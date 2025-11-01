#!/bin/bash
# Script de déploiement complet PelletsFun
# À exécuter en tant qu'utilisateur pelletsfun après le clonage du repo

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Déploiement de PelletsFun"
echo "============================="

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur : package.json non trouvé${NC}"
    echo "Assurez-vous d'exécuter ce script depuis le répertoire pelletsFun"
    exit 1
fi

# 1. Configuration Backend
echo -e "${BLUE}1. Configuration du Backend...${NC}"
cd backend

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Création du fichier .env...${NC}"
    cat > .env << 'EOF'
MONGODB_URI=mongodb://localhost:27017/pelletsfun
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://pelletsfun.harmonixe.fr
EOF
    echo -e "${GREEN}✅ Fichier .env créé${NC}"
    echo -e "${YELLOW}⚠️  N'oubliez pas de vérifier/modifier la configuration dans backend/.env${NC}"
else
    echo -e "${GREEN}✅ Fichier .env existe déjà${NC}"
fi

echo -e "${BLUE}   Installation des dépendances backend...${NC}"
npm install --production

cd ..

# 2. Configuration Frontend
echo -e "${BLUE}2. Configuration du Frontend...${NC}"
cd client

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Création du fichier .env...${NC}"
    cat > .env << 'EOF'
REACT_APP_API_URL=https://pelletsfun.harmonixe.fr
EOF
    echo -e "${GREEN}✅ Fichier .env créé${NC}"
else
    echo -e "${GREEN}✅ Fichier .env existe déjà${NC}"
fi

echo -e "${BLUE}   Installation des dépendances frontend...${NC}"
npm install

echo -e "${BLUE}   Build du frontend...${NC}"
npm run build

cd ..

# 3. Créer le dossier de logs
echo -e "${BLUE}3. Création du dossier de logs...${NC}"
mkdir -p ~/logs
echo -e "${GREEN}✅ Dossier logs créé${NC}"

# 4. Copier le fichier ecosystem.config.js si nécessaire
if [ -f "deployment/ecosystem.config.js" ]; then
    echo -e "${BLUE}4. Configuration PM2...${NC}"
    cp deployment/ecosystem.config.js .
    echo -e "${GREEN}✅ ecosystem.config.js copié${NC}"
fi

# 5. Lancer PM2
echo -e "${BLUE}5. Démarrage de PM2...${NC}"
pm2 start ecosystem.config.js
pm2 save

echo ""
echo -e "${GREEN}✅ Déploiement terminé !${NC}"
echo "============================="
echo ""
echo "📋 Statut PM2 :"
pm2 status
echo ""
echo "📝 Prochaines étapes :"
echo "  1. Configurer Nginx (en tant que root)"
echo "  2. Configurer le DNS sur Hostinger"
echo "  3. Configurer Nginx Proxy Manager"
echo ""
echo "📖 Voir le guide complet : deployment/DEPLOIEMENT_GUIDE.md"
