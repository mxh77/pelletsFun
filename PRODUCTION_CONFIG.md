# 🌐 Configuration Production - pelletsfun.harmonixe.fr

## 🎯 **URIs de Redirection - Configuration Complète**

### ✅ **URIs à Configurer dans Google Cloud Platform :**

Pour supporter à la fois le développement local ET la production, ajoutez ces deux URIs :

```
1. http://localhost:3000/api/boiler/gmail/callback     (développement)
2. https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback     (production)
```

## 🔧 **Configuration Google Cloud Console**

### **Interface Google Cloud Platform :**

```
┌─────────────────────────────────────────────────────────┐
│ URI de redirection autorisés                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ URI 1: ┌─────────────────────────────────────────────┐  │
│        │ http://localhost:3000/api/boiler/gmail/     │  │
│        │ callback                                    │  │
│        └─────────────────────────────────────────────┘  │
│                                                         │
│ URI 2: ┌─────────────────────────────────────────────┐  │
│        │ https://pelletsfun.harmonixe.fr/api/boiler/ │  │
│        │ gmail/callback                              │  │
│        └─────────────────────────────────────────────┘  │
│                                                         │
│ [+ Ajouter un URI]  [🗑️ Supprimer]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **Fichier gmail-credentials.json Final :**

```json
{
  "installed": {
    "client_id": "votre-client-id.apps.googleusercontent.com",
    "project_id": "pellets-okofen-import",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "votre-client-secret",
    "redirect_uris": [
      "http://localhost:3000/api/boiler/gmail/callback",
      "https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback"
    ]
  }
}
```

## 🚀 **Déploiement Production**

### **Architecture de Déploiement :**

```
🌐 Internet
    ↓
🔒 HTTPS (pelletsfun.harmonixe.fr)
    ↓
🖥️ Serveur de Production
    ↓
📧 Gmail API Callback → /api/boiler/gmail/callback
    ↓
✅ Token sauvegardé + système opérationnel
```

### **Différences Développement vs Production :**

| Environnement | URL Frontend | URL Backend | OAuth Callback |
|---------------|-------------|-------------|----------------|
| **Développement** | http://localhost:8080 | http://localhost:3000 | http://localhost:3000/api/boiler/gmail/callback |
| **Production** | https://pelletsfun.harmonixe.fr | https://pelletsfun.harmonixe.fr | https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback |

### **Points Critiques pour la Production :**

1. **🔒 HTTPS Obligatoire**
   - Google OAuth exige HTTPS en production
   - Votre certificat SSL doit être valide

2. **🌐 DNS Configuration**
   - `pelletsfun.harmonixe.fr` doit pointer vers votre serveur
   - Sous-domaine correctement configuré

3. **🔧 Variables d'Environnement**
   ```bash
   NODE_ENV=production
   API_URL=https://pelletsfun.harmonixe.fr
   ```

## 🔄 **Migration Dev → Production**

### **Étapes de Déploiement :**

1. **Configuration Gmail (une seule fois)**
   - Ajoutez l'URI production dans Google Cloud Console
   - Téléchargez le fichier credentials mis à jour

2. **Déploiement Backend**
   ```bash
   # Sur votre serveur de production
   cd pelletsFun/backend
   cp gmail-credentials.json config/
   npm install --production
   NODE_ENV=production npm start
   ```

3. **Déploiement Frontend**
   ```bash
   cd pelletsFun/client
   REACT_APP_API_URL=https://pelletsfun.harmonixe.fr npm run build
   # Déployer le dossier build/ sur votre serveur web
   ```

4. **Test de Production**
   - Ouvrir https://pelletsfun.harmonixe.fr
   - Tester l'autorisation Gmail
   - Vérifier l'import automatique

## 🔍 **Tests et Validation**

### **Test Local (Développement) :**
```bash
curl -X GET http://localhost:3000/api/boiler/gmail/auth
# → Doit retourner une URL d'autorisation Google
```

### **Test Production :**
```bash
curl -X GET https://pelletsfun.harmonixe.fr/api/boiler/gmail/auth
# → Doit retourner une URL d'autorisation Google
```

### **Vérification OAuth :**
1. Cliquez sur "Autoriser Gmail" en production
2. Vérifiez que la redirection fonctionne vers :
   `https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback`

## 🛠️ **Dépannage Production**

### **Problème: "redirect_uri_mismatch" en Production**

**Cause :** L'URI n'est pas configurée dans Google Cloud Console

**Solution :**
1. Allez sur Google Cloud Console
2. Vérifiez que cette URI exacte est présente :
   ```
   https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback
   ```

### **Problème: "This app isn't verified"**

**Cause :** Application en mode test Google

**Solutions :**
1. **Rapide :** Ajoutez votre email Gmail dans les "Test users"
2. **Complète :** Soumettez l'app pour vérification Google (optionnel)

### **Problème: Certificat SSL**

**Vérification :**
```bash
# Tester le certificat
curl -I https://pelletsfun.harmonixe.fr
# Doit retourner 200 OK sans erreur SSL
```

## 📊 **Monitoring Production**

### **Logs à Surveiller :**
```bash
# Logs OAuth
grep "Gmail" /var/log/pellets-app.log

# Logs Callbacks
grep "callback" /var/log/pellets-app.log

# Erreurs d'autorisation
grep "redirect_uri" /var/log/pellets-app.log
```

### **Alertes Recommandées :**
- ❌ Échecs d'autorisation Gmail
- 📧 Erreurs de récupération d'emails
- 💾 Problèmes d'import CSV
- 🔄 Interruptions du service auto-import

---

## 🎉 **Résultat Final**

Avec cette configuration, votre système Gmail Auto-Import fonctionnera parfaitement dans les deux environnements :

✅ **Développement Local :** `http://localhost:3000`
✅ **Production :** `https://pelletsfun.harmonixe.fr`

Les utilisateurs de votre site de production pourront :
1. 🔐 S'authentifier avec leur Gmail
2. 📧 Configurer la récupération automatique des emails Okofen  
3. 🤖 Profiter de l'import automatique 24h/24
4. 📊 Consulter leurs statistiques de consommation en temps réel

**Votre système de pellets est prêt pour la production ! 🚀🔥**