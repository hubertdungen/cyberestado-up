// server.js - Versão completa com sistema de assembleias e Rede UPense
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cyberestado_up',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Middleware de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de requisições
});
app.use('/api/', limiter);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'underground-politics-spqr-xxvii';

// Importar utils
const logger = require('./utils/logger');

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Token inválido', { error: err.message });
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware de verificação de permissões
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT p.* FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN roles r ON r.id = rp.role_id
         JOIN users u ON u.role_id = r.id
         WHERE u.id = $1 AND p.name = $2`,
        [req.user.id, permission]
      );

      if (result.rows.length === 0) {
        logger.warn('Permissão negada', { userId: req.user.id, permission });
        return res.status(403).json({ error: 'Permissão negada' });
      }

      next();
    } catch (error) {
      logger.error('Erro ao verificar permissão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

// Exportar middleware para uso em rotas
module.exports.authenticateToken = authenticateToken;
module.exports.checkPermission = checkPermission;
module.exports.pool = pool;
module.exports.io = io;

// ROTAS DE AUTENTICAÇÃO
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const userResult = await pool.query(
      `SELECT u.*, r.name as role_name, r.voting_power, r.id as role_id
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.username = $1 AND u.is_active = true`,
      [username]
    );

    if (userResult.rows.length === 0) {
      logger.warn('Tentativa de login falhou - usuário não encontrado', { username });
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      logger.warn('Tentativa de login falhou - senha incorreta', { username });
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role_name,
        roleId: user.role_id 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info('Login bem-sucedido', { userId: user.id, username: user.username });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.display_name,
        username: user.username,
        role: user.role_name,
        roleId: user.role_id,
        votingPower: user.voting_power,
        joinDate: user.created_at
      }
    });
  } catch (error) {
    logger.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Importar rotas de assembleias
const assembliesRouter = require('./routes/assemblies');
app.use('/api/assemblies', assembliesRouter);

// ROTAS DE PROPOSTAS (compatibilidade)
app.get('/api/proposals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.display_name as author_name, c.name as category_name,
              a.name as assembly_name, a.code as assembly_code
       FROM proposals p
       JOIN users u ON p.author_id = u.id
       JOIN proposal_categories c ON p.category_id = c.id
       LEFT JOIN assemblies a ON p.assembly_id = a.id
       ORDER BY p.created_at DESC`
    );

    const proposals = result.rows;

    // Buscar votos para cada proposta
    for (let proposal of proposals) {
      const votesResult = await pool.query(
        `SELECT v.*, u.display_name, r.name as role_name
         FROM votes v
         JOIN users u ON v.user_id = u.id
         JOIN roles r ON u.role_id = r.id
         WHERE v.proposal_id = $1`,
        [proposal.id]
      );

      // Organizar votos por tipo
      const votes = {
        civitas: { favor: 0, abstencao: 0, contra: 0 },
        triunvirato: {}
      };

      votesResult.rows.forEach(vote => {
        if (vote.role_name === 'triunviro') {
          votes.triunvirato[vote.display_name] = vote.vote_type;
        } else if (vote.role_name === 'civitas') {
          votes.civitas[vote.vote_type]++;
        }
      });

      proposal.votes = votes;

      // Contar comentários
      const commentsResult = await pool.query(
        'SELECT COUNT(*) FROM proposal_discussions WHERE proposal_id = $1',
        [proposal.id]
      );
      proposal.total_comments = parseInt(commentsResult.rows[0].count);
    }

    res.json(proposals);
  } catch (error) {
    logger.error('Erro ao buscar propostas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS DE NOTIFICAÇÕES
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    logger.error('Erro ao marcar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS DE EVENTOS
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.display_name as created_by_name
       FROM events e
       JOIN users u ON e.created_by = u.id
       ORDER BY e.date ASC`
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar eventos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS DE ADMINISTRAÇÃO
app.get('/api/admin/roles', authenticateToken, checkPermission('manage_roles'), async (req, res) => {
  try {
    const rolesResult = await pool.query(`
      SELECT r.*, rs.can_create_roles, rs.can_edit_permissions, 
             rs.can_manage_assemblies, rs.can_manage_networks
      FROM roles r
      LEFT JOIN role_settings rs ON r.id = rs.role_id
      ORDER BY r.hierarchy DESC
    `);
    
    const roles = rolesResult.rows;

    // Buscar permissões de cada role
    for (let role of roles) {
      const permsResult = await pool.query(
        `SELECT p.* FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1`,
        [role.id]
      );
      role.permissions = permsResult.rows;
    }

    res.json(roles);
  } catch (error) {
    logger.error('Erro ao buscar roles:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/admin/users', authenticateToken, checkPermission('manage_users'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.created_at, u.last_login,
              u.is_active, u.evaluation_end_date,
              r.id as role_id, r.name as role_name, r.color as role_color
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS DE CONFIGURAÇÃO DO SISTEMA
app.get('/api/system/config', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_config');
    const config = {};
    
    result.rows.forEach(row => {
      config[row.key] = JSON.parse(row.value);
    });

    res.json(config);
  } catch (error) {
    logger.error('Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// WebSocket para atualizações em tempo real
io.on('connection', (socket) => {
  logger.info('Novo cliente conectado', { socketId: socket.id });

  socket.on('join', (room) => {
    socket.join(room);
    logger.info('Cliente entrou na sala', { socketId: socket.id, room });
  });

  socket.on('leave', (room) => {
    socket.leave(room);
    logger.info('Cliente saiu da sala', { socketId: socket.id, room });
  });

  socket.on('disconnect', () => {
    logger.info('Cliente desconectado', { socketId: socket.id });
  });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  logger.info(`WebSocket disponível na porta ${PORT}`);
  logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  logger.error('Erro não tratado:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('Exceção não capturada:', err);
  process.exit(1);
});