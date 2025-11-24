-- =============================================
-- LIMPEZA ÚNICA DO HISTÓRICO DE EXECUÇÕES
-- Socket2Webhook | 3C Plus
-- =============================================

-- ⚠️ ATENÇÃO: Este script irá DELETAR TODAS as execuções existentes
-- Execute apenas UMA VEZ para limpar o histórico antigo
-- Após esta limpeza, apenas call-history-was-created será armazenado

-- 1. Verificar quantos registros existem antes da limpeza
SELECT 
  'ANTES DA LIMPEZA' as status,
  COUNT(*) as total_executions,
  COUNT(DISTINCT company_id) as total_companies,
  MIN(created_at) as oldest_execution,
  MAX(created_at) as newest_execution
FROM webhook_executions;

-- 2. Deletar TODAS as execuções antigas
-- DESCOMENTAR A LINHA ABAIXO PARA EXECUTAR A LIMPEZA:
-- DELETE FROM webhook_executions;

-- 3. Verificar resultado após limpeza
SELECT 
  'APÓS LIMPEZA' as status,
  COUNT(*) as total_executions,
  COUNT(DISTINCT company_id) as total_companies
FROM webhook_executions;

-- =============================================
-- INSTRUÇÕES DE USO
-- =============================================

/*
PASSO A PASSO:

1. Execute a primeira query (ANTES DA LIMPEZA) para ver o estado atual

2. Descomente a linha do DELETE (remova os dois hífens --)

3. Execute o DELETE para limpar todo o histórico

4. Execute a última query (APÓS LIMPEZA) para confirmar

5. A partir de agora, apenas call-history-was-created será armazenado
   com o número de telefone no campo phone_number

EXEMPLO DE EXECUÇÃO:

-- Ver estado atual
SELECT COUNT(*) FROM webhook_executions;

-- Limpar tudo
DELETE FROM webhook_executions;

-- Confirmar limpeza
SELECT COUNT(*) FROM webhook_executions;
-- Deve retornar: 0

OBSERVAÇÕES:
- Este é um DELETE permanente
- Não há como desfazer (a menos que tenha backup)
- Apenas execute quando tiver certeza
- Após a limpeza, o sistema começará a acumular apenas call-history-was-created
*/

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

