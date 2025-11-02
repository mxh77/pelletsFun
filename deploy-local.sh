#!/bin/bash
set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Déploiement automatique PelletsFun${NC}"
echo "========================================"

# Vérifier si des changements existent
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Aucun changement détecté${NC}"
    read -p "Voulez-vous quand même déployer la version actuelle ? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
    SKIP_COMMIT=true
else
    SKIP_COMMIT=false
fi

# Git add, commit et push
if [ "$SKIP_COMMIT" = false ]; then
    echo -e "${BLUE}📝 Préparation du commit...${NC}"
    
    # Afficher les fichiers modifiés
    echo -e "${YELLOW}Fichiers modifiés :${NC}"
    git status --short
    echo ""
    
    # Demander le message de commit
    read -p "💬 Message de commit : " COMMIT_MESSAGE
    
    if [ -z "$COMMIT_MESSAGE" ]; then
        echo -e "${RED}❌ Message de commit obligatoire${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}📦 Git add...${NC}"
    git add .
    
    echo -e "${BLUE}✍️  Git commit...${NC}"
    git commit -m "$COMMIT_MESSAGE" || {
        echo -e "${RED}❌ Erreur lors du commit${NC}"
        exit 1
    }
    
    echo -e "${BLUE}⬆️  Git push...${NC}"
    git push origin master || {
        echo -e "${RED}❌ Erreur lors du push${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Code pushé sur GitHub${NC}"
    echo ""
fi

# Déploiement sur le serveur
echo -e "${BLUE}🌐 Déploiement sur le serveur 192.168.1.90...${NC}"
echo ""

ssh pelletsfun@192.168.1.90 "cd /home/pelletsfun/pelletsFun && ./deployment/update-pelletsfun.sh" || {
    echo -e "${RED}❌ Erreur lors du déploiement${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}✅ Déploiement terminé avec succès !${NC}"
echo "========================================"
echo -e "${GREEN}🌐 Site accessible sur : https://pelletsfun.harmonixe.fr${NC}"
