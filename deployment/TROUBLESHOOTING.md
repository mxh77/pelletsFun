# 🔧 Guide de Dépannage PelletsFun

## 🚨 Problèmes Courants et Solutions

### 1. Le site ne charge pas (Erreur 502 Bad Gateway)

**Symptôme** : https://pelletsfun.harmonixe.fr affiche "502 Bad Gateway"

**Diagnostic** :
```bash
# Se connecter au conteneur
ssh root@192.168.1.90

# Vérifier Nginx
systemctl status nginx
nginx -t

# Vérifier PM2
su - pelletsfun
pm2 status
pm2 logs pelletsfun-backend
```

**Solutions** :

#### Solution 1a : Nginx n'est pas démarré
```bash
systemctl start nginx
systemctl enable nginx
```

#### Solution 1b : Backend PM2 crashé
```bash
su - pelletsfun
pm2 restart pelletsfun-backend
# OU
pm2 delete pelletsfun-backend
pm2 start ecosystem.config.js
pm2 save
```

#### Solution 1c : MongoDB n'est pas démarré
```bash
systemctl start mongod
systemctl status mongod
```

#### Solution 1d : Configuration Nginx incorrecte
```bash
nginx -t  # Vérifier la syntaxe
# Si erreur, corriger le fichier /etc/nginx/sites-available/pelletsfun
systemctl restart nginx
```

---

### 2. Erreur 504 Gateway Timeout

**Symptôme** : Le site met très longtemps à charger puis timeout

**Diagnostic** :
```bash
# Vérifier les ressources
htop
# OU
top

# Vérifier les logs
pm2 logs pelletsfun-backend --lines 100
tail -f /var/log/nginx/pelletsfun-error.log
```

**Solutions** :

#### Solution 2a : Augmenter les timeouts dans NPM
Dans NPM → Proxy Host → Advanced :
```nginx
proxy_connect_timeout 600;
proxy_send_timeout 600;
proxy_read_timeout 600;
send_timeout 600;
```

#### Solution 2b : Problème MongoDB
```bash
# Vérifier les connexions MongoDB
mongosh --eval "db.serverStatus().connections"

# Redémarrer MongoDB
systemctl restart mongod
```

#### Solution 2c : Manque de RAM
```bash
# Vérifier la RAM
free -h

# Augmenter la RAM du conteneur dans Proxmox
# Proxmox UI → CT 108 → Resources → Memory → Edit
```

---

### 3. Erreur CORS dans le navigateur

**Symptôme** : Console du navigateur affiche des erreurs CORS

```
Access to fetch at 'https://pelletsfun.harmonixe.fr/pelletsfun/deliveries' 
from origin 'https://pelletsfun.harmonixe.fr' has been blocked by CORS policy
```

**Solution** :

Modifier `backend/server.js` :
```javascript
app.use(cors({
  origin: 'https://pelletsfun.harmonixe.fr',  // ← Vérifier cette ligne
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

Puis redémarrer :
```bash
cd ~/pelletsFun
pm2 restart pelletsfun-backend
```

---

### 4. Certificat SSL invalide ou expiré

**Symptôme** : Navigateur affiche "Votre connexion n'est pas privée"

**Diagnostic** :
```bash
# Vérifier le certificat
openssl s_client -connect pelletsfun.harmonixe.fr:443 -servername pelletsfun.harmonixe.fr | grep -A 10 "Certificate chain"
```

**Solutions** :

#### Solution 4a : Renouveler le certificat dans NPM
1. NPM → SSL Certificates
2. Trouver `pelletsfun.harmonixe.fr`
3. 3 points → Renew Certificate

#### Solution 4b : Supprimer et recréer le certificat
1. NPM → Proxy Hosts → pelletsfun.harmonixe.fr → Edit
2. SSL → Edit → Change SSL Certificate → Request new
3. Save

#### Solution 4c : Vérifier que les ports 80/443 sont accessibles
```bash
# Depuis un serveur externe ou https://www.yougetsignal.com/tools/open-ports/
nc -zv 90.63.115.155 80
nc -zv 90.63.115.155 443
```

---

### 5. DNS ne résout pas

**Symptôme** : `nslookup pelletsfun.harmonixe.fr` ne retourne rien ou mauvaise IP

**Diagnostic** :
```bash
nslookup pelletsfun.harmonixe.fr
dig pelletsfun.harmonixe.fr
```

**Solutions** :

#### Solution 5a : Attendre la propagation DNS
Peut prendre de 5 minutes à 48 heures.

Vérifier la propagation mondiale :
- https://dnschecker.org/
- https://www.whatsmydns.net/

#### Solution 5b : Vérifier la configuration Hostinger
1. Se connecter à Hostinger
2. Domaines → harmonixe.fr → DNS
3. Vérifier que l'enregistrement A existe :
   ```
   pelletsfun → 90.63.115.155
   ```

#### Solution 5c : Vider le cache DNS local
```bash
# Windows
ipconfig /flushdns

# Linux
sudo systemd-resolve --flush-caches

# Mac
sudo dscacheutil -flushcache
```

---

### 6. Le site affiche l'ancienne version après mise à jour

**Symptôme** : Après `git pull` et rebuild, l'ancienne version s'affiche toujours

**Solutions** :

#### Solution 6a : Vider le cache du navigateur
- Chrome : Ctrl+Shift+Del → Vider le cache
- Firefox : Ctrl+Shift+Del → Vider le cache
- OU mode navigation privée

#### Solution 6b : Build incomplet
```bash
cd ~/pelletsFun/client
rm -rf build node_modules
npm install
npm run build

# Vérifier que les fichiers sont récents
ls -lh build/static/js/
```

#### Solution 6c : Cache NPM
Dans NPM → Proxy Host → pelletsfun.harmonixe.fr :
- Désactiver temporairement "Cache Assets"
- Sauvegarder
- Tester
- Réactiver si nécessaire

---

### 7. MongoDB connection refused

**Symptôme** : Logs PM2 affichent `MongoNetworkError: connect ECONNREFUSED`

**Diagnostic** :
```bash
systemctl status mongod
mongosh --eval "db.version()"
```

**Solutions** :

#### Solution 7a : Démarrer MongoDB
```bash
systemctl start mongod
systemctl enable mongod
```

#### Solution 7b : Vérifier l'URI de connexion
Dans `backend/.env` :
```bash
MONGODB_URI=mongodb://localhost:27017/pelletsfun
# OU si MongoDB Atlas :
# MONGODB_URI=mongodb+srv://...
```

#### Solution 7c : Vérifier les permissions
```bash
# MongoDB doit pouvoir écrire dans /var/lib/mongodb
ls -la /var/lib/mongodb
chown -R mongodb:mongodb /var/lib/mongodb

# Vérifier les logs MongoDB
tail -f /var/log/mongodb/mongod.log
```

---

### 8. PM2 ne démarre pas au boot

**Symptôme** : Après redémarrage du conteneur, PM2 n'est pas lancé

**Solution** :
```bash
# En root
pm2 startup systemd -u pelletsfun --hp /home/pelletsfun
# Exécuter la commande retournée

# En tant qu'utilisateur pelletsfun
su - pelletsfun
pm2 save

# Test : redémarrer le conteneur
# Depuis Proxmox ou :
reboot

# Après redémarrage, vérifier
pm2 status
```

---

### 9. Espace disque insuffisant

**Symptôme** : Erreurs "No space left on device"

**Diagnostic** :
```bash
df -h
du -sh /home/pelletsfun/* | sort -h
```

**Solutions** :

#### Solution 9a : Nettoyer les logs
```bash
# Logs PM2
pm2 flush

# Logs Nginx
rm /var/log/nginx/*.log.*.gz
truncate -s 0 /var/log/nginx/*.log

# Journald
journalctl --vacuum-time=7d
```

#### Solution 9b : Nettoyer npm cache
```bash
npm cache clean --force
```

#### Solution 9c : Augmenter le disque du conteneur
1. Proxmox UI → CT 108 → Resources → Hard Disk → Resize
2. Ajouter de l'espace (ex: +10GB)

---

### 10. Haute utilisation CPU/RAM

**Symptôme** : Le serveur ralentit, PM2 affiche haute utilisation

**Diagnostic** :
```bash
pm2 monit
htop
```

**Solutions** :

#### Solution 10a : Limiter la mémoire PM2
Modifier `ecosystem.config.js` :
```javascript
max_memory_restart: '300M',  // Redémarre si > 300MB
instances: 1,  // Passer à 2 si assez de RAM
```

#### Solution 10b : Optimiser MongoDB
```bash
# Limiter la RAM MongoDB
# Éditer /etc/mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.5  # Limiter à 500MB
```

#### Solution 10c : Augmenter les ressources du conteneur
Dans Proxmox :
- RAM : 2048MB → 4096MB
- CPU : 2 cores → 4 cores

---

## 🔍 Commandes de Diagnostic Utiles

### Vérifier tous les services
```bash
# Script health-check
/home/pelletsfun/pelletsFun/deployment/health-check.sh
```

### Logs en temps réel
```bash
# PM2
pm2 logs pelletsfun-backend --lines 100

# Nginx
tail -f /var/log/nginx/pelletsfun-access.log
tail -f /var/log/nginx/pelletsfun-error.log

# MongoDB
tail -f /var/log/mongodb/mongod.log

# Système
journalctl -f
```

### Vérifier les connexions réseau
```bash
# Ports en écoute
netstat -tlnp | grep -E '(80|443|5000|27017)'
# OU
ss -tlnp | grep -E '(80|443|5000|27017)'

# Connexions actives
netstat -an | grep ESTABLISHED
```

### Vérifier les processus
```bash
# PM2
pm2 list
pm2 info pelletsfun-backend

# Nginx
ps aux | grep nginx

# MongoDB
ps aux | grep mongod
```

---

## 🚑 Procédure d'urgence

### En cas de panne totale

1. **Redémarrer tous les services** :
```bash
systemctl restart mongod
systemctl restart nginx
su - pelletsfun -c "pm2 restart all"
```

2. **Si ça ne fonctionne toujours pas, redémarrer le conteneur** :
```bash
# Depuis Proxmox host
pct stop 108
pct start 108
```

3. **En dernier recours, restaurer depuis un backup** :
```bash
# Depuis Proxmox host
pct restore 108 /var/lib/vz/dump/vzdump-lxc-108-*.tar.zst
```

---

## 📞 Support et Contacts

- **Repository GitHub** : https://github.com/mxh77/pelletsFun
- **Issues GitHub** : https://github.com/mxh77/pelletsFun/issues
- **Documentation NPM** : https://nginxproxymanager.com/
- **Documentation Proxmox** : https://pve.proxmox.com/wiki/Main_Page

---

## 📊 Monitoring Préventif

Pour éviter les problèmes, mettre en place :

1. **Health checks automatiques** :
```bash
crontab -e
# Ajouter :
*/15 * * * * /home/pelletsfun/pelletsFun/deployment/health-check.sh
```

2. **Alertes email sur crash PM2** :
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

3. **Backups automatiques Proxmox** :
Via l'interface Proxmox → Datacenter → Backup → Schedule

---

**🔧 En cas de problème persistant, n'hésitez pas à consulter les logs et à créer une issue sur GitHub !**
