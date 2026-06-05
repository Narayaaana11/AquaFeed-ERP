const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Company = require('../models/Company');
const StockAdjustment = require('../models/StockAdjustment');
const { emitInvoiceCreated, emitInvoiceUpdated, emitInvoiceDeleted, emitInvoicePaid, emitDashboardUpdate, emitLowStockAlert } = require('../utils/websocket');

// Generate next invoice number
const generateInvoiceNumber = async (company) => {
  const prefix = company.invoicePrefix || 'INV';
  const counter = company.invoiceCounter || 1;
  const number = String(counter).padStart(4, '0');
  await Company.findByIdAndUpdate(company._id, { $inc: { invoiceCounter: 1 } });
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
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
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
  try {
    const { customerId, items, paymentType, notes, gstRate } = req.body;

    const customer = await Customer.findOne({ _id: customerId, company: req.companyId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const company = await Company.findById(req.companyId);
    const invoiceGstRate = gstRate ?? company.gstRate ?? 5;

    // Build line items with stock check
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, company: req.companyId });
      if (!product) return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }
      const lineTotal = item.quantity * (item.unitPrice || product.price);
      subtotal += lineTotal;
      lineItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice || product.price,
        discount: item.discount || 0,
        lineTotal,
      });
    }

    const gstAmount = Math.round(subtotal * (invoiceGstRate / 100));
    const total = subtotal + gstAmount;

    // Credit check for credit payment
    if (paymentType === 'Credit') {
      const newOutstanding = customer.outstandingBalance + total;
      if (customer.creditLimit > 0 && newOutstanding > customer.creditLimit) {
        return res.status(400).json({
          success: false,
          message: `Credit limit exceeded for ${customer.name}. Limit: ₹${customer.creditLimit}, Outstanding would be: ₹${newOutstanding}`,
        });
      }
    }

    const invoiceNumber = await generateInvoiceNumber(company);
    const status = paymentType === 'Credit' ? 'Credit' : 'Paid';
    const dueDate = paymentType === 'Credit' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

    const invoice = await Invoice.create({
      invoiceNumber,
      customer: customer._id,
      customerName: customer.name,
      items: lineItems,
      subtotal,
      gstRate: invoiceGstRate,
      gstAmount,
      total,
      paidAmount: paymentType !== 'Credit' ? total : 0,
      paymentType,
      status,
      dueDate,
      notes,
      createdBy: req.user._id,
      company: req.companyId,
    });

    // Deduct stock for each product + log adjustment
    for (const item of items) {
      const product = await Product.findById(item.productId);
      const prevStock = product.stock;
      product.stock -= item.quantity;
      await product.save();
      await StockAdjustment.create({
        product: product._id,
        type: 'sale',
        quantity: item.quantity,
        previousStock: prevStock,
        newStock: product.stock,
        reason: `Sale - ${invoiceNumber}`,
        reference: invoiceNumber,
        createdBy: req.user._id,
        company: req.companyId,
      });
    }

    // Update customer outstanding if credit
    if (paymentType === 'Credit') {
      await Customer.findByIdAndUpdate(customer._id, { $inc: { outstandingBalance: total } });
    }

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

module.exports = { getInvoices, getInvoice, createInvoice, updateInvoiceStatus, deleteInvoice };
