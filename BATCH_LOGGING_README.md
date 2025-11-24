# Batch Logging para call-history-was-created

## Implementação

Sistema de logging em lote que armazena eficientemente os POSTs de `call-history-was-created` no banco de dados, reduzindo drasticamente as escritas e evitando estouro do Disk IO Budget.

## Características

- **Batch size**: 50 registros por empresa
- **Flush interval**: 1 minuto (o que vier primeiro)
- **Dados armazenados**: apenas número discado + status + timestamp
- **Escopo**: somente eventos `call-history-was-created` que realmente tiveram POST enviado
- **Redução de escritas**: ~98% (de 1000 INSERTs/hora para ~20 INSERTs/hora)

## Estrutura do Banco

### Nova coluna adicionada

```sql
ALTER TABLE webhook_executions 
ADD COLUMN phone_number VARCHAR(20) NULL;

CREATE INDEX idx_webhook_executions_phone_number 
ON webhook_executions(phone_number) 
WHERE phone_number IS NOT NULL;
```

### Campos armazenados

- `webhook_id`: ID do webhook que processou
- `company_id`: ID da empresa
- `event_id`: ID do tipo de evento
- `status`: 'success' ou 'failed'
- `response_status`: Código HTTP da resposta
- `phone_number`: Número extraído de `callHistory.number` ✨ NOVO
- `request_payload`: JSONB com dados completos (backup)
- `created_at`: Timestamp automático

## Como testar

### 1. Aplicar migration no Supabase

No SQL Editor do Supabase, execute:

```sql
ALTER TABLE webhook_executions 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_executions_phone_number 
ON webhook_executions(phone_number) 
WHERE phone_number IS NOT NULL;
```

### 2. Verificar coluna criada

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'webhook_executions' AND column_name = 'phone_number';
```

### 3. Reiniciar servidor local

```bash
cd server
npm run dev
```

### 4. Verificar logs no console

Você verá logs como:

```
📤 POST: https://your-webhook.com - call-history-was-created
📊 BATCH INSERT: 50 logs de call-history para empresa abc-123
✅ BATCH INSERT concluído: 50 registros salvos
```

### 5. Consultar dados no banco

```sql
-- Ver últimos 10 registros com número
SELECT 
  phone_number,
  status,
  response_status,
  created_at
FROM webhook_executions
WHERE phone_number IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Contar registros por status
SELECT 
  status,
  COUNT(*) as total
FROM webhook_executions
WHERE phone_number IS NOT NULL
GROUP BY status;

-- Buscar por número específico
SELECT *
FROM webhook_executions
WHERE phone_number = '5582988628425'
ORDER BY created_at DESC;
```

## Funcionamento

### 1. Extração do número

```javascript
function extractPhoneNumber(eventName, eventData) {
  if (eventName !== 'call-history-was-created') {
    return null;
  }
  
  // Extrair de callHistory.number
  return eventData?.callHistory?.number || null;
}
```

### 2. Enfileiramento

```javascript
// Após POST ser enviado com sucesso
const phoneNumber = extractPhoneNumber(eventName, eventData);
if (phoneNumber && eventName === 'call-history-was-created') {
  queueCallHistoryLog({
    companyId,
    webhookId,
    eventId,
    phoneNumber,
    status,
    responseStatus
  });
}
```

### 3. Flush automático

- **Por tamanho**: quando atingir 50 logs na fila
- **Por tempo**: a cada 1 minuto (timer periódico)
- **No shutdown**: flush final antes do servidor desligar

## Monitoramento

### Logs importantes

- `📊 BATCH INSERT: N logs de call-history para empresa X` - Iniciando INSERT em lote
- `✅ BATCH INSERT concluído: N registros salvos` - Sucesso
- `❌ Erro no batch insert de call-history logs` - Falha (logs são re-enfileirados para retry)

### Métricas

```sql
-- Total de logs por empresa
SELECT 
  c.name as empresa,
  COUNT(*) as total_logs,
  COUNT(CASE WHEN we.status = 'success' THEN 1 END) as sucessos,
  COUNT(CASE WHEN we.status = 'failed' THEN 1 END) as falhas
FROM webhook_executions we
JOIN companies c ON c.id = we.company_id
WHERE we.phone_number IS NOT NULL
GROUP BY c.name
ORDER BY total_logs DESC;

-- Logs por hora
SELECT 
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as total_logs
FROM webhook_executions
WHERE phone_number IS NOT NULL
GROUP BY hora
ORDER BY hora DESC
LIMIT 24;
```

## Vantagens

1. **Redução massiva de INSERTs**: 50x menos escritas no banco
2. **Menor impacto no Disk IO**: evita estouro do budget
3. **Dados preservados**: histórico completo mantido
4. **Queries rápidas**: índice no phone_number
5. **Retry automático**: falhas são re-enfileiradas
6. **Flush garantido**: não perde dados no shutdown

## Observações

- Logs ficam em memória por no máximo 1 minuto
- Em caso de crash inesperado, perda máxima de 1 batch (~50 registros)
- Perda aceitável considerando volume de eventos
- Sistema pode processar milhares de eventos/hora sem problemas
- Apenas `call-history-was-created` é armazenado (conforme solicitado)

## Compatibilidade

- ✅ Não quebra funcionalidades existentes
- ✅ Sistema de logging antigo (`ENABLE_EXECUTION_LOGGING`) continua funcionando
- ✅ Coluna `phone_number` é NULL para outros eventos
- ✅ Totalmente retrocompatível

## Troubleshooting

### Logs não aparecem no banco

1. Verificar se migration foi aplicada: `SELECT * FROM information_schema.columns WHERE table_name = 'webhook_executions' AND column_name = 'phone_number'`
2. Verificar logs do servidor: procurar por "BATCH INSERT"
3. Verificar se evento é `call-history-was-created`
4. Verificar se POST foi realmente enviado (não filtrado)

### Batch não está sendo executado

1. Verificar se chegou ao tamanho do batch (50)
2. Aguardar 1 minuto (flush periódico)
3. Verificar logs de erro no console

### Erro no INSERT

- Logs são automaticamente re-enfileirados para retry
- Verificar permissões no Supabase
- Verificar se tabela existe e está acessível

