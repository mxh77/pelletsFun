@echo off
echo ========================================
echo  Demarrage de PelletsFun en local
echo ========================================
echo.

echo Demarrage du backend (port 5000)...
start "Backend" cmd /k "cd backend && node server.js"

timeout /t 3 /nobreak > nul

echo Demarrage du frontend (port 8080)...
start "Frontend" cmd /k "cd client && npm start"

echo.
echo ========================================
echo  Serveurs demarres !
echo ========================================
echo  Frontend: http://localhost:8080
echo  Backend:  http://localhost:5000
echo.
echo Fermez les fenetres cmd pour arreter les serveurs
echo.
pause
