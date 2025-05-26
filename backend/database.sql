-- backend/database.sql - Estrutura COMPLETA do Banco de Dados

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    role_id INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Tabela de propostas
CREATE TABLE IF NOT EXISTS proposals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id),
    category_id INTEGER DEFAULT 1,
    assembly_id INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'discussao',
    tcnup_approval VARCHAR(20),
    tcnup_justification TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discussion_ends_at TIMESTAMP,
    voting_started_at TIMESTAMP,
    voting_ends_at TIMESTAMP,
    approved_at TIMESTAMP
);

-- Tabela de votos
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    vote_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, user_id)
);

-- Tabela de discussões
CREATE TABLE IF NOT EXISTS proposal_discussions (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    is_official BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de assembleias
CREATE TABLE IF NOT EXISTS assemblies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    voting_equation JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS proposal_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    requires_tcnup BOOLEAN DEFAULT false,
    color VARCHAR(7) DEFAULT '#6366f1',
    allowed_assemblies INTEGER[] DEFAULT ARRAY[1]
);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME,
    type VARCHAR(50),
    location VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela da Rede UPense
CREATE TABLE IF NOT EXISTS upense_network (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    visibility VARCHAR(20) DEFAULT 'public',
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configuração do sistema
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuários padrão (senhas já criptografadas para 'underground2024')
INSERT INTO users (username, password, role, role_id) VALUES
('admin', '$2a$10$X8H4Mxn8SP8Mg4ad9YLJpOZWUTf7fQFzXH2mTL4hU0nKqu1/FCBGy', 'admin', 5),
('the_rationalist', '$2a$10$X8H4Mxn8SP8Mg4ad9YLJpOZWUTf7fQFzXH2mTL4hU0nKqu1/FCBGy', 'triunviro', 3),
('zeus', '$2a$10$X8H4Mxn8SP8Mg4ad9YLJpOZWUTf7fQFzXH2mTL4hU0nKqu1/FCBGy', 'triunviro', 3),
('atlantomed', '$2a$10$X8H4Mxn8SP8Mg4ad9YLJpOZWUTf7fQFzXH2mTL4hU0nKqu1/FCBGy', 'triunviro', 3)
ON CONFLICT (username) DO NOTHING;

-- Inserir assembleias
INSERT INTO assemblies (name, code, description, voting_equation) VALUES
('Congressum UPense', 'CU', 'Assembleia Geral - Comitia Centuriata + Triunvirato', 
 '{"civitas_weight": 85, "triunvirato_weight": 15}'),
('Comitia Centuriata', 'CC', 'Assembleia Popular dos Civitas', 
 '{"civitas_weight": 100}'),
('Triunvirato', 'T', 'Conselho dos Triúnviros', 
 '{"triunvirato_weight": 100}')
ON CONFLICT (code) DO NOTHING;

-- Inserir categorias
INSERT INTO proposal_categories (name, description, requires_tcnup, color) VALUES
('Constituição', 'Alteração de regras fundamentais', true, '#dc2626'),
('Legislativa', 'Criação ou alteração de normas', true, '#3b82f6'),
('Administrativa', 'Gestão interna', false, '#8b5cf6'),
('Ideológica', 'Princípios e valores', false, '#f59e0b'),
('Estrutural', 'Organização do UP', false, '#10b981'),
('Expansão', 'Crescimento da rede', false, '#06b6d4'),
('Metapolítica', 'Influência cultural', false, '#ec4899'),
('Eventos', 'Encontros e reuniões', false, '#7c3aed'),
('Atividades', 'Ações recreativas', false, '#6366f1')
ON CONFLICT (name) DO NOTHING;

-- Inserir configuração inicial
INSERT INTO system_config (key, value) VALUES
('votingPower', '{"triunvirato": 15, "civitas": 85, "triunviroIndividual": 5}'),
('vetoRules', '{"requiresUnanimity": true, "maxAttempts": 2}'),
('proposalSettings', '{"discussionDuration": 48, "votingDuration": 72}')
ON CONFLICT (key) DO NOTHING;

-- Inserir propostas de exemplo
INSERT INTO proposals (title, description, author_id, category_id, assembly_id) VALUES
('Proposta de Modernização do Cyber-Estado', 'Implementar novas funcionalidades no sistema digital do UP', 1, 3, 1),
('Criação de Nova Sucursal', 'Estabelecer nova sucursal focada em tecnologia', 2, 6, 1)
ON CONFLICT DO NOTHING;

-- Inserir sucursais da Rede UPense
INSERT INTO upense_network (name, code, description, visibility, created_by) VALUES
('O Cosmos Racional', 'OCR', 'Blog & Projeto dos autores The Rationalist e Zeus', 'public', 2),
('Estrela Polar', 'EP', 'Projeto de podcasts dissidentes', 'public', 2),
('Based Car Lovers', 'BCL', 'Enclave para apaixonados por automobilismo', 'private', 3),
('Unidade de Investigação', 'UIA', 'Proteção contra infiltrados', 'secret', 2)
ON CONFLICT (code) DO NOTHING;