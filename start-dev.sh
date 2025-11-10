#!/bin/bash
# Script pour démarrer l'environnement de développement local

echo "🚀 Démarrage environnement de développement PelletsFun"
echo "===================================================="

# Utilisation de la même base MongoDB qu'en production
echo "🌐 Connexion à MongoDB Cloud (même base qu'en production)"

# Démarrer le backend en mode développement
echo "🔧 Démarrage backend (port 3001)..."
cd backend
npm run dev:win &
BACKEND_PID=$!

# Démarrer le frontend
echo "🎨 Démarrage frontend (port 3000)..."
cd ../client
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Environnement de développement démarré !"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001"
echo ""
echo "Pour arrêter: Ctrl+C puis ./stop-dev.sh"

# Attendre l'arrêt
wait