# 🔒 Guide Sécurité - Credentials Gmail

## ⚠️ **IMPORTANT - Sécurité des Credentials**

### 🚨 **Ce qui s'est passé :**

GitHub Push Protection a détecté et **BLOQUÉ** le push car le fichier `gmail-credentials.json` contenait :
- Google OAuth Client ID 
- Google OAuth Client Secret

**C'est NORMAL et NÉCESSAIRE** pour protéger vos credentials !

## ✅ **Solution Appliquée**

### 1. **Fichiers Protégés (.gitignore)**
```
# Configuration secrets - NE PAS COMMITER
backend/config/gmail-credentials.json
backend/config/gmail-token.json
backend/config/*.json
!backend/config/*.example.json
```

### 2. **Structure des Fichiers**
```
backend/config/
├── gmail-credentials.json          ← JAMAIS sur GitHub (local uniquement)
├── gmail-credentials.example.json  ← Template sur GitHub (pas de secrets)
└── gmail-token.json               ← Token généré (local uniquement)
```

## 🔧 **Workflow Sécurisé**

### **Développement Local :**
1. ✅ Garder `gmail-credentials.json` en local
2. ✅ Utiliser le fichier pour l'authentification
3. ✅ Ne jamais le commiter sur GitHub

### **Déploiement Production :**
1. 📁 Copier `gmail-credentials.json` directement sur le serveur
2. 🔐 Utiliser des variables d'environnement si possible
3. 🛡️ Configurer les permissions fichier (600)

### **Partage d'Équipe :**
1. 📧 Envoyer les credentials par canal sécurisé (email crypté, etc.)
2. 🔄 Utiliser le fichier `.example.json` comme référence
3. 📋 Documenter la procédure d'installation

## 🛠️ **Configuration Actuelle**

### **Votre Fichier Réel (LOCAL UNIQUEMENT) :**
```json
{
    "web": {
        "client_id": "402578898728-f8l...kr18.apps.googleusercontent.com",
        "project_id": "pellets-okofen-import",
        "client_secret": "GOCSPX-QcBsNmj7...36vWh",
        "redirect_uris": [
            "http://localhost:3000/api/boiler/gmail/callback",
            "https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback"
        ]
    }
}
```

### **Template GitHub (PUBLIC) :**
```json
{
    "web": {
        "client_id": "VOTRE_CLIENT_ID.apps.googleusercontent.com",
        "project_id": "votre-projet-gmail",
        "client_secret": "VOTRE_CLIENT_SECRET",
        "redirect_uris": [
            "http://localhost:3000/api/boiler/gmail/callback",
            "https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback"
        ]
    }
}
```

## 🚀 **Déploiement Production Sécurisé**

### **Option 1: Copie Directe (Simple)**
```bash
# Sur le serveur de production
scp gmail-credentials.json serveur:/path/to/backend/config/
chmod 600 /path/to/backend/config/gmail-credentials.json
```

### **Option 2: Variables d'Environnement (Avancé)**
```bash
# Définir les variables
export GMAIL_CLIENT_ID="402578898728-..."
export GMAIL_CLIENT_SECRET="GOCSPX-..."

# Modifier le code pour lire les variables
# (modification du gmailService.js nécessaire)
```

### **Option 3: Secrets Manager (Cloud)**
```
- AWS Secrets Manager
- Azure Key Vault  
- Google Secret Manager
- Kubernetes Secrets
```

## 🔍 **Vérification Sécurité**

### **Checklist :**
```
☑️ gmail-credentials.json dans .gitignore
☑️ Fichier example.json committé (sans secrets)
☑️ Push GitHub réussi sans alerte sécurité
☑️ Fichier local functional pour tests
☑️ Plan déploiement production sécurisé
```

### **Test de Sécurité :**
```bash
# Vérifier que les secrets ne sont pas trackés
git status --ignored

# Doit afficher :
# backend/config/gmail-credentials.json (ignored)
```

## 🆘 **En Cas de Fuite Accidentelle**

Si vous avez déjà pushé des credentials sur GitHub :

### **Action Immédiate :**
1. 🚨 **Révoquer les credentials** sur Google Cloud Console
2. 🔄 **Générer de nouveaux credentials** 
3. 🗑️ **Supprimer l'historique Git** si nécessaire

### **Nettoyage Git :**
```bash
# Supprimer de l'historique (ATTENTION: destructeur)
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch backend/config/gmail-credentials.json' \
--prune-empty --tag-name-filter cat -- --all

# Push forcé pour nettoyer le remote
git push origin --force --all
```

## 💡 **Bonnes Pratiques**

### **✅ À Faire :**
- Utiliser des fichiers `.example` pour les templates
- Ajouter tous les secrets au `.gitignore`
- Tester régulièrement la sécurité avec `git status --ignored`
- Documenter la procédure d'installation pour l'équipe

### **❌ À Éviter :**
- Jamais commiter de vrais credentials
- Pas de secrets dans les noms de fichiers
- Éviter les credentials en dur dans le code
- Ne pas ignorer les alertes GitHub Security

---

## 🎉 **Résultat**

Votre configuration est maintenant **SÉCURISÉE** :
- ✅ Credentials protégés localement
- ✅ Template partagé sur GitHub
- ✅ Système Gmail fonctionnel
- ✅ Prêt pour déploiement production sécurisé

**La sécurité est maintenue, le développement peut continuer ! 🔒✨**