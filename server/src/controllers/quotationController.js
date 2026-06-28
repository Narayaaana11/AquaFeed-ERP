const mongoose = require('mongoose');
const Quotation = require('../models/Quotation');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Company = require('../models/Company');
const { calculateGstSplit } = require('../utils/gstCalculator');

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
    res.json({ success: true, message: 'Quotation deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getQuotations, getQuotation, createQuotation, updateQuotation, updateQuotationStatus, deleteQuotation };
