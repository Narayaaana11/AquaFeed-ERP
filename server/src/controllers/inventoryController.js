const Product = require('../models/Product');
const StockAdjustment = require('../models/StockAdjustment');

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

      return res.json({ success: true, data: { product, adjustment: outAdjustment } });
    }

    // Normal adjustments
    let newStock;
    if (type === 'add') newStock = previousStock + Math.abs(quantity);
    else if (type === 'remove') newStock = Math.max(0, previousStock - Math.abs(quantity));
    else if (type === 'adjustment') newStock = Math.max(0, quantity);
    else newStock = previousStock;

    product.stock = newStock;
    await product.save();

    const adjustment = await StockAdjustment.create({
      product: product._id,
      type,
      quantity: Math.abs(newStock - previousStock),
      previousStock,
      newStock,
      reason,
      createdBy: req.user._id,
      company: req.companyId,
    });

    await adjustment.populate('product', 'name brand');
    await adjustment.populate('createdBy', 'name');

    res.json({ success: true, data: { product, adjustment } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getInventory, getAdjustments, adjustInventory };
