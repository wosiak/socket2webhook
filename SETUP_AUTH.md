# 🔐 CONFIGURAÇÃO DO SISTEMA DE AUTENTICAÇÃO

## 📋 INSTRUÇÕES PARA CONFIGURAR O BANCO DE DADOS

### 1. 🚀 **Executar Migration no Supabase**

Para configurar as tabelas de usuários e autenticação no Supabase:

1. **Acesse o Supabase Dashboard:**
   - https://supabase.com/dashboard/projects
   - Selecione seu projeto: `primzeelnavovenfdhma`

2. **Abra o SQL Editor:**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New Query"

3. **Execute a Migration:**
   - Copie todo o conteúdo do arquivo: `supabase/migrations/create_auth_system.sql`
   - Cole no SQL Editor
   - Clique em "Run" para executar

### 2. 👤 **Usuário Padrão Criado**

Após executar a migration, será criado automaticamente:

```
Email: admin@3cplus.com
Senha: admin123
Role: Super Administrador
```

### 3. 🔧 **Funcionalidades Implementadas**

#### **🟢 SUPER_ADMIN (Acesso Total):**
- ✅ Gerenciar empresas (CRUD)
- ✅ Gerenciar webhooks (CRUD)  
- ✅ Ver métricas e dashboard
- ✅ **Gerenciar usuários (CRUD)**
- ✅ **Alterar roles de outros usuários**

#### **🟡 ADMIN (Operações Básicas):**
- ✅ Gerenciar empresas (CRUD)
- ✅ Gerenciar webhooks (CRUD)
- ✅ Ver métricas e dashboard
- ❌ **NÃO pode gerenciar usuários**
- ❌ **NÃO pode alterar roles**

### 4. 🎯 **Como Testar**

1. **Acesse a aplicação** (após deploy)
2. **Faça login** com as credenciais padrão
3. **Teste as funcionalidades:**
   - Dashboard e empresas (todos os roles)
   - Gerenciamento de usuários (apenas Super Admin)
   - Logout e login novamente

### 5. 🔒 **Segurança Implementada**

- **Row Level Security (RLS)** habilitado
- **Sessões com TTL** (7 dias)
- **Tokens seguros** com validação
- **Permissões baseadas em roles**
- **Cleanup automático** de sessões expiradas

### 6. 📱 **Interface Responsiva**

- **Tela de login** elegante e responsiva
- **Menu de usuário** com avatar e informações
- **Gerenciamento de usuários** com cards visuais
- **Proteção de rotas** baseada em permissões

---

## 🚀 **PRÓXIMOS PASSOS**

1. Execute a migration no Supabase
2. Faça o deploy da aplicação
3. Teste o login com as credenciais padrão
4. Crie novos usuários conforme necessário
5. Configure roles apropriados para cada usuário

---

## 🔧 **TROUBLESHOOTING**

### Erro de RLS (Row Level Security)
Se encontrar erros de permissão, verifique se:
- As políticas RLS foram criadas corretamente
- O usuário tem role adequado
- O token de sessão está válido

### Erro de Autenticação
- Verifique se a migration foi executada
- Confirme as variáveis de ambiente
- Teste com as credenciais padrão primeiro

### Problemas de Permissão
- Super Admin pode fazer tudo
- Admin normal NÃO pode gerenciar usuários
- Usuários só podem ver informações permitidas pelo role
