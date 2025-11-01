# Configuration DNS Hostinger pour PelletsFun

## 📍 Enregistrements DNS à ajouter

Connectez-vous à votre compte Hostinger : https://www.hostinger.fr

Allez dans **Domaines** → **harmonixe.fr** → **DNS / Nameservers**

### Enregistrement A pour PelletsFun

```
Type : A
Nom : pelletsfun
Pointe vers : 90.63.115.155
TTL : 14400 (ou laisser par défaut)
```

### Vérification de la configuration actuelle

Vos enregistrements actuels devraient ressembler à :

```
Type    Nom         Pointe vers        TTL
----    ----        ------------       -----
A       @           90.63.115.155      14400
A       proxmox     90.63.115.155      14400
A       ha          90.63.115.155      14400
A       pelletsfun  90.63.115.155      14400  ← À AJOUTER
```

## 🔍 Vérification DNS

Après avoir ajouté l'enregistrement, attendez quelques minutes puis testez :

### Depuis Windows (PowerShell ou CMD)
```powershell
nslookup pelletsfun.harmonixe.fr
```

### Depuis Linux/WSL
```bash
dig pelletsfun.harmonixe.fr
# OU
host pelletsfun.harmonixe.fr
```

### En ligne
- https://dnschecker.org/ → Entrez `pelletsfun.harmonixe.fr`
- https://www.whatsmydns.net/ → Entrez `pelletsfun.harmonixe.fr`

## ⏱️ Délai de propagation

- **Minimum** : 5-15 minutes
- **Typique** : 30 minutes - 2 heures
- **Maximum** : Jusqu'à 48 heures (rare)

## 🔄 Mise à jour automatique de l'IP (Dynamic DNS)

Si votre IP publique change fréquemment, vous pouvez :

### Option 1 : Via la box internet
Configurer le DynDNS dans votre box si elle le supporte.

### Option 2 : Script avec Hostinger API
Créer un script qui met à jour automatiquement l'IP via l'API Hostinger.

**Note** : Hostinger ne propose pas de DynDNS natif, mais vous pouvez :
1. Utiliser un service gratuit comme DuckDNS, No-IP
2. Créer un script personnalisé avec leur API
3. Utiliser Cloudflare (DNS gratuit avec API simple)

### Option 3 : Migration vers Cloudflare (recommandé)

Cloudflare offre :
- DNS gratuit et rapide
- API simple pour Dynamic DNS
- Protection DDoS gratuite
- Cache CDN

**Script DynDNS pour Cloudflare** (exemple) :
```bash
#!/bin/bash
ZONE_ID="votre_zone_id"
RECORD_ID="votre_record_id"
API_TOKEN="votre_api_token"
DOMAIN="pelletsfun.harmonixe.fr"

CURRENT_IP=$(curl -s https://api.ipify.org)

curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
     -H "Authorization: Bearer $API_TOKEN" \
     -H "Content-Type: application/json" \
     --data "{\"type\":\"A\",\"name\":\"$DOMAIN\",\"content\":\"$CURRENT_IP\"}"
```

## 📝 Sous-domaines configurés

| Sous-domaine | Service | IP | Statut |
|--------------|---------|----|----|
| proxmox.harmonixe.fr | Proxmox Web UI | 90.63.115.155 → 192.168.1.81 → 192.168.1.78:8006 | ✅ |
| ha.harmonixe.fr | Home Assistant | 90.63.115.155 → 192.168.1.81 → 192.168.1.107 | ✅ |
| pelletsfun.harmonixe.fr | PelletsFun App | 90.63.115.155 → 192.168.1.81 → 192.168.1.90 | 🔄 |

## 🔒 Configuration SSL

Le certificat SSL Let's Encrypt sera automatiquement généré par Nginx Proxy Manager une fois :
1. L'enregistrement DNS propagé
2. Le Proxy Host configuré dans NPM
3. Le port 80 accessible depuis Internet

**Aucune action manuelle nécessaire** - NPM gère tout automatiquement ! ✨
