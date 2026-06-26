const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
    },
    category: {
      type: String,
      default: 'Other',
    },
    pelletSize: {
      type: String,
      trim: true, // e.g., "2mm", "4mm"
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [0.1, 'Weight must be greater than 0'],
    },
    unit: {
      type: String,
      default: 'kg',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    purchasePrice: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
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
    tallyGuid: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

// Index for fast company-scoped queries
productSchema.index({ company: 1, isActive: 1 });
productSchema.index({ company: 1, stock: 1 });

// Virtual: stock status
productSchema.virtual('stockStatus').get(function () {
  if (this.stock <= 0) return 'out_of_stock';
  if (this.stock < this.lowStockThreshold / 2) return 'critical';
  if (this.stock < this.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

module.exports = mongoose.model('Product', productSchema);
