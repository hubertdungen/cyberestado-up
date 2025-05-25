
// backend/scripts/init-db.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'postgres', // Conectar ao banco padrão primeiro
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function initDatabase() {
  try {
    console.log('🔧 Iniciando configuração do banco de dados...');
    
    // Criar banco de dados se não existir
    await pool.query(`
      SELECT 'CREATE DATABASE cyberestado_up'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cyberestado_up')
    `);
    
    // Reconectar ao novo banco
    await pool.end();
    const newPool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });
    
    // Executar schema SQL
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await newPool.query(schema);
    
    console.log('✅ Schema do banco de dados criado com sucesso!');
    
    // Criar senha hash para usuários iniciais
    const defaultPassword = await bcrypt.hash('underground2024', 10);
    
    // Atualizar senhas dos usuários iniciais
    await newPool.query(`
      UPDATE users 
      SET password = $1 
      WHERE password = '$2a$10$YourHashedPasswordHere'
    `, [defaultPassword]);
    
    console.log('✅ Senhas dos usuários iniciais configuradas!');
    console.log('📝 Usuários criados:');
    console.log('   - admin / underground2024');
    console.log('   - the_rationalist / underground2024');
    console.log('   - zeus / underground2024');
    console.log('   - atlantomed / underground2024');
    console.log('   - tcnup_member / underground2024');
    
    await newPool.end();
    console.log('🎉 Banco de dados configurado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error);
    process.exit(1);
  }
}

initDatabase();