@echo off
title Uninstall Safawala BarTender Bridge Service
cd /d "%~dp0"
echo Uninstalling Safawala BarTender Bridge service...
node uninstall-service.js
echo Done.
pause
