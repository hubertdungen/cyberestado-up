@echo off
echo ========================================
echo   Corrigindo Frontend do Cyber-Estado
echo ========================================
echo.

REM Parar processos
taskkill /f /im node.exe >nul 2>&1

REM Ir para frontend
cd frontend

echo [1/7] Limpando instalacao anterior...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo [2/7] Instalando dependencias base...
call npm install

echo [3/7] Instalando Tailwind CSS...
call npm install -D tailwindcss postcss autoprefixer lucide-react socket.io-client

echo [4/7] Criando configuracao do Tailwind...
call npx tailwindcss init -p

echo [5/7] Configuracao criada! Agora voce precisa:
echo.
echo 1. Substituir o conteudo de tailwind.config.js
echo 2. Substituir o conteudo de src/index.css
echo 3. Verificar se App.js esta correto
echo.
echo Os arquivos estao em:
echo   frontend/tailwind.config.js
echo   frontend/postcss.config.js (ja criado)
echo   frontend/src/index.css
echo.
echo [6/7] Testando instalacao...
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Build falhou! Verifique os arquivos CSS.
    pause
    exit /b 1
)

echo [7/7] Pronto! Agora inicie com: npm start
echo.
echo ========================================
echo   Frontend configurado com sucesso!
echo ========================================
pause