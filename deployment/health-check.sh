#!/bin/bash
# Script de vérification de la santé du service PelletsFun
# À exécuter périodiquement (via cron par exemple)

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🏥 Vérification de la santé de PelletsFun"
echo "========================================="

# Variables
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost"
PUBLIC_URL="https://pelletsfun.harmonixe.fr"
ERRORS=0

# 1. Vérifier MongoDB
echo -e "${BLUE}1. MongoDB...${NC}"
if systemctl is-active --quiet mongod; then
    echo -e "${GREEN}   ✅ MongoDB est actif${NC}"
else
    echo -e "${RED}   ❌ MongoDB est inactif${NC}"
    ((ERRORS++))
fi

# 2. Vérifier Nginx
echo -e "${BLUE}2. Nginx...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}   ✅ Nginx est actif${NC}"
else
    echo -e "${RED}   ❌ Nginx est inactif${NC}"
    ((ERRORS++))
fi

# 3. Vérifier PM2
echo -e "${BLUE}3. PM2 Backend...${NC}"
if su - pelletsfun -c "pm2 status pelletsfun-backend" | grep -q "online"; then
    echo -e "${GREEN}   ✅ Backend PM2 est en ligne${NC}"
else
    echo -e "${RED}   ❌ Backend PM2 est hors ligne${NC}"
    ((ERRORS++))
fi

# 4. Vérifier le backend (HTTP)
echo -e "${BLUE}4. Backend API...${NC}"
if curl -s -f "$BACKEND_URL/pelletsfun/deliveries" > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Backend API répond${NC}"
else
    echo -e "${RED}   ❌ Backend API ne répond pas${NC}"
    ((ERRORS++))
fi

# 5. Vérifier le frontend local
echo -e "${BLUE}5. Frontend (local)...${NC}"
if curl -s -f "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Frontend accessible localement${NC}"
else
    echo -e "${RED}   ❌ Frontend non accessible localement${NC}"
    ((ERRORS++))
fi

# 6. Vérifier l'URL publique
echo -e "${BLUE}6. URL publique...${NC}"
if curl -s -f "$PUBLIC_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Site accessible publiquement${NC}"
else
    echo -e "${YELLOW}   ⚠️  Site non accessible publiquement (vérifier DNS/NPM)${NC}"
fi

# 7. Vérifier l'utilisation du disque
echo -e "${BLUE}7. Espace disque...${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}   ✅ Espace disque : ${DISK_USAGE}%${NC}"
else
    echo -e "${YELLOW}   ⚠️  Espace disque : ${DISK_USAGE}% (critique)${NC}"
fi

# 8. Vérifier l'utilisation de la RAM
echo -e "${BLUE}8. Mémoire...${NC}"
MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -lt 80 ]; then
    echo -e "${GREEN}   ✅ Utilisation mémoire : ${MEM_USAGE}%${NC}"
else
    echo -e "${YELLOW}   ⚠️  Utilisation mémoire : ${MEM_USAGE}% (élevée)${NC}"
fi

echo ""
echo "========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les services fonctionnent correctement${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS erreur(s) détectée(s)${NC}"
    exit 1
fi
