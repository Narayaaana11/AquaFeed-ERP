const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: { type: String, required: true }, // snapshot at time of sale
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price cannot be negative'],
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  lineTotal: {
    type: Number,
    required: true,
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerName: { type: String, required: true }, // snapshot
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    gstRate: {
      type: Number,
      default: 5,
    },
    gstAmount: {
      type: Number,
      required: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    payments: [{
      amount: { type: Number, required: true },
      paymentType: { type: String, enum: ['Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Credit'], required: true },
      date: { type: Date, default: Date.now }
    }],
    paymentType: {
      type: String,
      enum: ['Cash', 'UPI', 'Cheque', 'Credit', 'Bank Transfer', 'Split'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Paid', 'Pending', 'Credit', 'Overdue', 'Cancelled'],
      default: 'Pending',
    },
    dueDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    tallyGuid: {
      type: String,
      sparse: true,
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ company: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ company: 1, status: 1 });
invoiceSchema.index({ company: 1, customer: 1 });
invoiceSchema.index({ company: 1, tallyGuid: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
