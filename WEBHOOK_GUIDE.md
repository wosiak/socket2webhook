# 🚀 Guia do Sistema de Webhook - 3C Plus

## ✅ Funcionalidade Implementada

O sistema agora está completo e pode:

1. **Conectar ao socket da 3C Plus** usando o token da empresa
2. **Receber eventos em tempo real** do socket da 3C Plus
3. **Fazer POST automático** para suas URLs configuradas
4. **Gerenciar múltiplas conexões** simultaneamente
5. **Suportar autenticação e assinatura** nos webhooks

## 🔧 Como Funciona

### 1. Configuração da Empresa
- Cadastre a empresa com o **Token de API** da 3C Plus
- O token é usado para conectar ao socket: `https://socket.3c.plus`

### 2. Configuração do Webhook
- Defina a **URL** onde receber os eventos
- Selecione os **tipos de eventos** que deseja receber
- Configure **autenticação** (opcional): `Authorization: Bearer SEU_TOKEN`
- Configure **assinatura HMAC** (opcional): `X-Signature-SHA256`

### 3. Conexão ao Socket
- Use o botão **"Conectar"** no painel da empresa
- O sistema conecta automaticamente ao socket da 3C Plus
- Eventos são recebidos e encaminhados para suas URLs

## 📋 Eventos Suportados

O sistema suporta todos os eventos da 3C Plus:

- `agent-is-idle` - Agente ficou ocioso
- `call-was-connected` - Chamada foi conectada
- `call-was-disconnected` - Chamada foi desconectada
- `agent-status-changed` - Status do agente mudou
- `call-started` - Chamada iniciou
- `call-ended` - Chamada terminou
- **E qualquer outro evento** que a 3C Plus enviar

## 📤 Formato do POST

Quando um evento é recebido, o sistema faz POST para sua URL com:

```json
{
  "event": "agent-is-idle",
  "payload": {
    // Dados originais do evento da 3C Plus
    "agent_id": "123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "meta": {
    "socketId": "socket_123",
    "token_mask": "rRrX…8KrL",
    "received_at": "2024-01-01T00:00:00.000Z",
    "source": "webhook-proxy-3c-plus",
    "webhook_id": "webhook_456",
    "company_id": "company_789"
  }
}
```

## 🔐 Segurança

### Autenticação
Se configurado, o sistema adiciona o header:
```
Authorization: Bearer SEU_TOKEN
```

### Assinatura HMAC
Se configurado, o sistema adiciona o header:
```
X-Signature-SHA256: hmac_sha256_signature
```

## 🎯 Como Usar

### 1. Cadastre uma Empresa
```
Nome: Minha Empresa
ID 3C Plus: 12345
Token de API: rRrXvDCg07AEJRYKenHDxxymhQ5h8KrLwlYq062ZgeYLNHzio79wxgn33x4c
```

### 2. Configure um Webhook
```
Nome: Webhook Principal
URL: https://api.minhaempresa.com/webhook
Eventos: agent-is-idle, call-was-connected
Autenticação: Bearer meu_token_secreto
Assinatura: minha_chave_secreta
```

### 3. Conecte ao Socket
- Vá para os detalhes da empresa
- Clique em **"Conectar"** no painel de conexão
- O sistema conecta automaticamente ao socket da 3C Plus

### 4. Receba Eventos
- Eventos são enviados automaticamente para sua URL
- Você pode verificar o status da conexão em tempo real
- Logs detalhados no console do servidor

## 🔍 Monitoramento

### Status da Conexão
- **Conectado**: Verde com ícone de check
- **Desconectado**: Cinza com ícone de wifi off
- **Carregando**: Spinner durante operações

### Logs do Sistema
```
✅ Conectado ao socket da 3C Plus para empresa company_123!
📥 Evento recebido: agent-is-idle para empresa company_123
📤 Webhook enviado: agent-is-idle → https://api.exemplo.com/webhook
✅ Webhook enviado com sucesso para https://api.exemplo.com/webhook
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **"Token inválido"**
   - Verifique se o token da 3C Plus está correto
   - Confirme se a empresa está ativa na 3C Plus

2. **"URL não acessível"**
   - Verifique se sua URL está online
   - Confirme se aceita requisições POST
   - Verifique se retorna status 200

3. **"Eventos não chegando"**
   - Verifique se a conexão está ativa
   - Confirme se os tipos de eventos estão corretos
   - Verifique os logs do servidor

### Logs de Debug
O sistema registra todos os eventos no console:
- Conexões e desconexões
- Eventos recebidos
- Webhooks enviados
- Erros e falhas

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor
2. Confirme as configurações da empresa e webhook
3. Teste a URL do webhook manualmente
4. Verifique se o token da 3C Plus está válido

---

🎉 **Seu sistema de webhook está pronto para receber eventos da 3C Plus!**
