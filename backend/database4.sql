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


-- database-updates.sql - Atualizações para sistema de assembleias e Rede UPense

-- Tabela de assembleias
CREATE TABLE assemblies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL, -- CU, CC, T
    description TEXT,
    voting_equation JSONB, -- Fórmula de cálculo de votos
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir assembleias iniciais
INSERT INTO assemblies (name, code, description, voting_equation) VALUES
('Congressum UPense', 'CU', 'Assembleia Geral - Comitia Centuriata + Triunvirato', 
 '{"civitas_weight": 85, "triunvirato_weight": 15, "includes": ["civitas", "triunvirato"]}'),
('Comitia Centuriata', 'CC', 'Assembleia Popular dos Civitas', 
 '{"civitas_weight": 100, "senate_tiebreaker": true, "includes": ["civitas"]}'),
('Triunvirato', 'T', 'Conselho dos Triúnviros', 
 '{"triunvirato_weight": 100, "requires_unanimity": true, "includes": ["triunvirato"]}');

-- Atualizar tabela de propostas para incluir assembleia
ALTER TABLE proposals 
ADD COLUMN assembly_id INTEGER REFERENCES assemblies(id),
ADD COLUMN revision_of INTEGER REFERENCES proposals(id),
ADD COLUMN tcnup_justification TEXT,
ADD COLUMN discussion_ends_at TIMESTAMP,
ADD COLUMN forum_enabled BOOLEAN DEFAULT true;

-- Tabela de permissões de categoria por assembleia e role
CREATE TABLE assembly_category_permissions (
    id SERIAL PRIMARY KEY,
    assembly_id INTEGER REFERENCES assemblies(id),
    category_id INTEGER REFERENCES proposal_categories(id),
    role_id INTEGER REFERENCES roles(id),
    permission_type VARCHAR(20) DEFAULT 'visible', -- 'visible', 'grayed', 'hidden', 'allowed'
    UNIQUE(assembly_id, category_id, role_id)
);

-- Tabela de notificações expandida
ALTER TABLE notifications
ADD COLUMN priority VARCHAR(20) DEFAULT 'normal',
ADD COLUMN expires_at TIMESTAMP,
ADD COLUMN action_url VARCHAR(255),
ADD COLUMN assembly_id INTEGER REFERENCES assemblies(id);

-- Tabela de configurações de notificação por usuário
CREATE TABLE user_notification_settings (
    user_id INTEGER REFERENCES users(id) PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,
    proposal_updates BOOLEAN DEFAULT true,
    vote_reminders BOOLEAN DEFAULT true,
    event_reminders BOOLEAN DEFAULT true,
    assembly_notifications JSONB DEFAULT '{}' -- por assembleia
);

-- Tabela da Rede UPense (Sucursais)
CREATE TABLE upense_network (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'private', 'secret'
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de membros das sucursais
CREATE TABLE network_members (
    network_id INTEGER REFERENCES upense_network(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'moderator', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (network_id, user_id)
);

-- Tabela de permissões de sucursais por role
CREATE TABLE network_role_permissions (
    network_id INTEGER REFERENCES upense_network(id),
    role_id INTEGER REFERENCES roles(id),
    can_view BOOLEAN DEFAULT false,
    can_participate BOOLEAN DEFAULT false,
    PRIMARY KEY (network_id, role_id)
);

-- Tabela de eventos específicos de sucursais
CREATE TABLE network_events (
    id SERIAL PRIMARY KEY,
    network_id INTEGER REFERENCES upense_network(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME,
    location VARCHAR(255),
    is_public BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de chat/fórum por proposta
CREATE TABLE proposal_discussions (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(id),
    user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    is_official BOOLEAN DEFAULT false, -- mensagens oficiais do TCNUP/Triunvirato
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP
);

-- Tabela de configurações avançadas de roles
CREATE TABLE role_settings (
    role_id INTEGER REFERENCES roles(id) PRIMARY KEY,
    can_create_roles BOOLEAN DEFAULT false,
    can_edit_permissions BOOLEAN DEFAULT false,
    can_manage_assemblies BOOLEAN DEFAULT false,
    can_manage_networks BOOLEAN DEFAULT false,
    menu_access JSONB DEFAULT '{}', -- acesso específico a menus
    moderator_permissions JSONB DEFAULT '{}' -- permissões de moderação
);

-- Atualizar categorias com assembleia permitida
ALTER TABLE proposal_categories
ADD COLUMN allowed_assemblies INTEGER[] DEFAULT ARRAY[1], -- por padrão só CU
ADD COLUMN requires_justification BOOLEAN DEFAULT false;

-- Popular permissões iniciais
INSERT INTO assembly_category_permissions (assembly_id, category_id, role_id, permission_type) VALUES
-- Congressum UPense (todas categorias para civitas)
(1, 1, 2, 'allowed'), (1, 2, 2, 'allowed'), (1, 3, 2, 'allowed'),
(1, 4, 2, 'allowed'), (1, 5, 2, 'allowed'), (1, 6, 2, 'allowed'),
(1, 7, 2, 'allowed'), (1, 8, 2, 'allowed'), (1, 9, 2, 'allowed'),
-- Comitia Centuriata (apenas eventos, atividades, justiça popular)
(2, 8, 2, 'allowed'), (2, 9, 2, 'allowed'), (2, 3, 'grayed'),
-- Triunvirato (executivas e constitucionais)
(3, 1, 3, 'allowed'), (3, 2, 3, 'allowed'), (3, 3, 3, 'allowed');

-- Inserir sucursais iniciais da Rede UPense
INSERT INTO upense_network (name, code, description, visibility, created_by) VALUES
('O Cosmos Racional', 'OCR', 'Blog & Projeto dos autores The Rationalist e Zeus', 'public', 2),
('Estrela Polar', 'EP', 'Projeto de podcasts dissidentes', 'public', 2),
('Based Car Lovers', 'BCL', 'Enclave para apaixonados por automobilismo', 'private', 3),
('MNS Feed', 'MNS', 'Projeto internacional de contactos ideológicos', 'private', 4),
('Novo UP', 'NUP', 'Faceta mais descontraída do movimento', 'public', 2),
('SSDD', 'SSDD', 'Sobrevivência, Saúde, Desporto e Defesa', 'private', 3),
('UP Airsoft', 'UPA', 'Grupo focado no airsoft', 'private', 4),
('Unidade de Investigação', 'UIA', 'Proteção contra infiltrados', 'secret', 2);

-- Views úteis para o sistema

-- View de propostas com informação de assembleia
CREATE OR REPLACE VIEW proposals_assembly_view AS
SELECT 
    p.*,
    a.name as assembly_name,
    a.code as assembly_code,
    a.voting_equation,
    parent.title as revision_of_title
FROM proposals p
JOIN assemblies a ON p.assembly_id = a.id
LEFT JOIN proposals parent ON p.revision_of = parent.id;

-- View de permissões completas por usuário
CREATE OR REPLACE VIEW user_permissions_complete AS
SELECT 
    u.id as user_id,
    u.username,
    r.name as role_name,
    p.name as permission_name,
    p.category as permission_category,
    rs.menu_access,
    rs.moderator_permissions
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
LEFT JOIN role_settings rs ON r.id = rs.role_id;

-- Função para calcular votos por assembleia
CREATE OR REPLACE FUNCTION calculate_assembly_votes(
    p_proposal_id INTEGER,
    p_assembly_id INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_equation JSONB;
    v_result JSONB;
BEGIN
    SELECT voting_equation INTO v_equation
    FROM assemblies WHERE id = p_assembly_id;
    
    -- Implementar lógica de cálculo baseada na equação
    -- Retornar resultado estruturado
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Triggers para notificações automáticas

-- Trigger para notificar mudanças de status de proposta
CREATE OR REPLACE FUNCTION notify_proposal_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar autor
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        NEW.author_id,
        'proposal_status',
        'Status da proposta alterado',
        'Sua proposta "' || NEW.title || '" mudou para ' || NEW.status,
        jsonb_build_object('proposal_id', NEW.id, 'new_status', NEW.status)
    );
    
    -- Notificar votantes se aprovada/rejeitada
    IF NEW.status IN ('aprovada', 'rejeitada') THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT DISTINCT 
            v.user_id,
            'proposal_result',
            'Resultado de votação',
            'A proposta "' || NEW.title || '" foi ' || NEW.status,
            jsonb_build_object('proposal_id', NEW.id, 'result', NEW.status)
        FROM votes v
        WHERE v.proposal_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER proposal_status_notification
AFTER UPDATE OF status ON proposals
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_proposal_status_change();

-- Índices para performance
CREATE INDEX idx_assembly_permissions ON assembly_category_permissions(assembly_id, role_id);
CREATE INDEX idx_network_members ON network_members(network_id, user_id);
CREATE INDEX idx_proposal_discussions ON proposal_discussions(proposal_id, created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE NOT is_read;