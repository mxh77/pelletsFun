# 📝 Aide-Mémoire Configuration OAuth2 Gmail

## 🎯 **L'ESSENTIEL À RETENIR**

### 🔑 **URIs de Redirection EXACTES :**

**Développement :**
```
http://localhost:3000/api/boiler/gmail/callback
```

**Production :**
```
https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback
```

### 📋 **Checklist Configuration Google Cloud :**

```
☐ 1. Créer projet Google Cloud
☐ 2. Activer API Gmail  
☐ 3. Configurer écran de consentement OAuth
☐ 4. Créer identifiants OAuth 2.0
      ├─ Type: Application Web
      ├─ Nom: Pellets Gmail Client
      └─ URI: http://localhost:3000/api/boiler/gmail/callback
☐ 5. Télécharger fichier JSON
☐ 6. Placer dans backend/config/gmail-credentials.json
☐ 7. Redémarrer application
☐ 8. Tester autorisation
```

### ⚡ **Commandes de Test Rapide :**

```bash
# Test API disponible
curl http://localhost:3000/api/boiler/gmail/config

# Test URL d'autorisation
curl http://localhost:3000/api/boiler/gmail/auth
```

### 🚨 **Erreurs Communes à Éviter :**

| ❌ Incorrect | ✅ Correct |
|-------------|-----------|
| `http://localhost:8080/...` | `http://localhost:3000/...` |
| `https://localhost:3000/...` | `http://localhost:3000/...` |  
| `/oauth2callback` | `/api/boiler/gmail/callback` |
| Application de bureau | Application Web |

### 🔧 **Dépannage Express :**

**Problème** : "redirect_uri_mismatch"
**Solution** : Vérifiez l'URI dans Google Cloud Console

**Problème** : "Gmail Non Configuré"  
**Solution** : Vérifiez le fichier gmail-credentials.json

**Problème** : "Cannot GET /api/boiler/gmail/config"
**Solution** : Redémarrez le serveur backend

---

## 🎯 **URI de Redirection - Rappel Visuel**

```
Google OAuth ──────────────────┐
                               │
Frontend (8080) ─────┐         │
                     │         ▼
Backend (3000) ◄─────┴─── CALLBACK: /api/boiler/gmail/callback
```

**L'URI doit pointer vers le BACKEND (port 3000), pas le frontend !**

---

*Gardez ce mémo à portée de main pendant la configuration ! 📌*