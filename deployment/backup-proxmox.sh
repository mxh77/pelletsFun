#!/bin/bash
# Script de backup manuel pour le conteneur PelletsFun
# À exécuter sur le HOST Proxmox (pas dans le conteneur)

set -e

CTID=108
STORAGE="local"
COMPRESS="zstd"
MODE="snapshot"

echo "🗂️  Backup du conteneur PelletsFun (CT $CTID)..."

# Vérifier si le conteneur existe
if ! pct status $CTID > /dev/null 2>&1; then
    echo "❌ Erreur : Le conteneur $CTID n'existe pas"
    exit 1
fi

# Effectuer le backup
vzdump $CTID \
    --storage $STORAGE \
    --mode $MODE \
    --compress $COMPRESS \
    --mailnotification always

echo "✅ Backup terminé !"
echo ""
echo "📁 Emplacement du backup : /var/lib/vz/dump/"
ls -lh /var/lib/vz/dump/ | grep "vzdump-lxc-$CTID"
