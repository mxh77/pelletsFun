#!/usr/bin/env node

/**
 * Script de régénération forcée des tokens Gmail
 * Usage: node regenerate-gmail-auth.js
 */

const fs = require('fs').promises;
const path = require('path');

async function regenerateGmailAuth() {
  console.log('🔄 Régénération de l\'authentification Gmail');
  console.log('==========================================\n');

  const tokenPath = path.join(process.cwd(), 'config', 'gmail-token.json');
  
  try {
    // Vérifier si un token existe
    const exists = await fs.access(tokenPath).then(() => true).catch(() => false);
    
    if (exists) {
      console.log('📄 Token existant détecté');
      
      // Backup du token existant
      const backupPath = path.join(process.cwd(), 'config', `gmail-token-backup-${Date.now()}.json`);
      await fs.copyFile(tokenPath, backupPath);
      console.log('💾 Backup créé:', path.basename(backupPath));
      
      // Supprimer le token actuel
      await fs.unlink(tokenPath);
      console.log('🗑️ Token existant supprimé');
    } else {
      console.log('📄 Aucun token existant');
    }
    
    console.log('\n✅ Prêt pour nouvelle autorisation');
    console.log('\n🔗 Étapes suivantes:');
    console.log('  1. Accédez à l\'interface web PelletsFun');
    console.log('  2. Allez dans la section "Configuration Gmail"');
    console.log('  3. Cliquez sur "Configurer Gmail"');
    console.log('  4. Suivez le processus d\'autorisation OAuth2');
    console.log('  5. Assurez-vous de bien accepter TOUTES les permissions');
    
    console.log('\n⚠️ Important:');
    console.log('  • Utilisez le même compte Google que précédemment');
    console.log('  • Acceptez toutes les permissions demandées');
    console.log('  • Le système devrait maintenant conserver l\'autorisation');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter la régénération
regenerateGmailAuth().catch(console.error);