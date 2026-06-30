const mongoose = require('mongoose');

const creditNoteItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: { type: String, required: true },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0],
  },
  lineTotal: {
    type: Number,
    required: true,
  },
});

const creditNoteSchema = new mongoose.Schema(
  {
    creditNoteNumber: {
      type: String,
      required: true,
    },
    originalInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    originalInvoiceNumber: { type: String, required: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerName: { type: String, required: true },
    items: [creditNoteItemSchema],
    reason: {
      type: String,
      trim: true,
      default: 'Product return',
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Issued', 'Applied'],
      default: 'Issued',
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
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

creditNoteSchema.index({ company: 1, creditNoteNumber: 1 }, { unique: true });
creditNoteSchema.index({ company: 1, customer: 1 });
creditNoteSchema.index({ company: 1, originalInvoice: 1 });
creditNoteSchema.index({ company: 1, tallyGuid: 1 }, { unique: true, partialFilterExpression: { tallyGuid: { $type: "string" } } });
creditNoteSchema.index({ company: 1, date: -1 });
creditNoteSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('CreditNote', creditNoteSchema);
