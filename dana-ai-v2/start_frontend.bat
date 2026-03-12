@echo off
echo ==========================================
echo   DANA AI v2 — Frontend
echo ==========================================
cd /d "%~dp0frontend"
echo Installing npm packages...
call npm install
echo.
echo Buka http://localhost:3000
npm start
