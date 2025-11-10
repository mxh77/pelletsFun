#!/bin/bash
set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Déploiement Production PelletsFun${NC}"
echo "========================================"

# 1. Vérifier les changements
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️ Aucun changement détecté${NC}"
    read -p "Continuer le déploiement ? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    # 2. Commit automatique des changements
    echo -e "${BLUE}📝 Commit des changements...${NC}"
    git add .
    
    # Message de commit automatique avec timestamp
    COMMIT_MSG="Production deployment $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG" || true
    
    echo -e "${BLUE}⬆️ Push vers GitHub...${NC}"
    git push origin master || {
        echo -e "${RED}❌ Erreur lors du push${NC}"
        exit 1
    }
fi

# 3. Déploiement forcé sur le serveur
echo -e "${BLUE}🌐 Déploiement forcé sur le serveur...${NC}"

# Nettoyage et mise à jour forcée du serveur
ssh pelletsfun@192.168.1.90 << 'EOF'
cd /home/pelletsfun/pelletsFun

echo "🧹 Nettoyage du serveur..."
# Sauvegarder les configs importantes
cp backend/.env backup_env.tmp 2>/dev/null || true
cp backend/config/gmail-credentials.json backup_gmail.tmp 2>/dev/null || true

# Nettoyage forcé
git stash push -u -m "Auto stash before deployment"
git reset --hard HEAD
git clean -fd
git pull origin master

# Restaurer les configs
mv backup_env.tmp backend/.env 2>/dev/null || true
mv backup_gmail.tmp backend/config/gmail-credentials.json 2>/dev/null || true

echo "🔧 Mise à jour backend..."
cd backend
npm install --production

echo "🎨 Rebuild frontend..."
cd ../client
npm install
npm run build

echo "📋 Copie des fichiers..."
sudo rm -rf /var/www/pelletsfun/*
sudo cp -r build/* /var/www/pelletsfun/
sudo chown -R www-data:www-data /var/www/pelletsfun

echo "🧹 Vidage cache Nginx..."
sudo nginx -s reload

echo "🔄 Redémarrage services..."
pm2 restart pelletsfun-backend

echo "✅ Déploiement terminé!"
pm2 status
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Déploiement réussi !${NC}"
    echo -e "${GREEN}🌐 Site: https://pelletsfun.harmonixe.fr${NC}"
else
    echo -e "${RED}❌ Erreur déploiement${NC}"
    exit 1
fi