-- 🚀 OTIMIZAÇÃO DISK IO: Função para cleanup em lote de execuções antigas
-- Reduz drasticamente o número de operações de DELETE individuais

CREATE OR REPLACE FUNCTION cleanup_old_executions_batch(
  company_ids INTEGER[],
  keep_count INTEGER DEFAULT 10
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_deleted INTEGER := 0;
  company_id INTEGER;
BEGIN
  -- Processar cada empresa
  FOREACH company_id IN ARRAY company_ids
  LOOP
    -- Deletar execuções antigas mantendo apenas as N mais recentes
    WITH ranked_executions AS (
      SELECT id,
             ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
      FROM webhook_executions
      WHERE company_id = company_id
    )
    DELETE FROM webhook_executions
    WHERE id IN (
      SELECT id 
      FROM ranked_executions 
      WHERE rn > keep_count
    );
    
    -- Somar total deletado
    GET DIAGNOSTICS total_deleted = total_deleted + ROW_COUNT;
  END LOOP;
  
  RETURN total_deleted;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION cleanup_old_executions_batch IS 
'Função otimizada para limpeza em lote de execuções antigas de webhook. 
Reduz Disk IO ao processar múltiplas empresas em uma única transação.';
