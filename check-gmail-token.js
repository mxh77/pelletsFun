#!/usr/bin/env node

/**
 * 🔍 Script de diagnostic de l'authentification Gmail
 * Vérifie l'état du token et fournit des recommandations
 */

const fs = require('fs').promises;
const path = require('path');

const TOKEN_PATH = path.join(__dirname, 'backend', 'config', 'gmail-token.json');

async function checkGmailAuthStatus() {
  console.log('\n🔍 === DIAGNOSTIC AUTHENTIFICATION GMAIL ===\n');

  try {
    // Vérifier si le token existe
    const tokenData = await fs.readFile(TOKEN_PATH, 'utf8');
    const token = JSON.parse(tokenData);

    console.log('✅ Fichier token trouvé:', TOKEN_PATH);
    console.log('');

    // Vérifier le refresh_token
    if (!token.refresh_token) {
      console.log('❌ PROBLÈME: Refresh token manquant !');
      console.log('   → Action: Réautoriser l\'application Gmail');
      return;
    }
    console.log('✅ Refresh token présent');

    // Vérifier l'expiration du refresh_token
    if (token.refresh_token_expires_in) {
      const expiresInSeconds = token.refresh_token_expires_in;
      const expiresInDays = Math.floor(expiresInSeconds / 86400);
      const expiresInHours = Math.floor((expiresInSeconds % 86400) / 3600);

      console.log('⚠️  Mode: Testing (App non publiée)');
      console.log(`⏰ Refresh token expire dans: ${expiresInDays} jours et ${expiresInHours} heures`);
      console.log('');

      if (expiresInDays < 2) {
        console.log('🚨 ALERTE CRITIQUE: Expiration imminente !');
        console.log('   → Action URGENTE requise (voir ci-dessous)');
      } else if (expiresInDays < 5) {
        console.log('⚠️  AVERTISSEMENT: Expiration proche');
        console.log('   → Action recommandée (voir ci-dessous)');
      }

      console.log('');
      console.log('📋 SOLUTION PERMANENTE:');
      console.log('   1. Ouvrir: https://console.cloud.google.com/apis/credentials/consent');
      console.log('   2. Cliquer sur "PUBLISH APP" (Publier l\'application)');
      console.log('   3. Confirmer la publication');
      console.log('   4. Supprimer le token: rm backend/config/gmail-token.json');
      console.log('   5. Réautoriser l\'application UNE DERNIÈRE FOIS');
      console.log('   6. Le nouveau token sera PERMANENT ✨');
      console.log('');
      console.log('📖 Guide complet: FIX_GMAIL_AUTH_PERMANENTE.md');

    } else {
      console.log('✅ Mode: Production (App publiée)');
      console.log('✅ Refresh token PERMANENT (pas d\'expiration)');
      console.log('🎉 Configuration optimale ! Pas de réauthentification requise.');
    }

    console.log('');

    // Vérifier l'access_token
    if (token.expiry_date) {
      const now = Date.now();
      const expiresIn = token.expiry_date - now;
      
      if (expiresIn > 0) {
        const minutes = Math.floor(expiresIn / 60000);
        console.log(`✅ Access token valide pour encore: ${minutes} minutes`);
        console.log('   (Renouvellement automatique géré par le code)');
      } else {
        console.log('⚠️  Access token expiré (sera renouvelé automatiquement au prochain usage)');
      }
    }

    // Afficher les scopes
    if (token.scope) {
      console.log('');
      console.log('🔐 Scopes autorisés:');
      const scopes = token.scope.split(' ');
      scopes.forEach(scope => {
        console.log(`   - ${scope}`);
      });
    }

    // Afficher la date de création
    if (token.created_at) {
      console.log('');
      console.log(`📅 Token créé le: ${new Date(token.created_at).toLocaleString('fr-FR')}`);
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('❌ Fichier token non trouvé !');
      console.log('📍 Chemin attendu:', TOKEN_PATH);
      console.log('');
      console.log('📋 Action requise:');
      console.log('   1. Démarrer l\'application: ./start-dev.sh');
      console.log('   2. Ouvrir l\'interface de configuration Gmail');
      console.log('   3. Cliquer sur "Autoriser Gmail"');
      console.log('   4. Compléter le flux OAuth2');
    } else if (error instanceof SyntaxError) {
      console.log('❌ Fichier token invalide (JSON corrompu)');
      console.log('📋 Action: Supprimer le fichier et réautoriser');
      console.log(`   rm ${TOKEN_PATH}`);
    } else {
      console.log('❌ Erreur inattendue:', error.message);
    }
  }

  console.log('\n===========================================\n');
}

// Exécuter le diagnostic
checkGmailAuthStatus().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
