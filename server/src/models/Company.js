const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    ownerName: {
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
    pincode: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    logoUrl: {
      type: String,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    gstRate: {
      type: Number,
      default: 5,
      min: 0,
      max: 28,
    },
    invoicePrefix: {
      type: String,
      default: 'INV',
    },
    invoiceCounter: {
      type: Number,
      default: 1,
    },
    financialYearStart: {
      type: String,
      default: 'April',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
