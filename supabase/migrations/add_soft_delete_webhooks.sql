-- =============================================
-- ADICIONAR SOFT DELETE PARA WEBHOOKS
-- Socket2Webhook | 3C Plus
-- =============================================

-- 1. Adicionar coluna deleted na tabela webhooks
ALTER TABLE webhooks 
ADD COLUMN deleted BOOLEAN DEFAULT false;

-- 2. Criar índice para performance na coluna deleted
CREATE INDEX IF NOT EXISTS idx_webhooks_deleted ON webhooks (deleted);

-- 3. Criar índice composto para queries comuns (company_id + deleted)
CREATE INDEX IF NOT EXISTS idx_webhooks_company_deleted ON webhooks (company_id, deleted);

-- 4. Comentário para documentação
COMMENT ON COLUMN webhooks.deleted IS 'Soft delete flag. true = webhook foi excluído mas mantido para métricas, false = webhook ativo';

-- 5. Atualizar todos os webhooks existentes para deleted = false (caso não tenham valor)
UPDATE webhooks 
SET deleted = false 
WHERE deleted IS NULL;

-- =============================================
-- EXEMPLOS DE USO
-- =============================================

-- Buscar apenas webhooks ativos (frontend):
-- SELECT * FROM webhooks WHERE deleted = false;

-- Buscar todos para métricas (incluindo deletados):
-- SELECT * FROM webhooks; -- ou WHERE deleted IN (true, false)

-- Soft delete de um webhook:
-- UPDATE webhooks SET deleted = true, updated_at = NOW() WHERE id = 'webhook_id';

-- Restaurar webhook deletado:
-- UPDATE webhooks SET deleted = false, updated_at = NOW() WHERE id = 'webhook_id';

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================
