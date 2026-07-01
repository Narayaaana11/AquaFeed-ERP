const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Batch name/number is required'],
    trim: true
  },
  tallyGuid: {
    type: String,
    trim: true,
    index: true // Useful for quick lookups during sync
  },
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
    required: true
  },
  productName: {
    type: String, // Denormalized for faster queries
    trim: true
  },
  warehouse: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Warehouse'
  },
  warehouseName: {
    type: String, // Denormalized for faster queries
    trim: true
  },
  quantity: { 
    type: Number, 
    default: 0 
  },
  rate: { 
    type: Number, 
    default: 0 
  },
  value: { 
    type: Number, 
    default: 0 
  },
  manufacturedOn: { 
    type: Date 
  },
  expiryDate: {
    type: Date
  },
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  }
}, { 
  timestamps: true 
});

// Ensure unique batches per company, product, and name
batchSchema.index({ company: 1, product: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Batch', batchSchema);
