-- =============================================
-- ADD API TOKEN TO USERS
-- Cada usuário recebe um token único para autenticar
-- requisições HTTP externas à API do servidor.
-- =============================================

-- 1. Adicionar coluna api_token (nullable primeiro para UPDATE de existentes)
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_token VARCHAR(64);

-- 2. Gerar tokens para usuários existentes que não têm
UPDATE users
SET api_token = encode(gen_random_bytes(32), 'hex')
WHERE api_token IS NULL;

-- 3. Tornar NOT NULL depois do preenchimento
ALTER TABLE users ALTER COLUMN api_token SET NOT NULL;

-- 4. Definir DEFAULT para novos usuários criados pelo frontend
ALTER TABLE users ALTER COLUMN api_token SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- 5. Garantir unicidade
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_api_token_unique UNIQUE (api_token);

-- 6. Índice para lookup rápido no middleware de autenticação
CREATE INDEX IF NOT EXISTS idx_users_api_token ON users(api_token);
