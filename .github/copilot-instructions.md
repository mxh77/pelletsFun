# Instructions pour GitHub Copilot - PelletsFun

## Instructions générales
**TOUJOURS répondre en français** - Toutes les communications, explications, suggestions et commentaires doivent être exclusivement en français.

## ⚠️ SÉCURITÉ - VÉRIFICATION OBLIGATOIRE
**AVANT TOUT COMMIT** : Vérifier qu'aucun credential n'est présent dans le code :
- ❌ Jamais de mots de passe, tokens, clés API en dur dans le code
- ❌ Jamais d'URI MongoDB avec credentials (mongodb+srv://user:password@...)
- ✅ Toujours utiliser process.env.VARIABLE_NAME
- ✅ Vérifier que .env, credentials.json, tokens.json sont dans .gitignore
- ✅ Utiliser require('dotenv').config() dans les scripts
- ⚠️ Si credentials détectés : annuler commit, nettoyer code, révoquer credentials exposés

## Contexte du projet
Ce projet est une application de gestion de données de chaudière à pellets avec :
- Backend Node.js/Express avec MongoDB Atlas (même DB pour dev et prod)
- Frontend React
- Intégration Gmail API OAuth2 pour import automatique de fichiers CSV
- Déploiement sur serveur Proxmox avec PM2
- Production : https://pelletsfun.harmonixe.fr
- Backend port 3001 (dev) / 5000 (prod), Frontend port 3000 (dev)

## Instructions de développement

### Architecture
- Respecter la structure 3-sections pliables dans l'interface (Configuration, Import & Traitement, Analyse & Historique)
- Maintenir la persistance des configurations en base de données
- Suivre les patterns établis pour les modèles MongoDB (BoilerConfig, GmailConfig, etc.)

### Bonnes pratiques
- Toujours valider les entrées utilisateur côté backend
- Utiliser les styles CSS existants dans BoilerManagerRestructured.css
- Maintenir la cohérence des messages d'erreur et de succès
- Logger les opérations importantes avec des emojis pour faciliter le debugging

### Gestion des données
- Éviter la duplication de données en MongoDB (optimisation quota 512MB)
- Implémenter la suppression en cascade pour maintenir l'intégrité
- Utiliser les agrégations MongoDB pour les statistiques
- Maintenir l'historique des imports avec catégorisation temporelle
- **IMPORTANT** : Modèle BoilerData utilise le champ 'date' (pas 'timestamp') pour les requêtes
- Fichiers CSV avec format Ökofen : colonnes avec espaces ('AT [°C]', 'PE1 KT[°C]', 'PE1 SW[°C]')

### Interface utilisateur
- Utiliser les composants pliables existants
- Maintenir l'accessibilité (focus states, ARIA labels)
- Responsive design obligatoire
- Confirmations utilisateur pour les actions destructives

### Configuration Gmail
- Centraliser toute la configuration Gmail dans GmailConfig (collection MongoDB)
- Supporter les multi-expéditeurs via le tableau senders (ex: ['no-reply@my.oekofen.info'])
- Gérer la migration automatique des anciennes configurations
- Maintenir la compatibilité OAuth2 avec refresh tokens
- **Credentials** : backend/config/gmail-credentials.json
- **Token** : backend/config/gmail-token.json
- **GmailService** : Accepte credentialsPath et tokenPath en paramètres pour éviter les problèmes de chemins

## Processus de version et déploiement

### À la fin de chaque développement d'évolution
**OBLIGATOIRE** : Toujours proposer de tester en local AVANT tout déploiement en production.
**INTERDIT** : Ne jamais déployer en production sans test local préalable validé par l'utilisateur.
**INTERDIT** : Ne jamais proposer de build après une évolution (ex.: `npm run build`).
**INTERDIT** : Ne jamais créer de documentation sans demande explicite.

### Commande de déploiement production
**⚠️ ATTENTION - SYNTAXE OBLIGATOIRE :**
**Lorsque je demande de commiter et déployer en production**, utiliser **EXCLUSIVEMENT** cette syntaxe :
```bash
./deploy-production.sh "Message de commit détaillé"
```

**❌ NE JAMAIS :**
- Exécuter `./deploy-production.sh` sans message
- Proposer `git add` ou `git commit` séparément
- Lancer le serveur de développement (`./start-dev.sh`)

**✅ CORRECT :**
```bash
./deploy-production.sh "feat: Ajout suppression imports avec validation"
```

**✅ AVEC MESSAGE DÉTAILLÉ :**
```bash
./deploy-production.sh "✨ Interface révolutionnée: sélection multi-mois cross-année + design moderne

🎨 Améliorations majeures:
- Sélection multiple indépendante des années  
- Auto-sélection des 3 derniers mois
- Interface compacte avec boutons toggle
- Design élégant avec gradients

🔧 Corrections techniques:
- Format selectedMonths cross-année
- Logique de sélection persistante
- UX améliorée avec états visuels

🚀 Résultat: Interface moderne et fonctionnelle"
```

Format des commandes recommandé :
```bash
git add .
git commit -m "feat: Description concise de l'évolution

- Point clé 1 en français
- Point clé 2 en français  
- Point clé 3 en français"
```

Exemples de messages de commit :
- `feat: Ajout suppression imports et catégorisation historique`
- `fix: Correction filtrage intervalle d'import des données CSV`
- `refactor: Centralisation gestion configuration Gmail`
- `style: Amélioration design responsive mobile`

### Structure des messages de commit
- Utiliser les préfixes conventionnels : `feat:`, `fix:`, `refactor:`, `style:`, `docs:`
- Description courte en français (première ligne)
- Détails en français avec tirets (lignes suivantes)
- Mentionner les breaking changes si applicable

### Déploiement manuel
**Local :** Après le commit, l'utilisateur exécutera manuellement :
```bash
./deploy-local.sh "Message du commit"
```

**Production :** Commit + déploiement en une seule commande :
```bash
./deploy-production.sh "Message du commit"
```

### ⚠️ Résolution des erreurs de déploiement

**Si `./deploy-production.sh` lance le serveur de développement :**
1. Vérifier que le script n'a pas été modifié
2. S'assurer d'utiliser la syntaxe avec guillemets : `./deploy-production.sh "message"`
3. Contrôler les permissions du script : `chmod +x deploy-production.sh`

**Messages d'erreur courants :**
- `❌ Serveur backend non accessible` → Script en cours d'exécution, attendre la fin
- `Permission denied` → Exécuter `chmod +x deploy-production.sh`
- `No such file` → Vérifier d'être dans le répertoire racine du projet

### Tests avant déploiement
- Vérifier le build frontend (`npm run build`)
- Tester les nouvelles fonctionnalités localement
- Vérifier les logs backend pour les erreurs
- Valider l'interface sur différentes tailles d'écran

## Scripts de récupération de fichiers
### recover-and-import-missing-files.js
Script automatique de récupération et import des fichiers CSV manquants depuis Gmail :

**Chemins critiques** :
- **TOUJOURS** utiliser la détection automatique du répertoire de base :
  ```javascript
  const isInBackend = process.cwd().endsWith('backend');
  const BASE_DIR = isInBackend ? process.cwd() : path.join(process.cwd(), 'backend');
  ```
- **NE JAMAIS** hardcoder `backend/` dans les chemins (cause erreurs `backend/backend/`)
- Auto-downloads : `path.join(BASE_DIR, 'auto-downloads')`
- Config Gmail : `path.join(BASE_DIR, 'config', 'gmail-credentials.json')`

**Logique de récupération** :
- Génère dates de startDate jusqu'à **hier (J-1)** - fichier du jour généré le lendemain
- Vérifie fichier ET données en base (champ 'date' du modèle BoilerData)
- Charge config Gmail depuis MongoDB (senders, subject)
- Utilise `searchOkofenEmails` avec `overwriteExisting: true` pour forcer le re-téléchargement
- Parse CSV avec colonnes Ökofen (espaces dans les noms)

**Flags disponibles** :
- `--dry-run` : Simulation sans actions
- `--skip-gmail` : Import fichiers locaux uniquement

**Utilisation** :
```bash
node backend/scripts/recover-and-import-missing-files.js 2025-11-01
# OU depuis backend/
node scripts/recover-and-import-missing-files.js 2025-11-01
```

### GmailService - Gestion des chemins
**CRITIQUE** : `GmailService` doit stocker `this.tokenPath` passé en paramètre et l'utiliser pour :
- Lecture initiale du token
- Sauvegarde lors du renouvellement (`ensureValidToken`)
- Sauvegarde après échange code (`exchangeCodeForToken`)

**NE JAMAIS** utiliser `path.join(process.cwd(), 'config', 'gmail-token.json')` en dur.

## Maintenance et debugging
- Utiliser `pm2 logs pelletsfun-backend` pour les logs
- Surveiller l'utilisation MongoDB Atlas (quota 512MB)
- Vérifier les certificats SSL et la configuration Nginx
- Maintenir la documentation des nouvelles fonctionnalités
- **Problèmes chemins** : Toujours vérifier si lancé depuis racine ou backend/
- **Import CSV** : Vérifier format colonnes avec espaces (caractères spéciaux UTF-8)

**Note importante** : Il faut bien utiliser `ssh pelletsfun@192.168.1.90` (IP locale) et non le nom de domaine pour les opérations de maintenance serveur.