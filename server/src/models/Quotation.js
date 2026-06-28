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
  quotationNumber: { type: String, required: true, unique: true },
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
  tallyGuid: { type: String, sparse: true }
}, {
  timestamps: true
});

quotationSchema.index({ company: 1, quotationNumber: 1 }, { unique: true });
quotationSchema.index({ company: 1, tallyGuid: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Quotation', quotationSchema);
