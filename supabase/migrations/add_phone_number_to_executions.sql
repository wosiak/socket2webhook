-- =============================================
-- ADICIONAR COLUNA phone_number PARA TRACKING DE LIGAÇÕES
-- Socket2Webhook | 3C Plus
-- =============================================

-- 1. Adicionar coluna phone_number (opcional, apenas para call-history-was-created)
ALTER TABLE webhook_executions 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) NULL;

-- 2. Criar índice parcial para queries rápidas (apenas onde phone_number existe)
CREATE INDEX IF NOT EXISTS idx_webhook_executions_phone_number 
ON webhook_executions(phone_number) 
WHERE phone_number IS NOT NULL;

-- 3. Comentário para documentação
COMMENT ON COLUMN webhook_executions.phone_number IS 
'Número discado extraído de call-history-was-created (callHistory.number). NULL para outros eventos.';

-- 4. Verificar resultado
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'webhook_executions' AND column_name = 'phone_number';

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

