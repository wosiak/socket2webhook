# 🚀 3C Plus Webhook Proxy - Render Deployment

## 📋 Deploy no Render (24/7 Garantido)

### 🔧 Pré-requisitos
1. Conta no [Render](https://render.com)
2. Repositório GitHub conectado
3. Supabase com service role key

### 📝 Passos para Deploy

#### 1. **Conectar GitHub ao Render**
```bash
1. Vá para https://dashboard.render.com
2. Clique em "New +" → "Web Service"
3. Conecte seu GitHub
4. Selecione o repositório "socket2webhook"
```

#### 2. **Configurar Web Service**
```yaml
Name: webhook-proxy-server
Environment: Node
Region: Ohio (US East)
Branch: main
Build Command: cd server && npm install
Start Command: cd server && npm start
```

#### 3. **Variáveis de Ambiente**
```bash
SUPABASE_URL=https://primzeelnavovenfdhma.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[sua_service_role_key]
NODE_ENV=production
```

#### 4. **Configurações Avançadas**
```yaml
Health Check Path: /health
Auto Deploy: Yes
Instance Type: Starter ($7/mês)
```

### 🎯 **Após Deploy**

#### **URLs do Sistema:**
- **Servidor:** `https://webhook-proxy-server.onrender.com`
- **Health Check:** `https://webhook-proxy-server.onrender.com/health`
- **Status:** `https://webhook-proxy-server.onrender.com/status`

#### **Frontend (Netlify) - Atualizar:**
```javascript
// src/config/api.ts
export const API_BASE_URL = 'https://webhook-proxy-server.onrender.com'
```

### 🔍 **Monitoramento**

#### **Health Check (Automático):**
```bash
GET /health
# Resposta:
{
  "status": "healthy",
  "active_companies": 2,
  "uptime": 3600,
  "connections": ["company-uuid-1", "company-uuid-2"]
}
```

#### **Status Detalhado:**
```bash
GET /status
# Resposta:
{
  "server_status": "running",
  "active_companies": 2,
  "connections": [
    {
      "company_id": "uuid",
      "company_name": "Empresa XYZ",
      "webhooks_count": 3,
      "status": "connected"
    }
  ]
}
```

### 🚀 **Vantagens do Render**

✅ **Conexões 24/7** - Nunca hibernam  
✅ **Auto-restart** - Se cair, reinicia automaticamente  
✅ **Deploy automático** - Push no GitHub = deploy  
✅ **SSL gratuito** - HTTPS automático  
✅ **Logs em tempo real** - Debug fácil  
✅ **Health checks** - Monitoramento integrado  
✅ **$7/mês apenas** - Muito barato  

### 🛠️ **Troubleshooting**

#### **Se webhooks não funcionarem:**
```bash
1. Verificar logs no Render Dashboard
2. Testar health check: GET /health
3. Verificar status: GET /status
4. Forçar reconexão: POST /reconnect/COMPANY_ID
```

#### **Logs importantes:**
```bash
🚀 Servidor rodando na porta 3000
✅ Empresa [NOME] conectada com sucesso!
📡 Evento recebido para [EMPRESA]: new-message-whatsapp
✅ Webhook [ID] executado: success (200)
```

### 🎯 **Migração Completa**

1. **✅ Servidor Render** - Substitui Edge Functions
2. **✅ Frontend Netlify** - Apenas muda endpoint
3. **✅ Supabase** - Continua como banco
4. **❌ Edge Functions** - Podem ser removidas

**Resultado:** Sistema 100% confiável 24/7! 🎊
