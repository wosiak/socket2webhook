-- =============================================
-- CORREÇÃO FINAL DE AUTENTICAÇÃO
-- Socket2Webhook | 3C Plus
-- =============================================

-- Verificar e criar tipo apenas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin');
    END IF;
END $$;

-- Verificar e criar tabela de usuários apenas se não existir
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

-- Verificar e criar tabela de sessões apenas se não existir
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices apenas se não existirem
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_password ON users(email, password_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Função de updated_at (substituir se existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Remover trigger existente se houver e recriar
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes e recriar
DROP POLICY IF EXISTS "Users can access user data" ON users;
DROP POLICY IF EXISTS "Sessions can be accessed" ON user_sessions;

-- Políticas RLS permissivas para desenvolvimento
CREATE POLICY "Users can access user data" ON users
  FOR ALL USING (true);

CREATE POLICY "Sessions can be accessed" ON user_sessions
  FOR ALL USING (true);

-- Inserir usuário admin apenas se não existir
INSERT INTO users (email, name, password_hash, role, is_active) 
VALUES ('admin@3cplus.com', 'Super Administrador', encode(digest('admin123', 'sha256'), 'base64'), 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET 
  password_hash = encode(digest('admin123', 'sha256'), 'base64'),
  role = 'super_admin',
  is_active = true;

-- Função para limpar sessões expiradas
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

-- Verificação final
SELECT 
  'Usuário admin criado/atualizado:' as status,
  email, 
  name, 
  role, 
  is_active,
  created_at
FROM users 
WHERE email = 'admin@3cplus.com';

-- Verificar estrutura das tabelas
SELECT 
  'Tabela users:' as info,
  COUNT(*) as total_users
FROM users;

SELECT 
  'Tabela user_sessions:' as info,
  COUNT(*) as total_sessions
FROM user_sessions;

-- =============================================
-- CONFIGURAÇÃO COMPLETA!
-- =============================================
