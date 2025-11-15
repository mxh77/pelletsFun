# Guide de Résolution - Authentification Gmail Persistante

## 🚨 Problème : "Token expiré - nouvelle autorisation requise"

Ce guide vous aidera à résoudre définitivement les problèmes d'authentification Gmail récurrents.

## 🔧 Améliorations Implementées

### 1. Renouvellement Automatique des Tokens
- ✅ **Vérification préventive** avant chaque opération Gmail
- ✅ **Renouvellement automatique** des tokens expirés
- ✅ **Sauvegarde automatique** des nouveaux tokens
- ✅ **Gestion des erreurs** avec fallback vers réauthentification

### 2. Scripts de Diagnostic
- 📊 `node check-gmail-auth.js` - Diagnostic complet des tokens
- 🔄 `node regenerate-gmail-auth.js` - Régénération propre de l'auth

### 3. Monitoring Proactif
- ⏰ **Expiration préventive** : renouvellement 5min avant expiration
- 🔄 **Événements automatiques** : sauvegarde lors des renouvellements
- 📝 **Logs détaillés** pour traçabilité

## 🛠️ Procédure de Réparation

### Étape 1 : Diagnostic
```bash
node check-gmail-auth.js
```

### Étape 2 : Si problème détecté
```bash
node regenerate-gmail-auth.js
```

### Étape 3 : Nouvelle Autorisation
1. **Accédez à l'interface web** : https://pelletsfun.harmonixe.fr
2. **Section Configuration** → "Import Manuel depuis Gmail"
3. **Cliquez "Configurer Gmail"**
4. **IMPORTANT** : Acceptez TOUTES les permissions demandées
5. **Vérifiez** que le message "✅ Autorisation Gmail réussie" apparaît

### Étape 4 : Vérification
```bash
node check-gmail-auth.js
```
Vous devriez voir : "✅ Configuration OAuth2 correcte"

## 🔍 Points de Contrôle

### ✅ Configuration OAuth2 Correcte
- **Access Token** : ✅ Présent
- **Refresh Token** : ✅ Présent (CRITIQUE)
- **Expiration** : > 5 minutes
- **Scope** : gmail.readonly, gmail.modify

### ❌ Problèmes Courants

#### 1. Refresh Token Manquant
**Cause** : Autorisation incomplète ou révoquée
**Solution** : 
```bash
node regenerate-gmail-auth.js
# Puis refaire l'autorisation complète
```

#### 2. Token Expiré Régulièrement
**Cause** : Système de renouvellement défaillant
**Solution** : Les améliorations implementées devraient résoudre ce problème

#### 3. Erreur "invalid_grant"
**Cause** : Token corrompu ou compte modifié
**Solution** :
```bash
rm config/gmail-token.json
# Puis nouvelle autorisation
```

## 📋 Maintenance Préventive

### Vérification Mensuelle
```bash
node check-gmail-auth.js
```

### Logs à Surveiller
- `🔄 Token renouvelé automatiquement`
- `✅ Token renouvelé préventivement`
- `❌ Échec du renouvellement automatique`

### Alertes Importantes
- ⚠️ `Refresh token manquant`
- ❌ `Token expiré - nouvelle autorisation requise`

## 🚀 Nouvelles Fonctionnalités

### Auto-Renouvellement
Le système vérifie et renouvelle automatiquement les tokens :
- **Avant expiration** (5 minutes avant)
- **Lors d'erreurs d'authentification**
- **À chaque utilisation** des APIs Gmail

### Diagnostic Intégré
- **État des tokens** en temps réel
- **Prédiction d'expiration**
- **Recommandations automatiques**

## 📞 Support

Si le problème persiste après avoir suivi ce guide :

1. **Vérifiez les logs** du serveur backend
2. **Exécutez le diagnostic** : `node check-gmail-auth.js`
3. **Consultez la console** du navigateur web
4. **Vérifiez les permissions** du compte Google utilisé

## 🎯 Résultat Attendu

Après application de ces corrections :
- ✅ **Plus de réauthentification** manuelle répétée
- ✅ **Import Gmail automatique** sans interruption
- ✅ **Monitoring proactif** des tokens
- ✅ **Résolution automatique** des expirations

---

*Guide créé le $(date) - Version système OAuth2 améliorée*