@echo off
cd /d "%~dp0"
echo Starting shift-management on http://localhost:5173
echo Close this window to stop the server.
npx --yes serve . -p 5173
pause
