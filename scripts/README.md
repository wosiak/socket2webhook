# 🛠️ Scripts de Manutenção

## 🚨 Limpeza de Execuções de Webhook

### Problema
O sistema estava salvando **todas** as execuções de webhook no banco, resultando em **337k+ registros** que esgotaram o Disk IO Budget do Supabase.

### Solução
1. **Logging desabilitado por padrão** - Variável `ENABLE_EXECUTION_LOGGING=false`
2. **Script de limpeza emergencial** - Para remover execuções antigas
3. **Função SQL otimizada** - Para limpeza em lote

---

## 📋 Como Usar o Script de Limpeza

### 1. Visualizar o que seria deletado (DRY RUN)
```bash
cd /path/to/socket2webhook
node scripts/cleanup-executions.js 10 true
```

### 2. Executar limpeza mantendo 10 execuções por empresa
```bash
node scripts/cleanup-executions.js 10 false
```

### 3. Limpeza total (CUIDADO!)
```bash
node scripts/cleanup-executions.js 0 false
```

---

## ⚙️ Configurações de Logging

### Desabilitar logging (padrão - recomendado)
```bash
# No Render, definir variável de ambiente:
ENABLE_EXECUTION_LOGGING=false
```

### Habilitar logging (apenas para debug)
```bash
# Apenas quando necessário para debug
ENABLE_EXECUTION_LOGGING=true
```

---

## 📊 Impacto das Otimizações

| Antes | Depois | Redução |
|-------|--------|---------|
| 337k+ execuções | ~(empresas × 10) | ~99% |
| 100% POSTs salvos | 5% POSTs salvos | 95% |
| Disk IO esgotado | Disk IO normal | ~90% |

---

## 🔧 Manutenção Preventiva

### Executar limpeza mensal
```bash
# Cron job sugerido (1º dia do mês às 2h)
0 2 1 * * cd /path/to/socket2webhook && node scripts/cleanup-executions.js 10 false
```

### Monitorar execuções
```sql
-- Query para monitorar no Supabase
SELECT 
  company_id,
  COUNT(*) as total_executions,
  MAX(created_at) as last_execution
FROM webhook_executions 
GROUP BY company_id 
ORDER BY total_executions DESC;
```

---

## ⚠️ Avisos Importantes

1. **Logging desabilitado por padrão** - Os POSTs continuam funcionando normalmente
2. **Script irreversível** - Sempre fazer DRY RUN primeiro
3. **Backup recomendado** - Antes de limpezas massivas
4. **Monitoramento** - Verificar Disk IO no dashboard do Supabase
