const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Company = require('../models/Company');
const StockAdjustment = require('../models/StockAdjustment');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const { calculateGstSplit } = require('../utils/gstCalculator');
const { emitInvoiceCreated, emitInvoiceUpdated, emitInvoiceDeleted, emitInvoicePaid, emitDashboardUpdate, emitLowStockAlert } = require('../utils/websocket');

// Generate next invoice number
const generateInvoiceNumber = async (company, session) => {
  const prefix = company.invoicePrefix || 'INV';
  const counter = company.invoiceCounter || 1;
  const number = String(counter).padStart(4, '0');
  await Company.findByIdAndUpdate(company._id, { $inc: { invoiceCounter: 1 } }, { session });
  return `${prefix}-${number}`;
};

// GET /api/sales
const getInvoices = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50, from, to } = req.query;
    const query = { company: req.companyId };

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.status = status;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('customer', 'name phone')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Invoice.countDocuments(query),
    ]);

    res.json({ success: true, data: invoices, total });
  } catch (err) {
    next(err);
  }
};

// GET /api/sales/:id
const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, company: req.companyId })
      .populate('customer')
      .populate('items.product', 'name brand')
      .populate('createdBy', 'name');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales
const createInvoice = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { customerId, items, paymentType, notes, gstRate, paidAmount, warehouseId, date } = req.body;

    const customer = await Customer.findOne({ _id: customerId, company: req.companyId }).session(session);
    if (!customer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const company = await Company.findById(req.companyId).session(session);
    const invoiceGstRate = gstRate ?? company.gstRate ?? 5;

    // Find warehouse
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      const defaultWh = await Warehouse.findOne({ company: req.companyId, isDefault: true }).session(session);
      if (!defaultWh) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: 'No default warehouse configured for this company.' });
      }
      targetWarehouseId = defaultWh._id;
    }

    const warehouseObj = await Warehouse.findOne({ _id: targetWarehouseId, company: req.companyId }).session(session);
    if (!warehouseObj) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    }

    // Build line items with stock check
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, company: req.companyId }).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
      }

      // Check stock inside the selected warehouse
      const invRecord = await Inventory.findOne({
        product: product._id,
        warehouse: targetWarehouseId,
        company: req.companyId,
      }).session(session);

      const availableStock = invRecord ? invRecord.quantity : 0;

      if (availableStock < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}" in warehouse "${warehouseObj.name}". Available: ${availableStock}, Requested: ${item.quantity}`,
        });
      }

      const lineTotal = item.quantity * (item.unitPrice || product.price);
      subtotal += lineTotal;
      lineItems.push({
        product: product._id,
        productName: product.name,
        hsnCode: product.hsnCode || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice || product.price,
        discount: item.discount || 0,
        lineTotal,
      });
    }

    const gstAmount = Math.round(subtotal * (invoiceGstRate / 100));
    const { cgstAmount, sgstAmount, igstAmount } = calculateGstSplit(company.state, customer.state, gstAmount);
    const total = subtotal + gstAmount;

    // Determine the actual paid amount and credit amount
    let initialPaidAmount = 0;
    if (paymentType === 'Credit') {
      initialPaidAmount = 0;
    } else if (paidAmount !== undefined) {
      initialPaidAmount = paidAmount;
    } else {
      initialPaidAmount = total;
    }
    
    const creditAmount = total - initialPaidAmount;

    // Credit check for credit payment
    if (creditAmount > 0) {
      const newOutstanding = customer.outstandingBalance + creditAmount;
      if (customer.creditLimit > 0 && newOutstanding > customer.creditLimit) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Credit limit exceeded for ${customer.name}. Limit: ₹${customer.creditLimit}, Outstanding would be: ₹${newOutstanding}`,
        });
      }
    }

    const invoiceNumber = await generateInvoiceNumber(company, session);
    const status = initialPaidAmount >= total ? 'Paid' : 'Credit';
    const dueDate = creditAmount > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    const payments = initialPaidAmount > 0 ? [{
      amount: initialPaidAmount,
      paymentType: paymentType === 'Split' ? 'Cash' : (paymentType === 'Credit' ? 'Cash' : paymentType)
    }] : [];

    const [invoice] = await Invoice.create([{
      invoiceNumber,
      customer: customer._id,
      customerName: customer.name,
      items: lineItems,
      subtotal,
      gstRate: invoiceGstRate,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      total,
      paidAmount: initialPaidAmount,
      payments,
      paymentType,
      status,
      dueDate,
      notes,
      date: date || new Date(),
      createdBy: req.user._id,
      company: req.companyId,
    }], { session });

    // Deduct stock for each product + log adjustment
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      const prevStock = product.stock;

      // Deduct from warehouse inventory
      const invRecord = await Inventory.findOne({
        product: product._id,
        warehouse: targetWarehouseId,
        company: req.companyId,
      }).session(session);

      invRecord.quantity -= item.quantity;
      await invRecord.save({ session });

      // Deduct from global stock
      product.stock -= item.quantity;
      await product.save({ session });

      await StockAdjustment.create([{
        product: product._id,
        warehouse: targetWarehouseId,
        type: 'sale',
        quantity: item.quantity,
        previousStock: prevStock,
        newStock: product.stock,
        reason: `Sale - ${invoiceNumber}`,
        reference: invoiceNumber,
        createdBy: req.user._id,
        company: req.companyId,
      }], { session });
    }

    // Update customer outstanding if credit
    if (creditAmount > 0) {
      await Customer.findByIdAndUpdate(customer._id, { $inc: { outstandingBalance: creditAmount } }, { session });
    }

    await session.commitTransaction();
    session.endSession();

    const populated = await Invoice.findById(invoice._id).populate('customer', 'name phone');

    // Emit WebSocket events
    const io = req.app.locals.io;
    if (io) {
      emitInvoiceCreated(io, req.companyId, populated);

      // Check for low stock products
      const lowStockProducts = await Product.find({
        company: req.companyId,
        isActive: true,
        $expr: { $lt: ['$stock', '$lowStockThreshold'] },
      });
      if (lowStockProducts.length > 0) {
        emitLowStockAlert(io, req.companyId, lowStockProducts);
      }

      // Emit dashboard update for new invoice
      emitDashboardUpdate(io, req.companyId, { event: 'invoice_created', invoiceTotal: total });
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// PUT /api/sales/:id/status
const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, company: req.companyId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const oldStatus = invoice.status;
    invoice.status = status;
    if (status === 'Paid') {
      invoice.paidAmount = invoice.total;
      // Reduce outstanding if was credit
      if (oldStatus === 'Credit' || oldStatus === 'Pending') {
        await Customer.findByIdAndUpdate(invoice.customer, {
          $inc: { outstandingBalance: -invoice.total },
        });
      }
    }
    await invoice.save();

    // Emit WebSocket events
    const io = req.app.locals.io;
    if (io) {
      if (status === 'Paid') {
        emitInvoicePaid(io, req.companyId, invoice);
      } else {
        emitInvoiceUpdated(io, req.companyId, invoice);
      }
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sales/:id
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { status: 'Cancelled' },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitInvoiceDeleted(io, req.companyId, invoice._id);
    }

    res.json({ success: true, message: 'Invoice cancelled.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales/:id/payments
const addPayment = async (req, res, next) => {
  try {
    const { amount, paymentType, referenceNumber } = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, company: req.companyId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    if (amount <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0.' });
    
    const remainingBalance = invoice.total - invoice.paidAmount;
    if (amount > remainingBalance) {
      return res.status(400).json({ success: false, message: `Payment exceeds remaining balance of ₹${remainingBalance}.` });
    }

    invoice.paidAmount += amount;
    invoice.payments.push({ amount, paymentType, referenceNumber });
    
    if (invoice.paidAmount >= invoice.total) {
      invoice.status = 'Paid';
    }
    
    await invoice.save();

    // Reduce customer outstanding
    await Customer.findByIdAndUpdate(invoice.customer, {
      $inc: { outstandingBalance: -amount },
    });

    // Emit WebSocket events
    const io = req.app.locals.io;
    if (io) {
      emitInvoicePaid(io, req.companyId, invoice);
    }

    const populated = await Invoice.findById(invoice._id).populate('customer', 'name phone');

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// PUT /api/sales/:id — edit a Pending or Credit invoice
const updateInvoice = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, company: req.companyId }).populate('customer').session(session);
    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    if (invoice.status === 'Paid' || invoice.status === 'Cancelled') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Cannot edit a Paid or Cancelled invoice.' });
    }

    const { items, notes, paymentType, gstRate, warehouseId, date } = req.body;
    const targetWarehouseId = warehouseId || invoice.warehouse;

    // 1. Restore stock from old line items
    for (const oldItem of invoice.items) {
      const product = await Product.findById(oldItem.product).session(session);
      if (!product) continue;

      product.stock += oldItem.quantity;
      await product.save({ session });

      const invRecord = await Inventory.findOne({
        product: product._id,
        warehouse: targetWarehouseId,
        company: req.companyId,
      }).session(session);
      if (invRecord) {
        invRecord.quantity += oldItem.quantity;
        await invRecord.save({ session });
      }
    }

    // 2. Validate and build new line items
    const company = await Company.findById(req.companyId).session(session);
    const invoiceGstRate = gstRate ?? invoice.gstRate;
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, company: req.companyId }).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
      }

      const invRecord = await Inventory.findOne({
        product: product._id,
        warehouse: targetWarehouseId,
        company: req.companyId,
      }).session(session);

      const availableStock = invRecord ? invRecord.quantity : 0;
      if (availableStock < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${item.quantity}`,
        });
      }

      const lineTotal = item.quantity * (item.unitPrice || product.price);
      subtotal += lineTotal;
      lineItems.push({
        product: product._id,
        productName: product.name,
        hsnCode: product.hsnCode || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice || product.price,
        discount: item.discount || 0,
        lineTotal,
      });
    }

    const gstAmount = Math.round(subtotal * (invoiceGstRate / 100));
    const { cgstAmount, sgstAmount, igstAmount } = calculateGstSplit(company.state, invoice.customer.state, gstAmount);
    const total = subtotal + gstAmount;

    // 3. Deduct stock for new line items
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      const invRecord = await Inventory.findOne({
        product: product._id,
        warehouse: targetWarehouseId,
        company: req.companyId,
      }).session(session);

      invRecord.quantity -= item.quantity;
      await invRecord.save({ session });
      product.stock -= item.quantity;
      await product.save({ session });

      await StockAdjustment.create([{
        product: product._id,
        warehouse: targetWarehouseId,
        type: 'sale',
        quantity: item.quantity,
        previousStock: product.stock + item.quantity,
        newStock: product.stock,
        reason: `Invoice Edit - ${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
        createdBy: req.user._id,
        company: req.companyId,
      }], { session });
    }

    // 4. Update invoice fields
    invoice.items = lineItems;
    invoice.subtotal = subtotal;
    invoice.gstRate = invoiceGstRate;
    invoice.gstAmount = gstAmount;
    invoice.cgstAmount = cgstAmount;
    invoice.sgstAmount = sgstAmount;
    invoice.igstAmount = igstAmount;
    invoice.total = total;
    invoice.warehouse = targetWarehouseId;
    if (notes !== undefined) invoice.notes = notes;
    if (paymentType) invoice.paymentType = paymentType;
    if (date !== undefined) invoice.date = date;

    await invoice.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await Invoice.findById(invoice._id).populate('customer', 'name phone');
    const io = req.app.locals.io;
    if (io) emitInvoiceUpdated(io, req.companyId, populated);

    res.json({ success: true, data: populated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// GET /api/sales/payments/history
const getPaymentHistory = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50, from, to } = req.query;
    
    const matchStage = { company: new mongoose.Types.ObjectId(req.companyId) };
    if (search) {
      matchStage.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Aggregation pipeline to unwind payments
    const pipeline = [
      { $match: matchStage },
      { $unwind: "$payments" }
    ];

    if (from || to) {
      const dateMatch = {};
      if (from) dateMatch.$gte = new Date(from);
      if (to) dateMatch.$lte = new Date(to + 'T23:59:59.999Z');
      pipeline.push({ $match: { "payments.date": dateMatch } });
    }

    pipeline.push(
      { $sort: { "payments.date": -1 } },
      {
        $project: {
          invoiceId: "$_id",
          invoiceNumber: 1,
          customerName: 1,
          amount: "$payments.amount",
          paymentType: "$payments.paymentType",
          referenceNumber: "$payments.referenceNumber",
          date: "$payments.date"
        }
      }
    );

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const countPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await Invoice.aggregate(countPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    const dataPipeline = [...pipeline, { $skip: skip }, { $limit: parseInt(limit) }];
    const payments = await Invoice.aggregate(dataPipeline);

    res.json({ success: true, data: payments, total });
  } catch (err) {
    next(err);
  }
};

module.exports = { getInvoices, getInvoice, createInvoice, updateInvoice, updateInvoiceStatus, deleteInvoice, addPayment, getPaymentHistory };

