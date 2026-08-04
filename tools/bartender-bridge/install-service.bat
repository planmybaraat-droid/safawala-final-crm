@echo off
title Install Safawala BarTender Bridge as Windows Service
cd /d "%~dp0"
echo ============================================
echo  Safawala BarTender Bridge - Service Setup
echo ============================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Download from: https://nodejs.org
  pause
  exit /b 1
)

echo [1/3] Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
  echo ERROR: npm install failed.
  pause
  exit /b 1
)

echo.
echo [2/3] Registering Windows Service (requires Admin)...
echo       Run this script as Administrator if it fails.
echo.
node install-service.js

echo.
echo [3/3] Done!
echo.
echo The bridge is now installed as a Windows Service named:
echo   "Safawala BarTender Bridge"
echo.
echo It will start automatically on every Windows login.
echo You can manage it in Services (services.msc).
echo.
pause
