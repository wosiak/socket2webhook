import { io } from 'npm:socket.io-client@4.7.4'
import { createHmac } from 'npm:node:crypto'

interface WebhookConfig {
  id: string
  company_id: string
  url: string
  event_types: string[]
  is_active: boolean
  auth_header?: string
  signing_secret?: string
}

interface WebhookPayload {
  event: string
  payload: any
  meta: {
    socketId: string
    token_mask: string
    received_at: string
    source: string
    webhook_id: string
    company_id: string
  }
}

class WebhookService {
  private socketConnections: Map<string, any> = new Map()
  private webhookConfigs: Map<string, WebhookConfig[]> = new Map()

  // Função para assinar o corpo da requisição com HMAC-SHA256
  private signBody(body: string, secret: string): string {
    const hmac = createHmac('sha256', secret)
    hmac.update(body, 'utf8')
    return hmac.digest('hex')
  }

  // Função para fazer POST para a URL do webhook
  private async postToWebhook(config: WebhookConfig, payload: WebhookPayload): Promise<void> {
    const body = JSON.stringify(payload)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Adiciona header de autorização se configurado
    if (config.auth_header) {
      headers['Authorization'] = config.auth_header
    }

    // Adiciona assinatura HMAC se configurado
    if (config.signing_secret) {
      const signature = this.signBody(body, config.signing_secret)
      headers['X-Signature-SHA256'] = signature
    }

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Webhook HTTP ${response.status} ${response.statusText}: ${errorText}`)
      }

      console.log(`✅ Webhook enviado com sucesso para ${config.url}`)
    } catch (error) {
      console.error(`❌ Erro ao enviar webhook para ${config.url}:`, error.message)
      throw error
    }
  }

  // Função para processar eventos do socket
  private async handleSocketEvent(event: string, payload: any, token: string, socketId: string, companyId: string): Promise<void> {
    console.log(`📥 Evento recebido: ${event} para empresa ${companyId}`)

    // Busca webhooks configurados para esta empresa e evento
    const webhooks = this.webhookConfigs.get(companyId) || []
    const relevantWebhooks = webhooks.filter(webhook => 
      webhook.is_active && webhook.event_types.includes(event)
    )

    if (relevantWebhooks.length === 0) {
      console.log(`ℹ️ Nenhum webhook ativo encontrado para evento ${event} na empresa ${companyId}`)
      return
    }

    // Mascara o token para segurança
    const tokenMask = token.length > 10 ? `${token.slice(0, 4)}…${token.slice(-4)}` : token

    // Processa cada webhook relevante
    for (const webhook of relevantWebhooks) {
      try {
        const webhookPayload: WebhookPayload = {
          event,
          payload,
          meta: {
            socketId,
            token_mask: tokenMask,
            received_at: new Date().toISOString(),
            source: 'webhook-proxy-3c-plus',
            webhook_id: webhook.id,
            company_id: companyId
          }
        }

        await this.postToWebhook(webhook, webhookPayload)
        console.log(`📤 Webhook enviado: ${event} → ${webhook.url}`)
      } catch (error) {
        console.error(`❌ Falha ao enviar webhook ${webhook.id}:`, error.message)
        // Aqui você pode implementar retry logic ou salvar falhas no banco
      }
    }
  }

  // Função para conectar ao socket da 3C Plus
  public async connectToSocket(companyId: string, token: string, webhooks: WebhookConfig[]): Promise<void> {
    // Desconecta se já existe uma conexão
    if (this.socketConnections.has(companyId)) {
      this.disconnectFromSocket(companyId)
    }

    // Armazena configurações dos webhooks
    this.webhookConfigs.set(companyId, webhooks)

    // Conecta ao socket da 3C Plus
    const socket = io('https://socket.3c.plus', {
      transports: ['websocket'],
      query: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 10000,
    })

    // Eventos de conexão
    socket.on('connect', () => {
      console.log(`✅ Conectado ao socket da 3C Plus para empresa ${companyId}!`, socket.id)
    })

    socket.on('connect_error', (err) => {
      console.error(`❌ Erro de conexão para empresa ${companyId}:`, err.message)
    })

    socket.on('disconnect', (reason) => {
      console.warn(`⚠️ Desconectado da empresa ${companyId}:`, reason)
    })

    // Eventos específicos da 3C Plus
    socket.on('agent-is-idle', async (payload) => {
      await this.handleSocketEvent('agent-is-idle', payload, token, socket.id, companyId)
    })

    socket.on('call-was-connected', async (payload) => {
      await this.handleSocketEvent('call-was-connected', payload, token, socket.id, companyId)
    })

    socket.on('call-was-disconnected', async (payload) => {
      await this.handleSocketEvent('call-was-disconnected', payload, token, socket.id, companyId)
    })

    socket.on('agent-status-changed', async (payload) => {
      await this.handleSocketEvent('agent-status-changed', payload, token, socket.id, companyId)
    })

    socket.on('call-started', async (payload) => {
      await this.handleSocketEvent('call-started', payload, token, socket.id, companyId)
    })

    socket.on('call-ended', async (payload) => {
      await this.handleSocketEvent('call-ended', payload, token, socket.id, companyId)
    })

    // Evento genérico para capturar outros eventos
    socket.onAny(async (event, payload) => {
      if (!['connect', 'disconnect', 'connect_error'].includes(event)) {
        await this.handleSocketEvent(event, payload, token, socket.id, companyId)
      }
    })

    // Armazena a conexão
    this.socketConnections.set(companyId, socket)
  }

  // Função para desconectar do socket
  public disconnectFromSocket(companyId: string): void {
    const socket = this.socketConnections.get(companyId)
    if (socket) {
      socket.disconnect()
      this.socketConnections.delete(companyId)
      this.webhookConfigs.delete(companyId)
      console.log(`🔌 Desconectado do socket da empresa ${companyId}`)
    }
  }

  // Função para atualizar configurações de webhook
  public updateWebhookConfig(companyId: string, webhooks: WebhookConfig[]): void {
    this.webhookConfigs.set(companyId, webhooks)
    console.log(`🔄 Configurações de webhook atualizadas para empresa ${companyId}`)
  }

  // Função para obter status das conexões
  public getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {}
    for (const [companyId, socket] of this.socketConnections) {
      status[companyId] = socket.connected
    }
    return status
  }

  // Função para obter todas as conexões ativas
  public getActiveConnections(): string[] {
    return Array.from(this.socketConnections.keys())
  }
}

export const webhookService = new WebhookService()
