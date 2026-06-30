const mongoose = require('mongoose');

const financialMetricSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,
    },
    cashInHand: { type: Number, default: 0 },
    bankAccounts: { type: Number, default: 0 },
    currentAssets: { type: Number, default: 0 },
    currentLiabilities: { type: Number, default: 0 },
    workingCapital: { type: Number, default: 0 },
    capitalAccount: { type: Number, default: 0 },
    loansLiability: { type: Number, default: 0 },
    receivables: { type: Number, default: 0 },
    payables: { type: Number, default: 0 },
    lastSynced: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FinancialMetric', financialMetricSchema);
