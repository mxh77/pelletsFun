#!/bin/bash
set -e

echo "🔄 Mise à jour de PelletsFun..."
echo "================================"

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cd /home/pelletsfun/pelletsFun

# Pull des dernières modifications
echo -e "${BLUE}📥 Git pull...${NC}"
git pull origin master || {
    echo -e "${RED}❌ Erreur lors du git pull${NC}"
    exit 1
}

# Backend
echo -e "${BLUE}🔧 Mise à jour du backend...${NC}"
cd backend
npm install --production || {
    echo -e "${RED}❌ Erreur lors de l'installation des dépendances backend${NC}"
    exit 1
}

# Nettoyage configuration Gmail (suppression champs obsolètes)
echo -e "${BLUE}🧹 Nettoyage configuration Gmail...${NC}"
npm run clean-gmail-config || {
    echo -e "${RED}⚠️ Avertissement: Échec du nettoyage configuration Gmail${NC}"
    # Ne pas faire échouer le déploiement pour cela
}

# Frontend
echo -e "${BLUE}🎨 Rebuild du frontend...${NC}"
cd ../client
npm install || {
    echo -e "${RED}❌ Erreur lors de l'installation des dépendances frontend${NC}"
    exit 1
}

npm run build || {
    echo -e "${RED}❌ Erreur lors du build du frontend${NC}"
    exit 1
}

# Copie des fichiers buildés vers le répertoire web
echo -e "${BLUE}📋 Copie des fichiers vers /var/www/pelletsfun...${NC}"
sudo rm -rf /var/www/pelletsfun/*
sudo cp -r build/* /var/www/pelletsfun/
sudo chown -R www-data:www-data /var/www/pelletsfun

# Redémarrage PM2
echo -e "${BLUE}🔄 Redémarrage PM2...${NC}"
pm2 restart pelletsfun-backend || {
    echo -e "${RED}❌ Erreur lors du redémarrage PM2${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}✅ Mise à jour terminée avec succès !${NC}"
echo "================================"
pm2 status
echo ""
echo -e "${GREEN}🌐 Site accessible sur : https://pelletsfun.harmonixe.fr${NC}"
