-- =============================================
-- SISTEMA DE AUTENTICAÇÃO SIMPLIFICADO
-- Socket2Webhook | 3C Plus
-- =============================================

-- 1. Criar enum para roles de usuário
CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin');

-- 2. Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'admin',
  avatar_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- 3. Criar tabela de sessões de usuário
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_password ON users(email, password_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- 5. Criar trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS simplificadas

-- Política para usuários: permitir acesso básico (ajustaremos conforme necessário)
CREATE POLICY "Users can access user data" ON users
  FOR ALL USING (true);

-- Política para sessões: permitir acesso básico (ajustaremos conforme necessário)
CREATE POLICY "Sessions can be accessed" ON user_sessions
  FOR ALL USING (true);

-- 8. Inserir usuário super admin padrão
-- SENHA: admin123 (hash SHA256 base64)
INSERT INTO users (email, name, password_hash, role, is_active) VALUES 
('admin@3cplus.com', 'Super Administrador', encode(digest('admin123', 'sha256'), 'base64'), 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- 9. Função para limpar sessões expiradas (simplificada)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Comentários e documentação
COMMENT ON TABLE users IS 'Tabela de usuários do sistema com autenticação e roles';
COMMENT ON TABLE user_sessions IS 'Sessões ativas de usuários para controle de autenticação';
COMMENT ON TYPE user_role_enum IS 'Roles disponíveis: super_admin (acesso total) e admin (acesso limitado)';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Remove sessões expiradas do banco de dados';

-- =============================================
-- FIM DO SCRIPT SIMPLIFICADO
-- =============================================

-- Verificação final - mostrar usuário criado
SELECT email, name, role, is_active FROM users WHERE email = 'admin@3cplus.com';
