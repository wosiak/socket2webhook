# 🚀 Deploy no Netlify - Configuração Corrigida

## ✅ Problema Resolvido

O erro "Servidor não disponível: Failed to fetch" foi corrigido. A aplicação agora usa o **Supabase Edge Functions** diretamente, eliminando a necessidade de um backend separado.

## 🔧 Configuração Atual

### Variáveis de Ambiente Necessárias no Netlify:

| Variável | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://primzeelnavovenfdhma.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByaW16ZWVsbmF2b3ZlbmZkaG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDgyMzgsImV4cCI6MjA3MTEyNDIzOH0.exCcezOlx0klLLCkwb5rY68ZxsAsWKfsskQmKiv-M08` |

## 📋 Passos para Deploy

### 1. Push para GitHub
```bash
git push origin main
```

### 2. Configurar Netlify

1. **Acesse [netlify.com](https://netlify.com)**
2. **Import project** → Conecte o repositório `socket2webhook`
3. **Configure o build:**
   - Build command: `npm run build`
   - Publish directory: `dist`

### 3. Configurar Variáveis de Ambiente

No painel do Netlify, vá em **Site settings** → **Environment variables** e adicione:

```
VITE_SUPABASE_URL = https://primzeelnavovenfdhma.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByaW16ZWVsbmF2b3ZlbmZkaG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDgyMzgsImV4cCI6MjA3MTEyNDIzOH0.exCcezOlx0klLLCkwb5rY68ZxsAsWKfsskQmKiv-M08
```

### 4. Deploy

1. Clique em **Deploy site**
2. Aguarde o build (deve demorar 2-3 minutos)
3. A aplicação estará disponível na URL gerada

## 🎯 Como Funciona Agora

- **Frontend**: Netlify (React + Vite)
- **Backend**: Supabase Edge Functions (já configurado)
- **Banco de Dados**: Supabase PostgreSQL
- **Autenticação**: Supabase Auth

## 🔍 Teste de Funcionamento

Após o deploy, teste:

1. **Acesse a URL do Netlify**
2. **Verifique se não há erros no console**
3. **Teste as funcionalidades:**
   - Login
   - Cadastro de empresas
   - Configuração de webhooks
   - Monitoramento de eventos

## 🚨 Se Ainda Houver Problemas

1. **Verifique os logs do Netlify** em **Deploys** → **Latest deploy** → **Functions**
2. **Confirme as variáveis de ambiente** estão corretas
3. **Teste localmente** com `npm run dev` para verificar se funciona

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro no Netlify
2. Confirme se as variáveis de ambiente estão corretas
3. Teste a aplicação localmente primeiro

---

🎉 **A aplicação agora deve funcionar perfeitamente no Netlify!**
