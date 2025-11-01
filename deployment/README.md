# 📁 Dossier Deployment - PelletsFun

Ce dossier contient tous les fichiers nécessaires pour déployer PelletsFun sur votre infrastructure Proxmox avec Nginx Proxy Manager.

## 🎯 Par où commencer ?

### ⚡ Démarrage Rapide (30 min)
👉 **[QUICKSTART.md](QUICKSTART.md)** - Guide simplifié pour déployer rapidement

### 📖 Guide Complet
👉 **[DEPLOIEMENT_GUIDE.md](DEPLOIEMENT_GUIDE.md)** - Guide détaillé étape par étape avec explications

---

## 📚 Documentation Complète

### Guides Principaux
- **[QUICKSTART.md](QUICKSTART.md)** - ⚡ Démarrage rapide en 6 étapes (30 min)
- **[DEPLOIEMENT_GUIDE.md](DEPLOIEMENT_GUIDE.md)** - 🚀 Guide complet de déploiement étape par étape
- **[CHECKLIST.md](CHECKLIST.md)** - ✅ Checklist complète de déploiement à cocher
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - 🏗️ Architecture technique détaillée et flux de données
- **[SECURITY.md](SECURITY.md)** - 🔐 Guide de sécurisation de l'infrastructure

### Guides Spécialisés
- **[DNS_CONFIG.md](DNS_CONFIG.md)** - 🌍 Configuration DNS sur Hostinger
- **[NPM_CONFIG.md](NPM_CONFIG.md)** - 🔐 Configuration Nginx Proxy Manager et SSL
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - 🔧 Guide de dépannage et résolution de problèmes

## 🛠️ Scripts de Déploiement

### Installation
- **[install-container.sh](install-container.sh)** - Script d'installation des dépendances dans le conteneur (à exécuter en root)
- **[deploy.sh](deploy.sh)** - Script de déploiement de l'application (à exécuter en tant qu'utilisateur pelletsfun)

### Maintenance
- **[update-pelletsfun.sh](update-pelletsfun.sh)** - Script de mise à jour automatique (git pull + rebuild + restart)
- **[rollback.sh](rollback.sh)** - Script de rollback vers une version précédente
- **[health-check.sh](health-check.sh)** - Script de vérification de la santé du service
- **[monitor.sh](monitor.sh)** - Script de monitoring des ressources système
- **[backup-proxmox.sh](backup-proxmox.sh)** - Script de backup du conteneur (à exécuter sur le host Proxmox)

## ⚙️ Configuration

### Fichiers de Configuration
- **[ecosystem.config.js](ecosystem.config.js)** - Configuration PM2 pour le backend
- **[nginx-pelletsfun.conf](nginx-pelletsfun.conf)** - Configuration Nginx pour le reverse proxy local
- **[.env.backend.example](.env.backend.example)** - Exemple de fichier .env pour le backend
- **[.env.frontend.example](.env.frontend.example)** - Exemple de fichier .env pour le frontend

## 🚀 Utilisation Rapide

### 1. Sur le host Proxmox
```bash
# Créer le conteneur CT 108 via l'interface web ou CLI
# IP : 192.168.1.90

# Se connecter au conteneur
pct enter 108
```

### 2. Dans le conteneur (en root)
```bash
# Télécharger et exécuter le script d'installation
wget https://raw.githubusercontent.com/mxh77/pelletsFun/master/deployment/install-container.sh
chmod +x install-container.sh
./install-container.sh
```

### 3. En tant qu'utilisateur pelletsfun
```bash
su - pelletsfun
git clone https://github.com/mxh77/pelletsFun.git
cd pelletsFun
./deployment/deploy.sh
```

### 4. Configuration Nginx (en root)
```bash
exit  # revenir en root
cp /home/pelletsfun/pelletsFun/deployment/nginx-pelletsfun.conf /etc/nginx/sites-available/pelletsfun
ln -s /etc/nginx/sites-available/pelletsfun /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 5. Configuration DNS (Hostinger)
```
Nom : pelletsfun
Type : A
Pointe vers : 90.63.115.155
```

### 6. Configuration Nginx Proxy Manager
```
Domain : pelletsfun.harmonixe.fr
Forward to : 192.168.1.90:80
SSL : Let's Encrypt
```

## 📊 Commandes Utiles

```bash
# Vérifier la santé du service
./deployment/health-check.sh

# Mettre à jour l'application
./deployment/update-pelletsfun.sh

# Voir les logs PM2
pm2 logs pelletsfun-backend

# Redémarrer l'application
pm2 restart pelletsfun-backend

# Backup du conteneur (sur le host Proxmox)
./backup-proxmox.sh
```

## 🔗 URLs

- **URL publique** : https://pelletsfun.harmonixe.fr
- **Proxmox** : https://192.168.1.78:8006
- **NPM** : http://192.168.1.81:81
- **Conteneur** : http://192.168.1.90

## 📖 Documentation Complète

Voir **DEPLOIEMENT_GUIDE.md** pour le guide complet avec toutes les explications détaillées.
