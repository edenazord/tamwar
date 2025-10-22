@echo off
setlocal enabledelayedexpansion
set PORT=5173
set ROOT=%~dp0web

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js non trovato. Installa da https://nodejs.org/ e riprova.
  exit /b 1
)

rem Apri il browser dopo un breve delay
start "" cmd /c "timeout /t 1 >nul && start "" http://localhost:%PORT%/"

node "%~dp0server.js" --port %PORT% --root "%ROOT%"
