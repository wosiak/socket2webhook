# Webhook Proxy 3C Plus

Uma aplicação completa para gerenciamento de webhooks e proxy de eventos da plataforma 3C Plus.

## 🚀 Funcionalidades

- **Gerenciamento de Empresas**: Cadastro e configuração de empresas na plataforma 3C Plus
- **Webhook Proxy**: Interceptação e redirecionamento de eventos
- **Monitoramento em Tempo Real**: Visualização de eventos via WebSocket
- **Histórico de Execuções**: Rastreamento completo de todas as execuções
- **Dashboard Interativo**: Interface moderna e responsiva

## 🛠️ Tecnologias

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **Radix UI** para componentes acessíveis
- **Lucide React** para ícones

### Backend
- **Deno** com Hono framework
- **Supabase** para banco de dados e autenticação
- **WebSocket** para comunicação em tempo real

### Infraestrutura
- **Netlify** para deploy do frontend
- **Render** para deploy do backend
- **Supabase** para banco de dados PostgreSQL

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase
- Conta no Netlify
- Conta no Render

### Configuração Local

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/socket2webhook.git
cd socket2webhook
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
VITE_API_BASE_URL=http://localhost:8000
```

4. **Execute o projeto**
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## 🚀 Deploy

### Frontend (Netlify)

1. Conecte seu repositório GitHub ao Netlify
2. Configure as variáveis de ambiente no Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (URL do backend no Render)

3. Configure o build:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Backend (Render)

1. Conecte seu repositório GitHub ao Render
2. Configure as variáveis de ambiente:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. Configure o serviço:
   - Runtime: `Deno`
   - Build Command: `deno cache supabase/functions/server/index.tsx`
   - Start Command: `deno run --allow-net --allow-env supabase/functions/server/index.tsx`

## 📁 Estrutura do Projeto

```
├── src/
│   ├── components/          # Componentes React
│   ├── hooks/              # Custom hooks
│   ├── services/           # Serviços de API
│   ├── types/              # Definições TypeScript
│   └── utils/              # Utilitários
├── supabase/
│   └── functions/
│       └── server/         # Backend Deno
├── public/                 # Arquivos estáticos
└── docs/                   # Documentação
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Visualiza o build de produção

## 📊 Banco de Dados

O projeto utiliza as seguintes tabelas no Supabase:

- `companies` - Empresas cadastradas
- `webhooks` - Configurações de webhook
- `events` - Eventos recebidos
- `executions` - Histórico de execuções
- `metrics` - Métricas de performance

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato através do email: seu-email@exemplo.com
