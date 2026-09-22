@echo off
setlocal
title Pocket Atlas Launcher
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_pocket_atlas.ps1" %*
if errorlevel 1 pause
endlocal
