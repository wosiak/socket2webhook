-- =============================================
-- CORRIGIR POLÍTICAS RLS QUE CAUSAM RECURSÃO
-- Socket2Webhook | 3C Plus
-- =============================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Users can access user data" ON users;
DROP POLICY IF EXISTS "Sessions can be accessed" ON user_sessions;
DROP POLICY IF EXISTS "Users can view themselves or super_admin can view all" ON users;
DROP POLICY IF EXISTS "Only super_admin can create users" ON users;
DROP POLICY IF EXISTS "Users can update themselves or super_admin can update all" ON users;
DROP POLICY IF EXISTS "Only super_admin can delete users" ON users;
DROP POLICY IF EXISTS "Users can only access their own sessions" ON user_sessions;

-- 3. CRIAR POLÍTICAS SIMPLES SEM RECURSÃO
-- Para desenvolvimento, vamos permitir acesso total por enquanto

-- Política permissiva para users (sem recursão)
CREATE POLICY "allow_all_users_access" ON users
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Política permissiva para user_sessions (sem recursão)
CREATE POLICY "allow_all_sessions_access" ON user_sessions
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 4. REABILITAR RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 5. VERIFICAR SE O USUÁRIO ADMIN EXISTE
SELECT 
  'Verificação do usuário admin:' as status,
  email, 
  name, 
  password_hash,
  role, 
  is_active,
  created_at
FROM users 
WHERE email = 'admin@3cplus.com';

-- 6. SE NÃO EXISTIR, CRIAR NOVAMENTE
INSERT INTO users (email, name, password_hash, role, is_active) 
VALUES ('admin@3cplus.com', 'Super Administrador', 'admin123', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET 
  password_hash = 'admin123',
  role = 'super_admin',
  is_active = true;

-- 7. VERIFICAÇÃO FINAL
SELECT 
  'Usuário admin após correção:' as status,
  id,
  email, 
  name, 
  password_hash,
  role, 
  is_active
FROM users 
WHERE email = 'admin@3cplus.com';

-- 8. TESTAR QUERY QUE ESTAVA FALHANDO
SELECT 
  'Teste da query de login:' as status,
  id, 
  email, 
  name, 
  role, 
  avatar_url, 
  is_active, 
  created_at, 
  updated_at, 
  last_login
FROM users 
WHERE email = 'admin@3cplus.com' 
AND is_active = true;

-- =============================================
-- POLÍTICAS RLS CORRIGIDAS - SEM RECURSÃO
-- =============================================
