const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const StockAdjustment = require('../models/StockAdjustment');
const Company = require('../models/Company');

// Auto-generate PO number
const generatePONumber = async (companyId, session) => {
  const count = await PurchaseOrder.countDocuments({ company: companyId }).session(session);
  return `PO-${String(count + 1).padStart(4, '0')}`;
};

// GET /api/purchase-orders
const getPOs = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const query = { company: req.companyId };

    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [pos, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('supplier', 'name phone')
        .populate('warehouse', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PurchaseOrder.countDocuments(query),
    ]);

    res.json({ success: true, data: pos, total });
  } catch (err) {
    next(err);
  }
};

// GET /api/purchase-orders/:id
const getPO = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, company: req.companyId })
      .populate('supplier')
      .populate('warehouse', 'name')
      .populate('items.product', 'name brand')
      .populate('createdBy', 'name')
      .populate('receivedBy', 'name');
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    res.json({ success: true, data: po });
  } catch (err) {
    next(err);
  }
};

// POST /api/purchase-orders
const createPO = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { supplierId, warehouseId, items, expectedDate, notes } = req.body;

    const supplier = await Supplier.findOne({ _id: supplierId, company: req.companyId }).session(session);
    if (!supplier) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    // Resolve warehouse
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      const defaultWh = await Warehouse.findOne({ company: req.companyId, isDefault: true }).session(session);
      if (!defaultWh) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: 'No default warehouse configured.' });
      }
      targetWarehouseId = defaultWh._id;
    }

    const warehouse = await Warehouse.findOne({ _id: targetWarehouseId, company: req.companyId }).session(session);
    if (!warehouse) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    }

    // Build line items
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, company: req.companyId }).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
      }
      const lineTotal = item.quantity * (item.unitCost || product.purchasePrice || 0);
      subtotal += lineTotal;
      lineItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitCost: item.unitCost || product.purchasePrice || 0,
        lineTotal,
      });
    }

    const poNumber = await generatePONumber(req.companyId, session);

    const [po] = await PurchaseOrder.create([{
      poNumber,
      supplier: supplier._id,
      supplierName: supplier.name,
      items: lineItems,
      subtotal,
      totalAmount: subtotal,
      status: 'Ordered',
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      notes,
      warehouse: targetWarehouseId,
      createdBy: req.user._id,
      company: req.companyId,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const populated = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name phone')
      .populate('warehouse', 'name');

    // WebSocket notification
    const io = req.app.locals.io;
    if (io) {
      io.to(`company_${req.companyId}`).emit('po_created', populated);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// PUT /api/purchase-orders/:id/receive — mark as received, add stock
const receivePO = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, company: req.companyId }).session(session);
    if (!po) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }
    if (po.status === 'Received') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Purchase order already received.' });
    }
    if (po.status === 'Cancelled') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Cannot receive a cancelled PO.' });
    }

    // Add stock for each item
    for (const item of po.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) continue;

      const prevStock = product.stock;

      // Update / create warehouse inventory record
      let invRecord = await Inventory.findOne({
        product: product._id,
        warehouse: po.warehouse,
        company: req.companyId,
      }).session(session);

      if (invRecord) {
        invRecord.quantity += item.quantity;
        await invRecord.save({ session });
      } else {
        await Inventory.create([{
          product: product._id,
          warehouse: po.warehouse,
          quantity: item.quantity,
          company: req.companyId,
        }], { session });
      }

      // Update global product stock
      product.stock += item.quantity;
      // Update purchase price from PO if unitCost provided
      if (item.unitCost > 0) {
        product.purchasePrice = item.unitCost;
      }
      await product.save({ session });

      // Log stock adjustment
      await StockAdjustment.create([{
        product: product._id,
        warehouse: po.warehouse,
        type: 'purchase',
        quantity: item.quantity,
        previousStock: prevStock,
        newStock: product.stock,
        reason: `Purchase Order - ${po.poNumber}`,
        reference: po.poNumber,
        createdBy: req.user._id,
        company: req.companyId,
      }], { session });
    }

    po.status = 'Received';
    po.receivedDate = new Date();
    po.receivedBy = req.user._id;
    await po.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name phone')
      .populate('warehouse', 'name');

    // WebSocket
    const io = req.app.locals.io;
    if (io) {
      io.to(`company_${req.companyId}`).emit('po_received', populated);
      io.to(`inventory_${req.companyId}`).emit('inventory_update', { event: 'po_received' });
    }

    res.json({ success: true, data: populated, message: 'Stock received and updated successfully.' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// DELETE /api/purchase-orders/:id (cancel)
const cancelPO = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId, status: { $in: ['Draft', 'Ordered'] } },
      { status: 'Cancelled' },
      { new: true }
    );
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found or cannot be cancelled.' });
    res.json({ success: true, message: 'Purchase order cancelled.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPOs, getPO, createPO, receivePO, cancelPO };
