@echo off
setlocal
title Maestro Illustrator Local Engine
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_schrodinger.ps1"
if errorlevel 1 pause
endlocal
