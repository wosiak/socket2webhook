-- =============================================
-- OTIMIZAR WEBHOOK_EXECUTIONS PARA BUSCA INTELIGENTE
-- Socket2Webhook | 3C Plus
-- =============================================
-- 
-- Esta migration garante que request_payload seja JSONB
-- e adiciona índices para busca eficiente de dados extraídos
--
-- =============================================

-- 1. Garantir que request_payload é JSONB (se não existe, criar)
ALTER TABLE webhook_executions 
ADD COLUMN IF NOT EXISTS request_payload JSONB NULL;

-- 2. Adicionar coluna event_type para facilitar filtros
ALTER TABLE webhook_executions 
ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) NULL;

-- 3. Criar índice GIN para busca full-text no JSONB
CREATE INDEX IF NOT EXISTS idx_webhook_executions_request_payload_gin 
ON webhook_executions USING GIN (request_payload);

-- 4. Criar índice para event_type (queries comuns)
CREATE INDEX IF NOT EXISTS idx_webhook_executions_event_type 
ON webhook_executions(event_type) 
WHERE event_type IS NOT NULL;

-- 5. Criar índice composto para queries por empresa + tipo
CREATE INDEX IF NOT EXISTS idx_webhook_executions_company_event_type 
ON webhook_executions(company_id, event_type, created_at DESC);

-- 6. Comentários para documentação
COMMENT ON COLUMN webhook_executions.request_payload IS 
'Dados extraídos automaticamente do evento (JSONB). Contém campos pesquisáveis como telefones, nomes, emails detectados automaticamente.';

COMMENT ON COLUMN webhook_executions.event_type IS 
'Tipo do evento (ex: call-history-was-created, new-message-whatsapp). Facilita filtros no frontend.';

-- =============================================
-- QUERIES DE EXEMPLO PARA O FRONTEND
-- =============================================

-- Buscar por telefone (em qualquer campo)
-- SELECT * FROM webhook_executions 
-- WHERE company_id = 'uuid-here' 
--   AND request_payload::text ILIKE '%11999998888%'
-- ORDER BY created_at DESC LIMIT 50;

-- Buscar por tipo de evento específico
-- SELECT * FROM webhook_executions 
-- WHERE company_id = 'uuid-here' 
--   AND event_type = 'call-history-was-created'
-- ORDER BY created_at DESC LIMIT 50;

-- Buscar por campo específico extraído
-- SELECT * FROM webhook_executions 
-- WHERE company_id = 'uuid-here' 
--   AND request_payload->>'phone_phoneNumber' = '11999998888';

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================
