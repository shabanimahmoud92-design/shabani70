@echo off
cd /d "%~dp0"
git add -A
git commit -m "update"
git push origin main
echo.
echo Live: https://shabanimahmoud92-design.github.io/shift/
pause
