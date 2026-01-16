@echo off
REM Quick start script for Trick List Admin System (Windows)

echo.
echo ========================================
echo   Trick List Admin System Startup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Starting Admin API Server...
start "Trick List Admin API" cmd /k "cd /d "%cd%" && node admin-server.js"

timeout /t 2

echo Starting Web Server on port 8000...
start "Trick List Web Server" cmd /k "cd /d "%cd%" && python -m http.server 8000"

timeout /t 2

echo.
echo ========================================
echo    All servers started successfully!
echo ========================================
echo.
echo Web App:    http://localhost:8000
echo Admin API:  http://localhost:3001
echo.
echo Login with:
echo   Email:    Zenon.beckson.miah@gmail.com
echo   Password: Fluffball7891523!
echo.
echo Close command windows to stop servers
echo.
pause
