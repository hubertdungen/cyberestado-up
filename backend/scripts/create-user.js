
// backend/scripts/create-user.js
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function createUser() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Uso: node create-user.js <username> <password> <displayName> <roleId>');
    console.log('Roles: 1=elepos, 2=civitas, 3=triunviro, 4=tcnup, 5=admin');
    process.exit(1);
  }

  const [username, password, displayName, roleId] = args;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, password, display_name, role_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, hashedPassword, displayName, parseInt(roleId)]
    );

    console.log(`✅ Usuário criado com sucesso!`);
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Username: ${username}`);
    console.log(`   Nome: ${displayName}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
  } finally {
    await pool.end();
  }
}

createUser();
