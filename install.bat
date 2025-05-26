@echo off
echo ==========================================
echo   INSTALADOR COMPLETO - CYBER-ESTADO UP
echo ==========================================
echo.

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não está instalado!
    echo Por favor, instale o Node.js primeiro.
    pause
    exit /b 1
)

REM Verificar PostgreSQL
pg_isready >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  PostgreSQL não está rodando!
    echo Tentando iniciar...
    net start postgresql-x64-17 >nul 2>&1
    timeout /t 3 /nobreak >nul
)

echo ✅ Pré-requisitos OK
echo.

REM Criar estrutura
echo [1/10] Criando estrutura de pastas...
mkdir backend 2>nul
mkdir frontend\src 2>nul
mkdir frontend\public 2>nul

REM ===== BACKEND =====
echo [2/10] Criando arquivos do Backend...

REM package.json do backend
(
echo {
echo   "name": "cyberestado-backend",
echo   "version": "1.0.0",
echo   "main": "server.js",
echo   "scripts": {
echo     "start": "node server.js",
echo     "dev": "nodemon server.js"
echo   },
echo   "dependencies": {
echo     "express": "^4.18.2",
echo     "cors": "^2.8.5",
echo     "bcryptjs": "^2.4.3",
echo     "jsonwebtoken": "^9.0.2",
echo     "pg": "^8.11.3",
echo     "dotenv": "^16.3.1",
echo     "socket.io": "^4.6.2"
echo   }
echo }
) > backend\package.json

REM .env
(
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_USER=postgres
echo DB_PASSWORD=underground2024
echo DB_NAME=cyberestado_up
echo JWT_SECRET=underground-politics-spqr-xxvii
echo PORT=5000
) > backend\.env

REM server.js (parte 1)
(
echo const express = require('express'^);
echo const cors = require('cors'^);
echo const bcrypt = require('bcryptjs'^);
echo const jwt = require('jsonwebtoken'^);
echo const { Pool } = require('pg'^);
echo require('dotenv'^).config(^);
echo.
echo const app = express(^);
echo const PORT = process.env.PORT ^|^| 5000;
echo.
echo const pool = new Pool({
echo   user: process.env.DB_USER,
echo   host: process.env.DB_HOST,
echo   database: process.env.DB_NAME,
echo   password: process.env.DB_PASSWORD,
echo   port: process.env.DB_PORT,
echo }^);
echo.
echo app.use(cors(^)^);
echo app.use(express.json(^)^);
echo.
echo const JWT_SECRET = process.env.JWT_SECRET;
echo.
echo pool.query('SELECT NOW(^)', (err, res^) =^> {
echo   if (err^) {
echo     console.error('❌ Erro ao conectar ao PostgreSQL:', err^);
echo   } else {
echo     console.log('✅ PostgreSQL conectado!'^);
echo   }
echo }^);
) > backend\server.js

REM server.js (parte 2)
(
echo.
echo app.post('/api/auth/login', async (req, res^) =^> {
echo   const { username, password } = req.body;
echo   console.log('Tentativa de login:', username^);
echo.
echo   try {
echo     const result = await pool.query(
echo       'SELECT * FROM users WHERE username = $1',
echo       [username]
echo     ^);
echo.
echo     if (result.rows.length === 0^) {
echo       return res.status(401^).json({ error: 'Credenciais inválidas' }^);
echo     }
echo.
echo     const user = result.rows[0];
echo     const validPassword = await bcrypt.compare(password, user.password^);
echo.
echo     if (!validPassword^) {
echo       return res.status(401^).json({ error: 'Credenciais inválidas' }^);
echo     }
echo.
echo     const token = jwt.sign(
echo       { id: user.id, username: user.username, role: user.role },
echo       JWT_SECRET,
echo       { expiresIn: '24h' }
echo     ^);
echo.
echo     console.log('✅ Login bem-sucedido:', username^);
echo     res.json({ token, user: { id: user.id, username: user.username, role: user.role } }^);
echo   } catch (error^) {
echo     console.error('Erro no login:', error^);
echo     res.status(500^).json({ error: 'Erro no servidor' }^);
echo   }
echo }^);
echo.
echo app.get('/api/health', (req, res^) =^> {
echo   res.json({ status: 'ok', timestamp: new Date(^).toISOString(^) }^);
echo }^);
echo.
echo app.listen(PORT, (^) =^> {
echo   console.log(`Servidor rodando na porta ${PORT}`^);
echo }^);
) >> backend\server.js

REM database.sql
(
echo CREATE TABLE IF NOT EXISTS users (
echo     id SERIAL PRIMARY KEY,
echo     username VARCHAR(50^) UNIQUE NOT NULL,
echo     password VARCHAR(255^) NOT NULL,
echo     role VARCHAR(50^) NOT NULL,
echo     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
echo ^);
echo.
echo CREATE TABLE IF NOT EXISTS proposals (
echo     id SERIAL PRIMARY KEY,
echo     title VARCHAR(255^) NOT NULL,
echo     description TEXT NOT NULL,
echo     author_id INTEGER REFERENCES users(id^),
echo     status VARCHAR(50^) DEFAULT 'votacao',
echo     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
echo ^);
echo.
echo CREATE TABLE IF NOT EXISTS votes (
echo     id SERIAL PRIMARY KEY,
echo     proposal_id INTEGER REFERENCES proposals(id^),
echo     user_id INTEGER REFERENCES users(id^),
echo     vote_type VARCHAR(20^) NOT NULL,
echo     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
echo     UNIQUE(proposal_id, user_id^)
echo ^);
) > backend\database.sql

echo [3/10] Instalando dependências do Backend...
cd backend
call npm install
cd ..

REM ===== FRONTEND =====
echo [4/10] Criando arquivos do Frontend...

REM package.json do frontend
(
echo {
echo   "name": "cyberestado-frontend",
echo   "version": "1.0.0",
echo   "scripts": {
echo     "start": "react-scripts start",
echo     "build": "react-scripts build"
echo   },
echo   "dependencies": {
echo     "react": "^18.2.0",
echo     "react-dom": "^18.2.0",
echo     "react-scripts": "5.0.1",
echo     "axios": "^1.6.2",
echo     "lucide-react": "^0.263.0",
echo     "socket.io-client": "^4.6.2"
echo   },
echo   "browserslist": {
echo     "production": ["^>0.2%%", "not dead", "not op_mini all"],
echo     "development": ["last 1 chrome version", "last 1 firefox version"]
echo   }
echo }
) > frontend\package.json

REM index.html
(
echo ^<!DOCTYPE html^>
echo ^<html lang="pt"^>
echo   ^<head^>
echo     ^<meta charset="utf-8" /^>
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1" /^>
echo     ^<meta name="theme-color" content="#7c3aed" /^>
echo     ^<title^>Cyber-Estado UP^</title^>
echo   ^</head^>
echo   ^<body^>
echo     ^<div id="root"^>^</div^>
echo   ^</body^>
echo ^</html^>
) > frontend\public\index.html

echo [5/10] Instalando dependências do Frontend...
cd frontend
call npm install

echo [6/10] Instalando Tailwind CSS...
call npm install -D tailwindcss postcss autoprefixer
call npx tailwindcss init -p

REM tailwind.config.js
(
echo module.exports = {
echo   content: ["./src/**/*.{js,jsx}", "./public/index.html"],
echo   theme: { extend: {} },
echo   plugins: [],
echo }
) > tailwind.config.js

REM index.css
(
echo @tailwind base;
echo @tailwind components;
echo @tailwind utilities;
echo.
echo body { margin: 0; font-family: sans-serif; }
) > src\index.css

REM index.js
(
echo import React from 'react';
echo import ReactDOM from 'react-dom/client';
echo import './index.css';
echo import App from './App';
echo.
echo const root = ReactDOM.createRoot(document.getElementById('root'^)^);
echo root.render(^<App /^>^);
) > src\index.js

REM Criar App.js temporário
echo import React from 'react'; > src\App.js
echo export default function App() { return ^<div^>Cyber-Estado UP^</div^>; } >> src\App.js

cd ..

REM ===== BANCO DE DADOS =====
echo.
echo [7/10] Configurando PostgreSQL...
echo.
set /p PGPASSWORD=Digite a senha do PostgreSQL (usuario postgres): 

echo [8/10] Criando banco de dados...
psql -U postgres -c "DROP DATABASE IF EXISTS cyberestado_up;" >nul 2>&1
psql -U postgres -c "CREATE DATABASE cyberestado_up;"

echo [9/10] Criando tabelas...
psql -U postgres -d cyberestado_up -f backend\database.sql

echo [10/10] Inserindo usuários padrão...
cd backend
(
echo const bcrypt = require('bcryptjs'^);
echo const { Pool } = require('pg'^);
echo require('dotenv'^).config(^);
echo.
echo const pool = new Pool({
echo   user: process.env.DB_USER,
echo   host: process.env.DB_HOST,
echo   database: process.env.DB_NAME,
echo   password: process.env.DB_PASSWORD,
echo   port: process.env.DB_PORT,
echo }^);
echo.
echo async function create(^) {
echo   const hash = await bcrypt.hash('underground2024', 10^);
echo   const users = [
echo     ['admin', 'admin'],
echo     ['the_rationalist', 'triunviro'],
echo     ['zeus', 'triunviro'],
echo     ['atlantomed', 'triunviro']
echo   ];
echo.
echo   for (const [username, role] of users^) {
echo     await pool.query(
echo       'INSERT INTO users (username, password, role^) VALUES ($1, $2, $3^) ON CONFLICT DO NOTHING',
echo       [username, hash, role]
echo     ^);
echo   }
echo   console.log('Usuários criados!'^);
echo   process.exit(0^);
echo }
echo create(^);
) > createUsers.js

node createUsers.js
del createUsers.js
cd ..

REM Criar start.bat
(
echo @echo off
echo echo ====================================
echo echo   INICIANDO CYBER-ESTADO UP
echo echo ====================================
echo echo.
echo start "Backend" cmd /c "cd backend && npm start"
echo timeout /t 3 /nobreak ^>nul
echo start "Frontend" cmd /c "cd frontend && set BROWSER=none && npm start"
echo echo.
echo echo Sistema iniciado!
echo echo Frontend: http://localhost:3000
echo echo Backend: http://localhost:5000
echo pause
) > start.bat

echo.
echo ==========================================
echo   ✅ INSTALAÇÃO CONCLUÍDA!
echo ==========================================
echo.
echo IMPORTANTE: Copie o código do App.js para:
echo   frontend\src\App.js
echo.
echo Usuários disponíveis:
echo - admin / underground2024
echo - the_rationalist / underground2024
echo - zeus / underground2024
echo - atlantomed / underground2024
echo.
echo Para iniciar: execute start.bat
echo.
pause