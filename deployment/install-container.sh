#!/bin/bash
# Script d'installation automatique pour le conteneur PelletsFun
# À exécuter en tant que root dans le conteneur Proxmox

set -e

echo "🚀 Installation de PelletsFun dans le conteneur..."
echo "=================================================="

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Mise à jour du système
echo -e "${BLUE}📦 Mise à jour du système...${NC}"
apt update && apt upgrade -y

# Installation des paquets de base
echo -e "${BLUE}📦 Installation des paquets de base...${NC}"
apt install -y curl wget git nano sudo ca-certificates gnupg

# Installation de Node.js 20.x (LTS)
echo -e "${BLUE}📦 Installation de Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérification
echo -e "${GREEN}✅ Node.js version:${NC}"
node -v
echo -e "${GREEN}✅ NPM version:${NC}"
npm -v

# Installation de PM2
echo -e "${BLUE}📦 Installation de PM2...${NC}"
npm install -g pm2

# Installation de Nginx
echo -e "${BLUE}📦 Installation de Nginx...${NC}"
apt install -y nginx

# Installation de MongoDB 7.0
echo -e "${BLUE}📦 Installation de MongoDB 7.0...${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list

apt update
apt install -y mongodb-org

# Démarrage de MongoDB
systemctl enable mongod
systemctl start mongod

# Vérification MongoDB
echo -e "${GREEN}✅ MongoDB version:${NC}"
mongod --version | head -1

# Création de l'utilisateur pelletsfun
echo -e "${BLUE}👤 Création de l'utilisateur pelletsfun...${NC}"
if ! id -u pelletsfun > /dev/null 2>&1; then
    useradd -m -s /bin/bash pelletsfun
    usermod -aG sudo pelletsfun
    echo -e "${GREEN}✅ Utilisateur pelletsfun créé${NC}"
else
    echo -e "${YELLOW}⚠️  L'utilisateur pelletsfun existe déjà${NC}"
fi

# Configuration du repo Git (optionnel, demander à l'utilisateur)
echo -e "${BLUE}📥 Clonage du repository...${NC}"
echo -e "${YELLOW}⚠️  Configuration manuelle requise${NC}"
echo "Exécutez les commandes suivantes en tant qu'utilisateur pelletsfun:"
echo ""
echo "  su - pelletsfun"
echo "  git clone https://github.com/mxh77/pelletsFun.git"
echo "  cd pelletsFun"
echo ""

# Créer le dossier de logs
mkdir -p /home/pelletsfun/logs
chown -R pelletsfun:pelletsfun /home/pelletsfun

echo ""
echo -e "${GREEN}✅ Installation terminée !${NC}"
echo "=================================================="
echo ""
echo "📋 Prochaines étapes :"
echo "  1. Se connecter en tant qu'utilisateur pelletsfun : su - pelletsfun"
echo "  2. Cloner le repository : git clone https://github.com/mxh77/pelletsFun.git"
echo "  3. Configurer le backend (fichier .env)"
echo "  4. Installer les dépendances et builder l'application"
echo "  5. Configurer Nginx"
echo "  6. Lancer PM2"
echo ""
echo "📖 Voir le guide complet : DEPLOIEMENT_GUIDE.md"
