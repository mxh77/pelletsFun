---
description: "Déployer en production"
---

# Déploiement en Production

## Commande de déploiement

**⚠️ SYNTAXE OBLIGATOIRE :**

```bash
./deploy-production.sh "Message de commit détaillé"
```

## Exemples d'utilisation

### Message simple
```bash
./deploy-production.sh "feat: Ajout suppression imports avec validation"
```

### Message détaillé avec emojis
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

## ❌ À NE JAMAIS FAIRE

- Exécuter `./deploy-production.sh` sans message
- Proposer `git add` ou `git commit` séparément
- Lancer le serveur de développement (`./start-dev.sh`)
- Proposer de build (`npm run build`) après une évolution
- Proposer de déploiement local après une évolution

## ✅ Processus automatique

Le script `deploy-production.sh` effectue automatiquement :
1. Vérification de sécurité (aucun credential dans le code)
2. Build du frontend React
3. Commit Git avec le message fourni
4. Push vers le dépôt distant
5. Connexion SSH au serveur Proxmox
6. Pull des dernières modifications
7. Installation des dépendances si nécessaire
8. Redémarrage PM2
9. Vérification de l'état du serveur

## Structure des messages de commit

Utiliser les préfixes conventionnels :
- `feat:` - Nouvelle fonctionnalité
- `fix:` - Correction de bug
- `refactor:` - Refactoring de code
- `style:` - Amélioration visuelle/CSS
- `docs:` - Documentation

## Résolution des erreurs

### Le script lance le serveur de développement
1. Vérifier que le script n'a pas été modifié
2. S'assurer d'utiliser la syntaxe avec guillemets
3. Contrôler les permissions : `chmod +x deploy-production.sh`

### Messages d'erreur courants
- `❌ Serveur backend non accessible` → Attendre la fin du déploiement
- `Permission denied` → Exécuter `chmod +x deploy-production.sh`
- `No such file` → Vérifier d'être dans le répertoire racine du projet

## Tests avant déploiement

- [ ] Vérifier le build frontend localement
- [ ] Tester les nouvelles fonctionnalités
- [ ] Vérifier les logs backend
- [ ] Valider l'interface responsive
- [ ] **Vérifier l'absence de credentials dans le code**