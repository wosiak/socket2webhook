-- ===================================================
-- CREATE RPC FUNCTIONS TO BYPASS RLS FOR METRICS
-- Socket2Webhook | 3C Plus
-- ===================================================
-- 
-- Esta migration cria funções SQL com SECURITY DEFINER
-- que permitem contar registros de webhook_executions
-- sem serem bloqueadas por Row Level Security (RLS)
--
-- ===================================================

-- Função para obter métricas globais de execuções
CREATE OR REPLACE FUNCTION get_webhook_execution_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do dono (bypassa RLS)
SET search_path = public
AS $$
DECLARE
  total_count INTEGER;
  success_count INTEGER;
  failed_count INTEGER;
  result JSON;
BEGIN
  -- Contar total de execuções
  SELECT COUNT(*) INTO total_count FROM webhook_executions;
  
  -- Contar execuções bem-sucedidas
  SELECT COUNT(*) INTO success_count 
  FROM webhook_executions 
  WHERE status = 'success';
  
  -- Contar execuções com falha
  SELECT COUNT(*) INTO failed_count 
  FROM webhook_executions 
  WHERE status = 'failed';
  
  -- Montar JSON de resposta
  result := json_build_object(
    'totalExecutions', total_count,
    'successfulExecutions', success_count,
    'failedExecutions', failed_count
  );
  
  RETURN result;
END;
$$;

-- Dar permissão para authenticated e anon usarem a função
GRANT EXECUTE ON FUNCTION get_webhook_execution_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhook_execution_metrics() TO anon;

COMMENT ON FUNCTION get_webhook_execution_metrics() IS 
'Retorna métricas de execuções de webhooks (total, sucessos, falhas). Usa SECURITY DEFINER para bypassa RLS e permitir contagem para o Dashboard.';

-- ===================================================

-- Função para obter métricas por empresa
CREATE OR REPLACE FUNCTION get_webhook_execution_metrics_by_company(company_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count INTEGER;
  success_count INTEGER;
  failed_count INTEGER;
  result JSON;
BEGIN
  -- Contar total de execuções da empresa
  SELECT COUNT(*) INTO total_count 
  FROM webhook_executions 
  WHERE company_id = company_uuid;
  
  -- Contar execuções bem-sucedidas da empresa
  SELECT COUNT(*) INTO success_count 
  FROM webhook_executions 
  WHERE company_id = company_uuid AND status = 'success';
  
  -- Contar execuções com falha da empresa
  SELECT COUNT(*) INTO failed_count 
  FROM webhook_executions 
  WHERE company_id = company_uuid AND status = 'failed';
  
  -- Montar JSON de resposta
  result := json_build_object(
    'totalExecutions', total_count,
    'successfulExecutions', success_count,
    'failedExecutions', failed_count
  );
  
  RETURN result;
END;
$$;

-- Dar permissão para authenticated e anon usarem a função
GRANT EXECUTE ON FUNCTION get_webhook_execution_metrics_by_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhook_execution_metrics_by_company(UUID) TO anon;

COMMENT ON FUNCTION get_webhook_execution_metrics_by_company(UUID) IS 
'Retorna métricas de execuções de webhooks para uma empresa específica. Usa SECURITY DEFINER para bypassar RLS.';

-- ===================================================
-- QUERIES DE TESTE (NÃO EXECUTAR AUTOMATICAMENTE)
-- ===================================================

-- Testar função global:
-- SELECT get_webhook_execution_metrics();

-- Resultado esperado (JSON):
-- {"totalExecutions": 38587, "successfulExecutions": 35634, "failedExecutions": 2953}

-- Testar função por empresa (substitua o UUID):
-- SELECT get_webhook_execution_metrics_by_company('uuid-da-empresa-aqui');

-- ===================================================
-- FIM DA MIGRAÇÃO
-- ===================================================
