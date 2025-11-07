@echo off
setlocal enabledelayedexpansion

REM Scripts de gestion MongoDB pour PelletsFun
REM ==========================================

set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Fonction d'affichage coloré
:print_header
echo %BLUE%================================%NC%
echo %BLUE%%~1%NC%
echo %BLUE%================================%NC%
goto :eof

:print_success
echo %GREEN%✅ %~1%NC%
goto :eof

:print_warning
echo %YELLOW%⚠️  %~1%NC%
goto :eof

:print_error
echo %RED%❌ %~1%NC%
goto :eof

REM Vérifier que Node.js est disponible
:check_node
where node >nul 2>nul
if errorlevel 1 (
    call :print_error "Node.js n'est pas installé ou pas dans le PATH"
    exit /b 1
)
goto :eof

REM Vérifier que les dépendances sont installées
:check_dependencies
if not exist "node_modules" if not exist "backend\node_modules" (
    call :print_warning "Les dépendances ne semblent pas installées"
    echo Exécutez: npm install ou cd backend && npm install
    exit /b 1
)
goto :eof

REM Fonction principale d'aide
:show_help
call :print_header "SCRIPTS DE GESTION MONGODB - PELLETSFUN"
echo.
echo Usage: %~nx0 [COMMANDE]
echo.
echo COMMANDES DISPONIBLES:
echo   analyze        Analyser l'utilisation de l'espace MongoDB
echo   cleanup        Nettoyer la base (doublons + anciennes données)
echo   duplicates     Supprimer seulement les doublons (plus sûr)
echo   check          Diagnostiquer le service d'auto-import
echo   improve        Générer le service d'import amélioré
echo   backup         Sauvegarder l'ancien service
echo   replace        Remplacer par le service amélioré
echo   status         Afficher le statut actuel
echo   help           Afficher cette aide
echo.
echo EXEMPLES:
echo   %~nx0 analyze     # Analyser la base de données
echo   %~nx0 duplicates  # Nettoyer seulement les doublons
echo   %~nx0 improve     # Créer le service amélioré
echo.
goto :eof

REM Analyser la base de données
:analyze_database
call :print_header "ANALYSE DE LA BASE DE DONNÉES"
call :check_node
if errorlevel 1 exit /b 1
call :check_dependencies
if errorlevel 1 exit /b 1

if not exist "analyze-mongodb-space.js" (
    call :print_error "Script analyze-mongodb-space.js non trouvé"
    exit /b 1
)

call :print_success "Lancement de l'analyse..."
node analyze-mongodb-space.js
goto :eof

REM Nettoyer la base (complet)
:cleanup_database
call :print_header "NETTOYAGE COMPLET DE LA BASE"
call :print_warning "ATTENTION: Cette opération peut supprimer des données!"

set /p "response=Êtes-vous sûr de vouloir continuer? (y/N): "
if /i not "!response!"=="y" (
    echo Opération annulée
    exit /b 0
)

call :check_node
if errorlevel 1 exit /b 1
call :check_dependencies
if errorlevel 1 exit /b 1

if not exist "cleanup-mongodb.js" (
    call :print_error "Script cleanup-mongodb.js non trouvé"
    exit /b 1
)

call :print_success "Lancement du nettoyage complet..."
node cleanup-mongodb.js
goto :eof

REM Nettoyer seulement les doublons
:cleanup_duplicates
call :print_header "SUPPRESSION DES DOUBLONS"

set /p "response=Supprimer les doublons? (y/N): "
if /i not "!response!"=="y" (
    echo Opération annulée
    exit /b 0
)

call :check_node
if errorlevel 1 exit /b 1
call :check_dependencies
if errorlevel 1 exit /b 1

if not exist "cleanup-mongodb.js" (
    call :print_error "Script cleanup-mongodb.js non trouvé"
    exit /b 1
)

call :print_success "Suppression des doublons uniquement..."
node cleanup-mongodb.js --duplicates-only
goto :eof

REM Diagnostiquer le service
:check_service
call :print_header "DIAGNOSTIC DU SERVICE D'IMPORT"
call :check_node
if errorlevel 1 exit /b 1
call :check_dependencies
if errorlevel 1 exit /b 1

if not exist "check-import-service.js" (
    call :print_error "Script check-import-service.js non trouvé"
    exit /b 1
)

call :print_success "Diagnostic en cours..."
node check-import-service.js
goto :eof

REM Générer le service amélioré
:improve_service
call :print_header "GÉNÉRATION DU SERVICE AMÉLIORÉ"
call :check_node
if errorlevel 1 exit /b 1

if not exist "generate-improved-service.js" (
    call :print_error "Script generate-improved-service.js non trouvé"
    exit /b 1
)

call :print_success "Génération du service amélioré..."
node generate-improved-service.js

if exist "backend\services\autoImportService-improved.js" (
    call :print_success "Service amélioré généré avec succès!"
    echo.
    echo 📁 Fichier créé: backend\services\autoImportService-improved.js
    echo.
    echo 🔄 Pour l'utiliser:
    echo    1. Sauvegardez l'ancien: %~nx0 backup
    echo    2. Remplacez le service: %~nx0 replace
)
goto :eof

REM Sauvegarder l'ancien service
:backup_service
call :print_header "SAUVEGARDE DE L'ANCIEN SERVICE"

set "original=backend\services\autoImportService.js"

REM Générer timestamp pour Windows
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,8%-%dt:~8,6%"
set "backup=backend\services\autoImportService-backup-%timestamp%.js"

if not exist "%original%" (
    call :print_error "Service original non trouvé: %original%"
    exit /b 1
)

copy "%original%" "%backup%" >nul
call :print_success "Sauvegarde créée: %backup%"
goto :eof

REM Remplacer par le service amélioré
:replace_service
call :print_header "REMPLACEMENT DU SERVICE"

set "improved=backend\services\autoImportService-improved.js"
set "original=backend\services\autoImportService.js"

if not exist "%improved%" (
    call :print_error "Service amélioré non trouvé. Exécutez d'abord: %~nx0 improve"
    exit /b 1
)

call :print_warning "Cette opération va remplacer le service existant"
set /p "response=Continuer? (y/N): "

if /i not "!response!"=="y" (
    echo Opération annulée
    exit /b 0
)

REM Sauvegarder automatiquement
call :backup_service

REM Remplacer
copy "%improved%" "%original%" >nul
call :print_success "Service remplacé avec succès!"

call :print_warning "N'oubliez pas de redémarrer votre application Node.js"
goto :eof

REM Afficher le statut
:show_status
call :print_header "STATUT ACTUEL"

echo 📁 Fichiers disponibles:

if exist "analyze-mongodb-space.js" (echo   ✅ analyze-mongodb-space.js) else (echo   ❌ analyze-mongodb-space.js)
if exist "cleanup-mongodb.js" (echo   ✅ cleanup-mongodb.js) else (echo   ❌ cleanup-mongodb.js)
if exist "check-import-service.js" (echo   ✅ check-import-service.js) else (echo   ❌ check-import-service.js)
if exist "generate-improved-service.js" (echo   ✅ generate-improved-service.js) else (echo   ❌ generate-improved-service.js)

echo.
echo 🔧 Services:

if exist "backend\services\autoImportService.js" (
    echo   ✅ Service original présent
) else (
    echo   ❌ Service original manquant
)

if exist "backend\services\autoImportService-improved.js" (
    echo   ✅ Service amélioré généré
) else (
    echo   ❌ Service amélioré non généré
)

echo.
echo 💾 Sauvegardes:
set "backup_count=0"
for %%f in ("backend\services\autoImportService-backup-*.js") do set /a backup_count+=1
echo   📦 %backup_count% sauvegarde(s) trouvée(s)

echo.
echo 📊 Environnement:

where node >nul 2>nul
if not errorlevel 1 (
    for /f "tokens=*" %%i in ('node --version') do echo   ✅ Node.js: %%i
) else (
    echo   ❌ Node.js non disponible
)

if exist "backend\.env" (
    echo   ✅ Configuration .env présente
) else (
    echo   ❌ Configuration .env manquante
)

if exist "backend\node_modules" (
    echo   ✅ Dépendances Node.js installées
) else if exist "node_modules" (
    echo   ✅ Dépendances Node.js installées
) else (
    echo   ❌ Dépendances Node.js manquantes
)
goto :eof

REM Router les commandes
set "command=%~1"
if "%command%"=="" set "command=help"

if "%command%"=="analyze" goto analyze_database
if "%command%"=="cleanup" goto cleanup_database
if "%command%"=="duplicates" goto cleanup_duplicates
if "%command%"=="check" goto check_service
if "%command%"=="improve" goto improve_service
if "%command%"=="backup" goto backup_service
if "%command%"=="replace" goto replace_service
if "%command%"=="status" goto show_status
if "%command%"=="help" goto show_help

REM Commande inconnue, afficher l'aide
goto show_help