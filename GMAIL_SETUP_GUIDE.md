# 📧 Guide Configuration Gmail - Import Automatique

## 🎯 Objectif

Configurer l'accès automatique à votre messagerie Gmail pour récupérer directement les emails Okofen contenant les fichiers CSV de données quotidiennes de votre chaudière.

## 🔧 Configuration Google Cloud

### Étape 1: Créer un Projet Google Cloud

1. **Accéder à Google Cloud Console**
   - Ouvrez https://console.cloud.google.com/
   - Connectez-vous avec votre compte Google

2. **Créer un nouveau projet**
   - Cliquez sur le sélecteur de projet en haut
   - Cliquez sur "Nouveau projet"
   - Nom du projet: `pellets-okofen-import`
   - Cliquez sur "Créer"

### Étape 2: Activer l'API Gmail

1. **Naviguer vers les APIs**
   - Dans le menu de gauche: `APIs et services > Bibliothèque`
   - Recherchez "Gmail API"
   - Cliquez sur "Gmail API" puis "Activer"

### Étape 3: Configurer l'Écran de Consentement OAuth

1. **Accéder à l'écran de consentement**
   - Menu: `APIs et services > Écran de consentement OAuth`
   - Sélectionnez "Usage externe"
   - Cliquez sur "Créer"

2. **Remplir les informations**
   ```
   Nom de l'application: Pellets Okofen Import
   Email d'assistance: votre-email@gmail.com
   Email développeur: votre-email@gmail.com
   ```
   - Sauvegardez et continuez

3. **Ajouter les scopes**
   - Cliquez sur "Ajouter ou supprimer des champs d'application"
   - Recherchez et ajoutez:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Sauvegardez et continuez

### Étape 4: Créer les Identifiants OAuth

1. **Créer les identifiants**
   - Menu: `APIs et services > Identifiants`
   - Cliquez sur "Créer des identifiants"
   - Sélectionnez "ID client OAuth 2.0"

2. **Configuration Détaillée**

   **a) Type d'application:**
   ```
   ✅ Sélectionnez: "Application Web"
   ```

   **b) Nom de l'application:**
   ```
   Nom: Pellets Gmail Client
   (ou tout autre nom descriptif)
   ```

   **c) 🔑 URI de redirection autorisés (CRUCIAL):**
   
   Cliquez sur "Ajouter un URI" et saisissez **EXACTEMENT** :
   ```
   http://localhost:3000/api/boiler/gmail/callback
   ```
   
   **⚠️ ATTENTION - Points Importants :**
   - ✅ **Port 3000** : C'est le port de votre serveur backend Node.js
   - ✅ **Chemin complet** : `/api/boiler/gmail/callback` correspond à la route définie dans votre code
   - ✅ **HTTP** (pas HTTPS) : Pour l'environnement local
   - ❌ **PAS port 8080** : Le port 8080 est pour le frontend React, pas le backend API
   
   **d) Pour la Production (votre domaine réel):**
   Pour votre environnement de production, ajoutez aussi :
   ```
   https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback
   ```

3. **Finalisation**
   - Vérifiez que l'URI est exactement : `http://localhost:3000/api/boiler/gmail/callback`
   - Cliquez sur "Créer"

3. **Télécharger les identifiants**
   - Téléchargez le fichier JSON
   - Renommez-le en `gmail-credentials.json`

## 💾 Installation dans l'Application

### Étape 1: Placer le Fichier de Configuration

```bash
# Copiez le fichier téléchargé vers:
pelletsFun/backend/config/gmail-credentials.json
```

### Étape 2: Vérifier la Structure du Fichier

Le fichier doit ressembler à ceci:
```json
{
  "installed": {
    "client_id": "123456789-abcdefg.apps.googleusercontent.com",
    "project_id": "pellets-okofen-import",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "GOCSPX-votre_secret_client",
    "redirect_uris": [
      "http://localhost:3000/api/boiler/gmail/callback",
      "https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback"
    ]
  }
}
```

### Étape 3: Redémarrer l'Application

```bash
# Terminal 1 - Backend
cd pelletsFun/backend
npm start

# Terminal 2 - Frontend  
cd pelletsFun/client
npm start
```

## 🔐 Processus d'Autorisation

### 🔄 Flux OAuth2 Détaillé

```
👤 Utilisateur              🌐 Application Web         📧 Google Gmail API
     |                           |                           |
     |--1. Clic "Autoriser"----->|                           |
     |                           |--2. Redirect vers-------->|
     |                           |   Google Auth             |
     |<-----3. Page Google-------|                           |
     |     Authorization         |                           |
     |                           |                           |
     |--4. Autorisation Google-->|                           |
     |                           |<--5. Code + Redirect------|
     |                           |   vers callback           |
     |<--6. Confirmation---------|                           |
     |                           |--7. Échange code--------->|
     |                           |   contre token            |
     |                           |<--8. Token d'accès--------|
```

**URLs dans le processus :**
- **Frontend** : http://localhost:8080 (interface utilisateur)
- **Backend API** : http://localhost:3000 (serveur Node.js)
- **Callback OAuth** : http://localhost:3000/api/boiler/gmail/callback

### Étape 1: Accéder à l'Interface Gmail

1. Ouvrez l'application: http://localhost:8080
2. Cliquez sur l'onglet "📧 Gmail Auto"
3. Suivez les étapes d'autorisation affichées

### Étape 2: Autorisation Google

1. Cliquez sur "Obtenir l'Autorisation Gmail"
2. Une nouvelle fenêtre s'ouvre avec Google
3. Connectez-vous à votre compte Gmail
4. Acceptez les permissions demandées
5. La fenêtre se ferme automatiquement

### Étape 3: Configuration des Paramètres

```
✅ Gmail Configuré apparaît en vert
Paramètres recommandés:
- Expéditeur: laisser vide (ou spécifier l'adresse Okofen)
- Mots-clés: "okofen" ou "touch"
- Emails à vérifier: 10
- Jours en arrière: 7
```

## ⚙️ Configuration des Filtres Email

### Paramètres de Recherche

| Paramètre | Valeur Recommandée | Description |
|-----------|-------------------|-------------|
| **Expéditeur** | *(vide)* ou `noreply@okofen.com` | Filtre par expéditeur spécifique |
| **Sujet** | `okofen` | Mots-clés dans le sujet |
| **Max Results** | `10` | Nombre d'emails à examiner |
| **Jours Arrière** | `7` | Période de recherche |

### Format d'Email Attendu

```
De: noreply@okofen.com
Sujet: Données quotidiennes Okofen - [Date]
Pièce jointe: touch_YYYYMMDD.csv

Exemple: touch_20251103.csv
```

## 🔄 Fonctionnement Automatique

### Vérification Programmée

- **Fréquence**: Toutes les heures (configurable)
- **Actions**: 
  1. Connexion à Gmail via API
  2. Recherche d'emails avec les critères configurés
  3. Téléchargement des pièces jointes CSV
  4. Import automatique des données
  5. Marquage des emails comme traités

### Processus de Traitement

```
📧 Nouvel email détecté
    ↓
💾 Téléchargement pièce jointe CSV
    ↓  
🔄 Import automatique des données
    ↓
🏷️ Marquage email "Okofen-Traité"
    ↓
📊 Mise à jour des statistiques
```

## 🔍 Dépannage

### Problème: "Gmail Non Configuré"

**Solutions:**
1. Vérifiez que le fichier `gmail-credentials.json` existe
2. Vérifiez la structure JSON du fichier
3. Redémarrez l'application backend
4. Refaites l'autorisation Gmail

### Problème: "Erreur d'Autorisation" ou "redirect_uri_mismatch"

**Solutions:**
1. **Vérifiez l'URI de redirection dans Google Cloud Console**
   - Allez sur Google Cloud Console > APIs et services > Identifiants
   - Cliquez sur votre client OAuth 2.0
   - Vérifiez que l'URI est **exactement** : `http://localhost:3000/api/boiler/gmail/callback`
   - ⚠️ Attention aux détails : http vs https, port exact, chemin complet

2. **Erreurs Communes d'URI :**
   ```
   ❌ http://localhost:8080/api/boiler/gmail/callback  (mauvais port)
   ❌ http://localhost:3000/oauth2callback             (mauvais chemin)  
   ❌ https://localhost:3000/api/boiler/gmail/callback (https au lieu de http)
   ✅ http://localhost:3000/api/boiler/gmail/callback  (CORRECT)
   ```

3. **Autres vérifications :**
   - Assurez-vous que l'API Gmail est activée
   - Vérifiez que l'écran de consentement est configuré
   - Utilisez le bon compte Gmail (propriétaire du projet)
   - Redémarrez votre application après modification des credentials

### Problème: "Aucun Email Trouvé"

**Solutions:**
1. Vérifiez les critères de recherche (expéditeur, sujet)
2. Augmentez le nombre de jours en arrière
3. Vérifiez manuellement la présence d'emails Okofen
4. Testez avec des critères plus larges

### Problème: "Erreur de Téléchargement"

**Solutions:**
1. Vérifiez les permissions du dossier `auto-downloads`
2. Vérifiez l'espace disque disponible
3. Redémarrez le service Gmail
4. Vérifiez les logs du serveur backend

## 📊 Monitoring et Logs

### Interface de Monitoring

L'onglet "📧 Gmail Auto" affiche:
- ✅/❌ Statut de configuration
- 🔄 Bouton traitement manuel
- 📊 Statistiques de traitement
- ⚙️ Configuration des paramètres

### Logs Serveur

```bash
# Consulter les logs en temps réel
cd pelletsFun/backend
npm start

# Rechercher des erreurs spécifiques
grep "Gmail" logs/*.log
```

## 🔒 Sécurité et Confidentialité

### Données Collectées

- **Emails**: Seuls les emails avec pièces jointes CSV sont traités
- **Fichiers**: Seuls les fichiers CSV Okofen sont téléchargés
- **Stockage**: Les données sont stockées localement uniquement

### Permissions Gmail

- **Lecture**: Accès en lecture aux emails et pièces jointes
- **Modification**: Ajout de labels pour le suivi des traitements
- **Limitation**: Aucun accès aux emails personnels non-Okofen

### Révocation d'Accès

Pour révoquer l'accès Gmail:
1. Allez sur https://myaccount.google.com/permissions
2. Trouvez "Pellets Okofen Import"
3. Cliquez sur "Révoquer l'accès"

## 🚀 Utilisation Quotidienne

### Routine Automatique

1. **8h00**: Réception email quotidien Okofen
2. **9h00**: Vérification automatique programmée
3. **9h01**: Téléchargement et import automatique
4. **9h02**: Données disponibles dans l'interface

### Vérification Manuelle

Si besoin, utilisez le bouton "📧 Récupérer Emails Maintenant" pour forcer une vérification immédiate.

---

## 🎉 Résultat Final

Une fois configuré, le système:
- ✅ Récupère automatiquement les emails Okofen
- ✅ Télécharge les fichiers CSV quotidiens  
- ✅ Importe les données sans intervention
- ✅ Met à jour les statistiques en temps réel
- ✅ Marque les emails comme traités

**Fini le travail manuel ! Votre système de suivi de consommation de pellets est maintenant 100% automatisé ! 🔥**