const Product = require('../models/Product');
const StockAdjustment = require('../models/StockAdjustment');
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');
const { emitProductUpdate, emitInventoryUpdate, emitLowStockAlert } = require('../utils/websocket');

// GET /api/inventory
const getInventory = async (req, res, next) => {
  try {
    const { search, stockStatus } = req.query;
    const query = { company: req.companyId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (stockStatus === 'low_stock') {
      query.$expr = { $lt: ['$stock', '$lowStockThreshold'] };
    } else if (stockStatus === 'out_of_stock') {
      query.stock = 0;
    }

    const products = await Product.find(query).sort({ stock: 1 });

    const enriched = products.map((p) => ({
      ...p.toObject(),
      stockStatus: p.stock <= 0 ? 'out_of_stock'
        : p.stock < p.lowStockThreshold / 2 ? 'critical'
        : p.stock < p.lowStockThreshold ? 'low_stock'
        : 'in_stock',
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /api/inventory/adjustments
const getAdjustments = async (req, res, next) => {
  try {
    const { productId, page = 1, limit = 50 } = req.query;
    const query = { company: req.companyId };
    if (productId) query.product = productId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [adjustments, total] = await Promise.all([
      StockAdjustment.find(query)
        .populate('product', 'name brand')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      StockAdjustment.countDocuments(query),
    ]);

    res.json({ success: true, data: adjustments, total });
  } catch (err) {
    next(err);
  }
};

// POST /api/inventory/adjust
const adjustInventory = async (req, res, next) => {
  try {
    const { productId, type, quantity, reason, fromWarehouseId, toWarehouseId } = req.body;
    const product = await Product.findOne({ _id: productId, company: req.companyId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const previousStock = product.stock;
    
    if (type === 'transfer') {
      if (!fromWarehouseId || !toWarehouseId) {
        return res.status(400).json({ success: false, message: 'Both source and destination warehouses are required for transfer.' });
      }

      if (fromWarehouseId.toString() === toWarehouseId.toString()) {
        return res.status(400).json({ success: false, message: 'Source and destination warehouses cannot be the same.' });
      }

      // Check source warehouse inventory
      let sourceInv = await Inventory.findOne({
        product: productId,
        warehouse: fromWarehouseId,
        company: req.companyId,
      });

      if (!sourceInv || sourceInv.quantity < Math.abs(quantity)) {
        const available = sourceInv ? sourceInv.quantity : 0;
        return res.status(400).json({
          success: false,
          message: `Insufficient stock in source warehouse. Available: ${available}, Requested: ${Math.abs(quantity)}`,
        });
      }

      // Check/create destination warehouse inventory
      let destInv = await Inventory.findOne({
        product: productId,
        warehouse: toWarehouseId,
        company: req.companyId,
      });

      if (!destInv) {
        destInv = new Inventory({
          product: productId,
          warehouse: toWarehouseId,
          quantity: 0,
          company: req.companyId,
        });
      }

      // Perform transfer
      sourceInv.quantity -= Math.abs(quantity);
      destInv.quantity += Math.abs(quantity);

      await sourceInv.save();
      await destInv.save();

      // Global stock remains unchanged
      const newStock = previousStock;
      
      const outAdjustment = await StockAdjustment.create({
        product: product._id,
        warehouse: fromWarehouseId,
        type: 'transfer_out',
        quantity: Math.abs(quantity),
        previousStock,
        newStock,
        reason: reason || 'Warehouse Transfer',
        createdBy: req.user._id,
        company: req.companyId,
      });
      
      await StockAdjustment.create({
        product: product._id,
        warehouse: toWarehouseId,
        type: 'transfer_in',
        quantity: Math.abs(quantity),
        previousStock,
        newStock,
        reason: reason || 'Warehouse Transfer',
        createdBy: req.user._id,
        company: req.companyId,
      });

      await outAdjustment.populate('product', 'name brand');
      await outAdjustment.populate('createdBy', 'name');

      // Emit WebSocket events
      const io = req.app.locals.io;
      if (io) {
        emitProductUpdate(io, req.companyId, product);
        emitInventoryUpdate(io, req.companyId, { productId, fromWarehouseId, toWarehouseId });
      }

      return res.json({ success: true, data: { product, adjustment: outAdjustment } });
    }

    // Normal adjustments (add, remove, adjustment)
    if (!fromWarehouseId) {
      return res.status(400).json({ success: false, message: 'Warehouse is required for stock adjustments.' });
    }

    let inventoryItem = await Inventory.findOne({
      product: productId,
      warehouse: fromWarehouseId,
      company: req.companyId,
    });

    if (!inventoryItem) {
      inventoryItem = new Inventory({
        product: productId,
        warehouse: fromWarehouseId,
        quantity: 0,
        company: req.companyId,
      });
    }

    const previousWarehouseQty = inventoryItem.quantity;
    let newWarehouseQty = previousWarehouseQty;

    if (type === 'add') {
      newWarehouseQty = previousWarehouseQty + Math.abs(quantity);
    } else if (type === 'remove') {
      newWarehouseQty = Math.max(0, previousWarehouseQty - Math.abs(quantity));
    } else if (type === 'adjustment') {
      newWarehouseQty = Math.max(0, quantity);
    }

    inventoryItem.quantity = newWarehouseQty;
    await inventoryItem.save();

    // Recalculate global Product stock as sum of all warehouse quantities
    const allInventories = await Inventory.find({ product: productId, company: req.companyId });
    const newStock = allInventories.reduce((sum, inv) => sum + inv.quantity, 0);

    product.stock = newStock;
    await product.save();

    const adjustment = await StockAdjustment.create({
      product: product._id,
      warehouse: fromWarehouseId,
      type,
      quantity: Math.abs(newWarehouseQty - previousWarehouseQty),
      previousStock,
      newStock,
      reason,
      createdBy: req.user._id,
      company: req.companyId,
    });

    await adjustment.populate('product', 'name brand');
    await adjustment.populate('createdBy', 'name');

    // Emit WebSocket events
    const io = req.app.locals.io;
    if (io) {
      emitProductUpdate(io, req.companyId, product);
      emitInventoryUpdate(io, req.companyId, { productId, warehouseId: fromWarehouseId });

      // Check for low stock products
      if (newStock < product.lowStockThreshold) {
        const lowStockProducts = await Product.find({
          company: req.companyId,
          isActive: true,
          $expr: { $lt: ['$stock', '$lowStockThreshold'] },
        });
        emitLowStockAlert(io, req.companyId, lowStockProducts);
      }
    }

    res.json({ success: true, data: { product, adjustment } });
  } catch (err) {
    next(err);
  }
};

// GET /api/inventory/warehouse/:warehouseId
const getWarehouseInventory = async (req, res, next) => {
  try {
    const { warehouseId } = req.params;
    const inventory = await Inventory.find({ warehouse: warehouseId, company: req.companyId })
      .populate({
        path: 'product',
        match: { isActive: true }
      });
    
    // Filter out entries where product is null (inactive products)
    const activeInventory = inventory.filter(item => item.product !== null);
    res.json({ success: true, data: activeInventory });
  } catch (err) {
    next(err);
  }
};

module.exports = { getInventory, getAdjustments, adjustInventory, getWarehouseInventory };
