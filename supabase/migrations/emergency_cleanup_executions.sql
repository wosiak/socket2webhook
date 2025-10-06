-- 🚨 LIMPEZA EMERGENCIAL: Remover 337k+ execuções antigas
-- Manter apenas as 10 mais recentes por empresa

-- Primeiro, vamos ver quantas execuções temos por empresa
-- SELECT company_id, COUNT(*) as total_executions 
-- FROM webhook_executions 
-- GROUP BY company_id 
-- ORDER BY total_executions DESC;

-- 🗑️ LIMPEZA MASSIVA: Deletar execuções antigas mantendo apenas as 10 mais recentes
WITH ranked_executions AS (
  SELECT 
    id,
    company_id,
    ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at DESC) as rn
  FROM webhook_executions
),
executions_to_delete AS (
  SELECT id 
  FROM ranked_executions 
  WHERE rn > 10  -- Manter apenas as 10 mais recentes por empresa
)
DELETE FROM webhook_executions 
WHERE id IN (SELECT id FROM executions_to_delete);

-- Verificar resultado após limpeza
-- SELECT 
--   COUNT(*) as total_remaining,
--   COUNT(DISTINCT company_id) as companies_with_executions,
--   AVG(executions_per_company) as avg_per_company
-- FROM (
--   SELECT company_id, COUNT(*) as executions_per_company
--   FROM webhook_executions 
--   GROUP BY company_id
-- ) stats;

-- Comentário: Esta query deve reduzir de 337k+ para ~(número_empresas * 10)
