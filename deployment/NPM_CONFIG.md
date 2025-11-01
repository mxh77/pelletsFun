# Configuration Nginx Proxy Manager pour PelletsFun

## 🔐 Accès à NPM

**URL** : http://192.168.1.81:81  
**Email par défaut** : admin@example.com  
**Mot de passe par défaut** : changeme  

⚠️ **Important** : Changez ces identifiants lors de la première connexion !

---

## 📋 Configuration du Proxy Host

### Étape 1 : Créer un nouveau Proxy Host

1. Connectez-vous à NPM
2. Allez dans **Hosts** → **Proxy Hosts**
3. Cliquez sur **Add Proxy Host**

### Étape 2 : Onglet "Details"

```
Domain Names:
  pelletsfun.harmonixe.fr

Scheme: http
Forward Hostname / IP: 192.168.1.90
Forward Port: 80

☑ Cache Assets
☑ Block Common Exploits
☑ Websockets Support
☐ Access List: - None -
```

**Explications** :
- **Scheme** : `http` car Nginx dans le conteneur écoute en HTTP (le SSL est géré par NPM)
- **Forward Hostname** : L'IP locale du conteneur PelletsFun
- **Forward Port** : 80 (Nginx dans le conteneur)
- **Cache Assets** : Active le cache des fichiers statiques (CSS, JS, images)
- **Block Common Exploits** : Protection contre les attaques courantes
- **Websockets** : Nécessaire si votre app utilise des WebSockets (temps réel)

### Étape 3 : Onglet "SSL"

```
SSL Certificate: Request a new SSL Certificate with Let's Encrypt

☑ Force SSL
☑ HTTP/2 Support
☑ HSTS Enabled
☐ HSTS Subdomains
☑ Use a DNS Challenge (optionnel, pour wildcard)

Email Address for Let's Encrypt:
  votre-email@example.com

☑ I Agree to the Let's Encrypt Terms of Service
```

**Explications** :
- **Force SSL** : Redirige automatiquement HTTP → HTTPS
- **HTTP/2** : Protocole plus rapide que HTTP/1.1
- **HSTS** : Force les navigateurs à toujours utiliser HTTPS
- **Email** : Pour les notifications Let's Encrypt (expiration certificat)

### Étape 4 : Onglet "Custom Locations" (optionnel)

Si vous avez besoin de configurations spécifiques pour certains chemins :

```
Define Custom Location: /api
Scheme: http
Forward Hostname / IP: 192.168.1.90
Forward Port: 5000
☑ Websockets Support
```

**Note** : Pas nécessaire si Nginx dans le conteneur gère déjà le routing.

### Étape 5 : Onglet "Advanced" (optionnel)

Configuration personnalisée si nécessaire :

```nginx
# Augmenter la taille des uploads
client_max_body_size 100M;

# Timeouts pour les requêtes longues
proxy_connect_timeout 600;
proxy_send_timeout 600;
proxy_read_timeout 600;
send_timeout 600;

# Headers de sécurité additionnels
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

---

## ✅ Validation

Une fois sauvegardé, NPM va :

1. **Vérifier le domaine** via Let's Encrypt
2. **Générer le certificat SSL** (quelques secondes)
3. **Activer le proxy**

### Statut attendu

Dans la liste des Proxy Hosts, vous devriez voir :

```
✅ pelletsfun.harmonixe.fr
   Online
   Let's Encrypt (Expires in 89 days)
```

---

## 🔍 Vérification

### Test 1 : HTTP → HTTPS redirection
```bash
curl -I http://pelletsfun.harmonixe.fr
# Devrait retourner : 301 Moved Permanently
# Location: https://pelletsfun.harmonixe.fr
```

### Test 2 : HTTPS avec certificat valide
```bash
curl -I https://pelletsfun.harmonixe.fr
# Devrait retourner : 200 OK
```

### Test 3 : Certificat SSL
```bash
# Linux/Mac/WSL
openssl s_client -connect pelletsfun.harmonixe.fr:443 -servername pelletsfun.harmonixe.fr

# Ou via le navigateur
# https://www.ssllabs.com/ssltest/analyze.html?d=pelletsfun.harmonixe.fr
```

---

## 🐛 Dépannage

### Problème 1 : "DNS verification failed"

**Cause** : Le domaine ne pointe pas encore vers votre IP publique.

**Solution** :
```bash
# Vérifier la résolution DNS
nslookup pelletsfun.harmonixe.fr
# Doit retourner : 90.63.115.155

# Si ce n'est pas le cas, attendre la propagation DNS (5-30 min)
```

### Problème 2 : "502 Bad Gateway"

**Cause** : Le service dans le conteneur ne répond pas.

**Solution** :
```bash
# Se connecter au conteneur
ssh root@192.168.1.90

# Vérifier Nginx
systemctl status nginx
curl http://localhost

# Vérifier le backend
su - pelletsfun
pm2 status
pm2 logs
```

### Problème 3 : "504 Gateway Timeout"

**Cause** : Timeouts trop courts.

**Solution** : Ajouter dans l'onglet "Advanced" de NPM :
```nginx
proxy_connect_timeout 600;
proxy_send_timeout 600;
proxy_read_timeout 600;
```

### Problème 4 : CORS errors

**Cause** : Backend rejette les requêtes du domaine.

**Solution** : Vérifier `backend/server.js` :
```javascript
app.use(cors({
  origin: 'https://pelletsfun.harmonixe.fr',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 🔄 Renouvellement SSL

Let's Encrypt génère des certificats valides **90 jours**.

NPM renouvelle **automatiquement** les certificats :
- 30 jours avant expiration
- Processus transparent
- Aucune intervention nécessaire

### Forcer un renouvellement manuel

1. Aller dans **SSL Certificates**
2. Trouver le certificat de `pelletsfun.harmonixe.fr`
3. Cliquer sur les 3 points → **Renew Certificate**

---

## 📊 Monitoring

### Consulter les logs NPM

```bash
# Se connecter au conteneur NPM
ssh root@192.168.1.81
# OU via Proxmox
pct enter 106

# Logs Nginx
tail -f /data/logs/proxy-host-*.log

# Logs d'erreurs
tail -f /data/logs/error.log

# Logs Let's Encrypt
tail -f /data/logs/letsencrypt.log
```

### Access Lists (optionnel)

Pour restreindre l'accès par IP ou mot de passe :

1. **Access Lists** → **Add Access List**
2. Nom : `Internal Only`
3. **Authorization** :
   - Satisfy Any : ☐
   - Username/Password : admin / votre_mot_de_passe
4. **Access** :
   - Allow : `192.168.1.0/24` (réseau local)
   - Deny : `all`

Puis associer cette liste à votre Proxy Host.

---

## 🎯 Configuration finale attendue

```yaml
Proxy Hosts:
  - Domain: pelletsfun.harmonixe.fr
    Status: Online
    SSL: Let's Encrypt (Auto-renew)
    Forward: http://192.168.1.90:80
    Features:
      - Force SSL: ✅
      - HTTP/2: ✅
      - HSTS: ✅
      - Cache: ✅
      - Block Exploits: ✅
```

---

**🎉 Une fois configuré, votre site sera accessible en HTTPS avec un certificat SSL valide !**
