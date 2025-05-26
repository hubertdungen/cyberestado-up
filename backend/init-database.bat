@echo off
echo ==========================================
echo   Inicializacao do Banco de Dados
echo ==========================================
echo.

set /p PGPASSWORD=Digite a senha do PostgreSQL (usuario postgres): 

echo.
echo [1] Testando conexao...
psql -U postgres -h localhost -c "SELECT version();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Nao foi possivel conectar ao PostgreSQL
    echo Verifique se o servico esta rodando e a senha esta correta
    pause
    exit /b 1
)

echo Conexao OK!

echo.
echo [2] Criando banco de dados...
psql -U postgres -h localhost -c "DROP schema IF EXISTS cyberestado_up;"
psql -U postgres -h localhost -c "CREATE schema cyberestado_up;"

echo.
echo [3] Aplicando schema...
cd cyberestado-up\backend
if exist schema.sql (
    psql -U postgres -h localhost -d cyberestado_up -f schema.sql
    echo schema aplicado!
) else (
    echo ERRO: schema.sql nao encontrado!
    pause
    exit /b 1
)

echo.
echo [4] Aplicando atualizacoes...
if exist schema-updates.sql (
    psql -U postgres -h localhost -d cyberestado_up -f database-updates.sql
    echo Atualizacoes aplicadas!
)

echo.
echo [5] Executando script de inicializacao...
if exist scripts\init-db.js (
    node scripts\init-db.js
    echo Script executado!
)

echo.
echo [6] Configurando permissoes...
if exist scripts\setup-permissions.js (
    node scripts\setup-permissions.js
    echo Permissoes configuradas!
)

cd ..\..

echo.
echo ==========================================
echo   Banco de dados inicializado!
echo ==========================================
echo.
echo Usuarios criados:
echo - admin / underground2024
echo - the_rationalist / underground2024
echo - zeus / underground2024
echo - atlantomed / underground2024
echo - tcnup_member / underground2024
echo.
pause