#!/bin/bash
# Script de rollback pour revenir à une version précédente de PelletsFun
# Usage: ./rollback.sh [commit-hash]

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔄 Rollback de PelletsFun"
echo "========================="

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur : package.json non trouvé${NC}"
    echo "Assurez-vous d'exécuter ce script depuis le répertoire pelletsFun"
    exit 1
fi

# Si un hash de commit est fourni, l'utiliser, sinon afficher les derniers commits
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  Aucun commit spécifié${NC}"
    echo ""
    echo "Voici les 10 derniers commits :"
    echo "--------------------------------"
    git log --oneline -10
    echo ""
    echo -e "${BLUE}Usage: $0 <commit-hash>${NC}"
    echo "Exemple: $0 a1b2c3d"
    exit 0
fi

COMMIT_HASH=$1

# Vérifier que le commit existe
if ! git cat-file -e $COMMIT_HASH 2>/dev/null; then
    echo -e "${RED}❌ Erreur : Le commit $COMMIT_HASH n'existe pas${NC}"
    exit 1
fi

# Confirmation
echo -e "${YELLOW}⚠️  Vous allez revenir au commit : $COMMIT_HASH${NC}"
git log -1 $COMMIT_HASH
echo ""
read -p "Êtes-vous sûr ? (o/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "Rollback annulé"
    exit 0
fi

# Sauvegarder l'état actuel au cas où
echo -e "${BLUE}📦 Création d'une sauvegarde...${NC}"
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
git branch $BACKUP_BRANCH
echo -e "${GREEN}✅ Sauvegarde créée : $BACKUP_BRANCH${NC}"

# Checkout du commit
echo -e "${BLUE}🔄 Checkout du commit $COMMIT_HASH...${NC}"
git checkout $COMMIT_HASH

# Backend
echo -e "${BLUE}🔧 Réinstallation des dépendances backend...${NC}"
cd backend
npm install --production

# Frontend
echo -e "${BLUE}🎨 Rebuild du frontend...${NC}"
cd ../client
npm install
npm run build

# Redémarrage PM2
echo -e "${BLUE}🔄 Redémarrage PM2...${NC}"
cd ..
pm2 restart pelletsfun-backend

echo ""
echo -e "${GREEN}✅ Rollback terminé !${NC}"
echo "========================="
echo ""
echo "📋 Informations :"
echo "  Commit actuel : $(git log -1 --oneline)"
echo "  Sauvegarde : $BACKUP_BRANCH"
echo ""
echo "Pour revenir à la sauvegarde :"
echo "  git checkout $BACKUP_BRANCH"
echo ""
pm2 status
