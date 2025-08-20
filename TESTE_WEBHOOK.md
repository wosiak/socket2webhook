# 🧪 TESTE - Criação de Webhook

## 🎯 Status Atual
- ✅ **Eventos listando** - Dropdown funcionando
- ✅ **Fallback implementado** - Criação direta no Supabase
- ✅ **Estrutura corrigida** - Usando suas tabelas reais

## 🚀 TESTE AGORA:

### 1. **Abra o modal "Novo Webhook"**
- Vá para uma empresa
- Clique no botão azul "+ Novo Webhook"

### 2. **Selecione eventos**
- Clique no dropdown "Tipos de Eventos"
- Selecione 2-3 eventos diferentes
- Deve mostrar tags dos eventos selecionados

### 3. **Configure o webhook**
- URL: `https://api.exemplo.com/webhook` (ou qualquer URL)
- Webhook ativo: ✅ (marcado)

### 4. **Clique em "Criar Webhook"**
- Deve funcionar sem erro 404
- Console deve mostrar:
  ```
  Tentando criar webhook via API...
  Erro na API, tentando criar webhook diretamente: [erro]
  [webhook criado com sucesso]
  ```

### 5. **Verificar resultado**
- Modal deve fechar
- Lista de webhooks deve atualizar
- Deve mostrar o novo webhook criado

## 📍 O que foi implementado:

### **Fallback para criação de webhook:**
- **API falha** → Criação direta no Supabase
- **Tabela webhooks** → Inserção com nome, URL, status
- **Tabela webhook_events** → Relacionamentos com eventos
- **Busca completa** → Webhook com eventos relacionados

### **Estrutura de dados:**
```sql
-- Tabela webhooks
INSERT INTO webhooks (company_id, name, url, status, created_at, updated_at)

-- Tabela webhook_events  
INSERT INTO webhook_events (webhook_id, event_id, created_at)
```

## 🔍 Console deve mostrar:
```
Tentando criar webhook via API...
Erro na API, tentando criar webhook diretamente: Error: HTTP 404
[webhook criado com sucesso]
Webhooks encontrados: [array de webhooks]
```

## 🎉 Resultado esperado:
- ✅ Webhook criado na tabela `webhooks`
- ✅ Relacionamentos criados na tabela `webhook_events`
- ✅ Lista atualizada na interface
- ✅ Sem erros 404

## 🚨 Se não funcionar:
Envie screenshot do console para debug adicional.
