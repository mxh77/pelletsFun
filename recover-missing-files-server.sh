#!/bin/bash

# Script de récupération des fichiers CSV manquants - Version Serveur
# À exécuter directement sur le serveur de production 192.168.1.90

echo "🔍 RÉCUPÉRATION FICHIERS CSV MANQUANTS - SERVEUR"
echo "==============================================="
echo ""

# Configuration du serveur
SERVER_USER="pelletsfun"
SERVER_HOST="192.168.1.90"
PROJECT_PATH="/home/pelletsfun/pelletsFun"

echo "🌐 Connexion au serveur de production..."
echo "   Serveur: $SERVER_HOST"
echo "   Utilisateur: $SERVER_USER"
echo "   Projet: $PROJECT_PATH"
echo ""

# Exécuter le script sur le serveur distant
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
echo "🏠 Connecté au serveur de production"
echo "📂 Navigation vers le répertoire du projet..."

cd /home/pelletsfun/pelletsFun/backend

echo "📊 Vérification de l'environnement..."
echo "   - Répertoire courant: $(pwd)"
echo "   - Node.js version: $(node --version)"
echo "   - Fichiers auto-downloads existants: $(ls -1 auto-downloads/ 2>/dev/null | wc -l)"
echo ""

echo "🚀 Lancement du script de récupération..."
echo "========================================"

# Exécuter le script
node scripts/recover-missing-files.js

echo ""
echo "📈 Vérification post-traitement:"
echo "   - Fichiers maintenant disponibles: $(ls -1 auto-downloads/ 2>/dev/null | wc -l)"
echo ""
echo "📋 Derniers fichiers créés/modifiés:"
ls -lt auto-downloads/ | head -10

echo ""
echo "✅ Traitement serveur terminé"
EOF

REMOTE_EXIT_CODE=$?

echo ""
if [ $REMOTE_EXIT_CODE -eq 0 ]; then
    echo "🎉 Script de récupération terminé avec succès !"
    echo ""
    echo "🌐 Les fichiers sont maintenant disponibles sur:"
    echo "   https://pelletsfun.harmonixe.fr"
    echo ""
    echo "📊 Vous pouvez tester les graphiques via les boutons 'Stats'"
else
    echo "❌ Erreur lors de l'exécution sur le serveur (code: $REMOTE_EXIT_CODE)"
    echo ""
    echo "💡 Solutions possibles:"
    echo "   - Vérifier la connexion SSH au serveur"
    echo "   - S'assurer que MongoDB est démarré sur le serveur"
    echo "   - Vérifier les permissions du répertoire"
fi

echo ""