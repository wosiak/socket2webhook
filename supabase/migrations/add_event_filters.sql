-- =============================================
-- ADICIONAR SUPORTE A FILTROS DE EVENTOS
-- Socket2Webhook | 3C Plus
-- =============================================

-- 1. Adicionar coluna de filtros na tabela webhook_events
ALTER TABLE webhook_events 
ADD COLUMN filters JSONB DEFAULT '[]'::jsonb;

-- 2. Criar índice para performance na coluna de filtros
CREATE INDEX IF NOT EXISTS idx_webhook_events_filters ON webhook_events USING GIN (filters);

-- 3. Comentário para documentação
COMMENT ON COLUMN webhook_events.filters IS 'Filtros opcionais para aplicar nos eventos antes de enviar para o webhook. Formato: [{"field_path": "callHistory.status", "operator": "equals", "value": 7, "description": "Apenas chamadas com status 7"}]';

-- 4. Exemplos de filtros (apenas para documentação)
/*
Exemplo de filtros JSON:
[
  {
    "field_path": "callHistory.status",
    "operator": "equals", 
    "value": 7,
    "description": "Apenas ligações finalizadas com sucesso"
  },
  {
    "field_path": "callHistory.campaign.id",
    "operator": "equals",
    "value": 195452,
    "description": "Apenas da campanha específica"
  }
]

Operadores suportados:
- equals: Igual a
- not_equals: Diferente de
- greater_than: Maior que
- less_than: Menor que
- contains: Contém (string)
- not_contains: Não contém (string)
*/

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================
