# 🔧 Outils de Gestion MongoDB - PelletsFun

Ce dossier contient des outils pour diagnostiquer et résoudre les problèmes de quota MongoDB dans votre application PelletsFun.

## 🚨 Problème Initial

```
Error recalculating stock: you are over your space quota, using 512 MB of 512 MB
```

## 📋 Outils Disponibles

### 1. 🔍 Scripts d'Analyse

| Fichier | Description | Usage |
|---------|-------------|-------|
| `analyze-mongodb-space.js` | Analyse détaillée de l'utilisation de l'espace | `node analyze-mongodb-space.js` |
| `check-import-service.js` | Diagnostic du service d'auto-import | `node check-import-service.js` |

### 2. 🧹 Scripts de Nettoyage

| Fichier | Description | Usage |
|---------|-------------|-------|
| `cleanup-mongodb.js` | Nettoyage complet (doublons + anciennes données) | `node cleanup-mongodb.js` |
| `cleanup-mongodb.js` | Suppression des doublons uniquement (plus sûr) | `node cleanup-mongodb.js --duplicates-only` |

### 3. ⚙️ Scripts d'Amélioration

| Fichier | Description | Usage |
|---------|-------------|-------|
| `generate-improved-service.js` | Génère un service d'import amélioré | `node generate-improved-service.js` |

### 4. 🛠️ Scripts Utilitaires

| Fichier | Description | Usage |
|---------|-------------|-------|
| `mongodb-tools.sh` | Interface en ligne de commande (Linux/Mac) | `./mongodb-tools.sh [commande]` |
| `mongodb-tools.bat` | Interface en ligne de commande (Windows) | `mongodb-tools.bat [commande]` |

## 🚀 Démarrage Rapide

### Option 1: Interface Simplifiée (Recommandée)

```bash
# Sur Windows
mongodb-tools.bat

# Sur Linux/Mac
chmod +x mongodb-tools.sh
./mongodb-tools.sh
```

### Option 2: Scripts Individuels

```bash
# 1. Analyser le problème
node analyze-mongodb-space.js

# 2. Diagnostiquer le service d'import
node check-import-service.js

# 3. Supprimer les doublons (opération sûre)
node cleanup-mongodb.js --duplicates-only

# 4. Générer le service amélioré
node generate-improved-service.js
```

## 📊 Commandes de l'Interface

| Commande | Description |
|----------|-------------|
| `analyze` | Analyser l'utilisation de l'espace MongoDB |
| `duplicates` | Supprimer seulement les doublons (recommandé) |
| `cleanup` | Nettoyage complet (doublons + anciennes données) |
| `check` | Diagnostiquer le service d'auto-import |
| `improve` | Générer le service d'import amélioré |
| `backup` | Sauvegarder l'ancien service |
| `replace` | Remplacer par le service amélioré |
| `status` | Afficher le statut actuel |

## 🔄 Procédure Recommandée

### Étape 1: Diagnostic Initial
```bash
# Analyser la base de données
mongodb-tools.bat analyze

# Diagnostiquer le service
mongodb-tools.bat check
```

### Étape 2: Nettoyage Sécurisé
```bash
# Supprimer seulement les doublons (opération sûre)
mongodb-tools.bat duplicates
```

### Étape 3: Amélioration du Service
```bash
# Générer le service amélioré
mongodb-tools.bat improve

# Sauvegarder l'ancien service
mongodb-tools.bat backup

# Remplacer par le nouveau service
mongodb-tools.bat replace
```

### Étape 4: Vérification
```bash
# Vérifier le statut
mongodb-tools.bat status

# Re-analyser pour voir les améliorations
mongodb-tools.bat analyze
```

## ⚠️ Précautions Importantes

### Avant de Commencer
1. **Sauvegardez votre base de données** MongoDB
2. **Arrêtez votre application** avant les opérations de nettoyage
3. **Testez sur un environnement de développement** en premier

### Opérations Sûres
- ✅ `analyze` - Lecture seule
- ✅ `check` - Lecture seule  
- ✅ `duplicates` - Supprime seulement les doublons
- ✅ `status` - Lecture seule

### Opérations Risquées
- ⚠️ `cleanup` - Peut supprimer des données anciennes
- ⚠️ `replace` - Modifie le code de votre application

## 🔧 Améliorations du Service d'Import

Le service amélioré inclut :

### ✅ Nouvelles Fonctionnalités
- **Détection des doublons** par hash de fichier
- **Vérification de l'âge** des fichiers
- **Statistiques détaillées** avec taux d'erreur
- **Archivage automatique** des fichiers traités
- **Gestion d'erreurs** améliorée
- **Horodatage des imports** pour le suivi

### 🚫 Prévention des Doublons
- Hash MD5 pour identifier les fichiers identiques
- Vérification des dates de modification
- Évite le re-traitement des fichiers déjà importés
- Logs détaillés des opérations

### 📊 Monitoring Amélioré
```javascript
// Nouvelles métriques disponibles
{
  filesProcessed: 42,
  totalImported: 15840,
  duplicatesSkipped: 8,
  errorRate: "2.3%",
  duplicateRate: "16.0%"
}
```

## 🐛 Résolution de Problèmes

### Erreur: "Script non trouvé"
```bash
# Vérifiez que vous êtes dans le bon dossier
mongodb-tools.bat status
```

### Erreur: "Node.js non disponible"
```bash
# Installez Node.js ou ajoutez-le au PATH
where node
```

### Erreur: "Dépendances manquantes"
```bash
# Installez les dépendances
cd backend
npm install
```

### Erreur de connexion MongoDB
```bash
# Vérifiez le fichier .env
cat backend/.env

# Vérifiez la connectivité
node -e "console.log(process.env.MONGODB_URI)" 
```

## 📈 Surveillance Continue

### Après le Nettoyage
1. **Surveillez l'utilisation d'espace** MongoDB Atlas
2. **Vérifiez les logs** de votre application
3. **Testez l'import** de nouveaux fichiers CSV
4. **Programmez des nettoyages** réguliers

### Métriques à Surveiller
- Taille de la collection `BoilerData`
- Nombre de doublons détectés
- Fréquence des erreurs d'import
- Utilisation du quota MongoDB

## 📞 Support

Si vous rencontrez des problèmes :

1. **Vérifiez les logs** détaillés des scripts
2. **Consultez le statut** avec `mongodb-tools.bat status`
3. **Sauvegardez avant** toute opération de nettoyage
4. **Testez sur un petit échantillon** en premier

## 🔄 Mise à Jour

Pour mettre à jour ces outils :
1. Sauvegardez vos modifications
2. Téléchargez les nouveaux scripts
3. Adaptez votre configuration
4. Testez avant déploiement

---

**⚡ Conseil**: Commencez toujours par `mongodb-tools.bat analyze` pour comprendre votre situation actuelle !