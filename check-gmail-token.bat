@echo off
REM Script de diagnostic de l'authentification Gmail pour Windows

echo.
echo === DIAGNOSTIC AUTHENTIFICATION GMAIL ===
echo.

node check-gmail-token.js

echo.
echo Appuyez sur une touche pour fermer...
pause >nul
