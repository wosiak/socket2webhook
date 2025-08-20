# 🚀 Quick Start - Deploy Webhook Proxy 3C Plus

## ⚡ Deploy Rápido em 5 Passos

### 1. Execute o Setup
```bash
./deploy-setup.sh
```

### 2. Configure as Variáveis de Ambiente
Edite `.env.local`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Suba para o GitHub
```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/socket2webhook.git
git push -u origin main
```

### 4. Deploy no Render (Backend)
1. Acesse [render.com](https://render.com)
2. New Web Service → Conecte o repositório
3. Runtime: `Deno`
4. Build: `deno cache supabase/functions/server/index.tsx`
5. Start: `deno run --allow-net --allow-env supabase/functions/server/index.tsx`
6. Variáveis: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`

### 5. Deploy no Netlify (Frontend)
1. Acesse [netlify.com](https://netlify.com)
2. Import project → Conecte o repositório
3. Build: `npm run build`
4. Publish: `dist`
5. Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`

## 📋 Checklist de Deploy

- [ ] Repositório criado no GitHub
- [ ] Código enviado para o GitHub
- [ ] Backend configurado no Render
- [ ] Frontend configurado no Netlify
- [ ] Variáveis de ambiente configuradas
- [ ] Teste de funcionamento realizado

## 🔗 URLs Importantes

- **Frontend**: `https://sua-app.netlify.app`
- **Backend**: `https://sua-app.onrender.com`
- **Health Check**: `https://sua-app.onrender.com/make-server-661cf1c3/health`

## 📚 Documentação Completa

- [Guia de Deploy Detalhado](DEPLOY_GUIDE.md)
- [README do Projeto](README.md)
- [Estrutura do Banco de Dados](database_schema.sql)

---

🎉 **Sua aplicação está pronta para produção!**
