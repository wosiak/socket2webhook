# 🚨 Modo Staging - Trava de Segurança para Webhooks

## 📋 Visão Geral

O servidor possui uma **trava de segurança** que permite executar em modo **Staging/Dev** sem enviar webhooks reais aos clientes. Isso é essencial para:

- ✅ Testar mudanças no código sem impacto em produção
- ✅ Validar sistema de filas e retry sem disparar webhooks reais
- ✅ Debug e monitoramento de eventos sem efeitos colaterais
- ✅ Ambientes paralelos (Dev/Staging/Prod) isolados

---

## 🔧 Configuração

### **Modo Staging (Simulação)**

Para ativar o modo staging, defina a variável de ambiente:

```bash
DISABLE_WEBHOOK_DISPATCH=true
```

**Comportamento:**
- ❌ Webhooks **NÃO** são enviados aos clientes
- ✅ Sistema processa eventos normalmente (fila, filtros, deduplicação)
- ✅ Simula latência real (100-200ms aleatório)
- ✅ Retorna resposta fake de sucesso: `{ status: 200, data: { simulated: true } }`
- ✅ Logs indicam simulação: `🚫 STAGING (Simulação): Webhook não enviado`
- ✅ Todos os logs são salvos no banco (auditoria completa)

### **Modo Produção (Normal)**

Para ativar o modo produção, **remova a variável** ou defina como:

```bash
DISABLE_WEBHOOK_DISPATCH=false
# OU simplesmente não defina a variável
```

**Comportamento:**
- ✅ Webhooks são enviados normalmente aos clientes
- ✅ Retry automático (3 tentativas)
- ✅ Logging completo (100% falhas + 10% sucessos)

---

## 📊 Verificação do Modo Ativo

### **1. Logs de Startup**

Ao iniciar o servidor, você verá:

**Staging:**
```
🚀 3C Plus Webhook Proxy Server iniciando...
⚠️  MODO STAGING ATIVADO: Webhooks serão SIMULADOS (não enviados aos clientes)
⚠️  Para desativar, remova a variável DISABLE_WEBHOOK_DISPATCH ou defina como "false"
```

**Produção:**
```
🚀 3C Plus Webhook Proxy Server iniciando...
✅ MODO PRODUÇÃO ATIVADO: Webhooks serão enviados normalmente aos clientes
```

### **2. Endpoint /status**

Consulte o endpoint para verificar o modo atual:

```bash
GET https://seu-servidor.onrender.com/status
```

**Resposta:**
```json
{
  "server_status": "running",
  "operation_mode": "staging",  // ou "production"
  "webhook_dispatch_enabled": false,  // ou true
  "timestamp": "2024-01-30T...",
  "active_companies": 5,
  "uptime_seconds": 3600
}
```

### **3. Logs de Webhook**

Durante o processamento de eventos:

**Staging:**
```
📤 POST: https://cliente.com/webhook - call-history-was-created
🚫 STAGING (Simulação): Webhook 123 para https://cliente.com/webhook não enviado.
✅ STAGING (Simulação): Webhook simulado com sucesso em 156ms
```

**Produção:**
```
📤 POST: https://cliente.com/webhook - call-history-was-created
✅ POST sucesso: https://cliente.com/webhook - 200
```

---

## 🎯 Casos de Uso

### **Ambiente Dev/Staging no Render**

1. Crie um serviço separado no Render para Staging
2. Configure a variável de ambiente:
   ```
   DISABLE_WEBHOOK_DISPATCH=true
   ```
3. Deploy do mesmo código
4. Teste mudanças sem afetar clientes

### **Ambiente Produção no Render**

1. **NÃO** defina a variável `DISABLE_WEBHOOK_DISPATCH`
2. OU defina como `false`
3. Webhooks serão enviados normalmente

---

## ⚠️ Avisos Importantes

### **Segurança:**
- ✅ A trava funciona **por ambiente** (não por empresa ou webhook)
- ✅ Impossível desabilitar acidentalmente em produção (variável deve ser explicitamente definida)
- ✅ Logs claros em todas as etapas

### **Logs e Auditoria:**
- ✅ Mesmo em staging, todos os eventos são registrados no banco
- ✅ Status "success" é registrado (mas com dados simulados)
- ✅ Permite testar sistema de logging sem webhooks reais

### **Performance:**
- ✅ Latência simulada imita comportamento real
- ✅ Sistema de filas funciona identicamente
- ✅ Retry não é testado (sempre sucesso na primeira tentativa)

---

## 🔍 Troubleshooting

### **"Webhooks não estão sendo enviados em produção"**

1. Verifique os logs de startup:
   - Se aparecer `MODO STAGING`, a variável está definida incorretamente
2. Verifique o endpoint `/status`:
   - `webhook_dispatch_enabled` deve ser `true`
3. Remova ou altere a variável de ambiente no Render

### **"Staging está enviando webhooks reais"**

1. Verifique se a variável está definida **exatamente** como:
   ```
   DISABLE_WEBHOOK_DISPATCH=true
   ```
2. Reinicie o serviço após alterar variáveis de ambiente
3. Confirme nos logs de startup que aparece `MODO STAGING`

---

## 📝 Exemplo de Deploy

### **Render.yaml (múltiplos ambientes)**

```yaml
services:
  # Produção
  - type: web
    name: socket2webhook-prod
    env: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      # DISABLE_WEBHOOK_DISPATCH não definido = produção

  # Staging
  - type: web
    name: socket2webhook-staging
    env: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: staging
      - key: DISABLE_WEBHOOK_DISPATCH
        value: true  # Webhooks simulados
```

---

## ✅ Checklist de Deploy

### **Antes de Deploy em Produção:**
- [ ] Verificar que `DISABLE_WEBHOOK_DISPATCH` **NÃO** está definida
- [ ] Confirmar no Render que a variável não existe
- [ ] Testar endpoint `/status` após deploy
- [ ] Verificar logs de startup (`✅ MODO PRODUÇÃO`)

### **Antes de Deploy em Staging:**
- [ ] Definir `DISABLE_WEBHOOK_DISPATCH=true` no Render
- [ ] Verificar logs de startup (`⚠️ MODO STAGING`)
- [ ] Confirmar que webhooks mostram "Simulação" nos logs
- [ ] Testar endpoint `/status` mostra `operation_mode: "staging"`

---

**Última Atualização:** 2024-01-30
**Versão:** 1.0.0
