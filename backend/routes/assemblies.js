/ backend/routes/assemblies.js - Novas rotas para sistema de assembleias

const express = require('express');
const router = express.Router();
const { authenticateToken, checkPermission } = require('../middleware/auth');
const pool = require('../db');
const logger = require('../utils/logger');

// Listar assembleias disponíveis para o usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT a.*, 
        CASE 
          WHEN r.name = 'triunviro' THEN true
          WHEN r.name IN ('civitas', 'tcnup') AND a.code != 'T' THEN true
          ELSE false
        END as can_access
      FROM assemblies a
      CROSS JOIN roles r
      WHERE r.id = $1 AND a.is_active = true
    `, [req.user.roleId]);

    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar assembleias', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter categorias permitidas por assembleia
router.get('/:assemblyId/categories', authenticateToken, async (req, res) => {
  const { assemblyId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COALESCE(acp.permission_type, 'hidden') as permission_type
      FROM proposal_categories c
      LEFT JOIN assembly_category_permissions acp ON 
        c.id = acp.category_id AND 
        acp.assembly_id = $1 AND 
        acp.role_id = $2
      WHERE $1 = ANY(c.allowed_assemblies) OR c.allowed_assemblies IS NULL
      ORDER BY c.id
    `, [assemblyId, req.user.roleId]);

    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar categorias', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar proposta em assembleia específica
router.post('/:assemblyId/proposals', authenticateToken, async (req, res) => {
  const { assemblyId } = req.params;
  const { title, description, categoryId, eventDate, systemChanges } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar permissão de categoria na assembleia
    const permCheck = await client.query(`
      SELECT permission_type 
      FROM assembly_category_permissions
      WHERE assembly_id = $1 AND category_id = $2 AND role_id = $3
    `, [assemblyId, categoryId, req.user.roleId]);

    if (!permCheck.rows.length || permCheck.rows[0].permission_type !== 'allowed') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Categoria não permitida nesta assembleia' });
    }

    // Verificar se categoria requer TCNUP
    const categoryResult = await client.query(
      'SELECT requires_tcnup, requires_justification FROM proposal_categories WHERE id = $1',
      [categoryId]
    );

    const requiresTcnup = categoryResult.rows[0]?.requires_tcnup || false;
    const status = requiresTcnup ? 'pendente_tcnup' : 'discussao';

    // Calcular datas baseadas na configuração
    const configResult = await client.query(
      "SELECT value FROM system_config WHERE key = 'proposalSettings'"
    );
    const settings = JSON.parse(configResult.rows[0].value);
    
    const discussionEnds = new Date();
    discussionEnds.setHours(discussionEnds.getHours() + settings.discussionDuration);

    const result = await client.query(`
      INSERT INTO proposals 
      (title, description, author_id, category_id, assembly_id, status, 
       event_date, system_changes, tcnup_approval, discussion_ends_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *
    `, [
      title,
      description,
      req.user.id,
      categoryId,
      assemblyId,
      status,
      eventDate,
      JSON.stringify(systemChanges),
      requiresTcnup ? null : 'not_required',
      discussionEnds
    ]);

    // Criar tópico de discussão
    await client.query(`
      INSERT INTO proposal_discussions (proposal_id, user_id, message, is_official)
      VALUES ($1, $2, $3, true)
    `, [
      result.rows[0].id,
      req.user.id,
      `Proposta criada. Período de discussão até ${discussionEnds.toLocaleString('pt-PT')}`
    ]);

    // Notificar membros da assembleia
    await client.query(`
      INSERT INTO notifications (user_id, type, title, message, data, assembly_id)
      SELECT DISTINCT u.id, 'new_proposal', 'Nova Proposta', $1, $2, $3
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name IN (
        SELECT jsonb_array_elements_text(voting_equation->'includes')
        FROM assemblies WHERE id = $3
      )
    `, [
      `Nova proposta em ${assemblyId === 1 ? 'Congressum UPense' : assemblyId === 2 ? 'Comitia Centuriata' : 'Triunvirato'}`,
      JSON.stringify({ proposalId: result.rows[0].id }),
      assemblyId
    ]);

    await client.query('COMMIT');

    logger.audit(req.user.id, 'CREATE_PROPOSAL', {
      proposalId: result.rows[0].id,
      assemblyId,
      categoryId
    });

    io.emit('newProposal', { ...result.rows[0], assembly_id: assemblyId });
    res.status(201).json(result.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Erro ao criar proposta', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// ROTAS DA REDE UPENSE

// Listar sucursais visíveis
router.get('/network', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, 
        nm.role as user_role,
        COUNT(DISTINCT nm2.user_id) as member_count
      FROM upense_network n
      LEFT JOIN network_members nm ON n.id = nm.network_id AND nm.user_id = $1
      LEFT JOIN network_members nm2 ON n.id = nm2.network_id
      LEFT JOIN network_role_permissions nrp ON n.id = nrp.network_id AND nrp.role_id = $2
      WHERE 
        n.is_active = true AND (
          n.visibility = 'public' OR
          nm.user_id IS NOT NULL OR
          (n.visibility = 'private' AND nrp.can_view = true)
        )
      GROUP BY n.id, nm.role
      ORDER BY n.name
    `, [req.user.id, req.user.roleId]);

    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar rede UPense', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova sucursal
router.post('/network', authenticateToken, checkPermission('manage_networks'), async (req, res) => {
  const { name, code, description, visibility, iconUrl } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO upense_network (name, code, description, visibility, icon_url, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, code, description, visibility, iconUrl, req.user.id]);

    // Adicionar criador como admin
    await pool.query(`
      INSERT INTO network_members (network_id, user_id, role)
      VALUES ($1, $2, 'admin')
    `, [result.rows[0].id, req.user.id]);

    logger.audit(req.user.id, 'CREATE_NETWORK', { networkId: result.rows[0].id });
    res.status(201).json(result.rows[0]);

  } catch (error) {
    logger.error('Erro ao criar sucursal', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard da sucursal
router.get('/network/:networkId', authenticateToken, async (req, res) => {
  const { networkId } = req.params;

  try {
    // Verificar acesso
    const accessCheck = await pool.query(`
      SELECT n.*, nm.role as user_role
      FROM upense_network n
      LEFT JOIN network_members nm ON n.id = nm.network_id AND nm.user_id = $1
      WHERE n.id = $2 AND (
        n.visibility = 'public' OR
        nm.user_id IS NOT NULL OR
        EXISTS (
          SELECT 1 FROM network_role_permissions nrp 
          WHERE nrp.network_id = $2 AND nrp.role_id = $3 AND nrp.can_view = true
        )
      )
    `, [req.user.id, networkId, req.user.roleId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const network = accessCheck.rows[0];

    // Buscar dados do dashboard
    const [members, events, recentActivity] = await Promise.all([
      pool.query(`
        SELECT u.id, u.display_name, u.avatar_url, nm.role, nm.joined_at
        FROM network_members nm
        JOIN users u ON nm.user_id = u.id
        WHERE nm.network_id = $1
        ORDER BY nm.joined_at DESC
        LIMIT 10
      `, [networkId]),

      pool.query(`
        SELECT * FROM network_events
        WHERE network_id = $1 AND date >= CURRENT_DATE
        ORDER BY date, time
        LIMIT 5
      `, [networkId]),

      pool.query(`
        SELECT 'member_joined' as type, nm.joined_at as timestamp, u.display_name as data
        FROM network_members nm
        JOIN users u ON nm.user_id = u.id
        WHERE nm.network_id = $1
        ORDER BY nm.joined_at DESC
        LIMIT 10
      `, [networkId])
    ]);

    res.json({
      network,
      dashboard: {
        members: members.rows,
        events: events.rows,
        recentActivity: recentActivity.rows
      }
    });

  } catch (error) {
    logger.error('Erro ao buscar dashboard', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS DE DISCUSSÃO/FÓRUM

// Listar mensagens de discussão de proposta
router.get('/proposals/:proposalId/discussion', authenticateToken, async (req, res) => {
  const { proposalId } = req.params;

  try {
    const result = await pool.query(`
      SELECT pd.*, u.display_name, u.avatar_url, r.name as role_name
      FROM proposal_discussions pd
      JOIN users u ON pd.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE pd.proposal_id = $1
      ORDER BY pd.created_at ASC
    `, [proposalId]);

    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar discussão', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar mensagem à discussão
router.post('/proposals/:proposalId/discussion', authenticateToken, async (req, res) => {
  const { proposalId } = req.params;
  const { message } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO proposal_discussions (proposal_id, user_id, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [proposalId, req.user.id, message]);

    io.to(`proposal-${proposalId}`).emit('newDiscussionMessage', result.rows[0]);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    logger.error('Erro ao adicionar mensagem', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS DO TCNUP ATUALIZADAS

// Decisão do TCNUP com justificativa
router.post('/tcnup/decision/:proposalId', authenticateToken, checkPermission('tcnup_approval'), async (req, res) => {
  const { proposalId } = req.params;
  const { decision, justification } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (decision === 'rejected' && !justification) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Justificativa obrigatória para rejeição' });
    }

    const newStatus = decision === 'approved' ? 'votacao' : 'revisao';
    
    // Atualizar proposta
    await client.query(`
      UPDATE proposals 
      SET tcnup_approval = $1, 
          status = $2,
          tcnup_justification = $3,
          voting_started_at = CASE WHEN $2 = 'votacao' THEN NOW() ELSE NULL END,
          voting_ends_at = CASE 
            WHEN $2 = 'votacao' THEN NOW() + INTERVAL '72 hours' 
            ELSE NULL 
          END
      WHERE id = $4
    `, [decision, newStatus, justification, proposalId]);

    // Adicionar mensagem oficial na discussão
    await client.query(`
      INSERT INTO proposal_discussions (proposal_id, user_id, message, is_official)
      VALUES ($1, $2, $3, true)
    `, [
      proposalId,
      req.user.id,
      decision === 'approved' 
        ? 'Proposta aprovada pelo TCNUP. Votação iniciada.'
        : `Proposta rejeitada pelo TCNUP. Justificativa: ${justification}. A proposta retorna para revisão.`
    ]);

    // Notificar autor e participantes
    await client.query(`
      INSERT INTO notifications (user_id, type, title, message, data)
      SELECT DISTINCT u.id, 'tcnup_decision', 'Decisão do TCNUP', $1, $2
      FROM users u
      WHERE u.id IN (
        SELECT author_id FROM proposals WHERE id = $3
        UNION
        SELECT DISTINCT user_id FROM proposal_discussions WHERE proposal_id = $3
      )
    `, [
      decision === 'approved' ? 'Proposta aprovada pelo TCNUP' : 'Proposta em revisão',
      JSON.stringify({ proposalId, decision, justification }),
      proposalId
    ]);

    await client.query('COMMIT');

    logger.audit(req.user.id, 'TCNUP_DECISION', {
      proposalId,
      decision,
      justification
    });

    io.emit('tcnupDecision', { proposalId, decision, justification });
    res.json({ message: 'Decisão registrada com sucesso' });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Erro na decisão TCNUP', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// ROTAS DE ADMINISTRAÇÃO AVANÇADA

// Gestão de permissões de assembleia
router.put('/admin/assembly-permissions', authenticateToken, checkPermission('manage_assemblies'), async (req, res) => {
  const { permissions } = req.body; // Array de { assemblyId, categoryId, roleId, permissionType }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const perm of permissions) {
      await client.query(`
        INSERT INTO assembly_category_permissions 
        (assembly_id, category_id, role_id, permission_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (assembly_id, category_id, role_id)
        DO UPDATE SET permission_type = $4
      `, [perm.assemblyId, perm.categoryId, perm.roleId, perm.permissionType]);
    }

    await client.query('COMMIT');

    logger.audit(req.user.id, 'UPDATE_ASSEMBLY_PERMISSIONS', { permissions });
    res.json({ message: 'Permissões atualizadas com sucesso' });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Erro ao atualizar permissões', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// Configurar estrutura de assembleias
router.put('/admin/assembly-structure', authenticateToken, checkPermission('manage_assemblies'), async (req, res) => {
  const { assemblyId, name, votingEquation } = req.body;

  try {
    await pool.query(`
      UPDATE assemblies 
      SET name = COALESCE($2, name),
          voting_equation = COALESCE($3, voting_equation)
      WHERE id = $1
    `, [assemblyId, name, JSON.stringify(votingEquation)]);

    logger.audit(req.user.id, 'UPDATE_ASSEMBLY_STRUCTURE', { assemblyId, name, votingEquation });
    res.json({ message: 'Estrutura da assembleia atualizada' });

  } catch (error) {
    logger.error('Erro ao atualizar assembleia', { error: error.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;