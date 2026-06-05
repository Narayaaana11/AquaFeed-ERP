const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    type: {
      type: String,
      enum: ['add', 'remove', 'transfer_in', 'transfer_out', 'sale', 'return', 'damage', 'adjustment'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    reference: {
      type: String, // e.g., invoice number
      trim: true,
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
  },
  { timestamps: true }
);

stockAdjustmentSchema.index({ company: 1, product: 1 });
stockAdjustmentSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
