-- =============================================
-- SISTEMA DE AUTENTICAÇÃO E USUÁRIOS
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

-- 7. Criar políticas RLS

-- Política para usuários: apenas super_admin pode ver todos os usuários
-- Usuários normais só podem ver a si mesmos
CREATE POLICY "Users can view themselves or super_admin can view all" ON users
  FOR SELECT USING (
    auth.uid()::text = id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'super_admin' 
      AND is_active = true
    )
  );

-- Política para inserção: apenas super_admin pode criar novos usuários
CREATE POLICY "Only super_admin can create users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'super_admin' 
      AND is_active = true
    )
  );

-- Política para atualização: usuários podem atualizar a si mesmos, super_admin pode atualizar todos
CREATE POLICY "Users can update themselves or super_admin can update all" ON users
  FOR UPDATE USING (
    auth.uid()::text = id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'super_admin' 
      AND is_active = true
    )
  );

-- Política para exclusão: apenas super_admin pode deletar usuários
CREATE POLICY "Only super_admin can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'super_admin' 
      AND is_active = true
    )
  );

-- Políticas para sessões: usuários só podem ver suas próprias sessões
CREATE POLICY "Users can only access their own sessions" ON user_sessions
  FOR ALL USING (user_id::text = auth.uid()::text);

-- 8. Inserir usuário super admin padrão
-- SENHA: admin123 (hash SHA256 base64)
INSERT INTO users (email, name, password_hash, role, is_active) VALUES 
('admin@3cplus.com', 'Super Administrador', encode(digest('admin123', 'sha256'), 'base64'), 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- 9. Criar função para verificar permissões
CREATE OR REPLACE FUNCTION check_user_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role_enum;
  has_permission BOOLEAN := false;
BEGIN
  -- Buscar role do usuário
  SELECT role INTO user_role FROM users WHERE id = user_uuid AND is_active = true;
  
  -- Verificar permissões baseadas no role
  CASE permission_name
    WHEN 'manage_companies' THEN
      has_permission := user_role IN ('super_admin', 'admin');
    WHEN 'manage_webhooks' THEN
      has_permission := user_role IN ('super_admin', 'admin');
    WHEN 'view_dashboard' THEN
      has_permission := user_role IN ('super_admin', 'admin');
    WHEN 'manage_users' THEN
      has_permission := user_role = 'super_admin';
    WHEN 'change_user_roles' THEN
      has_permission := user_role = 'super_admin';
    ELSE
      has_permission := false;
  END CASE;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Criar função para limpar sessões expiradas
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

-- 11. Criar função para login de usuário
CREATE OR REPLACE FUNCTION authenticate_user(input_email TEXT, input_password TEXT)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_role user_role_enum,
  avatar_url TEXT,
  session_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  found_user users%ROWTYPE;
  new_token TEXT;
  new_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar usuário ativo com email
  SELECT * INTO found_user FROM users 
  WHERE email = input_email AND is_active = true;
  
  -- Verificar se usuário existe e senha está correta
  -- NOTA: Hash simples para desenvolvimento, usar bcrypt em produção
  IF found_user.id IS NOT NULL AND found_user.password_hash = encode(digest(input_password, 'sha256'), 'base64') THEN
    -- Gerar token de sessão
    new_token := encode(gen_random_bytes(32), 'base64');
    new_expires := NOW() + INTERVAL '7 days';
    
    -- Inserir nova sessão
    INSERT INTO user_sessions (user_id, token, expires_at)
    VALUES (found_user.id, new_token, new_expires);
    
    -- Atualizar último login
    UPDATE users SET last_login = NOW() WHERE id = found_user.id;
    
    -- Retornar dados do usuário e sessão
    RETURN QUERY SELECT 
      found_user.id,
      found_user.name,
      found_user.email,
      found_user.role,
      found_user.avatar_url,
      new_token,
      new_expires;
  END IF;
  
  -- Se não encontrou ou senha incorreta, não retorna nada
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Comentários e documentação
COMMENT ON TABLE users IS 'Tabela de usuários do sistema com autenticação e roles';
COMMENT ON TABLE user_sessions IS 'Sessões ativas de usuários para controle de autenticação';
COMMENT ON TYPE user_role_enum IS 'Roles disponíveis: super_admin (acesso total) e admin (acesso limitado)';
COMMENT ON FUNCTION check_user_permission IS 'Verifica se um usuário tem uma permissão específica baseada em seu role';
COMMENT ON FUNCTION authenticate_user IS 'Autentica usuário e cria sessão de login';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Remove sessões expiradas do banco de dados';

-- =============================================
-- FIM DO SCRIPT DE CRIAÇÃO
-- =============================================
