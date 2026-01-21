# 🔐 Guide Complet : Publier l'App Gmail en Production

## 📊 Votre Situation Actuelle

```
⚠️ Mode: Testing (App non publiée)
⏰ Refresh token expire dans: 5 jours et 16 heures
```

**Conséquence** : Vous devrez réautoriser l'application tous les 7 jours maximum.

---

## ✅ Solution : 5 Minutes pour une Auth Permanente

### Étape 1 : Publier l'Application sur Google Cloud (2 min)

#### 1.1 Accéder à la Console Google Cloud

Ouvrir dans votre navigateur :
```
https://console.cloud.google.com/apis/credentials/consent
```

**Important** : Sélectionnez bien le projet utilisé pour PelletsFun (probablement celui contenant "pelletsfun" ou "okofen" dans le nom).

---

#### 1.2 État Actuel : Testing

Vous devriez voir quelque chose comme :

```
┌────────────────────────────────────────────────┐
│ OAuth consent screen                           │
├────────────────────────────────────────────────┤
│                                                │
│ Publishing status: 🔶 Testing                  │
│                                                │
│ While in testing, only test users can          │
│ access your app. The maximum number of         │
│ test users is 100.                             │
│                                                │
│ [PUBLISH APP]  ← CLIQUER ICI                   │
│                                                │
└────────────────────────────────────────────────┘
```

---

#### 1.3 Cliquer sur "PUBLISH APP"

Un dialogue de confirmation apparaît :

```
┌──────────────────────────────────────────────┐
│ Push to production?                          │
├──────────────────────────────────────────────┤
│                                              │
│ ⚠️ Your OAuth consent screen                 │
│    configuration will be                     │
│    publicly accessible                       │
│                                              │
│ This won't affect your ability to            │
│ access your APIs and services.               │
│                                              │
│ For apps with sensitive or restricted        │
│ scopes, you may need verification.           │
│                                              │
│           [CANCEL]    [CONFIRM]              │
│                           ↑                  │
│                    CLIQUER ICI               │
└──────────────────────────────────────────────┘
```

**Cliquer sur "CONFIRM"**

---

#### 1.4 Vérification : Mode Production Activé

Après confirmation, vous devriez voir :

```
┌────────────────────────────────────────────────┐
│ OAuth consent screen                           │
├────────────────────────────────────────────────┤
│                                                │
│ Publishing status: ✅ In production            │
│                                                │
│ Your app is published and can be used by       │
│ all users. Refresh tokens will not expire.    │
│                                                │
└────────────────────────────────────────────────┘
```

**✅ Étape 1 terminée !** L'app est maintenant en production.

---

### Étape 2 : Obtenir un Nouveau Token Permanent (3 min)

#### 2.1 Supprimer l'Ancien Token (Expire dans 5 jours)

**Option A : Sous Windows (PowerShell ou CMD)**
```cmd
cd C:\Users\maxim\Desktop\Max\GIT\pelletsFun
del backend\config\gmail-token.json
```

**Option B : Sous Windows (Git Bash ou WSL)**
```bash
cd /c/Users/maxim/Desktop/Max/GIT/pelletsFun
rm backend/config/gmail-token.json
```

**Option C : Manuellement**
- Ouvrir l'explorateur Windows
- Naviguer vers : `C:\Users\maxim\Desktop\Max\GIT\pelletsFun\backend\config\`
- Supprimer le fichier `gmail-token.json`

---

#### 2.2 Redémarrer l'Application

**Option A : Script de démarrage**
```bash
./start-dev.bat
# OU
./start-dev.sh
```

**Option B : Manuel**
```bash
cd backend
npm start
```

Attendre que le serveur démarre (environ 10 secondes).

---

#### 2.3 Réautoriser Gmail

1. **Ouvrir votre navigateur**
   ```
   http://localhost:3000
   ```

2. **Accéder à la section Gmail**
   - Cliquer sur la section "Configuration" (si pliée)
   - Chercher le bouton "Autoriser Gmail" ou "Configurer Gmail"

3. **Cliquer sur "Autoriser Gmail"**
   - Vous serez redirigé vers Google
   - Sélectionner votre compte Google

4. **Accepter les permissions**
   ```
   ┌─────────────────────────────────────────┐
   │ PelletsFun wants to access your         │
   │ Google Account                          │
   ├─────────────────────────────────────────┤
   │                                         │
   │ This will allow PelletsFun to:          │
   │                                         │
   │ ✓ Read your Gmail messages              │
   │ ✓ Modify your Gmail messages            │
   │   (to mark as processed)                │
   │                                         │
   │         [Cancel]    [Allow]             │
   │                        ↑                │
   │                   CLIQUER ICI           │
   └─────────────────────────────────────────┘
   ```

5. **Confirmation**
   - Vous serez redirigé vers votre application
   - Message de succès : "✅ Autorisation Gmail réussie"

---

#### 2.4 Vérifier le Nouveau Token

**Exécuter le script de diagnostic :**

```bash
node check-gmail-token.js
```

**Résultat attendu :**
```
🔍 === DIAGNOSTIC AUTHENTIFICATION GMAIL ===

✅ Fichier token trouvé: C:\Users\maxim\Desktop\Max\GIT\pelletsFun\backend\config\gmail-token.json

✅ Refresh token présent
✅ Mode: Production (App publiée)
✅ Refresh token PERMANENT (pas d'expiration)
🎉 Configuration optimale ! Pas de réauthentification requise.

✅ Access token valide pour encore: 59 minutes
   (Renouvellement automatique géré par le code)
```

**🎉 SI vous voyez "Refresh token PERMANENT" → Terminé avec succès !**

---

### Étape 3 : Déployer en Production (1 min)

Une fois que le token permanent est confirmé en local, déployer sur le serveur de production :

```bash
./deploy-production.sh "fix: Configuration authentification Gmail permanente

- Passage app en mode Production sur Google Cloud
- Modification prompt: consent → select_account
- Ajout détection expiration refresh_token
- Nouveau token permanent obtenu
- Plus de réauthentification requise ✅"
```

**Note** : Le script se chargera de :
1. Commiter les changements de code
2. Pousser sur le repository
3. Se connecter au serveur en SSH
4. Redémarrer l'application
5. Vous devrez réautoriser Gmail **UNE FOIS** sur la production

---

## 🔍 Vérifications Post-Déploiement

### Sur le serveur de production

**1. Vérifier les logs PM2**
```bash
ssh pelletsfun@192.168.1.90
pm2 logs pelletsfun-backend --lines 50
```

**Rechercher ces lignes :**
```
✅ Refresh token permanent (mode Production activé)
✅ Service Gmail initialisé avec succès
```

**2. Tester l'import automatique**
- Attendre le prochain email Ökofen (lendemain)
- Vérifier que le CSV est bien importé
- Pas de réauthentification demandée

---

## ❓ FAQ et Résolution de Problèmes

### Q1 : J'ai cliqué sur "PUBLISH APP" mais je vois toujours "Testing"

**R :** Actualiser la page du navigateur (F5). Si le problème persiste :
1. Vérifier que vous êtes sur le bon projet Google Cloud
2. Vérifier que vous avez les permissions admin sur le projet

---

### Q2 : Après réauth, le token a toujours `refresh_token_expires_in`

**R :** Causes possibles :
1. L'app n'est pas vraiment en mode Production → Revérifier étape 1
2. Cache navigateur → Vider le cache et réessayer
3. Ancien token rechargé → Vérifier que `gmail-token.json` a bien été supprimé avant de réautoriser

**Solution :**
```bash
# Forcer suppression et réauth
rm backend/config/gmail-token.json
rm -rf node_modules/.cache  # Nettoyer cache Node
./start-dev.bat
# Réautoriser dans le navigateur en mode navigation privée
```

---

### Q3 : Le diagnostic dit "Access token expiré"

**R :** **C'est normal !** L'access token expire après 1 heure. Le code le renouvelle automatiquement en utilisant le refresh token permanent. Aucune action requise.

---

### Q4 : Google me demande de vérifier l'app

**R :** Si vous utilisez l'app pour **votre propre compte uniquement**, pas besoin de vérification. Vous pouvez ignorer l'avertissement et continuer avec "Advanced" → "Go to [app name] (unsafe)".

Si d'autres personnes utilisent l'app, vous devrez soumettre une demande de vérification Google.

---

### Q5 : Combien de temps le refresh token permanent reste valide ?

**R :** **Indéfiniment** sauf si :
- Vous révoquez manuellement l'accès depuis votre compte Google
- Vous changez le mot de passe de votre compte Google (révocation automatique pour sécurité)
- Google détecte une activité suspecte

Dans ces cas rares, vous devrez simplement réautoriser.

---

## 🎯 Résumé des Avantages

| Avant (Testing) | Après (Production) |
|----------------|-------------------|
| ❌ Réauth tous les 7 jours | ✅ Réauth jamais (sauf révocation manuelle) |
| ❌ Token expire = app cassée | ✅ Token permanent = fiabilité |
| ❌ Maintenance régulière | ✅ Zéro maintenance |
| ❌ Risque d'oubli | ✅ Tranquillité d'esprit |

---

## 📞 Support

Si problème persistant après avoir suivi ce guide :

1. **Exécuter le diagnostic**
   ```bash
   node check-gmail-token.js
   ```

2. **Vérifier les logs backend**
   ```bash
   # Local
   npm start  # Observer les logs console
   
   # Production
   pm2 logs pelletsfun-backend
   ```

3. **Consulter les guides existants**
   - [OAUTH_MEMO.md](OAUTH_MEMO.md) - Configuration OAuth de base
   - [GMAIL_AUTH_GUIDE.md](GMAIL_AUTH_GUIDE.md) - Guide détaillé authentification
   - [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md) - Configuration Google Cloud

---

## ✅ Checklist Finale

```
☐ App publiée en mode Production sur Google Cloud Console
☐ Ancien token supprimé (gmail-token.json)
☐ Application redémarrée
☐ Nouvelle autorisation Gmail effectuée
☐ Diagnostic confirme "Refresh token PERMANENT"
☐ Code modifié (prompt: select_account)
☐ Changements déployés en production
☐ Production réautorisée
☐ Logs production confirment token permanent
```

**Quand tous les ☐ sont cochés → Configuration optimale atteinte ! 🎉**

