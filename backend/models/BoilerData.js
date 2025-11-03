const mongoose = require('mongoose');

const boilerDataSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  // Températures
  outsideTemp: {
    type: Number, // AT [°C]
    required: true
  },
  outsideTempActive: {
    type: Number, // ATakt [°C]
    required: true
  },
  heatingFlowTemp: {
    type: Number, // HK1 VL Ist[°C]
    required: true
  },
  heatingFlowTempTarget: {
    type: Number, // HK1 VL Soll[°C]
    required: true
  },
  
  // Données chaudière pellets (PE1)
  boilerTemp: {
    type: Number, // PE1 KT[°C]
    required: true
  },
  boilerTempTarget: {
    type: Number, // PE1 KT_SOLL[°C]
    required: true
  },
  modulation: {
    type: Number, // PE1 Modulation[%]
    required: true
  },
  fanSpeed: {
    type: Number, // PE1 Luefterdrehzahl[%]
    required: true
  },
  runtime: {
    type: Number, // PE1 Runtime[h] - temps total de fonctionnement
    required: true
  },
  status: {
    type: Number, // PE1 Status
    required: true
  },
  
  // Données eau chaude
  hotWaterInTemp: {
    type: Number, // WW1 EinT Ist[°C]
    required: true
  },
  hotWaterOutTemp: {
    type: Number, // WW1 AusT Ist[°C]
    required: true
  },
  
  // Métadonnées
  filename: {
    type: String,
    required: true
  },
  importDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
boilerDataSchema.index({ date: 1, time: 1 });
boilerDataSchema.index({ runtime: 1 });
boilerDataSchema.index({ filename: 1 });

module.exports = mongoose.model('BoilerData', boilerDataSchema);