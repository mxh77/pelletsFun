#!/bin/bash

# 🔍 Script de Vérification Configuration Gmail OAuth2
# Usage: ./check-oauth-config.sh

echo "🔍 Vérification Configuration Gmail OAuth2"
echo "=========================================="

# Variables
LOCAL_CALLBACK="http://localhost:3000/api/boiler/gmail/callback"
PROD_CALLBACK="https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback"
CREDENTIALS_FILE="backend/config/gmail-credentials.json"

echo ""
echo "📁 1. Vérification fichier credentials..."

if [ -f "$CREDENTIALS_FILE" ]; then
    echo "✅ Fichier credentials trouvé: $CREDENTIALS_FILE"
    
    # Vérifier les URIs dans le fichier
    if grep -q "$LOCAL_CALLBACK" "$CREDENTIALS_FILE"; then
        echo "✅ URI développement trouvée dans le fichier"
    else
        echo "❌ URI développement MANQUANTE dans le fichier"
        echo "   Attendu: $LOCAL_CALLBACK"
    fi
    
    if grep -q "$PROD_CALLBACK" "$CREDENTIALS_FILE"; then
        echo "✅ URI production trouvée dans le fichier"
    else
        echo "⚠️  URI production MANQUANTE dans le fichier"
        echo "   Attendu: $PROD_CALLBACK"
        echo "   (Ajoutez-la si vous prévoyez déployer en production)"
    fi
else
    echo "❌ Fichier credentials MANQUANT: $CREDENTIALS_FILE"
    echo "   Copiez votre fichier depuis Google Cloud Console"
fi

echo ""
echo "🌐 2. Test connectivité serveur local..."

# Tester si le serveur local répond
if curl -s -f "http://localhost:3000/api/boiler/stats" > /dev/null; then
    echo "✅ Serveur backend local répond (port 3000)"
else
    echo "❌ Serveur backend local ne répond pas"
    echo "   Démarrez le serveur: cd backend && npm start"
fi

echo ""
echo "📧 3. Test API Gmail local..."

# Tester l'API Gmail local
if curl -s -f "http://localhost:3000/api/boiler/gmail/config" > /dev/null; then
    echo "✅ API Gmail locale accessible"
else
    echo "❌ API Gmail locale non accessible"
    echo "   Vérifiez que les nouvelles routes sont chargées"
fi

echo ""
echo "🚀 4. Test connectivité production..."

# Tester si le serveur de production répond
if curl -s -f "https://pelletsfun.harmonixe.fr" > /dev/null 2>&1; then
    echo "✅ Site de production accessible"
    
    # Tester l'API de production
    if curl -s -f "https://pelletsfun.harmonixe.fr/api/boiler/stats" > /dev/null 2>&1; then
        echo "✅ API production accessible"
    else
        echo "⚠️  API production non accessible (normal si pas encore déployée)"
    fi
else
    echo "⚠️  Site de production non accessible (normal si pas encore déployé)"
fi

echo ""
echo "🔧 5. Checklist configuration Google Cloud..."

echo "☐ Projet Google Cloud créé"
echo "☐ API Gmail activée"  
echo "☐ Écran de consentement OAuth configuré"
echo "☐ Identifiants OAuth 2.0 créés"
echo "☐ URI développement ajoutée: $LOCAL_CALLBACK"
echo "☐ URI production ajoutée: $PROD_CALLBACK"
echo "☐ Fichier JSON téléchargé et placé dans: $CREDENTIALS_FILE"

echo ""
echo "📋 Récapitulatif:"
echo "=================="
echo "Développement: ✅ http://localhost:3000"
echo "Production: 🚀 https://pelletsfun.harmonixe.fr"
echo ""
echo "URIs OAuth2 à configurer dans Google Cloud Console:"
echo "1. $LOCAL_CALLBACK"
echo "2. $PROD_CALLBACK"
echo ""
echo "Pour continuer:"
echo "1. 🔧 Configurez Google Cloud Platform avec les URIs ci-dessus"
echo "2. 💾 Téléchargez et placez le fichier credentials"
echo "3. 🔄 Redémarrez l'application"
echo "4. 📧 Testez l'autorisation Gmail"
echo ""
echo "Guide détaillé: GMAIL_SETUP_GUIDE.md"
echo "Configuration production: PRODUCTION_CONFIG.md"