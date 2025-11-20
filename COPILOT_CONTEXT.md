# 🎯 PROMPT POUR NOUVELLE CONVERSATION PELLETSFUN

## 📋 CONTEXTE PROJET
Je travaille sur **PelletsFun**, une application de gestion de chaudière à pellets avec import automatique Gmail. Le projet est hébergé sur GitHub (mxh77/pelletsFun) et déployé en production sur https://pelletsfun.harmonixe.fr.

## 🏗️ ARCHITECTURE TECHNIQUE
- **Backend** : Node.js/Express sur port 3001 (dev) / 5000 (prod)
- **Frontend** : React sur port 3000 (dev) / nginx (prod) 
- **Base de données** : MongoDB Atlas (même DB pour dev et prod)
- **Déploiement** : Script automatisé `deploy-production.sh` avec PM2
- **Gmail API** : OAuth2 pour import automatique de fichiers CSV joints

## 📁 STRUCTURE PROJET
```
pelletsFun/
├── backend/               # API Node.js/Express
│   ├── config/
│   │   ├── ports.js      # ⭐ Configuration centralisée des ports
│   │   ├── db.js         # Connexion MongoDB
│   │   └── gmail-credentials.json
│   ├── controllers/      # boilerController.js (logique principale)
│   ├── models/          # BoilerData, BoilerConfig, GmailConfig
│   ├── routes/          # Routes API
│   ├── services/        # gmailService, autoImportService
│   └── .env            # Credentials locales (ignoré par Git)
├── client/              # Frontend React
│   ├── src/components/
│   │   ├── BoilerManager.js  # ⭐ Interface principale
│   │   └── GmailConfig.js
│   └── .env            # Config frontend (ignorée par Git)
├── .env.example         # Templates sans credentials
└── deploy-production.sh # Script de déploiement
```

## 🔧 FONCTIONNALITÉS ACTUELLES
1. **Interface 3 sections pliables** : Configuration chaudière, Gmail auto-import, Import manuel
2. **Import Gmail automatique** : Traitement emails avec fichiers CSV (cron job)
3. **Import manuel** : Sélection période + multi-expéditeurs avec filtrage temporel
4. **Historique imports** : Catégorisation par année/mois avec suppression possible
5. **Configuration persistante** : Paramètres chaudière + adresses expéditrices en MongoDB
6. **Stockage persistant adresses** : Auto-sauvegarde + bouton manuel via GmailConfig

## ⚙️ CONFIGURATION RÉCENTE
- **Ports centralisés** dans `backend/config/ports.js` (UNIQUE source de vérité)
- **Plus de ports hardcodés** dans le code
- **Configuration .env simplifiée** : 1 fichier .env par service (backend + client)
- **Fichiers .env dans .gitignore** pour sécurité (templates .env.example committés)
- **Variables d'environnement** avec fallbacks intelligents dev/prod

## 🎨 INTERFACE UTILISATEUR
- **BoilerManager.js** : Interface principale avec gestion état React
- **Styles CSS** : BoilerManager.css avec classes pour boutons, sections, contrôles
- **API calls** : axios avec proxy React vers backend
- **Gestion erreurs** : Try/catch avec messages utilisateur
- **Loading states** : Boutons disabled pendant opérations

## 📊 MODÈLES DONNÉES
- **BoilerConfig** : Paramètres chaudière (intervalles, seuils, etc.)
- **GmailConfig** : Config Gmail (expéditeurs array, planning cron, etc.) 
- **BoilerData** : Données CSV importées avec timestamps
- **Champs principaux** : date, pelletLevel, temperature, consumption, etc.

## 🔐 SÉCURITÉ & DÉPLOIEMENT
- **Credentials MongoDB** : Seulement dans fichiers .env locaux (ignorés par Git)
- **Gmail OAuth2** : Callbacks configurés pour dev (3001) et prod
- **CORS** : Configuration automatique selon environnement
- **PM2** : Gestion processus production avec restart automatique
- **Git workflow** : Commits détaillés + push automatique + déploiement

**Note importante** : Il faut bien utiliser `ssh pelletsfun@192.168.1.90` (IP locale) et non le nom de domaine pour les opérations de maintenance serveur.

## 🎯 STATUT ACTUEL
✅ **Fonctionnel** : Toutes les fonctionnalités opérationnelles en dev et prod
✅ **Sécurisé** : Credentials protégées, configuration centralisée  
✅ **Déployé** : Version récente en production (commit cd99dbd)
✅ **Performance** : Import rapide, interface réactive, MongoDB optimisé

## ❓ POUR QUOI J'AI BESOIN D'AIDE
Je peux avoir besoin d'aide pour :
- Nouvelles fonctionnalités (ex: graphiques, exports, optimisations)
- Debug/corrections (erreurs, performance, UI/UX)
- Améliorations techniques (refactoring, tests, sécurité)
- Questions de déploiement ou configuration

**Contexte à jour au 10 novembre 2025 - Le projet est stable et prêt pour évolutions ! 🚀**

## 📝 UTILISATION
Copie le contenu de ce fichier dans une nouvelle conversation avec GitHub Copilot pour avoir tout le contexte nécessaire du projet PelletsFun.