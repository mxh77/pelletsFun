const mongoose = require('mongoose');

const gmailConfigSchema = new mongoose.Schema({
  // Il ne devrait y avoir qu'une seule configuration Gmail
  _id: {
    type: String,
    default: 'gmail-config'
  },
  
  // Configuration Gmail
  enabled: {
    type: Boolean,
    default: false
  },
  
  sender: {
    type: String,
    default: '' // Email de l'expéditeur (ex: chaudiere@example.com)
  },
  
  subject: {
    type: String,
    default: 'touch' // Mot-clé dans le sujet
  },
  
  maxResults: {
    type: Number,
    default: 10 // Nombre max d'emails à traiter
  },
  
  daysBack: {
    type: Number,
    default: 7 // Nombre de jours en arrière pour chercher
  },
  
  // Informations de statut
  lastCheck: {
    type: Date,
    default: null
  },
  
  lastSuccessfulImport: {
    type: Date,
    default: null
  },
  
  totalEmailsProcessed: {
    type: Number,
    default: 0
  },
  
  totalFilesImported: {
    type: Number,
    default: 0
  },
  
  // Paramètres avancés
  autoProcess: {
    type: Boolean,
    default: true // Traitement automatique des fichiers trouvés
  },
  
  archiveProcessedEmails: {
    type: Boolean,
    default: true // Archiver les emails traités avec un label
  },
  
  cronSchedule: {
    type: String,
    default: '0 */6 * * *' // Toutes les 6 heures par défaut
  }
}, {
  timestamps: true,
  collection: 'gmailconfig'
});

// Méthodes statiques utiles
gmailConfigSchema.statics.getConfig = async function() {
  let config = await this.findById('gmail-config');
  if (!config) {
    // Créer une configuration par défaut
    config = new this({});
    await config.save();
  }
  return config;
};

gmailConfigSchema.statics.updateConfig = async function(updates) {
  const config = await this.getConfig();
  Object.assign(config, updates);
  await config.save();
  return config;
};

module.exports = mongoose.model('GmailConfig', gmailConfigSchema);