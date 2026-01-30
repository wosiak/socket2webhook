-- ========================================
-- FIX: webhook_executions RLS Policies
-- Problema: Requisições HEAD falhando com erro 500
-- Solução: Adicionar políticas RLS completas
-- ========================================

-- 1. Garantir que RLS está habilitado
ALTER TABLE public.webhook_executions ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas (se existirem) para evitar conflitos
DROP POLICY IF EXISTS "authenticated_users_select_executions" ON public.webhook_executions;
DROP POLICY IF EXISTS "service_role_insert_executions" ON public.webhook_executions;
DROP POLICY IF EXISTS "service_role_update_executions" ON public.webhook_executions;
DROP POLICY IF EXISTS "service_role_delete_executions" ON public.webhook_executions;
DROP POLICY IF EXISTS "Users can view executions of their companies" ON public.webhook_executions;
DROP POLICY IF EXISTS "Authenticated users can view all webhook_executions" ON public.webhook_executions;

-- 3. Política para SELECT (leitura) - permite usuários autenticados verem todas as execuções
CREATE POLICY "allow_authenticated_select_webhook_executions"
ON public.webhook_executions
FOR SELECT
TO authenticated
USING (true);

-- 4. Política para INSERT (escrita) - permite authenticated e service_role
CREATE POLICY "allow_authenticated_insert_webhook_executions"
ON public.webhook_executions
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- 5. Política para UPDATE - permite authenticated e service_role
CREATE POLICY "allow_authenticated_update_webhook_executions"
ON public.webhook_executions
FOR UPDATE
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- 6. Política para DELETE - permite authenticated e service_role
CREATE POLICY "allow_authenticated_delete_webhook_executions"
ON public.webhook_executions
FOR DELETE
TO authenticated, service_role
USING (true);

-- 7. Política para anon key (public) - apenas SELECT (para casos onde não há autenticação)
-- COMENTADO: Não permitir acesso anônimo por segurança
-- CREATE POLICY "allow_anon_select_webhook_executions"
-- ON public.webhook_executions
-- FOR SELECT
-- TO anon
-- USING (true);

-- 8. Verificar políticas criadas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'webhook_executions';
  
  RAISE NOTICE '✅ Total de políticas RLS criadas para webhook_executions: %', policy_count;
  
  IF policy_count < 4 THEN
    RAISE WARNING '⚠️ Esperado 4 políticas, encontrado apenas %', policy_count;
  END IF;
END $$;

-- 9. Listar todas as políticas para confirmação
SELECT 
  schemaname AS schema,
  tablename AS tabela,
  policyname AS politica,
  permissive AS permissivo,
  roles AS funcoes,
  cmd AS comando,
  qual AS condicao_using,
  with_check AS condicao_check
FROM pg_policies 
WHERE tablename = 'webhook_executions'
ORDER BY policyname;
