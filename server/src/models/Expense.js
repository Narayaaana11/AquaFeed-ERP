const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        'Transport',
        'Staff Salary',
        'Packaging',
        'Electricity',
        'Rent',
        'Repairs',
        'Maintenance',
        'Marketing',
        'Other',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Cheque', 'Bank Transfer'],
      default: 'Cash',
    },
    reference: {
      type: String,
      trim: true,
    },
    // Approval workflow
    status: {
      type: String,
      enum: ['Pending Approval', 'Approved', 'Rejected'],
      default: 'Approved',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
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

expenseSchema.index({ company: 1, date: -1 });
expenseSchema.index({ company: 1, category: 1 });
expenseSchema.index({ company: 1, tallyGuid: 1 }, { unique: true, partialFilterExpression: { tallyGuid: { $type: "string" } } });

module.exports = mongoose.model('Expense', expenseSchema);
