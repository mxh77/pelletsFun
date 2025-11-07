#!/bin/bash

# Scripts de gestion MongoDB pour PelletsFun
# ==========================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage coloré
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier que Node.js est disponible
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js n'est pas installé ou pas dans le PATH"
        exit 1
    fi
}

# Vérifier que les dépendances sont installées
check_dependencies() {
    if [ ! -d "node_modules" ] && [ ! -d "backend/node_modules" ]; then
        print_warning "Les dépendances ne semblent pas installées"
        echo "Exécutez: npm install ou cd backend && npm install"
        exit 1
    fi
}

# Fonction principale d'aide
show_help() {
    print_header "SCRIPTS DE GESTION MONGODB - PELLETSFUN"
    echo ""
    echo "Usage: $0 [COMMANDE]"
    echo ""
    echo "COMMANDES DISPONIBLES:"
    echo "  analyze        Analyser l'utilisation de l'espace MongoDB"
    echo "  cleanup        Nettoyer la base (doublons + anciennes données)"
    echo "  duplicates     Supprimer seulement les doublons (plus sûr)"
    echo "  check          Diagnostiquer le service d'auto-import"
    echo "  improve        Générer le service d'import amélioré"
    echo "  backup         Sauvegarder l'ancien service"
    echo "  replace        Remplacer par le service amélioré"
    echo "  status         Afficher le statut actuel"
    echo "  help           Afficher cette aide"
    echo ""
    echo "EXEMPLES:"
    echo "  $0 analyze     # Analyser la base de données"
    echo "  $0 duplicates  # Nettoyer seulement les doublons"
    echo "  $0 improve     # Créer le service amélioré"
    echo ""
}

# Analyser la base de données
analyze_database() {
    print_header "ANALYSE DE LA BASE DE DONNÉES"
    check_node
    check_dependencies
    
    if [ ! -f "analyze-mongodb-space.js" ]; then
        print_error "Script analyze-mongodb-space.js non trouvé"
        exit 1
    fi
    
    print_success "Lancement de l'analyse..."
    node analyze-mongodb-space.js
}

# Nettoyer la base (complet)
cleanup_database() {
    print_header "NETTOYAGE COMPLET DE LA BASE"
    print_warning "ATTENTION: Cette opération peut supprimer des données!"
    
    echo -n "Êtes-vous sûr de vouloir continuer? (y/N): "
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Opération annulée"
        exit 0
    fi
    
    check_node
    check_dependencies
    
    if [ ! -f "cleanup-mongodb.js" ]; then
        print_error "Script cleanup-mongodb.js non trouvé"
        exit 1
    fi
    
    print_success "Lancement du nettoyage complet..."
    node cleanup-mongodb.js
}

# Nettoyer seulement les doublons
cleanup_duplicates() {
    print_header "SUPPRESSION DES DOUBLONS"
    
    echo -n "Supprimer les doublons? (y/N): "
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Opération annulée"
        exit 0
    fi
    
    check_node
    check_dependencies
    
    if [ ! -f "cleanup-mongodb.js" ]; then
        print_error "Script cleanup-mongodb.js non trouvé"
        exit 1
    fi
    
    print_success "Suppression des doublons uniquement..."
    node cleanup-mongodb.js --duplicates-only
}

# Diagnostiquer le service
check_service() {
    print_header "DIAGNOSTIC DU SERVICE D'IMPORT"
    check_node
    check_dependencies
    
    if [ ! -f "check-import-service.js" ]; then
        print_error "Script check-import-service.js non trouvé"
        exit 1
    fi
    
    print_success "Diagnostic en cours..."
    node check-import-service.js
}

# Générer le service amélioré
improve_service() {
    print_header "GÉNÉRATION DU SERVICE AMÉLIORÉ"
    check_node
    
    if [ ! -f "generate-improved-service.js" ]; then
        print_error "Script generate-improved-service.js non trouvé"
        exit 1
    fi
    
    print_success "Génération du service amélioré..."
    node generate-improved-service.js
    
    if [ -f "backend/services/autoImportService-improved.js" ]; then
        print_success "Service amélioré généré avec succès!"
        echo ""
        echo "📁 Fichier créé: backend/services/autoImportService-improved.js"
        echo ""
        echo "🔄 Pour l'utiliser:"
        echo "   1. Sauvegardez l'ancien: $0 backup"
        echo "   2. Remplacez le service: $0 replace"
    fi
}

# Sauvegarder l'ancien service
backup_service() {
    print_header "SAUVEGARDE DE L'ANCIEN SERVICE"
    
    local original="backend/services/autoImportService.js"
    local backup="backend/services/autoImportService-backup-$(date +%Y%m%d-%H%M%S).js"
    
    if [ ! -f "$original" ]; then
        print_error "Service original non trouvé: $original"
        exit 1
    fi
    
    cp "$original" "$backup"
    print_success "Sauvegarde créée: $backup"
}

# Remplacer par le service amélioré
replace_service() {
    print_header "REMPLACEMENT DU SERVICE"
    
    local improved="backend/services/autoImportService-improved.js"
    local original="backend/services/autoImportService.js"
    
    if [ ! -f "$improved" ]; then
        print_error "Service amélioré non trouvé. Exécutez d'abord: $0 improve"
        exit 1
    fi
    
    print_warning "Cette opération va remplacer le service existant"
    echo -n "Continuer? (y/N): "
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Opération annulée"
        exit 0
    fi
    
    # Sauvegarder automatiquement
    backup_service
    
    # Remplacer
    cp "$improved" "$original"
    print_success "Service remplacé avec succès!"
    
    print_warning "N'oubliez pas de redémarrer votre application Node.js"
}

# Afficher le statut
show_status() {
    print_header "STATUT ACTUEL"
    
    echo "📁 Fichiers disponibles:"
    
    [ -f "analyze-mongodb-space.js" ] && echo "  ✅ analyze-mongodb-space.js" || echo "  ❌ analyze-mongodb-space.js"
    [ -f "cleanup-mongodb.js" ] && echo "  ✅ cleanup-mongodb.js" || echo "  ❌ cleanup-mongodb.js"
    [ -f "check-import-service.js" ] && echo "  ✅ check-import-service.js" || echo "  ❌ check-import-service.js"
    [ -f "generate-improved-service.js" ] && echo "  ✅ generate-improved-service.js" || echo "  ❌ generate-improved-service.js"
    
    echo ""
    echo "🔧 Services:"
    
    if [ -f "backend/services/autoImportService.js" ]; then
        echo "  ✅ Service original présent"
    else
        echo "  ❌ Service original manquant"
    fi
    
    if [ -f "backend/services/autoImportService-improved.js" ]; then
        echo "  ✅ Service amélioré généré"
    else
        echo "  ❌ Service amélioré non généré"
    fi
    
    echo ""
    echo "💾 Sauvegardes:"
    local backups=$(find backend/services/ -name "autoImportService-backup-*.js" 2>/dev/null | wc -l)
    echo "  📦 $backups sauvegarde(s) trouvée(s)"
    
    echo ""
    echo "📊 Environnement:"
    
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        echo "  ✅ Node.js: $node_version"
    else
        echo "  ❌ Node.js non disponible"
    fi
    
    if [ -f "backend/.env" ]; then
        echo "  ✅ Configuration .env présente"
    else
        echo "  ❌ Configuration .env manquante"
    fi
    
    if [ -d "backend/node_modules" ] || [ -d "node_modules" ]; then
        echo "  ✅ Dépendances Node.js installées"
    else
        echo "  ❌ Dépendances Node.js manquantes"
    fi
}

# Router les commandes
case "${1:-help}" in
    "analyze")
        analyze_database
        ;;
    "cleanup")
        cleanup_database
        ;;
    "duplicates")
        cleanup_duplicates
        ;;
    "check")
        check_service
        ;;
    "improve")
        improve_service
        ;;
    "backup")
        backup_service
        ;;
    "replace")
        replace_service
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        show_help
        ;;
esac