const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Warehouse name is required'],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
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
    manager: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 0, // in tons
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Maintenance'],
      default: 'Active',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    tallyGuid: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

warehouseSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Warehouse', warehouseSchema);
