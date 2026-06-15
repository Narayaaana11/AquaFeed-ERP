const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    paymentTerms: {
      type: String,
      enum: ['Cash', 'Net15', 'Net30', 'Net45', 'Net60'],
      default: 'Net30',
    },
    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

supplierSchema.index({ company: 1, isActive: 1 });
supplierSchema.index({ company: 1, name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
