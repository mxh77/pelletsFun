const mongoose = require('mongoose');

const BoilerConfigSchema = new mongoose.Schema({
  // Paramètres techniques de la chaudière
  nominalPower: {
    type: Number,
    required: true,
    default: 15,
    min: 1,
    max: 100
  },
  
  pelletsPerKWh: {
    type: Number,
    required: true,
    default: 0.2,
    min: 0.1,
    max: 1.0
  },
  
  installationDate: {
    type: Date,
    default: null
  },
  
  importInterval: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
    max: 60
  },
  
  // Métadonnées
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Configuration unique (un seul document de config)
  configType: {
    type: String,
    default: 'main',
    unique: true
  }
}, {
  timestamps: true
});

// Middleware pour mettre à jour updatedAt
BoilerConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BoilerConfig', BoilerConfigSchema);