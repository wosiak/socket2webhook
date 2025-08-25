# W2W: WebSocket to Webhook | 3C Plus

Sistema completo de gerenciamento de webhooks para integração com a plataforma 3C Plus.

## 🚀 Funcionalidades

- ✅ **Gerenciamento de Empresas**: Cadastro e configuração de empresas
- ✅ **Webhooks Multi-Eventos**: Criação de webhooks com múltiplos tipos de eventos
- ✅ **Conexão em Tempo Real**: Integração com socket da 3C Plus
- ✅ **Dashboard Completo**: Métricas em tempo real e histórico de execuções
- ✅ **Processamento Contínuo**: Funciona 24/7 mesmo com PC desligado
- ✅ **Interface Intuitiva**: Navegação fácil e design responsivo

## 🏗️ Arquitetura

- **Frontend**: React + TypeScript + Tailwind CSS (Netlify)
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL
- **Real-time**: Socket.io para conexão com 3C Plus

## 📦 Deploy

### 1. Frontend (Netlify)

O frontend já está configurado para deploy automático via GitHub:

1. Conecte seu repositório ao Netlify
2. Configure as variáveis de ambiente:
   ```
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   ```

### 2. Backend (Supabase Edge Functions)

#### Pré-requisitos

1. Instale o Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Faça login no Supabase:
   ```bash
   supabase login
   ```

3. Conecte ao seu projeto:
   ```bash
   supabase link --project-ref seu_project_ref
   ```

#### Deploy das Edge Functions

1. Deploy da função de processamento de webhooks:
   ```bash
   supabase functions deploy webhook-processor
   ```

2. Deploy da função de conexão com socket:
   ```bash
   supabase functions deploy socket-connector
   ```

3. Configure as variáveis de ambiente no Supabase:
   - `SUPABASE_URL`: URL do seu projeto
   - `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço do Supabase

## 🗄️ Estrutura do Banco

### Tabelas Principais

- **companies**: Empresas cadastradas
- **webhooks**: Configurações de webhooks
- **webhook_events**: Relacionamento webhook-eventos
- **webhook_executions**: Histórico de execuções
- **events**: Tipos de eventos disponíveis
- **kv_store**: Armazenamento de configurações temporárias

## 🔧 Configuração

### 1. Configurar Empresa

1. Acesse o sistema
2. Clique em "Nova Empresa"
3. Preencha:
   - Nome da empresa
   - Company ID da 3C Plus
   - Token da API da 3C Plus

### 2. Configurar Webhook

1. Selecione a empresa
2. Clique em "Novo Webhook"
3. Configure:
   - Nome do webhook
   - Tipos de eventos (múltiplos)
   - URL de destino

### 3. Ativar Processamento

1. Ative o webhook (switch)
2. O sistema automaticamente:
   - Conecta ao socket da 3C Plus
   - Inicia o processamento contínuo
   - Monitora eventos em tempo real

## 📊 Monitoramento

### Dashboard

- **Total de Execuções**: Número total de webhooks processados
- **Taxa de Sucesso**: Percentual de execuções bem-sucedidas
- **Execuções Falharam**: Webhooks que falharam
- **Métricas por Empresa**: Performance individual

### Histórico de Execuções

- Evento processado
- Status (Sucesso/Falha)
- Tentativas realizadas
- Detalhes da resposta

## 🔄 Funcionamento Contínuo

O sistema funciona 24/7 através das Supabase Edge Functions:

1. **Conexão Persistente**: Mantém conexão com 3C Plus
2. **Processamento Automático**: Processa eventos automaticamente
3. **Retry Inteligente**: Reexecuta webhooks falhados
4. **Logs Detalhados**: Registra todas as atividades

## 🛠️ Desenvolvimento

### Instalação Local

```bash
git clone https://github.com/wosiak/socket2webhook.git
cd socket2webhook
npm install
npm run dev
```

### Variáveis de Ambiente

Crie um arquivo `.env.local`:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

## 📝 Logs e Debug

### Console do Navegador

- Logs de conexão com socket
- Status de webhooks
- Métricas em tempo real

### Supabase Logs

- Execuções de Edge Functions
- Queries de banco de dados
- Erros de processamento

## 🔒 Segurança

- Autenticação via Supabase
- Tokens seguros para API
- Isolamento por empresa
- Validação de URLs de webhook

## 📈 Performance

- Processamento assíncrono
- Cache inteligente
- Otimização de queries
- Monitoramento de métricas

## 🆘 Suporte

Para dúvidas ou problemas:

1. Verifique os logs no console
2. Consulte a documentação do Supabase
3. Abra uma issue no GitHub

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.
