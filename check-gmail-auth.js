#!/usr/bin/env node

/**
 * Utilitaire de diagnostic des tokens Gmail
 * Usage: node check-gmail-auth.js
 */

const fs = require('fs').promises;
const path = require('path');

async function checkGmailTokens() {
  console.log('🔍 Diagnostic des tokens Gmail OAuth2');
  console.log('=====================================\n');

  const tokenPath = path.join(process.cwd(), 'config', 'gmail-token.json');
  
  try {
    // Vérifier l'existence du fichier
    const tokenData = await fs.readFile(tokenPath, 'utf8');
    const tokens = JSON.parse(tokenData);
    
    console.log('📄 Fichier token trouvé:', tokenPath);
    console.log('📊 Analyse du token:');
    console.log('  ├─ Access Token:', tokens.access_token ? '✅ Présent' : '❌ Manquant');
    console.log('  ├─ Refresh Token:', tokens.refresh_token ? '✅ Présent' : '❌ MANQUANT');
    console.log('  ├─ Token Type:', tokens.token_type || 'Non spécifié');
    console.log('  └─ Scope:', tokens.scope || 'Non spécifié');
    
    // Vérifier l'expiration
    if (tokens.expiry_date) {
      const now = new Date().getTime();
      const expiryTime = tokens.expiry_date;
      const timeUntilExpiry = expiryTime - now;
      
      console.log('\n⏰ État d\'expiration:');
      if (timeUntilExpiry > 0) {
        const minutesLeft = Math.floor(timeUntilExpiry / (1000 * 60));
        const hoursLeft = Math.floor(minutesLeft / 60);
        
        if (hoursLeft > 0) {
          console.log(`  └─ Expire dans: ${hoursLeft}h ${minutesLeft % 60}min ✅`);
        } else if (minutesLeft > 5) {
          console.log(`  └─ Expire dans: ${minutesLeft}min ⚠️`);
        } else {
          console.log(`  └─ Expire dans: ${minutesLeft}min ⚠️ CRITIQUE`);
        }
      } else {
        const minutesAgo = Math.floor(Math.abs(timeUntilExpiry) / (1000 * 60));
        console.log(`  └─ EXPIRÉ depuis: ${minutesAgo}min ❌`);
      }
    } else {
      console.log('\n⏰ État d\'expiration: Date non spécifiée');
    }
    
    // Métadonnées
    if (tokens.created_at) {
      console.log('\n📅 Métadonnées:');
      console.log('  ├─ Créé le:', new Date(tokens.created_at).toLocaleString('fr-FR'));
      console.log('  └─ Version:', tokens.app_version || 'Non spécifiée');
    }
    
    // Recommandations
    console.log('\n💡 Recommandations:');
    
    if (!tokens.refresh_token) {
      console.log('  ❗ PROBLÈME CRITIQUE: Refresh token manquant');
      console.log('     → Supprimez le fichier token et refaites l\'autorisation');
      console.log('     → rm config/gmail-token.json');
    } else if (timeUntilExpiry && timeUntilExpiry < 5 * 60 * 1000) {
      console.log('  ⚠️  Token proche de l\'expiration');
      console.log('     → Le système devrait le renouveler automatiquement');
    } else {
      console.log('  ✅ Configuration OAuth2 correcte');
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('❌ Aucun fichier token trouvé');
      console.log('   └─ Chemin attendu:', tokenPath);
      console.log('\n💡 Actions requises:');
      console.log('  1. Configurer Gmail dans l\'interface web');
      console.log('  2. Suivre le processus d\'autorisation OAuth2');
    } else {
      console.error('❌ Erreur lecture token:', error.message);
    }
  }
  
  console.log('\n🔗 Plus d\'informations sur OAuth2:');
  console.log('   https://developers.google.com/gmail/api/auth/about-auth');
}

// Exécuter le diagnostic
checkGmailTokens().catch(console.error);