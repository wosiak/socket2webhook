# 🔄 Socket2Webhook | 3C Plus

Sistema avançado de gerenciamento de webhooks com filtros dinâmicos para integração com a plataforma 3C Plus.

## 🚀 Funcionalidades Principais

- ✅ **Gerenciamento de Empresas**: Cadastro e configuração completa de empresas
- ✅ **Webhooks Multi-Eventos**: Criação de webhooks com múltiplos tipos de eventos
- ✅ **Filtros Avançados**: Sistema de filtros interativos por evento com operators complexos
- ✅ **Conexão em Tempo Real**: Integração robusta com socket da 3C Plus via Render
- ✅ **Dashboard Completo**: Métricas em tempo real e histórico detalhado de execuções
- ✅ **Sistema de Usuários**: Autenticação completa com roles (admin/super_admin)
- ✅ **Processamento 24/7**: Funciona continuamente sem interrupções
- ✅ **Interface Moderna**: Design responsivo com componentes Shadcn UI

## 🎯 Filtros Interativos Avançados

### **Eventos Suportados com Filtros:**
- `call-history-was-created` - Histórico de chamadas
- `new-message-whatsapp` - Mensagens WhatsApp
- `call-was-created` - Chamadas criadas
- `call-is-trying` - Tentativas de chamada
- `call-was-abandoned` - Chamadas abandonadas
- `call-was-connected` - Chamadas conectadas
- `new-agent-message-whatsapp` - Mensagens de agentes
- `new-whatsapp-internal-message` - Mensagens internas
- `mailing-list-was-finished` - Listas finalizadas
- `agent-was-logged-out` - Agentes deslogados
- `agent-is-idle` - Agentes ociosos
- `agent-entered-manual` - Agentes em modo manual
- `start-snooze-chat-whatsapp` - Início de soneca no chat
- `finish-chat` - Finalização de chat
- `transfer-chat-whatsapp` - Transferência de chat
- `new-agent-chat-whatsapp` - Novos chats de agentes
- `call-was-not-answered` - Chamadas não atendidas
- `call-was-amd` - Detecção de secretária eletrônica
- `call-was-answered` - Chamadas atendidas

### **Operadores de Filtro:**
- `equals` - Igual a
- `not_equals` - Diferente de
- `greater_than` - Maior que
- `less_than` - Menor que
- `contains` - Contém
- `not_contains` - Não contém

## 🏗️ Arquitetura Atual

- **Frontend**: React + TypeScript + Vite + Shadcn UI (Netlify)
- **Backend**: Node.js + Express.js (Render)
- **Database**: Supabase PostgreSQL
- **Real-time**: Socket.io para conexão com 3C Plus
- **Autenticação**: Sistema próprio com Supabase Auth

## 📦 Deploy

### 1. Frontend (Netlify)

O frontend está configurado para deploy automático via GitHub:

1. Conecte seu repositório ao Netlify
2. Configure as variáveis de ambiente:
   ```env
   VITE_SUPABASE_URL=https://primzeelnavovenfdhma.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   VITE_API_BASE_URL=https://socket2webhook-3c.onrender.com
   ```

### 2. Backend (Render - Node.js)

#### Configuração no Render:

1. **Conectar GitHub ao Render:**
   - Acesse https://dashboard.render.com
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório GitHub

2. **Configurações do Serviço:**
   ```yaml
   Name: socket2webhook-3c
   Environment: Node
   Region: Ohio (US East)
   Branch: main
   Build Command: cd server && npm install
   Start Command: cd server && npm start
   ```

3. **Variáveis de Ambiente:**
   ```env
   SUPABASE_URL=https://primzeelnavovenfdhma.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   NODE_ENV=production
   PORT=8000
   ```

4. **Configurações Avançadas:**
   ```yaml
   Health Check Path: /health
   Auto Deploy: Yes
   Instance Type: Starter ($7/mês) - Recomendado para produção
   ```

### 3. Keep-Alive (N8N - Opcional)

Para manter o servidor Render sempre ativo (Free Tier):

```bash
# Requisição GET a cada 4 minutos
GET https://socket2webhook-3c.onrender.com/health
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

- **users**: Sistema de usuários e autenticação
- **user_sessions**: Sessões de usuários com TTL
- **companies**: Empresas cadastradas no sistema
- **webhooks**: Configurações de webhooks (com soft delete)
- **webhook_events**: Relacionamento webhook-eventos com filtros
- **webhook_executions**: Histórico detalhado de execuções
- **events**: Tipos de eventos disponíveis da 3C Plus

### Novos Campos Importantes

- **webhook_events.filters**: JSONB com filtros personalizados por evento
- **webhooks.deleted**: BOOLEAN para soft delete (preserva métricas)

## 🔧 Configuração e Uso

### 1. Sistema de Login

1. **Login inicial:**
   ```
   Email: admin@3cplus.com
   Senha: admin123
   ```
   
2. **Criar novos usuários:** (apenas Super Admin)
   - Acesse "Gerenciamento de Usuários"
   - Configure roles: `admin` ou `super_admin`

### 2. Configurar Empresa

1. Acesse o dashboard principal
2. Clique em "Nova Empresa"
3. Preencha:
   - Nome da empresa
   - Company ID da 3C Plus
   - Token da API da 3C Plus
   - Status (ativo/inativo)

### 3. Configurar Webhook com Filtros

1. Selecione a empresa
2. Clique em "Novo Webhook"
3. Configure:
   - Nome descritivo do webhook
   - Tipos de eventos (seleção múltipla)
   - URL de destino (validação automática)
   - **Filtros avançados** por evento:
     - Clique no ícone de filtro
     - Use a interface interativa
     - Clique nos valores JSON para filtrar automaticamente
     - Configure operadores (equals, contains, greater_than, etc.)

### 4. Ativar Processamento 24/7

1. Ative o webhook (switch)
2. O sistema automaticamente:
   - Conecta ao socket da 3C Plus via Render
   - Inicia o processamento contínuo
   - Aplica filtros configurados
   - Faz retry automático em falhas
   - Monitora eventos em tempo real

## 📊 Monitoramento e Métricas

### Dashboard Principal

- **Empresas Ativas**: Número de empresas com webhooks ativos
- **Webhooks Ativos**: Total de webhooks funcionando
- **Total de Execuções**: Número total de webhooks processados
- **Taxa de Sucesso**: Percentual de execuções bem-sucedidas
- **Execuções Falharam**: Webhooks que falharam (com retry automático)
- **Métricas por Empresa**: Performance individual e detalhada

### Histórico de Execuções

- **Evento processado**: Tipo de evento e payload
- **Status**: Sucesso/Falha com códigos HTTP
- **Filtros aplicados**: Quais filtros foram avaliados
- **Tentativas realizadas**: Sistema de retry inteligente
- **Tempo de resposta**: Performance da URL de destino
- **Detalhes da resposta**: Headers e corpo da resposta

### Endpoints de Monitoramento

- **Health Check**: `GET /health` - Status geral do sistema
- **Status Detalhado**: `GET /status` - Conexões ativas por empresa
- **Métricas**: `GET /metrics` - Estatísticas completas
- **Cache Stats**: `GET /cache-stats` - Performance do cache

## 🔄 Funcionamento 24/7 (Render)

O sistema funciona continuamente através do servidor Node.js no Render:

1. **Conexão Persistente**: Mantém conexão WebSocket com 3C Plus
2. **Processamento Automático**: Processa eventos em tempo real
3. **Sistema de Filtros**: Aplica filtros configurados antes do POST
4. **Retry Inteligente**: Reexecuta webhooks falhados automaticamente
5. **Logs Detalhados**: Registra todas as atividades para debug
6. **Auto-Reconnect**: Reconecta automaticamente em caso de falha
7. **Soft Delete**: Preserva dados para métricas mesmo após "exclusão"

## 🛠️ Desenvolvimento Local

### Instalação e Configuração

```bash
# Clone o repositório
git clone https://github.com/wosiak/socket2webhook.git
cd socket2webhook

# Frontend
npm install
npm run dev  # Roda em http://localhost:3000

# Backend (novo terminal)
cd server
npm install
npm run dev  # Roda em http://localhost:8000
```

### Variáveis de Ambiente

#### Frontend (`.env`):
```env
VITE_SUPABASE_URL=https://primzeelnavovenfdhma.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
VITE_API_BASE_URL=http://localhost:8000
```

#### Backend (`server/.env`):
```env
SUPABASE_URL=https://primzeelnavovenfdhma.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NODE_ENV=development
PORT=8000
```

### Estrutura do Projeto

```
socket2webhook/
├── src/                    # Frontend React
│   ├── components/         # Componentes UI
│   ├── services/          # API calls
│   ├── hooks/             # Custom hooks
│   └── types/             # TypeScript types
├── server/                # Backend Node.js
│   ├── server.js          # Servidor principal
│   └── package.json       # Dependências do backend
└── supabase/              # Database migrations
```

## 📝 Logs e Debug

### Logs do Frontend

- **Console do Navegador**: Logs de conexão, status de webhooks, métricas
- **Network Tab**: Requisições para API e Supabase
- **React DevTools**: Estado dos componentes

### Logs do Backend (Render)

- **Render Dashboard**: Logs em tempo real do servidor
- **Socket Connections**: Status das conexões WebSocket
- **Webhook Executions**: Detalhes de cada POST realizado
- **Error Tracking**: Erros e stack traces completos

### Logs do Supabase

- **Query Logs**: Todas as queries executadas
- **RLS Logs**: Políticas de segurança
- **Auth Logs**: Login/logout de usuários

## 🔒 Segurança Implementada

- **Autenticação Própria**: Sistema de login com roles
- **Row Level Security (RLS)**: Isolamento total por empresa
- **Tokens Seguros**: JWT com TTL de 7 dias
- **Validação de URLs**: Verificação de webhooks válidos
- **Rate Limiting**: Proteção contra spam
- **Input Sanitization**: Validação de todos os inputs
- **HTTPS Only**: Comunicação criptografada
- **Soft Delete**: Preservação de dados críticos

## 📈 Performance e Otimização

- **Processamento Assíncrono**: Non-blocking event processing
- **Cache Inteligente**: Redis-like cache para eventos frequentes
- **Connection Pooling**: Otimização de conexões com database
- **Lazy Loading**: Componentes carregados sob demanda
- **Code Splitting**: Bundles otimizados por rota
- **CDN**: Assets estáticos via Netlify CDN
- **Keep-Alive**: Conexões persistentes com 3C Plus
- **Retry Logic**: Sistema inteligente de tentativas

## 🆘 Suporte e Troubleshooting

### Para Problemas Comuns:

1. **Webhooks não disparam:**
   - Verifique logs no Render Dashboard
   - Teste health check: `GET /health`
   - Verifique status: `GET /status`
   - Forçar reconexão: `POST /force-reconnect`

2. **Filtros não funcionam:**
   - Confirme sintaxe JSON no event body
   - Verifique operadores utilizados
   - Teste com logs detalhados no backend

3. **Sistema desconecta:**
   - Configure keep-alive no N8N (4 minutos)
   - Considere upgrade para Render Pro
   - Monitore logs de reconexão automática

4. **Performance lenta:**
   - Verifique cache stats: `GET /cache-stats`
   - Analise métricas por empresa
   - Otimize filtros complexos

### Documentação Adicional:

- **Supabase Docs**: https://docs.supabase.com
- **Render Docs**: https://render.com/docs
- **3C Plus API**: Consulte documentação oficial

### Contato:

- **Issues no GitHub**: Para reportar bugs
- **Discussions**: Para dúvidas gerais
- **Email**: Para suporte técnico

## 📊 Status do Sistema

- **Frontend**: ✅ https://socket2webhook.netlify.app
- **Backend**: ✅ https://socket2webhook-3c.onrender.com
- **Database**: ✅ Supabase PostgreSQL
- **Uptime**: 99.9% (com keep-alive ativo)

## 🎯 Roadmap

### **Próximas Funcionalidades:**
- [ ] Dashboard de métricas avançadas
- [ ] Sistema de alertas por email
- [ ] API para integração externa
- [ ] Webhooks condicionais
- [ ] Backup automático
- [ ] Multi-tenancy melhorado

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Socket2Webhook | 3C Plus** - Sistema profissional de webhook management com filtros avançados para empresas que precisam de integração robusta e confiável. 🚀
