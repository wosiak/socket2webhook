# Socket2Webhook - Ambiente de Desenvolvimento

## 🚀 Branches e Deploys

### 📦 **PRODUÇÃO** (Não tocar!)
- **Branch**: `main`
- **Frontend**: https://socket2webhook.netlify.app
- **Backend**: https://socket2webhook.onrender.com
- **Status**: ✅ **FUNCIONANDO 100% - NÃO MEXER**

### 🧪 **DESENVOLVIMENTO** (Para testes)
- **Branch**: `development`
- **Frontend**: _A ser configurado_
- **Backend**: _A ser configurado_
- **Status**: 🔧 **Para testes e novas funcionalidades**

---

## 🔄 Workflow de Desenvolvimento

### **1. Trabalhando no Development**
```bash
# Garantir que está no branch development
git checkout development

# Fazer suas alterações...
# Testar no ambiente de desenvolvimento

# Commit das mudanças
git add .
git commit -m "feat: nova funcionalidade"
git push origin development
```

### **2. Promovendo para Produção**
```bash
# Quando tudo estiver testado e funcionando:
git checkout main
git merge development
git push origin main
```

---

## ⚠️ **REGRAS IMPORTANTES**

### ❌ **NUNCA FAZER:**
- **Não fazer commit direto na `main`**
- **Não fazer push direto para produção**
- **Não testar em produção**

### ✅ **SEMPRE FAZER:**
- **Testar tudo no `development` primeiro**
- **Confirmar que não quebra funcionalidades existentes**
- **Usar o ambiente de dev para experimentos**

---

## 🎯 **Próximos Passos**

1. **Configurar Netlify Dev** (frontend de desenvolvimento)
2. **Configurar Render Dev** (backend de desenvolvimento)
3. **Testar database logging fix** no ambiente dev
4. **Implementar novas funcionalidades** com segurança

---

## 📞 **Contato**
- **Produção funcionando**: ✅ Empresas podem usar normalmente
- **Development disponível**: ✅ Para implementar melhorias
- **Zero downtime**: ✅ Desenvolvimento não afeta produção
