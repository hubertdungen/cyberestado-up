
# start-v2.bat - Script para iniciar o sistema v2
@echo off
echo ==========================================
echo   Iniciando Cyber-Estado UP v2.0
echo   SPQR - Underground Politics
echo ==========================================
echo.

REM Verificar se PostgreSQL está rodando
echo [1/4] Verificando PostgreSQL...
pg_isready >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  PostgreSQL nao esta rodando!
    echo    Iniciando servico...
    net start postgresql-x64-15
    timeout /t 5 /nobreak >nul
)

echo [2/4] Verificando integridade do sistema...
cd cyberestado-up\backend
node scripts/check-system.js
if %errorlevel% neq 0 (
    echo ❌ Problemas detectados no sistema
    pause
    exit /b 1
)

echo.
echo [3/4] Iniciando Backend...
start "Cyber-Estado Backend" cmd /k "npm start"
timeout /t 5 /nobreak >nul

echo.
echo [4/4] Iniciando Frontend...
cd ..\frontend
start "Cyber-Estado Frontend" cmd /k "npm start"
timeout /t 5 /nobreak >nul

cd ..\..
echo.
echo ==========================================
echo   ✅ Sistema iniciado com sucesso!
echo ==========================================
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:5000
echo 📊 Health:   http://localhost:5000/api/health
echo.
echo Assembleias disponiveis:
echo - Congressum UPense (CU)
echo - Comitia Centuriata (CC)  
echo - Triunvirato (T)
echo.
echo Para parar: Feche as janelas do terminal
echo.
pause