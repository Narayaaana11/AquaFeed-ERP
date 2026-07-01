const mongoose = require('mongoose');

const syncMetadataSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },
  lastSuccessfulSync: {
    type: Date,
    default: null
  },
  lastVoucherId: {
    type: String,
    default: ''
  },
  lastAlterId: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Idle', 'Syncing', 'Error'],
    default: 'Idle'
  },
  lastError: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('SyncMetadata', syncMetadataSchema);
