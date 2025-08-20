# 🚀 Guia de Deploy - Webhook Proxy 3C Plus

Este guia detalhado irá ajudá-lo a fazer o deploy da aplicação no GitHub, Netlify (frontend) e Render (backend).

## 📋 Pré-requisitos

- Conta no [GitHub](https://github.com)
- Conta no [Netlify](https://netlify.com)
- Conta no [Render](https://render.com)
- Conta no [Supabase](https://supabase.com)
- Node.js 18+ instalado
- Git instalado

## 🔧 Passo 1: Preparação do Repositório

### 1.1 Execute o script de setup
```bash
./deploy-setup.sh
```

### 1.2 Configure as variáveis de ambiente
Edite o arquivo `.env.local` com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
VITE_API_BASE_URL=http://localhost:8000
```

### 1.3 Teste localmente
```bash
npm run dev
```

Certifique-se de que a aplicação está funcionando em `http://localhost:3000`

## 📤 Passo 2: GitHub

### 2.1 Crie o repositório no GitHub
1. Acesse [github.com](https://github.com)
2. Clique em "New repository"
3. Nome: `socket2webhook`
4. Descrição: "Webhook Proxy 3C Plus - Aplicação para gerenciamento de webhooks"
5. Deixe público ou privado (sua escolha)
6. **NÃO** inicialize com README, .gitignore ou licença
7. Clique em "Create repository"

### 2.2 Conecte o repositório local
```bash
git add .
git commit -m "Initial commit: Webhook Proxy 3C Plus"
git branch -M main
git remote add origin https://github.com/seu-usuario/socket2webhook.git
git push -u origin main
```

## 🌐 Passo 3: Deploy do Backend (Render)

### 3.1 Crie uma conta no Render
1. Acesse [render.com](https://render.com)
2. Faça login com sua conta GitHub
3. Clique em "New +" e selecione "Web Service"

### 3.2 Configure o serviço
1. **Connect a repository**: Selecione o repositório `socket2webhook`
2. **Name**: `webhook-proxy-backend`
3. **Region**: Escolha a região mais próxima (ex: US East)
4. **Branch**: `main`
5. **Runtime**: `Deno`
6. **Build Command**: `deno cache supabase/functions/server/index.tsx`
7. **Start Command**: `deno run --allow-net --allow-env supabase/functions/server/index.tsx`

### 3.3 Configure as variáveis de ambiente
Na seção "Environment Variables", adicione:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://seu-projeto.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sua_service_role_key_aqui` |

### 3.4 Deploy
1. Clique em "Create Web Service"
2. Aguarde o deploy (pode levar alguns minutos)
3. Anote a URL gerada (ex: `https://webhook-proxy-backend.onrender.com`)

### 3.5 Teste o backend
Acesse: `https://sua-url.onrender.com/make-server-661cf1c3/health`

Deve retornar:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "message": "Server is running and connected to database"
}
```

## 🎨 Passo 4: Deploy do Frontend (Netlify)

### 4.1 Crie uma conta no Netlify
1. Acesse [netlify.com](https://netlify.com)
2. Faça login com sua conta GitHub
3. Clique em "Add new site" → "Import an existing project"

### 4.2 Configure o deploy
1. **Connect to Git provider**: GitHub
2. **Repository**: Selecione `socket2webhook`
3. **Branch**: `main`
4. **Base directory**: (deixe vazio)
5. **Build command**: `npm run build`
6. **Publish directory**: `dist`

### 4.3 Configure as variáveis de ambiente
Na seção "Environment variables", adicione:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://seu-projeto.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sua_chave_anonima_aqui` |
| `VITE_API_BASE_URL` | `https://sua-url-backend.onrender.com` |

### 4.4 Deploy
1. Clique em "Deploy site"
2. Aguarde o build e deploy (pode levar alguns minutos)
3. Anote a URL gerada (ex: `https://amazing-app-123456.netlify.app`)

### 4.5 Configure domínio personalizado (opcional)
1. Vá em "Site settings" → "Domain management"
2. Clique em "Add custom domain"
3. Configure seu domínio (ex: `webhook-proxy.seudominio.com`)

## 🔄 Passo 5: Configuração Final

### 5.1 Atualize as variáveis de ambiente
Após o deploy do backend, atualize a variável `VITE_API_BASE_URL` no Netlify com a URL real do backend.

### 5.2 Teste a aplicação completa
1. Acesse a URL do frontend no Netlify
2. Teste todas as funcionalidades:
   - Login
   - Cadastro de empresas
   - Configuração de webhooks
   - Monitoramento de eventos

### 5.3 Configure webhooks (se necessário)
Se você estiver usando webhooks externos, atualize as URLs para apontar para seu backend no Render.

## 🔧 Passo 6: Configurações Avançadas

### 6.1 Configurar deploy automático
- **GitHub**: Os deploys acontecem automaticamente quando você faz push para a branch `main`
- **Netlify**: Vá em "Site settings" → "Build & deploy" → "Deploy contexts" para configurar branches específicas
- **Render**: Vá em "Settings" → "Build & Deploy" para configurar triggers de deploy

### 6.2 Monitoramento
- **Netlify**: Use "Site settings" → "Analytics" para monitorar performance
- **Render**: Use "Logs" para monitorar o backend
- **Supabase**: Use o dashboard para monitorar o banco de dados

### 6.3 Backup e segurança
- Configure backups automáticos no Supabase
- Use HTTPS em todas as URLs
- Configure rate limiting se necessário

## 🚨 Troubleshooting

### Problemas comuns:

1. **Build falha no Netlify**
   - Verifique se todas as dependências estão no `package.json`
   - Verifique se o Node.js version está correto
   - Verifique os logs de build

2. **Backend não inicia no Render**
   - Verifique se as variáveis de ambiente estão corretas
   - Verifique se o Deno está configurado corretamente
   - Verifique os logs do serviço

3. **Erro de CORS**
   - Verifique se a URL do backend está correta no frontend
   - Verifique se o CORS está configurado no backend

4. **Erro de conexão com Supabase**
   - Verifique se as credenciais do Supabase estão corretas
   - Verifique se o projeto Supabase está ativo
   - Verifique se as tabelas foram criadas corretamente

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro
2. Consulte a documentação do README.md
3. Abra uma issue no GitHub
4. Entre em contato através do email de suporte

---

🎉 **Parabéns! Sua aplicação está no ar!**

Agora você pode acessar sua aplicação através da URL do Netlify e continuar o desenvolvimento fazendo push para o GitHub.
