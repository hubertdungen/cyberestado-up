
// backend/scripts/check-system.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkSystem() {
  try {
    console.log('🔍 Verificando estado do sistema...\n');

    // Verificar conexão
    await pool.query('SELECT 1');
    console.log('✅ Conexão com banco de dados OK');

    // Contar usuários por role
    const usersResult = await pool.query(`
      SELECT r.name, COUNT(u.id) as count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
      GROUP BY r.name
      ORDER BY r.hierarchy DESC
    `);
    
    console.log('\n📊 Usuários por Role:');
    usersResult.rows.forEach(row => {
      console.log(`   ${row.name}: ${row.count}`);
    });

    // Verificar propostas
    const proposalsResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM proposals
      GROUP BY status
    `);
    
    console.log('\n📋 Propostas por Status:');
    proposalsResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });

    // Verificar configuração do sistema
    const configResult = await pool.query('SELECT * FROM system_config');
    
    console.log('\n⚙️  Configuração do Sistema:');
    configResult.rows.forEach(row => {
      console.log(`   ${row.key}: ${row.value}`);
    });

    // Verificar eventos próximos
    const eventsResult = await pool.query(`
      SELECT title, date
      FROM events
      WHERE date >= CURRENT_DATE
      ORDER BY date
      LIMIT 5
    `);
    
    console.log('\n📅 Próximos Eventos:');
    eventsResult.rows.forEach(row => {
      console.log(`   ${row.title} - ${new Date(row.date).toLocaleDateString('pt-PT')}`);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar sistema:', error.message);
  } finally {
    await pool.end();
  }
}

checkSystem();
