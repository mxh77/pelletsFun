# Configuration Environment Variables

## Installation rapide

1. **Backend** :
```bash
cp backend/.env.example backend/.env
# Éditer backend/.env avec tes vraies credentials MongoDB
```

2. **Frontend** :
```bash  
cp client/.env.example client/.env
# (Généralement pas besoin de modification)
```

3. **Production** :
   - Copier manuellement les fichiers `.env` sur le serveur avec les credentials de production

## Structure

```
backend/
  .env.example  ← Template (dans Git)
  .env          ← Vraies credentials (ignoré par Git)
  
client/
  .env.example  ← Template (dans Git)  
  .env          ← Config locale (ignorée par Git)
```

**Simple et standard !**