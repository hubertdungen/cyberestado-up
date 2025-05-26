// backend/server.js - Backend COMPLETO do Cyber-Estado UP
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 5000;

// Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// ========== AUTENTICAÇÃO ==========

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Tentativa de login:', username);

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, roleId: user.role_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login bem-sucedido:', username);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        roleId: user.role_id
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ========== ASSEMBLEIAS ==========

app.get('/api/assemblies', authenticateToken, async (req, res) => {
  try {
    // Dados mockados das assembleias
    const assemblies = [
      {
        id: 1,
        name: 'Congressum UPense',
        code: 'CU',
        description: 'Assembleia Geral - Comitia Centuriata + Triunvirato',
        voting_equation: { civitas_weight: 85, triunvirato_weight: 15 },
        can_access: true
      },
      {
        id: 2,
        name: 'Comitia Centuriata',
        code: 'CC',
        description: 'Assembleia Popular dos Civitas',
        voting_equation: { civitas_weight: 100 },
        can_access: req.user.role !== 'triunviro'
      },
      {
        id: 3,
        name: 'Triunvirato',
        code: 'T',
        description: 'Conselho dos Triúnviros',
        voting_equation: { triunvirato_weight: 100 },
        can_access: req.user.role === 'triunviro' || req.user.role === 'admin'
      }
    ];

    res.json(assemblies.filter(a => a.can_access));
  } catch (error) {
    console.error('Erro ao buscar assembleias:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ========== CATEGORIAS ==========

app.get('/api/assemblies/:assemblyId/categories', authenticateToken, async (req, res) => {
  try {
    const categories = [
      { id: 1, name: 'Constituição', requires_tcnup: true, permission_type: 'allowed' },
      { id: 2, name: 'Legislativa', requires_tcnup: true, permission_type: 'allowed' },
      { id: 3, name: 'Administrativa', requires_tcnup: false, permission_type: 'allowed' },
      { id: 4, name: 'Ideológica', requires_tcnup: false, permission_type: 'allowed' },
      { id: 5, name: 'Estrutural', requires_tcnup: false, permission_type: 'allowed' },
      { id: 6, name: 'Expansão', requires_tcnup: false, permission_type: 'allowed' },
      { id: 7, name: 'Metapolítica', requires_tcnup: false, permission_type: 'allowed' },
      { id: 8, name: 'Eventos', requires_tcnup: false, permission_type: 'allowed' },
      { id: 9, name: 'Atividades', requires_tcnup: false, permission_type: 'allowed' }
    ];

    res.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ========== PROPOSTAS ==========

app.get('/api/proposals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username as author_name
      FROM proposals p
      LEFT JOIN users u ON p.author_id = u.id
      ORDER BY p.created_at DESC
    `);

    // Adicionar dados mockados para as propostas
    const proposals = result.rows.map(p => ({
      ...p,
      assembly_id: 1,
      assembly_name: 'Congressum UPense',
      category_name: 'Legislativa',
      total_comments: Math.floor(Math.random() * 10),
      votes: {
        civitas: { favor: 0, abstencao: 0, contra: 0 },
        triunvirato: {}
      }
    }));

    res.json(proposals);
  } catch (error) {
    console.error('Erro ao buscar propostas:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/assemblies/:assemblyId/proposals', authenticateToken, async (req, res) => {
  const { assemblyId } = req.params;
  const { title, description, categoryId } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO proposals (title, description, author_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, req.user.id, 'discussao']
    );

    const proposal = result.rows[0];
    
    // Notificar via WebSocket
    io.emit('newProposal', proposal);

    res.status(201).json(proposal);
  } catch (error) {
    console.error('Erro ao criar proposta:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ========== DISCUSSÃO ==========

app.get('/api/assemblies/proposals/:proposalId/discussion', authenticateToken, async (req, res) => {
  try {
    // Dados mockados de discussão
    const discussion = [
      {
        id: 1,
        display_name: 'Sistema',
        role_name: 'system',
        message: 'Proposta criada. Período de discussão iniciado.',
        created_at: new Date(),
        is_official: true
      }
    ];

    res.json(discussion);
  } catch (error) {
    console.error('Erro ao buscar discussão:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/assemblies/proposals/:proposalId/discussion', authenticateToken, async (req, res) => {
  const { message } = req.body;
  const { proposalId } = req.params;

  try {
    const newMessage = {
      id: Date.now(),
      proposal_id: proposalId,
      display_name: req.user.username,
      role_name: req.user.role,
      message,
      created_at: new Date(),
      is_official: false
    };

    // Emitir via WebSocket
    io.emit('newDiscussionMessage', newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ========== REDE UPENSE ==========

app.get('/api/assemblies/network', authenticateToken, async (req, res) => {
  try {
    const networks = [
      {
        id: 1,
        name: 'O Cosmos Racional',
        code: 'OCR',
        description: 'Blog & Projeto dos autores The Rationalist e Zeus',
        visibility: 'public',
        member_count: 15,
        user_role: null
      },
      {
        id: 2,
        name: 'Estrela Polar',
        code: 'EP',
        description: 'Projeto de podcasts dissidentes',
        visibility: 'public',
        member_count: 23,
        user_role: null
      },
      {
        id: 3,
        name: 'Based Car Lovers',
        code: 'BCL',
        description: 'Enclave para apaixonados por automobilismo',
        visibility: 'private',
        member_count: 8,
        user_role: req.user.role === 'admin' ? 'admin' : null
      },
      {
        id: 4,
        name: 'Unidade de Investigação',
        code: 'UIA',
        description: 'Proteção contra infiltrados',
        visibility: 'secret',
        member_count: 3,
        user_role: req.user.role === 'admin' ? 'admin' : null
      }
    ];

    res.json(networks);
  } catch (error) {
    console.error('Erro ao buscar rede UPense:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ========== NOTIFICAÇÕES ==========

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = [
      {
        id: 1,
        message: 'Bem-vindo ao Cyber-Estado UP!',
        type: 'info',
        timestamp: new Date(),
        is_read: false
      }
    ];

    res.json(notifications);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  res.json({ message: 'Notificação marcada como lida' });
});

// ========== EVENTOS ==========

app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const events = [
      {
        id: 1,
        title: 'Assembleia Geral',
        date: '2024-05-30',
        type: 'evento',
        created_by_name: 'The Rationalist'
      }
    ];

    res.json(events);
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ========== ADMINISTRAÇÃO ==========

app.get('/api/roles', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'triunviro') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const roles = [
      { id: 1, name: 'elepos', color: '#fbbf24', voting_power: 0, hierarchy: 1 },
      { id: 2, name: 'civitas', color: '#8b5cf6', voting_power: 1, hierarchy: 2 },
      { id: 3, name: 'triunviro', color: '#dc2626', voting_power: 5, hierarchy: 4 },
      { id: 4, name: 'tcnup', color: '#0ea5e9', voting_power: 0, hierarchy: 3 },
      { id: 5, name: 'admin', color: '#10b981', voting_power: 0, hierarchy: 5 }
    ];

    res.json(roles);
  } catch (error) {
    console.error('Erro ao buscar roles:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'triunviro') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = await pool.query('SELECT id, username, role, created_at FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ========== HEALTH CHECK ==========

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Cyber-Estado UP está rodando!' 
  });
});

// ========== WEBSOCKET ==========

io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Cliente ${socket.id} entrou na sala ${room}`);
  });

  socket.on('leave', (room) => {
    socket.leave(room);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// ========== INICIAR SERVIDOR ==========

server.listen(PORT, () => {
  console.log(`
====================================
   CYBER-ESTADO UP - BACKEND
====================================
🚀 Servidor rodando na porta ${PORT}
🌐 URL: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/api/health
====================================
  `);
});