const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
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
    // Credit management
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Customer classification
    type: {
      type: String,
      enum: ['Retail', 'Wholesale', 'Distributor', 'Farm'],
      default: 'Retail',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

customerSchema.index({ company: 1, isActive: 1 });

// Virtual: available credit
customerSchema.virtual('availableCredit').get(function () {
  return Math.max(0, this.creditLimit - this.outstandingBalance);
});

// Virtual: credit utilisation %
customerSchema.virtual('creditUtilisation').get(function () {
  if (this.creditLimit === 0) return 0;
  return Math.min(100, (this.outstandingBalance / this.creditLimit) * 100);
});

module.exports = mongoose.model('Customer', customerSchema);
