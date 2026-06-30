const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  hsnCode: { type: String },
  lineTotal: { type: Number, required: true, min: 0 }
});

const quotationSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  quotationNumber: { type: String, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  items: [quotationItemSchema],
  subtotal: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, default: 0, min: 0 },
  gstAmount: { type: Number, default: 0, min: 0 },
  cgstAmount: { type: Number, default: 0, min: 0 },
  sgstAmount: { type: Number, default: 0, min: 0 },
  igstAmount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Converted'], default: 'Draft' },
  validUntil: { type: Date },
  notes: { type: String },
  convertedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  tallyGuid: { type: String, sparse: true },
  date: { type: Date, required: true, default: Date.now }
}, {
  timestamps: true
});

quotationSchema.index({ company: 1, quotationNumber: 1 }, { unique: true });
quotationSchema.index({ company: 1, tallyGuid: 1 }, { unique: true, partialFilterExpression: { tallyGuid: { $type: "string" } } });
quotationSchema.index({ company: 1, date: -1 });
quotationSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Quotation', quotationSchema);
