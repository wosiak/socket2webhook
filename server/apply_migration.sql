-- Aplicar migration para adicionar phone_number
ALTER TABLE webhook_executions 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_executions_phone_number 
ON webhook_executions(phone_number) 
WHERE phone_number IS NOT NULL;

COMMENT ON COLUMN webhook_executions.phone_number IS 
'Número discado extraído de call-history-was-created (callHistory.number). NULL para outros eventos.';

-- Verificar resultado
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'webhook_executions' AND column_name = 'phone_number';
