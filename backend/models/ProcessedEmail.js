const mongoose = require('mongoose');

const processedEmailSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  subject: {
    type: String,
    required: false
  },
  sender: {
    type: String,
    required: false
  },
  emailDate: {
    type: Date,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileHash: {
    type: String, // Hash MD5 du contenu pour détecter les doublons
    required: false
  },
  fileSize: {
    type: Number,
    required: false
  },
  status: {
    type: String,
    enum: ['processed', 'imported', 'skipped', 'error', 'duplicate'],
    default: 'processed'
  },
  processedDate: {
    type: Date,
    default: Date.now
  },
  errorMessage: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Index pour recherche rapide par date
processedEmailSchema.index({ emailDate: -1 });
processedEmailSchema.index({ processedDate: -1 });

module.exports = mongoose.model('ProcessedEmail', processedEmailSchema);