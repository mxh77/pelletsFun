#!/bin/bash
# Script de monitoring des ressources système pour PelletsFun
# Peut être exécuté manuellement ou via cron

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "📊 Monitoring PelletsFun - $(date)"
echo "=================================================="

# 1. Utilisation CPU
echo -e "${BLUE}CPU:${NC}"
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
CPU_USAGE_INT=${CPU_USAGE%.*}

if [ "$CPU_USAGE_INT" -lt 50 ]; then
    echo -e "${GREEN}✅ Utilisation CPU: ${CPU_USAGE}%${NC}"
elif [ "$CPU_USAGE_INT" -lt 80 ]; then
    echo -e "${YELLOW}⚠️  Utilisation CPU: ${CPU_USAGE}% (modérée)${NC}"
else
    echo -e "${RED}❌ Utilisation CPU: ${CPU_USAGE}% (élevée)${NC}"
fi

# 2. Utilisation RAM
echo -e "${BLUE}RAM:${NC}"
MEM_TOTAL=$(free -h | awk 'NR==2 {print $2}')
MEM_USED=$(free -h | awk 'NR==2 {print $3}')
MEM_PERCENT=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')

if [ "$MEM_PERCENT" -lt 70 ]; then
    echo -e "${GREEN}✅ RAM: ${MEM_USED} / ${MEM_TOTAL} (${MEM_PERCENT}%)${NC}"
elif [ "$MEM_PERCENT" -lt 85 ]; then
    echo -e "${YELLOW}⚠️  RAM: ${MEM_USED} / ${MEM_TOTAL} (${MEM_PERCENT}%)${NC}"
else
    echo -e "${RED}❌ RAM: ${MEM_USED} / ${MEM_TOTAL} (${MEM_PERCENT}%) - Critique !${NC}"
fi

# 3. Espace disque
echo -e "${BLUE}Disque:${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_USED=$(df -h / | awk 'NR==2 {print $3}')
DISK_TOTAL=$(df -h / | awk 'NR==2 {print $2}')

if [ "$DISK_USAGE" -lt 70 ]; then
    echo -e "${GREEN}✅ Disque: ${DISK_USED} / ${DISK_TOTAL} (${DISK_USAGE}%)${NC}"
elif [ "$DISK_USAGE" -lt 85 ]; then
    echo -e "${YELLOW}⚠️  Disque: ${DISK_USED} / ${DISK_TOTAL} (${DISK_USAGE}%)${NC}"
else
    echo -e "${RED}❌ Disque: ${DISK_USED} / ${DISK_TOTAL} (${DISK_USAGE}%) - Critique !${NC}"
fi

# 4. Processus PM2
echo -e "${BLUE}PM2:${NC}"
if su - pelletsfun -c "pm2 status" | grep -q "pelletsfun-backend.*online"; then
    PM2_MEM=$(su - pelletsfun -c "pm2 jlist" | grep -A 20 "pelletsfun-backend" | grep "memory" | head -1 | awk '{print $2}' | sed 's/,//')
    PM2_MEM_MB=$((PM2_MEM / 1024 / 1024))
    PM2_CPU=$(su - pelletsfun -c "pm2 jlist" | grep -A 20 "pelletsfun-backend" | grep '"cpu"' | head -1 | awk '{print $2}' | sed 's/,//')
    
    echo -e "${GREEN}✅ Backend: Online${NC}"
    echo "   RAM: ${PM2_MEM_MB}MB"
    echo "   CPU: ${PM2_CPU}%"
    
    # Uptime
    UPTIME=$(su - pelletsfun -c "pm2 jlist" | grep -A 20 "pelletsfun-backend" | grep "pm_uptime" | head -1 | awk '{print $2}' | sed 's/,//')
    UPTIME_SECONDS=$(($(date +%s) - UPTIME / 1000))
    UPTIME_HOURS=$((UPTIME_SECONDS / 3600))
    echo "   Uptime: ${UPTIME_HOURS}h"
    
    # Restarts
    RESTARTS=$(su - pelletsfun -c "pm2 jlist" | grep -A 20 "pelletsfun-backend" | grep '"restarts"' | head -1 | awk '{print $2}' | sed 's/,//')
    if [ "$RESTARTS" -eq 0 ]; then
        echo -e "   Restarts: ${GREEN}${RESTARTS}${NC}"
    elif [ "$RESTARTS" -lt 5 ]; then
        echo -e "   Restarts: ${YELLOW}${RESTARTS}${NC}"
    else
        echo -e "   Restarts: ${RED}${RESTARTS} (vérifier les logs)${NC}"
    fi
else
    echo -e "${RED}❌ Backend: Offline${NC}"
fi

# 5. Nginx
echo -e "${BLUE}Nginx:${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx: Active${NC}"
    
    # Connexions actives
    CONNECTIONS=$(ps aux | grep nginx | wc -l)
    echo "   Processus: $CONNECTIONS"
else
    echo -e "${RED}❌ Nginx: Inactive${NC}"
fi

# 6. MongoDB
echo -e "${BLUE}MongoDB:${NC}"
if systemctl is-active --quiet mongod; then
    echo -e "${GREEN}✅ MongoDB: Active${NC}"
    
    # Version
    MONGO_VERSION=$(mongod --version | head -1 | awk '{print $3}')
    echo "   Version: $MONGO_VERSION"
    
    # Connexions
    if command -v mongosh &> /dev/null; then
        MONGO_CONNECTIONS=$(mongosh --quiet --eval "db.serverStatus().connections.current" 2>/dev/null || echo "N/A")
        echo "   Connexions: $MONGO_CONNECTIONS"
    fi
else
    echo -e "${RED}❌ MongoDB: Inactive${NC}"
fi

# 7. Réseau
echo -e "${BLUE}Réseau:${NC}"

# Port 80 (Nginx)
if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    echo -e "${GREEN}✅ Port 80: Ouvert (Nginx)${NC}"
else
    echo -e "${RED}❌ Port 80: Fermé${NC}"
fi

# Port 5000 (Backend)
if netstat -tlnp 2>/dev/null | grep -q ":5000 "; then
    echo -e "${GREEN}✅ Port 5000: Ouvert (Backend)${NC}"
else
    echo -e "${RED}❌ Port 5000: Fermé${NC}"
fi

# Port 27017 (MongoDB)
if netstat -tlnp 2>/dev/null | grep -q ":27017 "; then
    echo -e "${GREEN}✅ Port 27017: Ouvert (MongoDB)${NC}"
else
    echo -e "${RED}❌ Port 27017: Fermé${NC}"
fi

# 8. Derniers logs (erreurs uniquement)
echo -e "${BLUE}Dernières erreurs PM2:${NC}"
ERROR_COUNT=$(su - pelletsfun -c "pm2 logs pelletsfun-backend --lines 100 --nostream" 2>/dev/null | grep -i "error" | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ Aucune erreur récente${NC}"
else
    echo -e "${YELLOW}⚠️  ${ERROR_COUNT} erreur(s) dans les 100 dernières lignes${NC}"
    su - pelletsfun -c "pm2 logs pelletsfun-backend --lines 5 --nostream" 2>/dev/null | grep -i "error" | tail -3
fi

# 9. Taille des logs
echo -e "${BLUE}Taille des logs:${NC}"
LOG_SIZE=$(du -sh /home/pelletsfun/logs 2>/dev/null | awk '{print $1}')
echo "   PM2: $LOG_SIZE"

NGINX_LOG_SIZE=$(du -sh /var/log/nginx 2>/dev/null | awk '{print $1}')
echo "   Nginx: $NGINX_LOG_SIZE"

# 10. Résumé
echo ""
echo "=================================================="
echo -e "${BLUE}📈 Résumé:${NC}"

ISSUES=0

[ "$CPU_USAGE_INT" -ge 80 ] && ((ISSUES++))
[ "$MEM_PERCENT" -ge 85 ] && ((ISSUES++))
[ "$DISK_USAGE" -ge 85 ] && ((ISSUES++))
! su - pelletsfun -c "pm2 status" 2>/dev/null | grep -q "pelletsfun-backend.*online" && ((ISSUES++))
! systemctl is-active --quiet nginx && ((ISSUES++))
! systemctl is-active --quiet mongod && ((ISSUES++))

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les services fonctionnent normalement${NC}"
else
    echo -e "${RED}❌ $ISSUES problème(s) détecté(s)${NC}"
fi

echo ""
echo "Pour plus de détails, exécutez :"
echo "  pm2 monit              # Monitoring temps réel"
echo "  pm2 logs               # Logs en direct"
echo "  htop                   # Utilisation système"
echo "  ./health-check.sh      # Vérification complète"
