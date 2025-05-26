@echo off
echo ====================================
echo   INICIANDO CYBER-ESTADO UP
echo ====================================
echo.
start "Backend" cmd /c "cd backend && npm start"
timeout /t 3 /nobreak >nul
start "Frontend" cmd /c "cd frontend && set BROWSER=none && npm start"
echo.
echo Sistema iniciado!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
pause
