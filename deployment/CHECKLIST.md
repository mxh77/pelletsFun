# ✅ Checklist de Déploiement PelletsFun

## 🏗️ Phase 1 : Préparation Proxmox

- [ ] Connexion à Proxmox : https://192.168.1.78:8006
- [ ] Création du conteneur CT 108
  - [ ] Hostname : `pelletsfun`
  - [ ] IP : `192.168.1.90/24`
  - [ ] Gateway : `192.168.1.1`
  - [ ] RAM : 2048 MB
  - [ ] CPU : 2 cores
  - [ ] Démarrage automatique : Oui
- [ ] Conteneur démarré et accessible

## 🔧 Phase 2 : Installation du Conteneur

- [ ] Connexion au conteneur : `pct enter 108` ou `ssh root@192.168.1.90`
- [ ] Mise à jour système : `apt update && apt upgrade -y`
- [ ] Installation Node.js 20.x
  - [ ] Commande exécutée
  - [ ] Vérification : `node -v` → v20.x.x
- [ ] Installation PM2 : `npm install -g pm2`
- [ ] Installation Nginx : `apt install -y nginx`
- [ ] Installation MongoDB
  - [ ] MongoDB installé
  - [ ] Service démarré : `systemctl status mongod`
  - [ ] Test : `mongosh --eval "db.version()"`
- [ ] Création utilisateur `pelletsfun`
  - [ ] Utilisateur créé
  - [ ] Dossiers créés : `/home/pelletsfun/logs`

## 📦 Phase 3 : Déploiement de l'Application

- [ ] Connexion en tant que `pelletsfun` : `su - pelletsfun`
- [ ] Clonage du repo : `git clone https://github.com/mxh77/pelletsFun.git`
- [ ] Configuration Backend
  - [ ] Fichier `backend/.env` créé
  - [ ] MONGODB_URI configuré
  - [ ] CORS_ORIGIN configuré : `https://pelletsfun.harmonixe.fr`
  - [ ] `npm install --production` exécuté
- [ ] Configuration Frontend
  - [ ] Fichier `client/.env` créé
  - [ ] REACT_APP_API_URL configuré
  - [ ] `npm install` exécuté
  - [ ] `npm run build` exécuté
  - [ ] Dossier `client/build/` existe et contient des fichiers
- [ ] Configuration PM2
  - [ ] `ecosystem.config.js` copié
  - [ ] `pm2 start ecosystem.config.js` exécuté
  - [ ] `pm2 save` exécuté
  - [ ] `pm2 status` → backend online
- [ ] Configuration PM2 startup (en root)
  - [ ] `pm2 startup systemd -u pelletsfun --hp /home/pelletsfun` exécuté
  - [ ] Commande retournée exécutée

## 🌐 Phase 4 : Configuration Nginx

- [ ] Retour en root : `exit`
- [ ] Fichier de config copié : `/etc/nginx/sites-available/pelletsfun`
- [ ] Lien symbolique créé : `/etc/nginx/sites-enabled/pelletsfun`
- [ ] Site par défaut supprimé : `rm /etc/nginx/sites-enabled/default`
- [ ] Test de configuration : `nginx -t` → OK
- [ ] Redémarrage Nginx : `systemctl restart nginx`
- [ ] Service activé : `systemctl enable nginx`
- [ ] Test local : `curl http://localhost` → HTML de React
- [ ] Test API : `curl http://localhost:5000/pelletsfun/deliveries` → JSON

## 🌍 Phase 5 : Configuration DNS (Hostinger)

- [ ] Connexion à Hostinger
- [ ] Accès à la gestion DNS de `harmonixe.fr`
- [ ] Ajout enregistrement A
  - [ ] Nom : `pelletsfun`
  - [ ] Type : A
  - [ ] Pointe vers : `90.63.115.155`
  - [ ] TTL : 14400
- [ ] Sauvegarde de la configuration DNS
- [ ] Vérification propagation DNS
  - [ ] `nslookup pelletsfun.harmonixe.fr` → 90.63.115.155
  - [ ] Test en ligne : https://dnschecker.org/

## 🔐 Phase 6 : Configuration Nginx Proxy Manager

- [ ] Connexion à NPM : http://192.168.1.81:81
- [ ] Création Proxy Host
  - [ ] Domain : `pelletsfun.harmonixe.fr`
  - [ ] Scheme : `http`
  - [ ] Forward Hostname : `192.168.1.90`
  - [ ] Forward Port : `80`
  - [ ] Cache Assets : ✅
  - [ ] Block Common Exploits : ✅
  - [ ] Websockets Support : ✅
- [ ] Configuration SSL
  - [ ] Request new SSL Certificate : ✅
  - [ ] Force SSL : ✅
  - [ ] HTTP/2 Support : ✅
  - [ ] HSTS Enabled : ✅
  - [ ] Email renseigné
  - [ ] Terms of Service acceptés
- [ ] Sauvegarde de la configuration
- [ ] Certificat SSL généré avec succès
- [ ] Statut du Proxy Host : Online

## ✅ Phase 7 : Tests et Vérifications

### Tests locaux (dans le conteneur)
- [ ] Frontend local : `curl http://localhost` → OK
- [ ] Backend local : `curl http://localhost:5000/pelletsfun/deliveries` → OK
- [ ] PM2 status : `pm2 status` → online
- [ ] Logs PM2 : `pm2 logs` → pas d'erreurs

### Tests réseau local
- [ ] Frontend via IP : http://192.168.1.90 → OK
- [ ] Depuis navigateur : page React s'affiche

### Tests publics
- [ ] Résolution DNS : `nslookup pelletsfun.harmonixe.fr` → 90.63.115.155
- [ ] HTTP → HTTPS : `curl -I http://pelletsfun.harmonixe.fr` → 301
- [ ] HTTPS : `curl -I https://pelletsfun.harmonixe.fr` → 200
- [ ] Navigateur : https://pelletsfun.harmonixe.fr
  - [ ] Page s'affiche correctement
  - [ ] Certificat SSL valide (cadenas vert)
  - [ ] Pas d'erreurs dans la console
  - [ ] API fonctionnelle (test CRUD)

### Tests de sécurité
- [ ] SSL Labs : https://www.ssllabs.com/ssltest/ → Grade A
- [ ] Pas d'avertissements de sécurité dans le navigateur
- [ ] CORS fonctionnel (pas d'erreurs CORS)

## 🎯 Phase 8 : Points Bonus (Optionnel)

### Scripts d'automatisation
- [ ] Script de mise à jour testé : `./update-pelletsfun.sh`
- [ ] Script health-check testé : `./health-check.sh`
- [ ] Script health-check ajouté au crontab
  - [ ] `crontab -e` → `*/15 * * * * /home/pelletsfun/pelletsFun/deployment/health-check.sh`

### Backup Proxmox
- [ ] Test backup manuel : `vzdump 108 --storage local --mode snapshot`
- [ ] Backup automatique configuré
  - [ ] Via interface Proxmox : Datacenter → Backup → Add
  - [ ] OU via cron : `/etc/cron.d/backup-pelletsfun`
- [ ] Test de restauration effectué

### Monitoring
- [ ] Logs accessibles : `pm2 logs`
- [ ] Métriques PM2 : `pm2 monit`
- [ ] Logs Nginx : `tail -f /var/log/nginx/pelletsfun-*.log`

### CI/CD (Avancé)
- [ ] Webhook GitHub configuré
- [ ] Script de déploiement automatique
- [ ] Tests automatisés

## 📊 Validation Finale

### Fonctionnalités de l'application
- [ ] Page d'accueil s'affiche
- [ ] Liste des livraisons fonctionne
- [ ] Liste des recharges fonctionne
- [ ] Ajout d'une livraison fonctionne
- [ ] Ajout d'une recharge fonctionne
- [ ] Modification fonctionne
- [ ] Suppression fonctionne
- [ ] Données persistantes dans MongoDB

### Performance
- [ ] Temps de chargement < 3 secondes
- [ ] Pas de lenteur perceptible
- [ ] PM2 ne signale pas de crash

### Disponibilité
- [ ] Site accessible 24/7
- [ ] Redémarrage automatique en cas de crash (PM2)
- [ ] Redémarrage automatique au reboot du conteneur

## 📝 Documentation

- [ ] README.md mis à jour
- [ ] Fichiers .env documentés (sans les secrets)
- [ ] Guide de maintenance créé
- [ ] Contacts/accès documentés
- [ ] Procédure de rollback documentée

## 🎉 Déploiement Terminé !

**Date de déploiement** : _______________

**URL publique** : https://pelletsfun.harmonixe.fr

**Version déployée** : _______________

**Déployé par** : _______________

**Notes** :
_______________________________________________
_______________________________________________
_______________________________________________

---

## 🚨 En cas de problème

**Logs à vérifier** :
1. `pm2 logs pelletsfun-backend`
2. `tail -f /var/log/nginx/pelletsfun-error.log`
3. `journalctl -u mongod -f`
4. Logs NPM : Settings → Logs dans l'interface NPM

**Contacts** :
- Support Proxmox : _______________
- Support Hostinger : _______________
- Repository GitHub : https://github.com/mxh77/pelletsFun

**Rollback** :
```bash
# Revenir à la version précédente
cd ~/pelletsFun
git log --oneline  # noter le hash du commit précédent
git checkout <hash>
./deployment/update-pelletsfun.sh
```
