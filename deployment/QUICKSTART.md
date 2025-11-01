# ⚡ Démarrage Rapide - PelletsFun sur Proxmox

> **Guide simplifié pour déployer PelletsFun en moins de 30 minutes**

## 🎯 Prérequis

✅ Proxmox 9.0.3 installé et accessible (192.168.1.78:8006)  
✅ Nginx Proxy Manager installé (CT 106, 192.168.1.81)  
✅ Accès au panneau DNS Hostinger  
✅ Ports 80/443 redirigés vers 192.168.1.81 sur la box  

---

## 🚀 Installation en 6 Étapes

### 1️⃣ Créer le Conteneur Proxmox (5 min)

Via l'interface Proxmox (https://192.168.1.78:8006) :

1. **Create CT** → CT ID : `108`
2. **Hostname** : `pelletsfun`
3. **Template** : Debian 12 standard
4. **Disk** : 8 GB
5. **CPU** : 2 cores
6. **RAM** : 2048 MB
7. **Network** :
   - IP : `192.168.1.90/24`
   - Gateway : `192.168.1.1`
8. **Start after created** : ✅

---

### 2️⃣ Installer les Dépendances (10 min)

```bash
# Se connecter au conteneur
pct enter 108

# Télécharger et exécuter le script d'installation
wget https://raw.githubusercontent.com/mxh77/pelletsFun/master/deployment/install-container.sh
chmod +x install-container.sh
./install-container.sh

# Attendre la fin de l'installation (~5-10 min)
```

---

### 3️⃣ Déployer l'Application (5 min)

```bash
# Passer en utilisateur pelletsfun
su - pelletsfun

# Cloner le repository
git clone https://github.com/mxh77/pelletsFun.git
cd pelletsFun

# Déployer automatiquement
./deployment/deploy.sh

# Vérifier que tout fonctionne
pm2 status  # Doit afficher "online"
```

---

### 4️⃣ Configurer Nginx (2 min)

```bash
# Revenir en root
exit

# Copier la configuration Nginx
cp /home/pelletsfun/pelletsFun/deployment/nginx-pelletsfun.conf /etc/nginx/sites-available/pelletsfun
ln -s /etc/nginx/sites-available/pelletsfun /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Tester et redémarrer
nginx -t
systemctl restart nginx

# Test local
curl http://localhost  # Doit afficher le HTML de React
```

---

### 5️⃣ Configurer le DNS (2 min)

Sur Hostinger (https://www.hostinger.fr) :

1. **Domaines** → **harmonixe.fr** → **DNS**
2. **Ajouter un enregistrement** :
   ```
   Type : A
   Nom : pelletsfun
   Pointe vers : 90.63.115.155
   TTL : 14400
   ```
3. **Sauvegarder**

Attendre 5-15 minutes pour la propagation DNS.

---

### 6️⃣ Configurer Nginx Proxy Manager (3 min)

Sur NPM (http://192.168.1.81:81) :

1. **Hosts** → **Proxy Hosts** → **Add Proxy Host**

2. **Onglet Details** :
   ```
   Domain Names : pelletsfun.harmonixe.fr
   Scheme : http
   Forward Hostname / IP : 192.168.1.90
   Forward Port : 80
   ✅ Cache Assets
   ✅ Block Common Exploits
   ✅ Websockets Support
   ```

3. **Onglet SSL** :
   ```
   SSL Certificate : Request a new SSL Certificate
   ✅ Force SSL
   ✅ HTTP/2 Support
   ✅ HSTS Enabled
   Email : votre-email@example.com
   ✅ I Agree to the Let's Encrypt Terms of Service
   ```

4. **Save**

NPM va automatiquement générer le certificat SSL (30 secondes).

---

## ✅ Vérification Finale

### Test 1 : DNS
```bash
nslookup pelletsfun.harmonixe.fr
# Doit retourner : 90.63.115.155
```

### Test 2 : HTTPS
Ouvrir dans le navigateur : **https://pelletsfun.harmonixe.fr**

✅ Le site doit s'afficher avec un certificat SSL valide (cadenas vert)

### Test 3 : API
Tester une requête API :
```bash
curl https://pelletsfun.harmonixe.fr/pelletsfun/deliveries
# Doit retourner du JSON ([] si vide)
```

---

## 🎉 C'est terminé !

Votre site est maintenant accessible en HTTPS :
👉 **https://pelletsfun.harmonixe.fr**

---

## 📚 Pour aller plus loin

- **[DEPLOIEMENT_GUIDE.md](DEPLOIEMENT_GUIDE.md)** - Guide détaillé complet
- **[SECURITY.md](SECURITY.md)** - Sécuriser votre installation
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Résoudre les problèmes
- **[CHECKLIST.md](CHECKLIST.md)** - Checklist complète

---

## 🔧 Commandes Utiles

```bash
# Mettre à jour l'application
su - pelletsfun
cd ~/pelletsFun
./deployment/update-pelletsfun.sh

# Vérifier la santé du service
./deployment/health-check.sh

# Voir les logs
pm2 logs pelletsfun-backend

# Redémarrer l'application
pm2 restart pelletsfun-backend

# Monitoring
pm2 monit
```

---

## 🚨 En cas de problème

1. **Vérifier les logs** :
   ```bash
   pm2 logs pelletsfun-backend
   tail -f /var/log/nginx/pelletsfun-error.log
   ```

2. **Redémarrer les services** :
   ```bash
   systemctl restart nginx
   systemctl restart mongod
   pm2 restart all
   ```

3. **Consulter le guide de dépannage** : [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

**⏱️ Temps total estimé : 30 minutes**

Bon déploiement ! 🚀
