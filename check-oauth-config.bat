@echo off
REM 🔍 Script de Vérification Configuration Gmail OAuth2 - Version Windows
REM Usage: check-oauth-config.bat

echo 🔍 Vérification Configuration Gmail OAuth2
echo ==========================================

REM Variables
set LOCAL_CALLBACK=http://localhost:3000/api/boiler/gmail/callback
set PROD_CALLBACK=https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback
set CREDENTIALS_FILE=backend\config\gmail-credentials.json

echo.
echo 📁 1. Vérification fichier credentials...

if exist "%CREDENTIALS_FILE%" (
    echo ✅ Fichier credentials trouvé: %CREDENTIALS_FILE%
    
    REM Vérifier les URIs dans le fichier
    findstr /C:"%LOCAL_CALLBACK%" "%CREDENTIALS_FILE%" >nul
    if %errorlevel%==0 (
        echo ✅ URI développement trouvée dans le fichier
    ) else (
        echo ❌ URI développement MANQUANTE dans le fichier
        echo    Attendu: %LOCAL_CALLBACK%
    )
    
    findstr /C:"%PROD_CALLBACK%" "%CREDENTIALS_FILE%" >nul
    if %errorlevel%==0 (
        echo ✅ URI production trouvée dans le fichier
    ) else (
        echo ⚠️  URI production MANQUANTE dans le fichier
        echo    Attendu: %PROD_CALLBACK%
        echo    ^(Ajoutez-la si vous prévoyez déployer en production^)
    )
) else (
    echo ❌ Fichier credentials MANQUANT: %CREDENTIALS_FILE%
    echo    Copiez votre fichier depuis Google Cloud Console
)

echo.
echo 🌐 2. Test connectivité serveur local...

REM Tester si le serveur local répond
curl -s -f "http://localhost:3000/api/boiler/stats" >nul 2>&1
if %errorlevel%==0 (
    echo ✅ Serveur backend local répond ^(port 3000^)
) else (
    echo ❌ Serveur backend local ne répond pas
    echo    Démarrez le serveur: cd backend ^&^& npm start
)

echo.
echo 📧 3. Test API Gmail local...

REM Tester l'API Gmail local
curl -s -f "http://localhost:3000/api/boiler/gmail/config" >nul 2>&1
if %errorlevel%==0 (
    echo ✅ API Gmail locale accessible
) else (
    echo ❌ API Gmail locale non accessible
    echo    Vérifiez que les nouvelles routes sont chargées
)

echo.
echo 🚀 4. Test connectivité production...

REM Tester si le serveur de production répond
curl -s -f "https://pelletsfun.harmonixe.fr" >nul 2>&1
if %errorlevel%==0 (
    echo ✅ Site de production accessible
    
    REM Tester l'API de production
    curl -s -f "https://pelletsfun.harmonixe.fr/api/boiler/stats" >nul 2>&1
    if %errorlevel%==0 (
        echo ✅ API production accessible
    ) else (
        echo ⚠️  API production non accessible ^(normal si pas encore déployée^)
    )
) else (
    echo ⚠️  Site de production non accessible ^(normal si pas encore déployé^)
)

echo.
echo 🔧 5. Checklist configuration Google Cloud...
echo.
echo ☐ Projet Google Cloud créé
echo ☐ API Gmail activée
echo ☐ Écran de consentement OAuth configuré  
echo ☐ Identifiants OAuth 2.0 créés
echo ☐ URI développement ajoutée: %LOCAL_CALLBACK%
echo ☐ URI production ajoutée: %PROD_CALLBACK%
echo ☐ Fichier JSON téléchargé et placé dans: %CREDENTIALS_FILE%

echo.
echo 📋 Récapitulatif:
echo ==================
echo Développement: ✅ http://localhost:3000
echo Production: 🚀 https://pelletsfun.harmonixe.fr
echo.
echo URIs OAuth2 à configurer dans Google Cloud Console:
echo 1. %LOCAL_CALLBACK%
echo 2. %PROD_CALLBACK%
echo.
echo Pour continuer:
echo 1. 🔧 Configurez Google Cloud Platform avec les URIs ci-dessus
echo 2. 💾 Téléchargez et placez le fichier credentials
echo 3. 🔄 Redémarrez l'application
echo 4. 📧 Testez l'autorisation Gmail
echo.
echo Guide détaillé: GMAIL_SETUP_GUIDE.md
echo Configuration production: PRODUCTION_CONFIG.md

pause