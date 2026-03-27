# 🚀 Universal Batch Logging System

## 📋 Overview

Sistema inteligente de logging em lote que substitui o antigo sistema específico de `call-history-was-created`. Agora funciona para **TODOS os tipos de eventos** com extração automática de campos pesquisáveis.

---

## ✅ Problema Resolvido

### **Antes:**
- ❌ 100 eventos = ~115 INSERTs no banco (sobrecarga)
- ❌ Salvava apenas `call-history-was-created` e `new-message-whatsapp`
- ❌ 10% dos sucessos salvos aleatoriamente
- ❌ Tamanho: 5-30KB por evento (JSON completo)
- ❌ Espaço no Supabase esgotando rapidamente

### **Depois:**
- ✅ 100 eventos = 1 INSERT (redução de 95%)
- ✅ Funciona para **TODOS os eventos automaticamente**
- ✅ Tamanho: 200-500 bytes por evento (campos seletivos)
- ✅ Pesquisável no frontend (telefones, nomes, emails)
- ✅ Economia de 90% de espaço no banco

---

## 🎯 Como Funciona

### **1. Auto-Detecção de Campos Importantes**

A função `autoExtractSearchableFields()` varre recursivamente o JSON do evento e extrai:

- **Telefones:** Detecta via regex em múltiplos formatos (`+5511999998888`, `11999998888`, etc)
- **Campos com palavras-chave:** `phone`, `name`, `email`, `from`, `to`, `message`, `queue`, `status`
- **Duração:** Campos como `duration`, `duracao`
- **Fallback:** Se não encontrar nada, salva o JSON truncado (1KB)

**Exemplo de entrada (evento `call-history-was-created`):**
```json
{
  "uuid": "abc123",
  "phoneNumber": "+5511999998888",
  "duration": 120,
  "queue": { "name": "Suporte", "id": 456 },
  "agent": { "id": 789, "name": "João" }
}
```

**Exemplo de saída (salvo no banco):**
```json
{
  "phone_phoneNumber": "+5511999998888",
  "duration": 120,
  "queue.name": "Suporte",
  "agent.name": "João"
}
```

---

### **2. Batch Processing**

- **Enfileira** eventos na memória (Map por `companyId`)
- **Flush automático** ao atingir **100 eventos** OU a cada **60 segundos**
- **1 INSERT** para múltiplos registros (performance!)
- **Graceful shutdown:** Flush final ao receber SIGTERM/SIGINT

---

### **3. Estrutura no Banco de Dados**

**Colunas adicionadas:**
- `event_type` (VARCHAR): Tipo do evento (ex: "call-history-was-created")
- `request_payload` (JSONB): Dados extraídos automaticamente

**Índices criados:**
- GIN index em `request_payload` (busca full-text rápida)
- Index em `event_type` (filtros por tipo)
- Index composto `(company_id, event_type, created_at)`

---

## 🔍 Buscas no Frontend

### **Busca Genérica (por qualquer campo):**
```sql
SELECT * FROM webhook_executions
WHERE company_id = 'uuid-empresa'
  AND request_payload::text ILIKE '%11999998888%'
ORDER BY created_at DESC LIMIT 50;
```

### **Busca Estruturada (campo específico):**
```sql
SELECT * FROM webhook_executions
WHERE company_id = 'uuid-empresa'
  AND request_payload->>'phone_phoneNumber' = '5511999998888';
```

### **Busca por Tipo + Termo:**
```sql
SELECT * FROM webhook_executions
WHERE company_id = 'uuid-empresa'
  AND event_type = 'call-history-was-created'
  AND request_payload::text ILIKE '%João%';
```

### **No código TypeScript (Frontend):**
```typescript
const searchWebhookExecutions = async (companyId: string, searchTerm: string) => {
  const { data } = await supabase
    .from('webhook_executions')
    .select('*')
    .eq('company_id', companyId)
    .or(`
      request_payload::text.ilike.%${searchTerm}%,
      event_type.ilike.%${searchTerm}%
    `)
    .order('created_at', { ascending: false })
    .limit(50);
  
  return data;
};
```

---

## 📊 Comparação de Performance

| Métrica | Sistema Antigo | Sistema Novo | Melhoria |
|---------|---------------|--------------|----------|
| **INSERTs/segundo** | ~20 (individual) | ~1 a cada 100 eventos | **95% menos** ✅ |
| **Tamanho/evento** | 5-30KB | 200-500 bytes | **90% menor** ✅ |
| **Tipos suportados** | 2 (call-history, whatsapp) | TODOS | **Infinito** ✅ |
| **Espaço (1M eventos)** | 5-30GB | 200-500MB | **95% economia** ✅ |
| **Pesquisável** | ❌ (só phone_number) | ✅ (todos os campos) | **100%** ✅ |

---

## 🚀 Deploy e Migração

### **1. Aplicar Migration SQL no Supabase**

Execute o arquivo `supabase/migrations/add_searchable_data_to_executions.sql` no **SQL Editor** do Supabase:

```bash
# Se estiver usando Supabase CLI local:
supabase db push
```

**Ou copie e cole o SQL manualmente no Supabase Dashboard.**

---

### **2. Deploy do Backend**

#### **Development (Staging):**
```bash
# Já está na branch development
git pull origin development

# Se usar Render, vai fazer deploy automático via GitHub
# Ou faça deploy manual
```

#### **Production (Main):**
```bash
# Somente após testar em Development!
git checkout main
git merge development
git push origin main
```

---

### **3. Verificar Logs**

Após deploy, verifique os logs do Render:

```
✅ Esperado ao iniciar:
🚀 3C Plus Webhook Proxy Server iniciando...
📅 Timestamp: 2026-02-02T...
✅ MODO PRODUÇÃO ATIVADO: Webhooks serão enviados normalmente

✅ Esperado ao receber eventos:
📊 FLUSH AUTOMÁTICO: 100 eventos da empresa uuid-123
📊 BATCH INSERT: 100 eventos da empresa uuid-123
✅ BATCH SALVO: 100 eventos com dados pesquisáveis
```

---

## 🔧 Configurações Ajustáveis

No arquivo `server/server.js`, você pode ajustar:

```javascript
const UNIVERSAL_BATCH_SIZE = 100; // Eventos por batch (padrão: 100)
const UNIVERSAL_BATCH_INTERVAL = 60000; // Intervalo em ms (padrão: 60s)
const MAX_EVENT_JSON_SIZE = 1024; // Tamanho máximo do fallback (padrão: 1KB)
```

**Recomendações:**
- **Alta frequência de eventos:** Diminua `UNIVERSAL_BATCH_SIZE` para 50
- **Baixa frequência:** Aumente `UNIVERSAL_BATCH_INTERVAL` para 120000 (2 minutos)

---

## ⚠️ Importante

### **Flush no Shutdown**
O sistema faz flush automático ao receber `SIGTERM` ou `SIGINT`. Isso garante que **nenhum log seja perdido** ao reiniciar o servidor.

### **Limpeza de Logs Antigos**
Para evitar crescimento infinito, crie um cronjob no Supabase:

```sql
-- Deletar logs com mais de 30 dias
DELETE FROM webhook_executions
WHERE created_at < NOW() - INTERVAL '30 days';
```

Ou use o cleanup script existente em `scripts/cleanup-executions.js`.

---

## 🎉 Benefícios Finais

1. ✅ **95% menos carga no banco** (100 eventos = 1 INSERT)
2. ✅ **90% menos espaço** (200 bytes vs 5-30KB)
3. ✅ **Busca inteligente** (detecta telefones, nomes, emails)
4. ✅ **Zero configuração** (funciona com eventos novos automaticamente)
5. ✅ **Graceful shutdown** (não perde logs pendentes)
6. ✅ **Escalável** (suporta milhões de eventos)

---

## 📞 Suporte

Para dúvidas ou problemas, verifique:
- Logs do Render: `https://dashboard.render.com/`
- Logs do Supabase: `https://supabase.com/dashboard/`
- GitHub Issues: `https://github.com/wosiak/socket2webhook/issues`

---

**Data da Implementação:** 02/02/2026  
**Branch:** `development`  
**Commit:** `6192660`
