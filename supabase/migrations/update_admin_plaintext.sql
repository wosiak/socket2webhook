-- =============================================
-- ATUALIZAR USUÁRIO ADMIN COM SENHA EM TEXTO PLANO
-- Socket2Webhook | 3C Plus
-- =============================================

-- Atualizar usuário admin para usar senha em texto plano (para testes)
UPDATE users 
SET password_hash = 'admin123'
WHERE email = 'admin@3cplus.com';

-- Verificar se foi atualizado
SELECT 
  'Usuário admin atualizado:' as status,
  email, 
  name, 
  password_hash,
  role, 
  is_active
FROM users 
WHERE email = 'admin@3cplus.com';

-- =============================================
-- AGORA A SENHA ESTÁ EM TEXTO PLANO: admin123
-- =============================================
