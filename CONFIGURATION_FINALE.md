# 🎯 Configuration Finale - pelletsfun.harmonixe.fr

## ✅ **URIs OAuth2 à Configurer dans Google Cloud Platform**

### **Configuration Complète pour Dev + Production :**

Dans Google Cloud Console → APIs et services → Identifiants → OAuth 2.0, ajoutez ces **deux URIs exactement** :

```
1. http://localhost:3000/api/boiler/gmail/callback
2. https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback
```

### **Interface Google Cloud Platform :**

```
┌─────────────────────────────────────────────────────────┐
│ Créer un ID client OAuth 2.0                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Type d'application: [Application Web] ✅                │
│                                                         │
│ Nom: Pellets Gmail Client                               │
│                                                         │
│ URI de redirection autorisés:                          │
│                                                         │
│ URI 1: http://localhost:3000/api/boiler/gmail/callback  │
│ URI 2: https://pelletsfun.harmonixe.fr/api/boiler/      │
│        gmail/callback                                   │
│                                                         │
│        [+ Ajouter un URI]                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🔧 **Fichier gmail-credentials.json Final**

Après téléchargement depuis Google Cloud, le fichier doit contenir :

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

## 🚀 **Étapes Finales**

### **1. Configuration Google Cloud (15 min)**
```
☐ Créer projet Google Cloud
☐ Activer API Gmail
☐ Configurer écran consentement OAuth
☐ Créer identifiants OAuth 2.0 avec les 2 URIs
☐ Télécharger le fichier JSON
```

### **2. Installation Local (2 min)**
```bash
# Placer le fichier
cp gmail-credentials.json backend/config/

# Redémarrer l'application
cd backend && npm start
cd client && npm start
```

### **3. Test et Validation (2 min)**
```bash
# Tester la configuration
./check-oauth-config.bat

# Ouvrir l'application
http://localhost:8080
→ Onglet "📧 Gmail Auto"  
→ Cliquer "Obtenir l'Autorisation Gmail"
```

### **4. Déploiement Production (quand prêt)**
```bash
# Même fichier credentials fonctionne
# Déployer sur pelletsfun.harmonixe.fr
# Tester https://pelletsfun.harmonixe.fr
```

## 🎊 **Résultat Final**

### **Développement :**
```
✅ http://localhost:8080 (frontend)
✅ http://localhost:3000 (backend API)
✅ OAuth callback: localhost:3000/api/boiler/gmail/callback
```

### **Production :**
```
✅ https://pelletsfun.harmonixe.fr (frontend + backend)
✅ OAuth callback: pelletsfun.harmonixe.fr/api/boiler/gmail/callback
```

### **Fonctionnalités Opérationnelles :**
- 📧 **Récupération automatique** emails Okofen depuis Gmail
- 💾 **Téléchargement automatique** fichiers CSV quotidiens
- 🔄 **Import automatique** données chaudière
- 📊 **Calculs précis** consommation pellets
- 🤖 **Surveillance 24h/24** nouveaux emails
- 🏷️ **Marquage automatique** emails traités

---

## 🎯 **Action Immédiate**

**Prochaine étape :** Configurez maintenant Google Cloud Platform avec ces URIs exactes, puis suivez le guide `GMAIL_SETUP_GUIDE.md` pour l'installation complète.

**Votre système Gmail Auto-Import est prêt à devenir 100% automatique ! 🔥🚀**

*Configuration pour pelletsfun.harmonixe.fr - Novembre 2024*