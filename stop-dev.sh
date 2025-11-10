#!/bin/bash
echo "🛑 Arrêt de l'environnement de développement..."

# Tuer les processus Node.js
pkill -f "nodemon server.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

echo "✅ Environnement arrêté"