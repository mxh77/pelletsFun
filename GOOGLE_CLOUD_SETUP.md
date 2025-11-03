# 🎯 Configuration Google Cloud Platform - Guide Visuel Détaillé

## 🔧 URI de Redirection - Configuration Exacte

### ✅ **URI CORRECTE à configurer dans Google Cloud :**

```
http://localhost:3000/api/boiler/gmail/callback
```

### 📋 **Étapes Visuelles dans Google Cloud Platform :**

#### **1️⃣ Créer les Identifiants OAuth 2.0**

```
Google Cloud Console
├── APIs et services
    ├── Identifiants
        ├── + CRÉER DES IDENTIFIANTS
            └── ID client OAuth 2.0
```

#### **2️⃣ Formulaire de Configuration**

```
┌─────────────────────────────────────────┐
│ Créer un ID client OAuth 2.0           │
├─────────────────────────────────────────┤
│                                         │
│ Type d'application: *                   │
│ ┌─────────────────────┐                 │
│ │  ○ Application Web  │ ← Sélectionner  │
│ │  ○ Application de bureau              │
│ │  ○ Application mobile                 │
│ └─────────────────────┘                 │
│                                         │
│ Nom: ┌─────────────────────────┐        │
│      │ Pellets Gmail Client    │        │
│      └─────────────────────────┘        │
│                                         │
└─────────────────────────────────────────┘
```

#### **3️⃣ Configuration des URI de Redirection**

```
┌─────────────────────────────────────────────────────────┐
│ URI de redirection autorisés                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ Ajouter un URI ──────────────────────────────────┐   │
│ │                                                   │   │
│ │ URI 1: ┌─────────────────────────────────────────┐ │   │
│ │        │ http://localhost:3000/api/boiler/gmail/ │ │   │
│ │        │ callback                                │ │   │
│ │        └─────────────────────────────────────────┘ │   │
│ │                                                   │   │
│ │ [+ Ajouter un URI]  [🗑️ Supprimer]               │   │
│ │                                                   │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│ ⚠️  IMPORTANT: L'URI doit correspondre exactement      │
│     à votre route backend !                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 🎯 **Points Critiques à Retenir :**

#### **✅ Configuration CORRECTE :**
```
✓ Type: Application Web
✓ URI: http://localhost:3000/api/boiler/gmail/callback
✓ Port: 3000 (serveur backend Node.js)
✓ Protocole: http (pour développement local)
✓ Chemin: /api/boiler/gmail/callback (route définie dans le code)
```

#### **❌ Erreurs Communes :**
```
❌ http://localhost:8080/...     (port frontend React, pas backend)
❌ http://localhost:3000/oauth2callback  (chemin incorrect)
❌ https://localhost:3000/...    (https en local)
❌ Application de bureau         (type incorrect)
```

### 🔍 **Vérification de la Configuration :**

#### **Dans Google Cloud Console :**
1. Allez dans `APIs et services > Identifiants`
2. Cliquez sur votre ID client OAuth 2.0
3. Vérifiez que l'URI apparaît exactement comme :
   ```
   http://localhost:3000/api/boiler/gmail/callback
   ```

#### **Dans votre fichier de credentials :**
Le fichier téléchargé `gmail-credentials.json` doit contenir :
```json
{
  "installed": {
    "client_id": "votre-id-client.apps.googleusercontent.com",
    "client_secret": "votre-secret",
    "redirect_uris": ["http://localhost:3000/api/boiler/gmail/callback"]
  }
}
```

### 🚀 **Architecture Complète :**

```
📱 Frontend React (port 8080)
    ↓
🔄 Requête vers Backend
    ↓  
🖥️  Backend Node.js (port 3000)
    ↓
📧 Google Gmail API
    ↓
🔙 Callback vers: http://localhost:3000/api/boiler/gmail/callback
    ↓
✅ Token sauvegardé + Redirection vers frontend
```

### 🛠️ **En cas de Problème :**

#### **Message d'erreur "redirect_uri_mismatch" :**
```
1. Vérifiez l'URI dans Google Cloud Console
2. Assurez-vous qu'il n'y a pas d'espaces ou caractères supplémentaires  
3. Vérifiez le port (3000, pas 8080)
4. Vérifiez le protocole (http, pas https pour local)
5. Redémarrez votre application après modification
```

#### **Test de Validation :**
Une fois configuré, testez avec :
```bash
curl -X GET http://localhost:3000/api/boiler/gmail/auth
```
Cela doit retourner une URL d'autorisation Google valide.

---

## 🎊 **Résultat Final :**

Avec cette configuration exacte, quand l'utilisateur clique sur "Autoriser Gmail" dans votre interface :

1. 🌐 Il sera redirigé vers Google pour l'autorisation
2. ✅ Après autorisation, Google le renverra sur votre backend
3. 🔄 Votre backend récupérera le token d'accès automatiquement  
4. 📧 Le système pourra alors accéder aux emails Okofen
5. 🚀 L'import automatique sera opérationnel !

**Configuration Google Cloud Platform terminée ! 🎯**