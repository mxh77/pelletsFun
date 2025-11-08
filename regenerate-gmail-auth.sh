#!/bin/bash

# Script de régénération de l'autorisation Gmail pour la production
# Ce script génère une URL d'autorisation pour résoudre le problème de refresh_token

echo "🔧 Régénération de l'autorisation Gmail en production..."
echo ""
echo "⚠️ PROBLÈME DÉTECTÉ: Refresh token manquant"
echo "📋 SOLUTION: Nouvelle autorisation OAuth2 requise"
echo ""

# Informations de connexion
PRODUCTION_USER="pelletsfun"
PRODUCTION_HOST="192.168.1.90"
BACKEND_PATH="/home/pelletsfun/pelletsFun/backend"

echo "📡 Connexion au serveur de production..."

# Créer et exécuter le script de régénération sur le serveur
ssh "${PRODUCTION_USER}@${PRODUCTION_HOST}" << 'ENDSSH'
#!/bin/bash

# Variables
BACKEND_DIR="/home/pelletsfun/pelletsFun/backend"
cd "$BACKEND_DIR"

echo "📁 Dossier de travail: $(pwd)"

# Vérifier les credentials
if [ ! -f "config/gmail-credentials.production.json" ]; then
    echo "❌ Credentials de production non trouvés"
    exit 1
fi

# Supprimer l'ancien token
if [ -f "config/gmail-token.json" ]; then
    echo "🗑️ Suppression de l'ancien token..."
    rm config/gmail-token.json
fi

# Créer script d'autorisation temporaire
cat > temp_reauth.js << 'ENDJS'
const GmailService = require('./services/gmailService');

async function regenerateAuth() {
    try {
        console.log('🔄 Génération de la nouvelle URL d\'autorisation...');
        
        const gmailService = new GmailService();
        const result = await gmailService.initialize('./config/gmail-credentials.production.json');
        
        if (!result.configured && result.authUrl) {
            console.log('\n🔗 URL D\'AUTORISATION GMAIL:');
            console.log('=====================================');
            console.log(result.authUrl);
            console.log('=====================================');
            console.log('\n📋 ÉTAPES À SUIVRE:');
            console.log('1. Copiez l\'URL ci-dessus dans votre navigateur');
            console.log('2. Connectez-vous avec le compte Gmail configuré');
            console.log('3. Autorisez l\'application PelletsFun');
            console.log('4. Copiez le code d\'autorisation qui s\'affiche');
            console.log('5. Exécutez: node temp_exchange.js [VOTRE_CODE]');
            console.log('\n⚠️ IMPORTANT: Cette URL expire après quelques minutes !');
        } else {
            console.log('❌ Erreur génération URL:', result.error);
        }
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

regenerateAuth();
ENDJS

# Créer script d'échange de code temporaire
cat > temp_exchange.js << 'ENDJS'
const GmailService = require('./services/gmailService');

async function exchangeCode() {
    try {
        const code = process.argv[2];
        if (!code) {
            console.log('❌ Usage: node temp_exchange.js [CODE_AUTORISATION]');
            console.log('Example: node temp_exchange.js 4/0AX4XfWh...');
            return;
        }
        
        console.log('🔄 Échange du code d\'autorisation...');
        
        const gmailService = new GmailService();
        await gmailService.initialize('./config/gmail-credentials.production.json');
        
        const result = await gmailService.exchangeCodeForToken(code);
        console.log('✅', result.message);
        
        // Vérifier le token généré
        const fs = require('fs');
        if (fs.existsSync('config/gmail-token.json')) {
            const token = JSON.parse(fs.readFileSync('config/gmail-token.json', 'utf8'));
            if (token.refresh_token) {
                console.log('✅ Refresh token correctement généré');
            } else {
                console.log('⚠️ Refresh token manquant - réessayez l\'autorisation');
            }
        }
        
        console.log('🧹 Nettoyage des fichiers temporaires...');
        fs.unlinkSync('temp_reauth.js');
        fs.unlinkSync('temp_exchange.js');
        
        console.log('🚀 Redémarrage du service...');
        require('child_process').exec('pm2 restart pelletsfun-backend', (err, stdout, stderr) => {
            if (err) {
                console.log('⚠️ Redémarrez manuellement: pm2 restart pelletsfun-backend');
            } else {
                console.log('✅ Service redémarré avec succès');
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur échange code:', error.message);
        if (error.message.includes('invalid_grant')) {
            console.log('💡 Le code a expiré ou est invalide. Régénérez une nouvelle URL.');
        }
    }
}

exchangeCode();
ENDJS

echo "🚀 Exécution du script de régénération..."
node temp_reauth.js

ENDSSH

echo ""
echo "🎯 ACTIONS À EFFECTUER:"
echo "1. Copiez l'URL d'autorisation affichée ci-dessus"
echo "2. Ouvrez-la dans votre navigateur"
echo "3. Autorisez l'application Gmail"
echo "4. Récupérez le code d'autorisation"
echo "5. Exécutez sur le serveur:"
echo "   ssh pelletsfun@192.168.1.90 'cd /home/pelletsfun/pelletsFun/backend && node temp_exchange.js [VOTRE_CODE]'"
echo ""
echo "🔍 Pour vérifier les logs après:"
echo "   ssh pelletsfun@192.168.1.90 'pm2 logs pelletsfun-backend --lines 20'"