const mongoose = require('mongoose');
const Quotation = require('../models/Quotation');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Company = require('../models/Company');
const Invoice = require('../models/Invoice');
const StockAdjustment = require('../models/StockAdjustment');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const { calculateGstSplit } = require('../utils/gstCalculator');
const {
  emitQuotationCreated,
  emitQuotationUpdated,
  emitQuotationDeleted,
  emitInvoiceCreated,
  emitLowStockAlert,
  emitDashboardUpdate
} = require('../utils/websocket');


const generateQuotationNumber = async (company, session) => {
  const prefix = company.quotationPrefix || 'QTN';
  const counter = company.quotationCounter || 1;
  const number = String(counter).padStart(4, '0');
  await Company.findByIdAndUpdate(company._id, { $inc: { quotationCounter: 1 } }, { session });
  return `${prefix}-${number}`;
};

// GET /api/quotations
const getQuotations = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50, from, to } = req.query;
    const query = { company: req.companyId };

    if (search) {
      query.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [quotations, total] = await Promise.all([
      Quotation.find(query)
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Quotation.countDocuments(query),
    ]);

    res.json({ success: true, data: quotations, total });
  } catch (err) {
    next(err);
  }
};

// GET /api/quotations/:id
const getQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, company: req.companyId })
      .populate('customer')
      .populate('items.product', 'name brand');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found.' });
    res.json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
};

// POST /api/quotations
const createQuotation = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { customerId, items, notes, validUntil } = req.body;

    const customer = await Customer.findOne({ _id: customerId, company: req.companyId }).session(session);
    if (!customer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const company = await Company.findById(req.companyId).session(session);
    const gstRate = company.gstRate ?? 5;

    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, company: req.companyId }).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
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

    const gstAmount = Math.round(subtotal * (gstRate / 100));
    const { cgstAmount, sgstAmount, igstAmount } = calculateGstSplit(company.state, customer.state, gstAmount);
    const total = subtotal + gstAmount;

    const quotationNumber = await generateQuotationNumber(company, session);

    const [quotation] = await Quotation.create([{
      company: req.companyId,
      quotationNumber,
      customer: customer._id,
      customerName: customer.name,
      items: lineItems,
      subtotal,
      gstRate,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      total,
      status: 'Draft',
      validUntil,
      notes,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const populated = await Quotation.findById(quotation._id).populate('customer', 'name phone');

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitQuotationCreated(io, req.companyId, populated);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// PUT /api/quotations/:id
const updateQuotation = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, notes, validUntil } = req.body;
    
    const quotation = await Quotation.findOne({ _id: req.params.id, company: req.companyId }).session(session);
    if (!quotation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    if (quotation.status === 'Accepted' || quotation.status === 'Converted') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Cannot modify a quotation that is ${quotation.status}.` });
    }

    let subtotal = 0;
    const lineItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, company: req.companyId }).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
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

    const company = await Company.findById(req.companyId).session(session);
    const customer = await Customer.findById(quotation.customer).session(session);
    const gstRate = quotation.gstRate;
    const gstAmount = Math.round(subtotal * (gstRate / 100));
    const { cgstAmount, sgstAmount, igstAmount } = calculateGstSplit(company.state, customer.state, gstAmount);
    const total = subtotal + gstAmount;

    quotation.items = lineItems;
    quotation.subtotal = subtotal;
    quotation.gstAmount = gstAmount;
    quotation.cgstAmount = cgstAmount;
    quotation.sgstAmount = sgstAmount;
    quotation.igstAmount = igstAmount;
    quotation.total = total;
    if (notes !== undefined) quotation.notes = notes;
    if (validUntil !== undefined) quotation.validUntil = validUntil;

    await quotation.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await Quotation.findById(quotation._id).populate('customer', 'name phone');

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitQuotationUpdated(io, req.companyId, populated);
    }

    res.json({ success: true, data: populated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// PUT /api/quotations/:id/status
const updateQuotationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const quotation = await Quotation.findOne({ _id: req.params.id, company: req.companyId });
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found.' });

    quotation.status = status;
    await quotation.save();

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitQuotationUpdated(io, req.companyId, quotation);
    }

    res.json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/quotations/:id
const deleteQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, company: req.companyId });
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found.' });
    if (quotation.status === 'Converted') return res.status(400).json({ success: false, message: 'Cannot delete a converted quotation.' });

    await Quotation.deleteOne({ _id: quotation._id });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitQuotationDeleted(io, req.companyId, quotation._id);
    }

    res.json({ success: true, message: 'Quotation deleted.' });
  } catch (err) {
    next(err);
  }
};

const generateInvoiceNumberInternal = async (company, session) => {
  const prefix = company.invoicePrefix || 'INV';
  const counter = company.invoiceCounter || 1;
  const number = String(counter).padStart(4, '0');
  await Company.findByIdAndUpdate(company._id, { $inc: { invoiceCounter: 1 } }, { session });
  return `${prefix}-${number}`;
};

const convertToInvoice = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, company: req.companyId }).session(session);
    if (!quotation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    if (quotation.status === 'Converted') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Quotation has already been converted to an invoice.' });
    }

    const customer = await Customer.findOne({ _id: quotation.customer, company: req.companyId }).session(session);
    if (!customer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const company = await Company.findById(req.companyId).session(session);

    // Find warehouse - default or first available
    const defaultWh = await Warehouse.findOne({ company: req.companyId, isDefault: true }).session(session);
    if (!defaultWh) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'No default warehouse configured for this company.' });
    }
    const targetWarehouseId = defaultWh._id;

    // Check stock for each product in warehouse
    for (const item of quotation.items) {
      const product = await Product.findOne({ _id: item.product, company: req.companyId }).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
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
          message: `Insufficient stock for "${product.name}" in warehouse "${defaultWh.name}". Available: ${availableStock}, Requested: ${item.quantity}`,
        });
      }
    }

    // Invoice GST Calculations (re-use from Quotation)
    const invoiceGstRate = quotation.gstRate || company.gstRate || 5;
    const { cgstAmount, sgstAmount, igstAmount } = calculateGstSplit(company.state, customer.state, quotation.gstAmount);

    const invoiceNumber = await generateInvoiceNumberInternal(company, session);

    // Default to Credit invoice for conversion, or check if customer has outstanding credit limit
    const total = quotation.total;
    const initialPaidAmount = 0; // standard convert to credit invoice
    const creditAmount = total - initialPaidAmount;

    // Credit limit check
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

    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const lineItems = quotation.items.map(item => ({
      product: item.product,
      productName: item.productName,
      hsnCode: item.hsnCode || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      lineTotal: item.lineTotal,
    }));

    const [invoice] = await Invoice.create([{
      invoiceNumber,
      customer: customer._id,
      customerName: customer.name,
      items: lineItems,
      subtotal: quotation.subtotal,
      gstRate: invoiceGstRate,
      gstAmount: quotation.gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      total,
      paidAmount: initialPaidAmount,
      payments: [],
      paymentType: 'Credit',
      status: 'Credit',
      dueDate,
      notes: quotation.notes || `Converted from quotation ${quotation.quotationNumber}`,
      createdBy: req.user._id,
      company: req.companyId,
    }], { session });

    // Deduct stock and log adjustment
    for (const item of quotation.items) {
      const product = await Product.findById(item.product).session(session);
      const prevStock = product.stock;

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
        previousStock: prevStock,
        newStock: product.stock,
        reason: `Sale (Converted) - ${invoiceNumber}`,
        reference: invoiceNumber,
        createdBy: req.user._id,
        company: req.companyId,
      }], { session });
    }

    // Update customer outstanding
    await Customer.findByIdAndUpdate(customer._id, { $inc: { outstandingBalance: creditAmount } }, { session });

    // Update Quotation status & reference
    quotation.status = 'Converted';
    quotation.convertedInvoice = invoice._id;
    await quotation.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Populate and emit WebSocket updates
    const populatedInvoice = await Invoice.findById(invoice._id).populate('customer', 'name phone');
    const populatedQuotation = await Quotation.findById(quotation._id).populate('customer', 'name phone');

    const io = req.app.locals.io;
    if (io) {
      emitInvoiceCreated(io, req.companyId, populatedInvoice);
      emitQuotationUpdated(io, req.companyId, populatedQuotation);

      // Low stock check
      const lowStockProducts = await Product.find({
        company: req.companyId,
        isActive: true,
        $expr: { $lt: ['$stock', '$lowStockThreshold'] },
      });
      if (lowStockProducts.length > 0) {
        emitLowStockAlert(io, req.companyId, lowStockProducts);
      }
      emitDashboardUpdate(io, req.companyId, { event: 'invoice_created', invoiceTotal: total });
    }

    res.status(201).json({ success: true, data: populatedInvoice });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

module.exports = {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  deleteQuotation,
  convertToInvoice
};
