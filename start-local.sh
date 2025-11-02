#!/bin/bash

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Démarrage de PelletsFun en local${NC}"
echo "========================================"

# Vérifier si MongoDB tourne
echo -e "${BLUE}🔍 Vérification de MongoDB...${NC}"
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB n'est pas démarré${NC}"
    echo "Assurez-vous que MongoDB est installé et démarré"
    echo "Windows: Démarrez le service MongoDB depuis les Services"
    echo "Mac: brew services start mongodb-community"
    echo "Linux: sudo systemctl start mongod"
    read -p "Appuyez sur Entrée une fois MongoDB démarré..."
fi

# Fonction pour tuer les processus à la fin
cleanup() {
    echo -e "\n${YELLOW}🛑 Arrêt des serveurs...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Démarrer le backend
echo -e "${BLUE}🔧 Démarrage du backend (port 5000)...${NC}"
cd backend
node server.js &
BACKEND_PID=$!
cd ..

# Attendre que le backend démarre
sleep 3

# Démarrer le frontend
echo -e "${BLUE}🎨 Démarrage du frontend (port 8080)...${NC}"
cd client
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✅ Serveurs démarrés !${NC}"
echo "========================================"
echo -e "${GREEN}🌐 Frontend: http://localhost:8080${NC}"
echo -e "${GREEN}🔌 Backend:  http://localhost:5000${NC}"
echo ""
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter les serveurs${NC}"
echo ""

# Attendre que les processus se terminent
wait
