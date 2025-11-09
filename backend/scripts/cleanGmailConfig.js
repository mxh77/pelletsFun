const mongoose = require('mongoose');
const GmailConfig = require('../models/GmailConfig');

// Script de nettoyage pour supprimer les champs obsolètes maxResults et daysBack
async function cleanGmailConfig() {
  try {
    console.log('🔧 Nettoyage de la configuration Gmail...');
    
    // Se connecter à MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletsfun';
    await mongoose.connect(mongoUri);
    
    console.log('📡 Connecté à MongoDB');
    
    // Supprimer les champs obsolètes
    const result = await GmailConfig.updateMany(
      {}, 
      { 
        $unset: { 
          maxResults: 1, 
          daysBack: 1 
        } 
      }
    );
    
    console.log(`✅ ${result.modifiedCount} configuration(s) nettoyée(s)`);
    
    // Afficher la configuration actuelle
    const config = await GmailConfig.getConfig();
    console.log('📧 Configuration Gmail après nettoyage:', config.toObject());
    
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  cleanGmailConfig();
}

module.exports = cleanGmailConfig;