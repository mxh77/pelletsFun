# 🔐 Guide de Sécurité PelletsFun

## 🎯 Objectifs de Sécurité

- ✅ Communication chiffrée (HTTPS)
- ✅ Isolation des services (conteneurs)
- ✅ Protection contre les attaques courantes
- ✅ Sauvegarde et récupération
- ✅ Mise à jour régulière des dépendances

---

## 🔒 Checklist de Sécurité

### Niveau Critique (À FAIRE IMMÉDIATEMENT)

- [ ] Changer le mot de passe par défaut de Nginx Proxy Manager
- [ ] Activer l'authentification MongoDB
- [ ] Configurer un pare-feu (UFW) dans le conteneur
- [ ] Désactiver l'accès SSH par mot de passe (utiliser clés SSH)
- [ ] Mettre en place des sauvegardes automatiques

### Niveau Important (À FAIRE RAPIDEMENT)

- [ ] Configurer Fail2Ban contre les attaques brute-force
- [ ] Limiter les tentatives de connexion
- [ ] Activer les logs d'audit
- [ ] Configurer des alertes email
- [ ] Mettre en place un monitoring

### Niveau Recommandé (Bonnes Pratiques)

- [ ] Scanner les vulnérabilités des dépendances npm
- [ ] Mettre en place un WAF (Web Application Firewall)
- [ ] Configurer CSP (Content Security Policy)
- [ ] Implémenter rate limiting
- [ ] Documenter les procédures de sécurité

---

## 🛡️ Configuration Sécurité

### 1. Sécuriser Nginx Proxy Manager

#### Changer le mot de passe par défaut

```bash
# Première connexion à NPM : http://192.168.1.81:81
Email: admin@example.com
Password: changeme

# CHANGER IMMÉDIATEMENT :
1. Settings → Users → Edit
2. Email: votre-email@example.com
3. Nouveau mot de passe (fort)
```

#### Activer l'authentification 2FA (si disponible)

#### Créer un utilisateur dédié (pas admin)

---

### 2. Sécuriser MongoDB

#### Activer l'authentification

```bash
# Se connecter au conteneur
ssh root@192.168.1.90

# Se connecter à MongoDB
mongosh

# Créer un utilisateur admin
use admin
db.createUser({
  user: "adminUser",
  pwd: "votre_mot_de_passe_fort",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Créer un utilisateur pour l'application
use pelletsfun
db.createUser({
  user: "pelletsfunUser",
  pwd: "votre_mot_de_passe_fort",
  roles: [ { role: "readWrite", db: "pelletsfun" } ]
})

# Quitter
exit
```

#### Activer l'auth dans la configuration

```bash
# Éditer /etc/mongod.conf
nano /etc/mongod.conf

# Ajouter :
security:
  authorization: enabled

# Redémarrer MongoDB
systemctl restart mongod
```

#### Mettre à jour backend/.env

```bash
# Nouvelle URI avec authentification
MONGODB_URI=mongodb://pelletsfunUser:votre_mot_de_passe_fort@localhost:27017/pelletsfun?authSource=pelletsfun
```

---

### 3. Configurer le Pare-feu (UFW)

```bash
# Installer UFW
apt install -y ufw

# Configuration par défaut
ufw default deny incoming
ufw default allow outgoing

# Autoriser SSH (si nécessaire)
ufw allow 22/tcp

# Autoriser HTTP (Nginx)
ufw allow 80/tcp

# Activer UFW
ufw enable

# Vérifier le statut
ufw status verbose
```

**⚠️ Important** : Ne PAS autoriser les ports 5000 et 27017 depuis l'extérieur !

---

### 4. Sécuriser SSH

#### Désactiver l'authentification par mot de passe

```bash
# Générer une clé SSH depuis votre machine Windows
ssh-keygen -t ed25519 -C "votre-email@example.com"

# Copier la clé publique sur le serveur
ssh-copy-id root@192.168.1.90

# Éditer la configuration SSH
nano /etc/ssh/sshd_config

# Modifier :
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes

# Redémarrer SSH
systemctl restart sshd
```

#### Changer le port SSH (optionnel mais recommandé)

```bash
# Dans /etc/ssh/sshd_config
Port 2222  # Au lieu de 22

# Redémarrer SSH
systemctl restart sshd

# Mettre à jour UFW
ufw delete allow 22/tcp
ufw allow 2222/tcp
```

---

### 5. Configurer Fail2Ban

```bash
# Installer Fail2Ban
apt install -y fail2ban

# Créer une configuration locale
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/pelletsfun-error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/pelletsfun-error.log
EOF

# Démarrer Fail2Ban
systemctl enable fail2ban
systemctl start fail2ban

# Vérifier le statut
fail2ban-client status
```

---

### 6. Headers de Sécurité HTTP

#### Dans Nginx (CT 108)

Ajouter dans `/etc/nginx/sites-available/pelletsfun` :

```nginx
# Headers de sécurité
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Content Security Policy (adapter selon vos besoins)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

#### Dans Nginx Proxy Manager

Onglet "Advanced" du Proxy Host :

```nginx
# Headers de sécurité
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

### 7. Rate Limiting

#### Dans Nginx

Ajouter dans `/etc/nginx/nginx.conf` (section http) :

```nginx
http {
    # Limite de requêtes
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    # Limite de connexions
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    
    # ... reste de la config
}
```

Dans `/etc/nginx/sites-available/pelletsfun` :

```nginx
location /pelletsfun/deliveries {
    limit_req zone=api burst=20 nodelay;
    limit_conn addr 10;
    
    # ... reste de la config
}
```

---

### 8. Sécuriser les Variables d'Environnement

```bash
# Protéger les fichiers .env
chmod 600 /home/pelletsfun/pelletsFun/backend/.env
chmod 600 /home/pelletsfun/pelletsFun/client/.env

# S'assurer que seul pelletsfun peut les lire
chown pelletsfun:pelletsfun /home/pelletsfun/pelletsFun/backend/.env
chown pelletsfun:pelletsfun /home/pelletsfun/pelletsFun/client/.env
```

**⚠️ Ne JAMAIS commiter les fichiers .env dans Git !**

```bash
# Vérifier que .env est dans .gitignore
cat .gitignore | grep .env
```

---

### 9. Scanner les Vulnérabilités

#### Scanner les dépendances npm

```bash
# Backend
cd ~/pelletsFun/backend
npm audit
npm audit fix  # Corriger automatiquement

# Frontend
cd ~/pelletsFun/client
npm audit
npm audit fix
```

#### Automatiser avec un script

```bash
cat > /home/pelletsfun/security-audit.sh << 'EOF'
#!/bin/bash
echo "🔍 Audit de sécurité des dépendances"
echo "===================================="

cd /home/pelletsfun/pelletsFun

echo "Backend:"
cd backend
npm audit --audit-level=moderate

echo ""
echo "Frontend:"
cd ../client
npm audit --audit-level=moderate

echo ""
echo "✅ Audit terminé"
EOF

chmod +x /home/pelletsfun/security-audit.sh

# Ajouter au crontab (hebdomadaire)
(crontab -l 2>/dev/null; echo "0 3 * * 0 /home/pelletsfun/security-audit.sh | mail -s 'Security Audit' votre-email@example.com") | crontab -
```

---

### 10. Logs et Audit

#### Activer les logs détaillés

Dans `backend/server.js`, ajouter un middleware de logging :

```javascript
const morgan = require('morgan');

// Logger les requêtes
app.use(morgan('combined'));

// Logger les tentatives d'accès non autorisées
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});
```

#### Rotation des logs

```bash
# Installer logrotate (déjà installé sur Debian)
cat > /etc/logrotate.d/pelletsfun << 'EOF'
/home/pelletsfun/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 pelletsfun pelletsfun
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/pelletsfun-*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
EOF
```

---

## 🚨 Plan de Réponse aux Incidents

### 1. Détection

**Signes d'une potentielle attaque** :
- Augmentation soudaine du trafic
- Nombreuses erreurs 401/403 dans les logs
- CPU/RAM élevée sans raison
- Modifications non autorisées de fichiers

**Outils de détection** :
```bash
# Surveiller les logs en temps réel
tail -f /var/log/nginx/pelletsfun-error.log
pm2 logs pelletsfun-backend

# Vérifier les IPs bannies
fail2ban-client status sshd

# Surveiller les connexions
netstat -an | grep ESTABLISHED
```

### 2. Réaction

En cas d'attaque détectée :

```bash
# 1. Bloquer l'IP source
ufw deny from <IP_ATTAQUANT>

# 2. Arrêter temporairement le service
pm2 stop pelletsfun-backend

# 3. Analyser les logs
grep <IP_ATTAQUANT> /var/log/nginx/pelletsfun-access.log

# 4. Sauvegarder l'état actuel
vzdump 108 --storage local --mode snapshot

# 5. Corriger la faille si identifiée

# 6. Redémarrer le service
pm2 start pelletsfun-backend
```

### 3. Post-Incident

- [ ] Documenter l'incident
- [ ] Identifier la cause racine
- [ ] Appliquer les correctifs
- [ ] Informer les utilisateurs si nécessaire
- [ ] Mettre à jour les procédures

---

## 🔄 Maintenance de Sécurité

### Quotidienne
- [ ] Vérifier les logs pour activités suspectes
- [ ] Surveiller l'utilisation CPU/RAM

### Hebdomadaire
- [ ] Scanner les vulnérabilités npm (`npm audit`)
- [ ] Vérifier les backups
- [ ] Analyser les IPs bannies par Fail2Ban

### Mensuelle
- [ ] Mettre à jour les dépendances npm
- [ ] Mettre à jour le système (`apt update && apt upgrade`)
- [ ] Vérifier l'expiration du certificat SSL (auto-renew normalement)
- [ ] Tester la restauration d'un backup

### Trimestrielle
- [ ] Audit de sécurité complet
- [ ] Révision des accès et permissions
- [ ] Test de pénétration (si possible)

---

## 📚 Ressources et Références

- **OWASP Top 10** : https://owasp.org/www-project-top-ten/
- **Mozilla Observatory** : https://observatory.mozilla.org/
- **SSL Labs** : https://www.ssllabs.com/ssltest/
- **Security Headers** : https://securityheaders.com/
- **npm audit** : https://docs.npmjs.com/cli/audit

---

## ✅ Checklist Finale de Sécurité

- [ ] HTTPS activé avec certificat valide
- [ ] Mot de passe NPM changé
- [ ] MongoDB avec authentification
- [ ] UFW configuré et activé
- [ ] SSH sécurisé (clés uniquement)
- [ ] Fail2Ban installé et configuré
- [ ] Headers de sécurité configurés
- [ ] Rate limiting activé
- [ ] Fichiers .env protégés (chmod 600)
- [ ] Dépendances npm à jour
- [ ] Logs et rotation configurés
- [ ] Backups automatiques configurés
- [ ] Plan de réponse aux incidents documenté

**🔒 La sécurité est un processus continu, pas une destination !**
