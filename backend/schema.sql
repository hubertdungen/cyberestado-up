-- schema.sql - Schema do banco de dados do Cyber-Estado UP

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS cyberestado_up;

-- Tabela de roles (cargos)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#7c3aed',
    voting_power DECIMAL(5,2) DEFAULT 0,
    hierarchy INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de permissões
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de associação role-permissões
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Tabela de usuários
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    avatar_url VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    evaluation_end_date TIMESTAMP -- Para Elepos em avaliação
);

-- Tabela de categorias de propostas
CREATE TABLE proposal_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    requires_tcnup BOOLEAN DEFAULT false,
    color VARCHAR(7) DEFAULT '#6366f1'
);

-- Tabela de propostas
CREATE TABLE proposals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES proposal_categories(id),
    status VARCHAR(50) DEFAULT 'discussao',
    event_date DATE,
    system_changes JSONB,
    tcnup_approval VARCHAR(20),
    veto_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voting_started_at TIMESTAMP,
    voting_ends_at TIMESTAMP,
    approved_at TIMESTAMP
);

-- Tabela de votos
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    vote_type VARCHAR(20) NOT NULL, -- 'favor', 'abstencao', 'contra', 'veto'
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, user_id)
);

-- Tabela de comentários em propostas
CREATE TABLE proposal_comments (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    parent_id INTEGER REFERENCES proposal_comments(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP
);

-- Tabela de eventos
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME,
    type VARCHAR(50), -- 'evento', 'atividade'
    location VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configuração do sistema
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs de auditoria
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de notificações
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados iniciais

-- Roles iniciais
INSERT INTO roles (name, color, voting_power, hierarchy) VALUES
('elepos', '#fbbf24', 0, 1),
('civitas', '#8b5cf6', 1, 2),
('triunviro', '#dc2626', 5, 4),
('tcnup', '#0ea5e9', 0, 3),
('admin', '#10b981', 0, 5);

-- Permissões iniciais
INSERT INTO permissions (name, description, category) VALUES
-- Propostas
('view_proposals', 'Ver propostas', 'proposals'),
('create_proposal', 'Criar propostas', 'proposals'),
('vote', 'Votar em propostas', 'proposals'),
('veto', 'Vetar propostas', 'proposals'),
('tcnup_approval', 'Aprovar/rejeitar propostas como TCNUP', 'proposals'),
-- Administração
('manage_roles', 'Gerenciar roles e permissões', 'admin'),
('manage_users', 'Gerenciar usuários', 'admin'),
('manage_events', 'Gerenciar eventos', 'admin'),
('apply_system_changes', 'Aplicar mudanças do sistema', 'admin'),
('view_audit_logs', 'Ver logs de auditoria', 'admin'),
-- Social
('create_posts', 'Criar posts na rede social', 'social'),
('moderate_content', 'Moderar conteúdo', 'social'),
-- Outros
('access_security', 'Acessar área de segurança', 'security'),
('access_government', 'Acessar governo executivo', 'government');

-- Associar permissões aos roles
-- Elepos (apenas visualizar)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE name IN ('view_proposals');

-- Civitas (participação básica)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name IN ('view_proposals', 'create_proposal', 'vote', 'create_posts');

-- TCNUP (aprovação constitucional)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE name IN ('view_proposals', 'create_proposal', 'vote', 'tcnup_approval', 'create_posts');

-- Triúnviro (poderes executivos)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE name IN (
    'view_proposals', 'create_proposal', 'vote', 'veto',
    'manage_events', 'create_posts', 'moderate_content',
    'access_security', 'access_government'
);

-- Admin (todos os poderes)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions;

-- Categorias de propostas
INSERT INTO proposal_categories (name, description, requires_tcnup, color) VALUES
('constituicao', 'Alteração de regras fundamentais', true, '#dc2626'),
('legislativa', 'Criação ou alteração de normas', true, '#3b82f6'),
('administrativa', 'Gestão interna', false, '#8b5cf6'),
('ideologica', 'Princípios e valores', false, '#f59e0b'),
('estrutural', 'Organização do UP', false, '#10b981'),
('expansao', 'Crescimento da rede', false, '#06b6d4'),
('metapolitica', 'Influência cultural', false, '#ec4899'),
('eventos', 'Encontros e reuniões', false, '#7c3aed'),
('atividades', 'Ações recreativas', false, '#6366f1');

-- Configuração inicial do sistema
INSERT INTO system_config (key, value) VALUES
('votingPower', '{"triunvirato": 15, "civitas": 85, "triunviroIndividual": 5}'),
('vetoRules', '{"requiresUnanimity": true, "maxAttempts": 2}'),
('proposalSettings', '{"discussionDuration": 48, "votingDuration": 72}'),
('eleposEvaluation', '{"minDuration": 60, "maxDuration": 180}');

-- Usuários iniciais (senhas: "underground2024")
INSERT INTO users (username, password, display_name, role_id) VALUES
('admin', '$2a$10$YourHashedPasswordHere', 'Administrador', 5),
('the_rationalist', '$2a$10$YourHashedPasswordHere', 'The Rationalist', 3),
('zeus', '$2a$10$YourHashedPasswordHere', 'Zeus', 3),
('atlantomed', '$2a$10$YourHashedPasswordHere', 'AtlantoMed', 3),
('tcnup_member', '$2a$10$YourHashedPasswordHere', 'Membro TCNUP', 4);

-- Criar índices para melhor performance
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_author ON proposals(author_id);
CREATE INDEX idx_votes_proposal ON votes(proposal_id);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Triggers para atualização automática

-- Trigger para atualizar timestamp de last_login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para log de auditoria
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, target_type, target_id, old_value, new_value)
    VALUES (
        current_setting('app.current_user_id')::INTEGER,
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
CREATE TRIGGER update_user_last_login
BEFORE UPDATE ON users
FOR EACH ROW
WHEN (OLD.last_login IS DISTINCT FROM NEW.last_login)
EXECUTE FUNCTION update_last_login();

-- Views úteis

-- View de propostas com informações completas
CREATE VIEW proposals_full AS
SELECT 
    p.*,
    u.display_name as author_name,
    u.avatar_url as author_avatar,
    c.name as category_name,
    c.color as category_color,
    c.requires_tcnup,
    COUNT(DISTINCT v.id) as total_votes,
    COUNT(DISTINCT pc.id) as total_comments
FROM proposals p
JOIN users u ON p.author_id = u.id
JOIN proposal_categories c ON p.category_id = c.id
LEFT JOIN votes v ON p.id = v.proposal_id
LEFT JOIN proposal_comments pc ON p.id = pc.proposal_id
GROUP BY p.id, u.display_name, u.avatar_url, c.name, c.color, c.requires_tcnup;