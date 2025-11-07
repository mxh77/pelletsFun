# 🤖 Guide Auto-Import - Données Okofen

## 📋 Vue d'ensemble

Le système d'auto-import permet d'automatiser complètement l'importation des fichiers CSV de statistiques quotidiennes de votre chaudière Okofen, éliminant le besoin de traitement manuel.

## 🎯 Fonctionnalités

### ✅ Import Automatique
- **Surveillance en temps réel** des nouveaux fichiers CSV
- **Pattern matching** intelligent pour les fichiers Okofen
- **Archivage automatique** des fichiers traités
- **Vérification programmée** toutes les heures

### 📊 Analyse Avancée
- **Calcul précis de consommation** basé sur le runtime différentiel
- **Statistiques détaillées** par période avec modulation
- **Données météo** intégrées (température extérieure)
- **Graphiques de tendances** quotidiennes

## 🔧 Configuration Initiale

### 1. Activation du Service
1. Ouvrez l'interface **"Gestion Données Chaudière"**
2. Dans la section **"Import Automatique"**, cliquez sur **"Activer Auto-Import"**
3. Le système commence immédiatement la surveillance du dossier

### 2. Configuration Chaudière
```
⚙️ Paramètres recommandés :
- Puissance nominale : 15 kW (à ajuster selon votre modèle)
- Consommation pellets : 0.2 kg/kWh (moyenne Okofen)
```

## 📧 Workflow Email → Import

### Méthode 1: Sauvegarde Manuelle (Recommandée)
```
1. 📧 Réception email quotidien Okofen
2. 💾 Télécharger le fichier CSV joint
3. 📁 Sauvegarder dans le dossier racine du projet : 
   /pelletsFun/touch_YYYYMMDD.csv
4. 🤖 Import automatique détecté et traité
5. ✅ Fichier archivé dans /processed/
```

### Méthode 2: Upload Manuel
```
1. 📤 Utiliser le bouton "Upload Fichier CSV Okofen"
2. ✅ Import immédiat avec validation
3. 📊 Mise à jour instantanée des statistiques
```

### Méthode 3: Import Manuel Gmail (🆕 Nouvelle Fonctionnalité)
```
1. 🚀 Cliquez sur "Déclencher Import Maintenant"
2. 📧 Import automatique depuis Gmail avec mêmes paramètres que le cron
3. 📊 Rapport détaillé avec statistiques complètes
4. ✅ Contrôle manuel de l'automatisation
```

## 📁 Structure des Fichiers

### Format Attendu
```
Nom de fichier : touch_YYYYMMDD.csv
Exemple : touch_20251103.csv

Encodage : Latin1 (ISO-8859-1)
Séparateur : ; (point-virgule)
```

### Colonnes Requises
```csv
Date/Heure;T° Extérieure;Modulation;Temps de fonctionnement
03.11.2025 00:00;5.5;45;1234.5
```

## 🔍 Surveillance et Monitoring

### Indicateurs d'État
- **🟢 Surveillance Active** : Service opérationnel
- **🔴 Surveillance Inactive** : Service arrêté
- **⏰ Vérification programmée** : Cron job actif

### Vérification Manuelle
Utilisez **"Vérifier Nouveaux Fichiers"** pour :
- Forcer une vérification immédiate
- Tester le système après ajout de fichiers
- Diagnostiquer les problèmes d'import

### Import Manuel Gmail (🆕)
Le bouton **"Déclencher Import Maintenant"** permet :
- **🚀 Import immédiat** des emails Gmail selon les paramètres configurés
- **📊 Rapport détaillé** avec statistiques avant/après import
- **🔧 Test et dépannage** de la configuration Gmail
- **⚡ Rattrapage** d'imports ratés ou panne système

**Affichage des résultats :**
- 📈 **Statistiques** : Nouvelles entrées, fichiers importés, totaux
- 🛠️ **Service Stats** : Fichiers traités, doublons ignorés, taux d'erreur
- 📧 **Gmail Details** : Fichiers téléchargés et traités depuis Gmail

## 📊 Utilisation des Données

### Statistiques Générales
```
📈 Métriques disponibles :
- Runtime total de la chaudière
- Consommation estimée (kg pellets)
- Nombre de fichiers traités
- Période de données disponible
```

### Calcul de Consommation
```
🧮 Paramètres :
- Période personnalisable (date début → fin)
- Calcul basé sur runtime différentiel
- Prise en compte de la modulation
- Corrélation température extérieure
```

### Analyse Quotidienne
```
📅 Données par jour :
- Température min/max
- Modulation moyenne
- Runtime effectif
- Consommation estimée
```

## 🛠️ Résolution de Problèmes

### Fichier Non Détecté
```
❓ Vérifications :
1. ✅ Nom de fichier correct : touch_YYYYMMDD.csv
2. ✅ Emplacement : dossier racine du projet
3. ✅ Service auto-import activé
4. 🔄 Utiliser "Vérifier Nouveaux Fichiers"
```

### Erreur d'Import
```
❌ Causes communes :
- Encodage incorrect (utiliser Latin1)
- Format CSV invalide
- Données manquantes ou corrompues
- Fichier déjà traité (vérifier dossier processed/)
```

### Performance
```
⚡ Optimisations :
- Un fichier CSV = ~1440 lignes (24h × 60min)
- Import typique : < 5 secondes
- Base de données indexée pour performances
```

## 📈 Conseils d'Usage

### Routine Quotidienne
```
1. 🌅 Réception email Okofen (généralement le matin)
2. 💾 Sauvegarde rapide du CSV dans le dossier
3. 📊 Vérification automatique des nouvelles données
4. 📈 Consultation des statistiques mises à jour
```

### Analyse Hebdomadaire
```
📅 Recommandations :
- Analyser la consommation par semaine
- Corréler avec les températures extérieures
- Identifier les pics de consommation
- Optimiser les réglages chaudière
```

### Maintenance
```
🧹 Tâches périodiques :
- Vider le dossier processed/ si nécessaire
- Sauvegarder les données importantes
- Vérifier la cohérence des calculs
```

## 🔐 Sécurité et Sauvegarde

### Données Sensibles
```
🛡️ Protection :
- Aucune donnée personnelle stockée
- Seules les statistiques techniques conservées
- Accès local uniquement (pas d'exposition internet)
```

### Sauvegarde Recommandée
```
💾 À sauvegarder :
- Base de données MongoDB
- Fichiers CSV originaux
- Configuration chaudière personnalisée
```

## 📞 Support

### Logs et Debug
```
🔍 Informations disponibles :
- Messages d'erreur détaillés dans l'interface
- Logs serveur en console
- Statistiques d'import en temps réel
```

### Amélirations Futures
```
🚀 Roadmap :
- [ ] Import direct depuis email
- [ ] Graphiques avancés
- [ ] Alertes consommation
- [ ] Export données Excel
- [ ] API mobile
```

---

## 🎉 Félicitations !

Votre système d'auto-import Okofen est maintenant opérationnel. Profitez de l'analyse automatique de votre consommation de pellets et optimisez le rendement de votre installation ! 🔥

*Dernière mise à jour : Novembre 2024*