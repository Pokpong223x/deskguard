@echo off
setlocal
cd /d "%~dp0"
set "DESKGUARD_NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  set "DESKGUARD_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)
if not exist "dist-web\index.html" (
  echo Web build missing. Run npm ci and npm run export:web first.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4173 in your browser after the server starts.
"%DESKGUARD_NODE%" scripts\serve-web.mjs
if errorlevel 1 (
  echo Install Node.js 24 if it is missing, or check the error above.
  pause
  exit /b 1
)
