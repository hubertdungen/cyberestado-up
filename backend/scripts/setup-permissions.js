
// setup-permissions.js - Script para configurar permissões
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function setupPermissions() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Configurando permissões de assembleias...');
    
    // Permissões para Civitas
    const civitasPerms = [
      { assembly: 1, categories: [1,2,3,4,5,6,7,8,9], permission: 'allowed' },
      { assembly: 2, categories: [8,9], permission: 'allowed' },
      { assembly: 2, categories: [3], permission: 'grayed' }
    ];
    
    for (const perm of civitasPerms) {
      for (const catId of perm.categories) {
        await client.query(`
          INSERT INTO assembly_category_permissions 
          (assembly_id, category_id, role_id, permission_type)
          VALUES ($1, $2, 2, $3)
          ON CONFLICT (assembly_id, category_id, role_id) 
          DO UPDATE SET permission_type = $3
        `, [perm.assembly, catId, perm.permission]);
      }
    }
    
    console.log('✅ Permissões de Civitas configuradas');
    
    // Permissões para Triúnviros
    const triunviroPerms = [
      { assembly: 1, categories: [1,2,3,4,5,6,7,8,9], permission: 'allowed' },
      { assembly: 2, categories: [1,2,3,4,5,6,7,8,9], permission: 'allowed' },
      { assembly: 3, categories: [1,2,3], permission: 'allowed' }
    ];
    
    for (const perm of triunviroPerms) {
      for (const catId of perm.categories) {
        await client.query(`
          INSERT INTO assembly_category_permissions 
          (assembly_id, category_id, role_id, permission_type)
          VALUES ($1, $2, 3, $3)
          ON CONFLICT (assembly_id, category_id, role_id) 
          DO UPDATE SET permission_type = $3
        `, [perm.assembly, catId, perm.permission]);
      }
    }
    
    console.log('✅ Permissões de Triúnviros configuradas');
    
    // Configurações de roles
    await client.query(`
      INSERT INTO role_settings (role_id, can_create_roles, can_edit_permissions, can_manage_assemblies, can_manage_networks)
      VALUES 
        (1, false, false, false, false),  -- elepos
        (2, false, false, false, false),  -- civitas
        (3, true, true, true, true),      -- triunviro
        (4, false, false, false, false),  -- tcnup
        (5, true, true, true, true)       -- admin
      ON CONFLICT (role_id) DO NOTHING
    `);
    
    console.log('✅ Configurações de roles aplicadas');
    
    await client.query('COMMIT');
    console.log('✅ Todas as permissões configuradas com sucesso');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao configurar permissões:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupPermissions();