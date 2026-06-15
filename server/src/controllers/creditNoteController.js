const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const StockAdjustment = require('../models/StockAdjustment');
const CreditNote = require('../models/CreditNote');
const Warehouse = require('../models/Warehouse');

// Auto-generate credit note number
const generateCNNumber = async (companyId, session) => {
  const count = await CreditNote.countDocuments({ company: companyId }).session(session);
  return `CN-${String(count + 1).padStart(4, '0')}`;
};

// POST /api/credit-notes
const createCreditNote = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { invoiceId, items, reason } = req.body;

    const invoice = await Invoice.findOne({ _id: invoiceId, company: req.companyId })
      .populate('customer')
      .session(session);
    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    if (invoice.status === 'Cancelled') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Cannot create a credit note for a cancelled invoice.' });
    }

    // Resolve warehouse from original invoice
    const warehouseId = invoice.warehouse;

    // Build credit note items with stock validation
    let totalAmount = 0;
    const cnItems = [];

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) continue;

      // Find matching item in original invoice
      const origItem = invoice.items.find(i => i.product.toString() === item.productId);
      if (!origItem) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: `Product ${item.productId} not found in original invoice.` });
      }
      if (item.quantity > origItem.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: `Return quantity for ${origItem.productName} exceeds invoiced quantity.` });
      }

      const lineTotal = item.quantity * origItem.unitPrice;
      totalAmount += lineTotal;
      cnItems.push({
        product: origItem.product,
        productName: origItem.productName,
        quantity: item.quantity,
        unitPrice: origItem.unitPrice,
        lineTotal,
      });
    }

    if (cnItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'No valid items to return.' });
    }

    const creditNoteNumber = await generateCNNumber(req.companyId, session);

    const [cn] = await CreditNote.create([{
      creditNoteNumber,
      originalInvoice: invoice._id,
      originalInvoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer._id,
      customerName: invoice.customerName,
      items: cnItems,
      reason: reason || 'Product return',
      totalAmount,
      warehouse: warehouseId,
      createdBy: req.user._id,
      company: req.companyId,
    }], { session });

    // Add stock back for each returned item
    for (const item of cnItems) {
      const product = await Product.findById(item.product).session(session);
      if (!product) continue;

      const prevStock = product.stock;

      // Add to warehouse inventory
      if (warehouseId) {
        let invRecord = await Inventory.findOne({
          product: product._id,
          warehouse: warehouseId,
          company: req.companyId,
        }).session(session);

        if (invRecord) {
          invRecord.quantity += item.quantity;
          await invRecord.save({ session });
        } else {
          await Inventory.create([{
            product: product._id,
            warehouse: warehouseId,
            quantity: item.quantity,
            company: req.companyId,
          }], { session });
        }
      }

      // Add to global stock
      product.stock += item.quantity;
      await product.save({ session });

      await StockAdjustment.create([{
        product: product._id,
        warehouse: warehouseId,
        type: 'return',
        quantity: item.quantity,
        previousStock: prevStock,
        newStock: product.stock,
        reason: `Credit Note - ${creditNoteNumber} (Return from ${invoice.invoiceNumber})`,
        reference: creditNoteNumber,
        createdBy: req.user._id,
        company: req.companyId,
      }], { session });
    }

    // Reduce customer outstanding if invoice was on credit
    const customer = await Customer.findById(invoice.customer._id).session(session);
    if (customer && customer.outstandingBalance > 0) {
      const reduction = Math.min(totalAmount, customer.outstandingBalance);
      await Customer.findByIdAndUpdate(customer._id, { $inc: { outstandingBalance: -reduction } }, { session });
    }

    await session.commitTransaction();
    session.endSession();

    const populated = await CreditNote.findById(cn._id).populate('originalInvoice', 'invoiceNumber');

    // WebSocket
    const io = req.app.locals.io;
    if (io) {
      io.to(`company_${req.companyId}`).emit('credit_note_created', populated);
      io.to(`inventory_${req.companyId}`).emit('inventory_update', { event: 'return' });
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// GET /api/credit-notes
const getCreditNotes = async (req, res, next) => {
  try {
    const { customerId } = req.query;
    const query = { company: req.companyId };
    if (customerId) query.customer = customerId;

    const cns = await CreditNote.find(query)
      .populate('customer', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: cns });
  } catch (err) {
    next(err);
  }
};

// GET /api/credit-notes/:id
const getCreditNote = async (req, res, next) => {
  try {
    const cn = await CreditNote.findOne({ _id: req.params.id, company: req.companyId })
      .populate('customer', 'name phone')
      .populate('originalInvoice', 'invoiceNumber');
    if (!cn) return res.status(404).json({ success: false, message: 'Credit note not found.' });
    res.json({ success: true, data: cn });
  } catch (err) {
    next(err);
  }
};

module.exports = { createCreditNote, getCreditNotes, getCreditNote };
