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
  
  senders: [{
    type: String,
    default: ''
  }], // Tableau des emails expéditeurs (ex: ['chaudiere@example.com', 'autre@example.com'])
  
  subject: {
    type: String,
    default: 'X128812' // Mot-clé dans le sujet
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
  },
  
  cronEnabled: {
    type: Boolean,
    default: false
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
  
  // Mise à jour explicite de chaque champ au lieu de Object.assign
  if (updates.enabled !== undefined) config.enabled = updates.enabled;
  if (updates.senders !== undefined) config.senders = updates.senders;
  if (updates.subject !== undefined) config.subject = updates.subject;
  if (updates.autoProcess !== undefined) config.autoProcess = updates.autoProcess;
  if (updates.archiveProcessedEmails !== undefined) config.archiveProcessedEmails = updates.archiveProcessedEmails;
  if (updates.cronSchedule !== undefined) config.cronSchedule = updates.cronSchedule;
  if (updates.cronEnabled !== undefined) config.cronEnabled = updates.cronEnabled;
  
  await config.save();
  console.log('💾 Config sauvegardée en base:', config.toObject());
  return config;
};

module.exports = mongoose.model('GmailConfig', gmailConfigSchema);