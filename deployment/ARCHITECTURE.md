# 🏗️ Architecture PelletsFun

## 📊 Vue d'ensemble

```
Internet (90.63.115.155)
        │
        │ ports 80/443
        ▼
┌───────────────────────┐
│   Box Internet        │
│   NAT/Port Forwarding │
│   80 → 192.168.1.81   │
│   443 → 192.168.1.81  │
└───────────────────────┘
        │
        │ réseau local 192.168.1.0/24
        ▼
┌───────────────────────────────────────────────────────┐
│  Serveur Proxmox 9.0.3 (192.168.1.78)                │
│                                                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │  CT 106 : Nginx Proxy Manager (192.168.1.81)   │ │
│  │  - Reverse Proxy                                │ │
│  │  - SSL/TLS Termination (Let's Encrypt)         │ │
│  │  - Routing :                                    │ │
│  │    • proxmox.harmonixe.fr → 192.168.1.78:8006  │ │
│  │    • ha.harmonixe.fr → 192.168.1.107           │ │
│  │    • pelletsfun.harmonixe.fr → 192.168.1.90:80 │ │
│  └─────────────────────────────────────────────────┘ │
│                                                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │  CT 107 : Home Assistant (192.168.1.107)       │ │
│  │  - HassOS                                       │ │
│  └─────────────────────────────────────────────────┘ │
│                                                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │  CT 108 : PelletsFun (192.168.1.90)            │ │
│  │                                                  │ │
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │  Nginx (Port 80)                           │ │ │
│  │  │  - Serve frontend React (static)           │ │ │
│  │  │  - Reverse proxy vers backend              │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  │           │                                      │ │
│  │           │ proxy_pass                          │ │
│  │           ▼                                      │ │
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │  Node.js Backend (Port 5000)               │ │ │
│  │  │  - Express.js API                          │ │ │
│  │  │  - PM2 (process manager)                   │ │ │
│  │  │  - Routes :                                │ │ │
│  │  │    • /pelletsfun/deliveries               │ │ │
│  │  │    • /pelletsfun/recharges                │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  │           │                                      │ │
│  │           │ mongoose                            │ │
│  │           ▼                                      │ │
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │  MongoDB (Port 27017)                      │ │ │
│  │  │  - Database : pelletsfun                   │ │ │
│  │  │  - Collections :                           │ │ │
│  │  │    • deliveries                            │ │ │
│  │  │    • recharges                             │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

---

## 🔄 Flux de Requêtes

### 1. Requête Frontend (Page HTML)

```
User → https://pelletsfun.harmonixe.fr
  ↓
Internet (90.63.115.155:443)
  ↓
Box (NAT) → 192.168.1.81:443
  ↓
NPM (CT 106)
  - Vérifie le certificat SSL
  - Déchiffre HTTPS
  - Proxy vers http://192.168.1.90:80
  ↓
Nginx (CT 108)
  - Serve /home/pelletsfun/pelletsFun/client/build/index.html
  ↓
User reçoit la page React
```

### 2. Requête API (Data)

```
User → https://pelletsfun.harmonixe.fr/pelletsfun/deliveries
  ↓
Internet → Box → NPM
  ↓
NPM → http://192.168.1.90:80/pelletsfun/deliveries
  ↓
Nginx (CT 108)
  - proxy_pass http://localhost:5000/pelletsfun/deliveries
  ↓
Node.js Backend (Port 5000)
  - Express route handler
  - Mongoose query
  ↓
MongoDB (Port 27017)
  - Requête à la collection 'deliveries'
  ↓
Response JSON
  ↓
NPM (chiffrement HTTPS)
  ↓
User reçoit les données
```

---

## 🔒 Couches de Sécurité

### Niveau 1 : Internet → Box
- **Firewall de la box** : Seuls les ports 80 et 443 sont ouverts
- **NAT** : Redirection uniquement vers 192.168.1.81

### Niveau 2 : NPM
- **SSL/TLS Termination** : Certificat Let's Encrypt
- **Force SSL** : Redirection HTTP → HTTPS
- **HSTS** : Header Strict-Transport-Security
- **Block Common Exploits** : Protection contre attaques courantes
- **Reverse Proxy** : Les conteneurs backend ne sont pas directement exposés

### Niveau 3 : Nginx (CT 108)
- **Headers de sécurité** :
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
- **Proxy vers localhost** : Backend non accessible depuis l'extérieur
- **CORS** : Origine autorisée uniquement depuis pelletsfun.harmonixe.fr

### Niveau 4 : Backend Node.js
- **CORS configuré** : Uniquement depuis le domaine officiel
- **Validation des entrées** : Controllers Express
- **MongoDB connection** : Localhost uniquement

### Niveau 5 : MongoDB
- **Bind IP** : 127.0.0.1 (localhost uniquement)
- **Pas d'accès externe** : Non exposé sur le réseau local
- **Authentication** : (à activer en production)

---

## 📦 Stack Technique

### Frontend
- **Framework** : React 18.3.1
- **Routing** : React Router DOM 7.0.1
- **UI** : React Bootstrap 2.10.5 + Bootstrap 5.3.3
- **Icons** : FontAwesome 6.7.1
- **HTTP Client** : Axios 1.7.7
- **Build** : Create React App (react-scripts 5.0.1)

### Backend
- **Runtime** : Node.js 20.x (LTS)
- **Framework** : Express.js 4.21.1
- **ODM** : Mongoose 8.8.2
- **CORS** : cors 2.8.5
- **Body Parser** : body-parser 1.20.3
- **Process Manager** : PM2 (latest)

### Database
- **MongoDB** : 7.0.x
- **Storage Engine** : WiredTiger

### Infrastructure
- **Hypervisor** : Proxmox VE 9.0.3
- **OS Conteneur** : Debian 12 (Bookworm)
- **Reverse Proxy** : Nginx 1.22.x
- **SSL Provider** : Let's Encrypt
- **Proxy Manager** : Nginx Proxy Manager

---

## 📁 Structure des Fichiers

### Sur le conteneur CT 108

```
/home/pelletsfun/
├── pelletsFun/
│   ├── backend/
│   │   ├── server.js              # Point d'entrée backend
│   │   ├── package.json
│   │   ├── .env                   # Variables d'environnement
│   │   ├── config/
│   │   │   └── db.js              # Configuration MongoDB
│   │   ├── controllers/
│   │   │   ├── deliveryController.js
│   │   │   └── rechargeController.js
│   │   ├── models/
│   │   │   ├── Delivery.js
│   │   │   └── Recharge.js
│   │   └── routes/
│   │       ├── deliveries.js
│   │       └── recharges.js
│   │
│   ├── client/
│   │   ├── package.json
│   │   ├── .env                   # Variables d'environnement frontend
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── App.js
│   │   │   ├── components/
│   │   │   │   ├── DeliveryForm.js
│   │   │   │   ├── DeliveryList.js
│   │   │   │   ├── RechargeForm.js
│   │   │   │   └── RechargeList.js
│   │   └── build/                 # ← Servi par Nginx
│   │       ├── index.html
│   │       └── static/
│   │
│   ├── deployment/
│   │   ├── ecosystem.config.js    # Config PM2
│   │   ├── nginx-pelletsfun.conf  # Config Nginx
│   │   ├── deploy.sh
│   │   ├── update-pelletsfun.sh
│   │   └── ...
│   │
│   └── ecosystem.config.js        # Config PM2 (racine)
│
└── logs/
    ├── backend-error.log
    ├── backend-out.log
    └── backend-combined.log

/etc/nginx/
├── sites-available/
│   └── pelletsfun                 # Config Nginx
└── sites-enabled/
    └── pelletsfun → ../sites-available/pelletsfun

/var/www/
└── (non utilisé, build servi depuis /home/pelletsfun/...)
```

---

## 🌐 DNS & Domaines

### Configuration Hostinger

| Sous-domaine | Type | Pointe vers | Destination finale |
|--------------|------|-------------|--------------------|
| proxmox.harmonixe.fr | A | 90.63.115.155 | 192.168.1.78:8006 (Proxmox) |
| ha.harmonixe.fr | A | 90.63.115.155 | 192.168.1.107 (Home Assistant) |
| pelletsfun.harmonixe.fr | A | 90.63.115.155 | 192.168.1.90 (PelletsFun) |

### Résolution complète

```
pelletsfun.harmonixe.fr
  → DNS public : 90.63.115.155
  → Box NAT : 192.168.1.81:443
  → NPM : proxy vers 192.168.1.90:80
  → Nginx : serve frontend OU proxy vers :5000
  → Backend : API Node.js
  → MongoDB : base de données
```

---

## ⚡ Performance

### Optimisations

1. **Nginx Caching** : Assets statiques cachés (CSS, JS, images)
2. **HTTP/2** : Activé via NPM
3. **Gzip/Brotli** : Compression automatique
4. **PM2 Cluster Mode** : Possibilité de scaler sur plusieurs cores
5. **MongoDB Indexation** : Index sur les champs fréquemment requêtés

### Limites Actuelles

- **RAM conteneur** : 2048 MB
- **CPU** : 2 cores
- **Connexions MongoDB** : ~100 simultanées
- **PM2 instances** : 1 (cluster mode désactivé)

### Capacité Estimée

- **Utilisateurs simultanés** : ~50-100
- **Requêtes/sec** : ~100-200
- **Stockage MongoDB** : Limité par l'espace disque du conteneur

---

## 🔄 Flux de Déploiement

```
Développement Local (Windows)
  ↓ git commit & push
GitHub Repository (mxh77/pelletsFun)
  ↓ manuel : ssh + git pull
Conteneur CT 108
  ↓ ./update-pelletsfun.sh
  1. git pull origin master
  2. npm install (backend + frontend)
  3. npm run build (frontend)
  4. pm2 restart
  ↓
Production Live (https://pelletsfun.harmonixe.fr)
```

---

## 📊 Monitoring

### Points de surveillance

1. **Uptime** : PM2 status
2. **CPU/RAM** : htop, pm2 monit
3. **Logs** : pm2 logs, nginx logs
4. **SSL** : Expiration certificat (auto-renew par NPM)
5. **Backup** : Snapshots Proxmox

### Outils

- **PM2** : `pm2 monit`
- **Script personnalisé** : `./monitor.sh`
- **Health check** : `./health-check.sh`
- **Proxmox** : Interface web pour métriques conteneur

---

Cette architecture assure :
- ✅ **Sécurité** (HTTPS, reverse proxy, isolation)
- ✅ **Performance** (caching, HTTP/2)
- ✅ **Maintenabilité** (PM2, scripts)
- ✅ **Scalabilité** (possibilité d'ajouter des instances)
- ✅ **Monitoring** (logs, métriques)
