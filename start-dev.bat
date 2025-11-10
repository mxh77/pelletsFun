@echo off
echo 🚀 Demarrage environnement de developpement PelletsFun
echo ====================================================
echo 🌐 Connexion a MongoDB Cloud (meme base qu'en production)
echo.

echo 🔧 Demarrage backend (port 3001)...
cd backend
start "Backend" cmd /k "npm run dev:win"

echo 🎨 Demarrage frontend (port 3000)...
cd ..\client
start "Frontend" cmd /k "npm start"

echo.
echo ✅ Environnement de developpement demarre !
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:3001
echo.
echo Pour arreter: fermer les fenetres ou Ctrl+C dans chaque terminal
pause