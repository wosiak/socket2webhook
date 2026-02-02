-- =============================================
-- FIX DASHBOARD ACCESS TO WEBHOOK_EXECUTIONS
-- Socket2Webhook | 3C Plus
-- =============================================
-- 
-- Esta migration garante que usuários autenticados possam
-- fazer SELECT em webhook_executions para visualização no Dashboard
--
-- =============================================

-- 1. Remover policies conflitantes antigas (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view all webhook_executions" ON webhook_executions;
DROP POLICY IF EXISTS "Users can view webhook_executions" ON webhook_executions;
DROP POLICY IF EXISTS "Allow authenticated read access" ON webhook_executions;

-- 2. Criar policy para SELECT (leitura) para usuários autenticados
CREATE POLICY "authenticated_users_can_select_webhook_executions"
ON webhook_executions
FOR SELECT
TO authenticated
USING (true);

-- 3. Garantir que a policy de INSERT continue funcionando
-- (para o backend poder salvar logs)
DROP POLICY IF EXISTS "authenticated_users_can_insert_webhook_executions" ON webhook_executions;

CREATE POLICY "authenticated_users_can_insert_webhook_executions"
ON webhook_executions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Comentários para documentação
COMMENT ON POLICY "authenticated_users_can_select_webhook_executions" ON webhook_executions IS 
'Permite que usuários autenticados visualizem todas as execuções de webhooks no Dashboard';

COMMENT ON POLICY "authenticated_users_can_insert_webhook_executions" ON webhook_executions IS 
'Permite que o backend (autenticado) insira logs de execuções via batch logging';

-- 5. Verificar que RLS está habilitado
ALTER TABLE webhook_executions ENABLE ROW LEVEL SECURITY;

-- 6. Recarregar schema do PostgREST (para aplicar mudanças imediatamente)
-- NOTA: Execute manualmente após aplicar esta migration:
-- NOTIFY pgrst, 'reload schema';

-- =============================================
-- VALIDAÇÃO (Queries de teste - NÃO EXECUTAR AUTOMATICAMENTE)
-- =============================================

-- Verificar policies existentes:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'webhook_executions';

-- Testar acesso como usuário autenticado:
-- SELECT COUNT(*) FROM webhook_executions;
-- SELECT status, COUNT(*) FROM webhook_executions GROUP BY status;

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================
