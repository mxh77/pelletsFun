# 📁 Script de Récupération des Fichiers CSV Manquants

## 🎯 **Objectif**
Ce script identifie et récupère tous les fichiers CSV qui ont été importés en base de données mais qui ne sont pas sauvegardés dans `backend/auto-downloads`. Il est particulièrement utile pour récupérer les fichiers des imports automatiques passés qui n'étaient pas sauvegardés.

## 🔍 **Ce que fait le script**

### 1. **Analyse** 
- Scan de tous les fichiers uniques importés en base de données
- Vérification de leur présence dans `backend/auto-downloads`
- Identification des fichiers manquants

### 2. **Récupération**
- **Méthode 1** : Tentative de téléchargement depuis Gmail (si configuré)
- **Méthode 2** : Génération du fichier CSV à partir des données en base
- Sauvegarde dans `backend/auto-downloads`

### 3. **Rapport**
- Statistiques complètes de l'opération
- Liste des fichiers récupérés/générés
- Taux de réussite

## 🚀 **Utilisation**

### **Sur Windows :**
```bash
# Depuis la racine du projet
./recover-missing-files.bat
```

### **Sur Linux/Mac :**
```bash
# Rendre le script exécutable
chmod +x recover-missing-files.sh

# Exécuter le script
./recover-missing-files.sh
```

### **Directement avec Node.js :**
```bash
cd backend
node scripts/recover-missing-files.js
```

## 📊 **Exemple de sortie**

```
🚀 DÉMARRAGE - Récupération fichiers CSV manquants
============================================================

🔌 Connexion à MongoDB...
✅ Connecté à MongoDB
📁 Répertoire créé: /path/to/backend/auto-downloads

🔍 Analyse des fichiers importés en base de données...
📊 Fichiers uniques en base: 89

✅ touch_20250730.csv - EXISTE
✅ touch_20250731.csv - EXISTE
❌ touch_20251108.csv - MANQUANT
❌ touch_20251109.csv - MANQUANT

📈 Résumé de l'analyse:
   Total fichiers en base: 89
   Fichiers existants: 87
   Fichiers manquants: 2

🔄 Récupération de 2 fichiers manquants...

📧 Initialisation du service Gmail...
✅ Service Gmail prêt pour récupération

[1/2] Traitement: touch_20251108.csv
📧 Tentative récupération Gmail: touch_20251108.csv
❌ touch_20251108.csv - ÉCHEC Gmail: Fichier non trouvé dans Gmail
🔧 Génération depuis base de données: touch_20251108.csv
✅ touch_20251108.csv - GÉNÉRÉ (1440 entrées)

[2/2] Traitement: touch_20251109.csv
🔧 Génération depuis base de données: touch_20251109.csv
✅ touch_20251109.csv - GÉNÉRÉ (1420 entrées)

============================================================
📊 RAPPORT DE RÉCUPÉRATION FINAL
============================================================

📈 Statistiques:
   Fichiers total en base: 89
   Fichiers existants: 87
   Fichiers manquants: 2
   Fichiers récupérés Gmail: 0
   Fichiers générés: 2
   Échecs: 0

✅ Fichiers récupérés:
   - touch_20251108.csv (généré)
   - touch_20251109.csv (généré)

🎯 Taux de réussite: 100.0%
============================================================
```

## ⚙️ **Fonctionnalités avancées**

### **Génération de fichiers CSV**
Si un fichier ne peut pas être récupéré depuis Gmail, le script génère un fichier CSV compatible avec le format Okofen en utilisant les données stockées en base de données.

### **Détection intelligente**
Le script évite de traiter les fichiers déjà présents et se concentre uniquement sur les manquants.

### **Gestion d'erreurs**
Chaque étape est sécurisée avec une gestion d'erreurs appropriée et des messages informatifs.

## 🔧 **Dépendances**

- **Node.js** (version 14+)
- **MongoDB** actif et accessible
- **Configuration Gmail** (optionnelle, pour récupération depuis emails)
- **Modules npm** : mongoose, path, fs

## 📝 **Notes importantes**

1. **Sauvegarde** : Le script ne modifie pas les données existantes en base
2. **Performance** : Pause de 1 seconde entre chaque fichier pour éviter la surcharge
3. **Compatibilité** : Les fichiers générés sont compatibles avec l'interface graphique
4. **Format** : Respect du format CSV Okofen original (séparateur `;`, encodage `latin1`)

## 🎯 **Cas d'usage typiques**

- **Première utilisation** : Récupérer tous les fichiers des imports passés
- **Maintenance** : Vérification périodique de l'intégrité des fichiers
- **Migration** : Restauration après problème technique
- **Audit** : Contrôle de cohérence entre base et fichiers

## ✅ **Après l'exécution**

Une fois le script terminé avec succès :

1. **Vérifiez** : `ls -la backend/auto-downloads/` 
2. **Testez** : Utilisez les boutons "📊 Stats" dans l'interface web
3. **Profitez** : Analysez vos courbes de température ! 🌡️📊