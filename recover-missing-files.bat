@echo off
chcp 65001 >nul
title Récupération Fichiers CSV Manquants - PelletsFun

echo.
echo 🔍 RÉCUPÉRATION FICHIERS CSV MANQUANTS
echo ======================================
echo.

REM Vérifier si nous sommes dans le bon répertoire
if not exist "backend\scripts\recover-missing-files.js" (
    echo ❌ Erreur: Script non trouvé. Exécutez depuis la racine du projet.
    pause
    exit /b 1
)

REM Vérifier si Node.js est disponible
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erreur: Node.js non trouvé. Installez Node.js d'abord.
    pause
    exit /b 1
)

REM Naviguer vers le répertoire backend
cd backend

echo 📂 Répertoire de travail: %CD%
echo.

REM Variables d'environnement
set NODE_ENV=production

REM Exécuter le script de récupération
echo 🚀 Lancement du script de récupération...
echo.

node scripts\recover-missing-files.js

set EXIT_CODE=%errorlevel%

echo.
if %EXIT_CODE% equ 0 (
    echo ✅ Script terminé avec succès
    echo.
    echo 📋 Vérification des fichiers récupérés:
    dir auto-downloads\*.csv /o-d | more
) else (
    echo ❌ Script terminé avec des erreurs ^(code: %EXIT_CODE%^)
)

echo.
echo 🔗 Pour voir tous les fichiers disponibles:
echo    dir backend\auto-downloads\*.csv
echo.
echo 📊 Pour tester les graphiques, utilisez l'interface web:
echo    https://pelletsfun.harmonixe.fr
echo.
pause