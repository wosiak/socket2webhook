-- ===================================================
-- CREATE RPC FUNCTIONS FOR COMPANY EXECUTIONS
-- Socket2Webhook | 3C Plus
-- ===================================================
-- 
-- Funções para buscar execuções de webhooks por empresa
-- Usa SECURITY DEFINER para bypassar RLS que bloqueia JOINs
--
-- ===================================================

-- Função para buscar execuções de uma empresa
CREATE OR REPLACE FUNCTION get_company_executions(
  company_uuid UUID,
  result_limit INTEGER DEFAULT 100,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  webhook_id UUID,
  event_id UUID,
  event_type VARCHAR,
  status VARCHAR,
  response_status INTEGER,
  error_message TEXT,
  request_payload JSONB,
  created_at TIMESTAMPTZ,
  webhook_name VARCHAR,
  webhook_url TEXT,
  company_name VARCHAR,
  event_name VARCHAR,
  event_display_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER -- Bypassa RLS
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    we.id,
    we.company_id,
    we.webhook_id,
    we.event_id,
    we.event_type,
    we.status,
    we.response_status,
    we.error_message,
    we.request_payload,
    we.created_at,
    w.name as webhook_name,
    w.url as webhook_url,
    c.name as company_name,
    e.name as event_name,
    e.display_name as event_display_name
  FROM webhook_executions we
  LEFT JOIN webhooks w ON w.id = we.webhook_id
  LEFT JOIN companies c ON c.id = we.company_id
  LEFT JOIN events e ON e.id = we.event_id
  WHERE we.company_id = company_uuid
  ORDER BY we.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_company_executions(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_executions(UUID, INTEGER, INTEGER) TO anon;

COMMENT ON FUNCTION get_company_executions(UUID, INTEGER, INTEGER) IS 
'Retorna execuções de webhooks para uma empresa específica. Usa SECURITY DEFINER para bypassar RLS e permitir JOINs.';

-- ===================================================

-- Função para buscar execuções por número de telefone
CREATE OR REPLACE FUNCTION search_executions_by_phone(
  company_uuid UUID,
  phone_search TEXT
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  webhook_id UUID,
  event_type VARCHAR,
  status VARCHAR,
  response_status INTEGER,
  error_message TEXT,
  request_payload JSONB,
  created_at TIMESTAMPTZ,
  webhook_name VARCHAR,
  webhook_url TEXT,
  company_name VARCHAR,
  event_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    we.id,
    we.company_id,
    we.webhook_id,
    we.event_type,
    we.status,
    we.response_status,
    we.error_message,
    we.request_payload,
    we.created_at,
    w.name as webhook_name,
    w.url as webhook_url,
    c.name as company_name,
    e.name as event_name
  FROM webhook_executions we
  LEFT JOIN webhooks w ON w.id = we.webhook_id
  LEFT JOIN companies c ON c.id = we.company_id
  LEFT JOIN events e ON e.id = we.event_id
  WHERE we.company_id = company_uuid
    AND (
      -- Buscar no JSONB request_payload (campos extraídos automaticamente)
      we.request_payload::text ILIKE '%' || phone_search || '%'
      -- OU buscar no campo phone_number legado (se existir)
      OR COALESCE(we.phone_number, '') ILIKE '%' || phone_search || '%'
    )
  ORDER BY we.created_at DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION search_executions_by_phone(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_executions_by_phone(UUID, TEXT) TO anon;

COMMENT ON FUNCTION search_executions_by_phone(UUID, TEXT) IS 
'Busca execuções de webhooks por número de telefone. Busca tanto no request_payload (JSONB) quanto no campo phone_number legado.';

-- ===================================================
-- QUERIES DE TESTE
-- ===================================================

-- Testar busca de execuções (substitua o UUID pela empresa real):
-- SELECT * FROM get_company_executions('b15b7d0e-f747-4e7b-bfc8-535d57918299', 10, 0);

-- Testar busca por telefone:
-- SELECT * FROM search_executions_by_phone('b15b7d0e-f747-4e7b-bfc8-535d57918299', '11999998888');

-- ===================================================
-- FIM DA MIGRAÇÃO
-- ===================================================
