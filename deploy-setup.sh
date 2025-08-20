#!/bin/bash

echo "🚀 Configurando deploy do Webhook Proxy 3C Plus"
echo "================================================"

# Verificar se o Git está instalado
if ! command -v git &> /dev/null; then
    echo "❌ Git não está instalado. Por favor, instale o Git primeiro."
    exit 1
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale o Node.js primeiro."
    exit 1
fi

echo "✅ Git e Node.js encontrados"

# Inicializar Git se não estiver inicializado
if [ ! -d ".git" ]; then
    echo "📁 Inicializando repositório Git..."
    git init
    echo "✅ Repositório Git inicializado"
else
    echo "✅ Repositório Git já existe"
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install
echo "✅ Dependências instaladas"

# Criar arquivo .env.local se não existir
if [ ! -f ".env.local" ]; then
    echo "📝 Criando arquivo .env.local..."
    cp env.example .env.local
    echo "✅ Arquivo .env.local criado"
    echo "⚠️  IMPORTANTE: Configure as variáveis de ambiente no arquivo .env.local"
else
    echo "✅ Arquivo .env.local já existe"
fi

echo ""
echo "🎉 Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as variáveis de ambiente no arquivo .env.local"
echo "2. Faça commit das mudanças: git add . && git commit -m 'Initial commit'"
echo "3. Crie um repositório no GitHub chamado 'socket2webhook'"
echo "4. Conecte o repositório local ao GitHub:"
echo "   git remote add origin https://github.com/seu-usuario/socket2webhook.git"
echo "   git push -u origin main"
echo "5. Configure o deploy no Netlify (frontend)"
echo "6. Configure o deploy no Render (backend)"
echo ""
echo "📚 Consulte o README.md para instruções detalhadas de deploy"
