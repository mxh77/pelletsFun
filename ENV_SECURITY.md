# Configuration des Credentials MongoDB

## ⚠️ SÉCURITÉ IMPORTANTE

Les fichiers `.env` dans ce dépôt sont des **TEMPLATES** sans vraies credentials.

### Configuration pour le développement local

1. **Backend** : Crée un fichier `.env.local` dans le dossier `backend/` :
```bash
# backend/.env.local
MONGODB_URI=mongodb+srv://TON_USER:TON_PASSWORD@TON_CLUSTER.mongodb.net/pelletsFun?retryWrites=true&w=majority&appName=monPetitRoadtrip
PORT=3001
FRONTEND_PORT=3000
```

2. **Frontend** : Le fichier `client/.env` est déjà configuré correctement.

### Configuration pour la production

Les variables d'environnement doivent être définies directement sur le serveur :

```bash
export MONGODB_URI="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/DATABASE"
export PORT=5000
export NODE_ENV=production
```

### Règles de sécurité

- ✅ **Jamais** de vraies credentials dans les fichiers `.env` commités
- ✅ **Toujours** utiliser `.env.local` pour le développement local
- ✅ **Variables d'environnement système** pour la production
- ✅ Fichiers `.env.local` sont ignorés par Git automatiquement

## Structure finale simple

```
backend/
  .env          ← Template (dans Git) - SANS vraies credentials
  .env.local    ← Vraies credentials (ignoré par Git)
  
client/
  .env          ← Configuration frontend (dans Git)
```

**SIMPLE ET SÉCURISÉ !**