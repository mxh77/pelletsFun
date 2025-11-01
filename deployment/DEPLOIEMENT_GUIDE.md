# 🚀 Guide de Déploiement PelletsFun sur Proxmox

## 📋 Vue d'ensemble

**Application** : PelletsFun (React + Node.js + MongoDB)  
**URL cible** : https://pelletsfun.harmonixe.fr  
**Infrastructure** : Proxmox 9.0.3 + Nginx Proxy Manager  

---

## 🏗️ ÉTAPE 1 : Création du Conteneur Proxmox

### 1.1 Créer le conteneur Debian

Se connecter à Proxmox : https://192.168.1.78:8006

```bash
# Via l'interface Proxmox ou en CLI sur le host Proxmox
pct create 108 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname pelletsfun \
  --memory 2048 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.1.90/24,gw=192.168.1.1 \
  --storage local-lvm \
  --rootfs local-lvm:8 \
  --unprivileged 1 \
  --features nesting=1 \
  --start 1
```

**Alternative via l'interface web :**
1. Cliquer sur **Create CT**
2. **Hostname** : `pelletsfun`
3. **IP** : `192.168.1.90/24`
4. **Gateway** : `192.168.1.1`
5. **Memory** : 2048 MB
6. **Cores** : 2
7. Démarrer le conteneur

---

## 🔧 ÉTAPE 2 : Configuration du Conteneur

### 2.1 Se connecter au conteneur

```bash
# Via Proxmox Shell ou SSH
pct enter 108
# OU
ssh root@192.168.1.90
```

### 2.2 Installer les dépendances système

```bash
# Mise à jour du système
apt update && apt upgrade -y

# Installation des paquets de base
apt install -y curl wget git nano sudo

# Installation de Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérification
node -v  # devrait afficher v20.x.x
npm -v

# Installation de PM2 (gestionnaire de processus)
npm install -g pm2

# Installation de Nginx (pour servir le frontend)
apt install -y nginx

# Installation de MongoDB (si nécessaire en local, sinon utiliser MongoDB Atlas)
# Option 1 : MongoDB local
apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl enable mongod
systemctl start mongod

# Option 2 : Utiliser MongoDB Atlas (recommandé pour la production)
# Dans ce cas, passer à l'étape suivante
```

---

## 📦 ÉTAPE 3 : Déploiement de l'Application

### 3.1 Cloner le repository

```bash
# Créer un utilisateur dédié (bonne pratique)
useradd -m -s /bin/bash pelletsfun
usermod -aG sudo pelletsfun

# Passer en tant qu'utilisateur pelletsfun
su - pelletsfun

# Cloner le repo (adapter l'URL si repo privé)
cd ~
git clone https://github.com/mxh77/pelletsFun.git
cd pelletsFun
```

### 3.2 Configuration du Backend

```bash
cd ~/pelletsFun/backend

# Créer le fichier .env
cat > .env << 'EOF'
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/pelletsfun
# OU si MongoDB Atlas :
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pelletsfun?retryWrites=true&w=majority

# Server Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=https://pelletsfun.harmonixe.fr
EOF

# Installer les dépendances
npm install --production

# Test du backend
node server.js
# Vérifier que le serveur démarre sur le port 5000
# Ctrl+C pour arrêter
```

### 3.3 Build et configuration du Frontend

```bash
cd ~/pelletsFun/client

# Installer les dépendances
npm install

# Modifier la configuration pour pointer vers le bon backend
# Éditer le fichier de configuration API (si existant)
# OU créer un fichier .env pour le frontend

cat > .env << 'EOF'
REACT_APP_API_URL=https://pelletsfun.harmonixe.fr/api
EOF

# Build de production
npm run build

# Le dossier build/ contient maintenant les fichiers statiques
```

---

## 🌐 ÉTAPE 4 : Configuration Nginx dans le Conteneur

### 4.1 Créer la configuration Nginx

```bash
# Revenir en root
exit  # ou sudo su

# Créer le fichier de configuration Nginx
cat > /etc/nginx/sites-available/pelletsfun << 'EOF'
server {
    listen 80;
    server_name localhost;

    # Logs
    access_log /var/log/nginx/pelletsfun-access.log;
    error_log /var/log/nginx/pelletsfun-error.log;

    # Frontend - servir les fichiers statiques React
    location / {
        root /home/pelletsfun/pelletsFun/client/build;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API - proxy vers Node.js
    location /api {
        rewrite ^/api(.*)$ $1 break;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Routes API spécifiques (adapter selon vos routes)
    location /pelletsfun/deliveries {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /pelletsfun/recharges {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Activer le site
ln -s /etc/nginx/sites-available/pelletsfun /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Supprimer le site par défaut

# Tester la configuration
nginx -t

# Redémarrer Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## ⚡ ÉTAPE 5 : Lancement avec PM2

### 5.1 Créer le fichier de configuration PM2

```bash
# En tant qu'utilisateur pelletsfun
su - pelletsfun
cd ~/pelletsFun

# Créer ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'pelletsfun-backend',
      cwd: '/home/pelletsfun/pelletsFun/backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/home/pelletsfun/logs/backend-error.log',
      out_file: '/home/pelletsfun/logs/backend-out.log',
      log_file: '/home/pelletsfun/logs/backend-combined.log',
      time: true
    }
  ]
};
EOF

# Créer le dossier de logs
mkdir -p ~/logs

# Démarrer l'application avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot (en root)
exit
pm2 startup systemd -u pelletsfun --hp /home/pelletsfun
# Exécuter la commande affichée par PM2

# Vérifier le statut
su - pelletsfun
pm2 status
pm2 logs
```

---

## 🌍 ÉTAPE 6 : Configuration DNS (Hostinger)

Se connecter au panneau de contrôle Hostinger : https://www.hostinger.fr

1. Aller dans **Domaines** → **harmonixe.fr** → **DNS / Nameservers**
2. Ajouter un nouvel enregistrement DNS :

```
Type : A
Nom : pelletsfun
Pointe vers : 90.63.115.155
TTL : 14400 (ou laisser par défaut)
```

3. Sauvegarder

**⏱️ Propagation DNS** : Peut prendre de 5 minutes à 48 heures (généralement 15-30 minutes)

### Vérifier la propagation DNS :

```bash
# Depuis votre machine Windows (WSL ou Git Bash)
nslookup pelletsfun.harmonixe.fr
# OU
dig pelletsfun.harmonixe.fr
```

---

## 🔐 ÉTAPE 7 : Configuration Nginx Proxy Manager

Se connecter à NPM : http://192.168.1.81:81 (ou via https://proxmox.harmonixe.fr si configuré)

### 7.1 Créer un Proxy Host

1. Aller dans **Hosts** → **Proxy Hosts** → **Add Proxy Host**

**Onglet Details :**
```
Domain Names : pelletsfun.harmonixe.fr
Scheme : http
Forward Hostname / IP : 192.168.1.90
Forward Port : 80
Cache Assets : ✅ (activé)
Block Common Exploits : ✅ (activé)
Websockets Support : ✅ (activé si besoin temps réel)
Access List : - None - (ou créer une liste si besoin)
```

**Onglet SSL :**
```
SSL Certificate : Request a new SSL Certificate
Force SSL : ✅ (activé)
HTTP/2 Support : ✅ (activé)
HSTS Enabled : ✅ (activé)
HSTS Subdomains : ❌ (désactivé sauf si sous-domaines)
Email Address for Let's Encrypt : votre-email@example.com
I Agree to the Let's Encrypt Terms of Service : ✅
```

2. Cliquer sur **Save**

NPM va automatiquement :
- Générer le certificat SSL via Let's Encrypt
- Configurer le reverse proxy
- Activer HTTPS avec redirection automatique

---

## ✅ ÉTAPE 8 : Vérifications

### 8.1 Test local (depuis le conteneur)

```bash
# Se connecter au conteneur
ssh root@192.168.1.90

# Tester Nginx
curl http://localhost
# Devrait afficher le HTML de votre app React

# Tester le backend
curl http://localhost:5000/pelletsfun/deliveries
# Devrait retourner les données JSON

# Vérifier PM2
su - pelletsfun
pm2 status
pm2 logs pelletsfun-backend --lines 50
```

### 8.2 Test depuis le réseau local

```bash
# Depuis votre machine Windows
curl http://192.168.1.90
# OU ouvrir dans le navigateur : http://192.168.1.90
```

### 8.3 Test public

```bash
# Vérifier DNS
nslookup pelletsfun.harmonixe.fr
# Doit retourner : 90.63.115.155

# Tester l'accès HTTPS
curl -I https://pelletsfun.harmonixe.fr
# Doit retourner HTTP/2 200 avec certificat SSL valide

# Ouvrir dans le navigateur :
# https://pelletsfun.harmonixe.fr
```

---

## 🎯 ÉTAPE 9 : Points Bonus - Automatisation

### 9.1 Script de mise à jour automatique (CI/CD simple)

```bash
# Sur le conteneur, en tant qu'utilisateur pelletsfun
cat > ~/update-pelletsfun.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Mise à jour de PelletsFun..."

cd /home/pelletsfun/pelletsFun

# Pull des dernières modifications
echo "📥 Git pull..."
git pull origin master

# Backend
echo "🔧 Mise à jour du backend..."
cd backend
npm install --production

# Frontend
echo "🎨 Rebuild du frontend..."
cd ../client
npm install
npm run build

# Redémarrage PM2
echo "🔄 Redémarrage PM2..."
pm2 restart pelletsfun-backend

echo "✅ Mise à jour terminée !"
pm2 status
EOF

chmod +x ~/update-pelletsfun.sh

# Test du script
./update-pelletsfun.sh
```

### 9.2 Dynamic DNS avec Hostinger API (optionnel)

```bash
# Script de mise à jour automatique de l'IP publique
cat > /usr/local/bin/update-ddns.sh << 'EOF'
#!/bin/bash

# Configuration
HOSTINGER_API_KEY="votre_api_key_hostinger"
DOMAIN="harmonixe.fr"
SUBDOMAIN="pelletsfun"
RECORD_TYPE="A"

# Obtenir l'IP publique actuelle
CURRENT_IP=$(curl -s https://api.ipify.org)

# Mettre à jour via l'API Hostinger (adapter selon leur API)
# Voir documentation : https://api.hostinger.com/

echo "IP actuelle : $CURRENT_IP"
# Logique d'appel API ici...

EOF

chmod +x /usr/local/bin/update-ddns.sh

# Ajouter au crontab (vérification toutes les heures)
(crontab -l 2>/dev/null; echo "0 * * * * /usr/local/bin/update-ddns.sh") | crontab -
```

### 9.3 Backup automatique Proxmox

```bash
# Sur le host Proxmox (pas dans le conteneur)
# Via l'interface web Proxmox :
# Datacenter → Backup → Add

# OU en CLI :
vzdump 108 --storage local --mode snapshot --compress zstd --mailnotification always --mailto votre@email.com

# Planification automatique (quotidienne à 2h du matin)
cat > /etc/cron.d/backup-pelletsfun << 'EOF'
0 2 * * * root vzdump 108 --storage local --mode snapshot --compress zstd --quiet 1
EOF
```

---

## 🔍 Dépannage

### Problème : Le site ne charge pas

```bash
# Vérifier Nginx
systemctl status nginx
nginx -t
tail -f /var/log/nginx/pelletsfun-error.log

# Vérifier PM2
pm2 status
pm2 logs pelletsfun-backend

# Vérifier MongoDB
systemctl status mongod
mongo --eval "db.adminCommand('ping')"
```

### Problème : Certificat SSL non généré

- Vérifier que le port 80 est bien accessible depuis Internet
- Vérifier la propagation DNS
- Consulter les logs NPM : Settings → Logs

### Problème : Erreur CORS

Modifier `backend/server.js` :

```javascript
app.use(cors({
  origin: 'https://pelletsfun.harmonixe.fr',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 📊 Commandes Utiles

```bash
# Logs en temps réel
pm2 logs pelletsfun-backend --lines 100

# Redémarrer l'application
pm2 restart pelletsfun-backend

# Rebuild complet
cd ~/pelletsFun
./update-pelletsfun.sh

# Vérifier l'utilisation des ressources
pm2 monit

# Snapshot Proxmox
vzdump 108 --storage local --mode snapshot
```

---

## ✅ Checklist Finale

- [ ] Conteneur Proxmox créé (CT 108, IP 192.168.1.90)
- [ ] Node.js, PM2, Nginx, MongoDB installés
- [ ] Repository cloné et configuré
- [ ] Backend démarré avec PM2
- [ ] Frontend buildé et servi par Nginx
- [ ] DNS configuré sur Hostinger (pelletsfun.harmonixe.fr → 90.63.115.155)
- [ ] Proxy Host créé dans NPM (192.168.1.90:80)
- [ ] Certificat SSL Let's Encrypt généré
- [ ] Site accessible via https://pelletsfun.harmonixe.fr
- [ ] Script de mise à jour automatique créé
- [ ] Backup Proxmox configuré

---

## 🎉 Résultat Attendu

**URL publique** : https://pelletsfun.harmonixe.fr  
**Certificat SSL** : ✅ Valide (Let's Encrypt)  
**Backend API** : https://pelletsfun.harmonixe.fr/pelletsfun/deliveries  
**Haute disponibilité** : PM2 redémarre automatiquement en cas de crash  

---

**🚀 Bon déploiement !**
