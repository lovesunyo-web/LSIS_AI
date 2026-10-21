@echo off
setlocal
cd /d "%~dp0"
echo Starting local server at http://localhost:8000/index.html
where py >nul 2>nul
if %errorlevel%==0 (
  start "Cable Local Server" cmd /k "cd /d ""%~dp0"" && py -m http.server 8000"
) else (
  start "Cable Local Server" cmd /k "cd /d ""%~dp0"" && python -m http.server 8000"
)
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000/index.html"
endlocal
