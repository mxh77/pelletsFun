#!/bin/bash

# Script de récupération des fichiers CSV manquants
# Usage: ./recover-missing-files.sh

echo "🔍 RÉCUPÉRATION FICHIERS CSV MANQUANTS"
echo "======================================"
echo ""

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "backend/scripts/recover-missing-files.js" ]; then
    echo "❌ Erreur: Script non trouvé. Exécutez depuis la racine du projet."
    exit 1
fi

# Vérifier si Node.js est disponible
if ! command -v node &> /dev/null; then
    echo "❌ Erreur: Node.js non trouvé. Installez Node.js d'abord."
    exit 1
fi

# Naviguer vers le répertoire backend
cd backend

echo "📂 Répertoire de travail: $(pwd)"
echo ""

# Variables d'environnement
export NODE_ENV=production

# Exécuter le script de récupération
echo "🚀 Lancement du script de récupération..."
echo ""

node scripts/recover-missing-files.js

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Script terminé avec succès"
    echo ""
    echo "📋 Vérification des fichiers récupérés:"
    ls -la auto-downloads/ | tail -10
else
    echo "❌ Script terminé avec des erreurs (code: $EXIT_CODE)"
fi

echo ""
echo "🔗 Pour voir tous les fichiers disponibles:"
echo "   ls -la backend/auto-downloads/"
echo ""
echo "📊 Pour tester les graphiques, utilisez l'interface web:"
echo "   https://pelletsfun.harmonixe.fr"