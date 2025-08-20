import { io, Socket } from 'socket.io-client'

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

class WebhookSocketService {
  private socket: Socket | null = null
  private webhookConfigs: WebhookConfig[] = []
  private companyId: string = ''
  private token: string = ''
  private isConnected: boolean = false

  // Função para assinar o corpo da requisição com HMAC-SHA256
  private async signBody(body: string, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(body)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
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
      const signature = await this.signBody(body, config.signing_secret)
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
      console.error(`❌ Erro ao enviar webhook para ${config.url}:`, error)
      throw error
    }
  }

  // Função para processar eventos do socket
  private async handleSocketEvent(event: string, payload: any): Promise<void> {
    console.log(`📥 Evento recebido: ${event} para empresa ${this.companyId}`)

    // Busca webhooks configurados para este evento
    const relevantWebhooks = this.webhookConfigs.filter(webhook => 
      webhook.is_active && webhook.event_types.includes(event)
    )

    if (relevantWebhooks.length === 0) {
      console.log(`ℹ️ Nenhum webhook ativo encontrado para evento ${event}`)
      return
    }

    // Mascara o token para segurança
    const tokenMask = this.token.length > 10 ? `${this.token.slice(0, 4)}…${this.token.slice(-4)}` : this.token

    // Processa cada webhook relevante
    for (const webhook of relevantWebhooks) {
      try {
        const webhookPayload: WebhookPayload = {
          event,
          payload,
          meta: {
            socketId: this.socket?.id || 'unknown',
            token_mask: tokenMask,
            received_at: new Date().toISOString(),
            source: 'webhook-proxy-3c-plus',
            webhook_id: webhook.id,
            company_id: this.companyId
          }
        }

        await this.postToWebhook(webhook, webhookPayload)
        console.log(`📤 Webhook enviado: ${event} → ${webhook.url}`)
      } catch (error) {
        console.error(`❌ Falha ao enviar webhook ${webhook.id}:`, error)
      }
    }
  }

  // Função para conectar ao socket da 3C Plus
  public async connectToSocket(companyId: string, token: string, webhooks: WebhookConfig[]): Promise<void> {
    // Desconecta se já existe uma conexão
    if (this.socket) {
      this.disconnectFromSocket()
    }

    this.companyId = companyId
    this.token = token
    this.webhookConfigs = webhooks

    // Conecta ao socket da 3C Plus
    this.socket = io('https://socket.3c.plus', {
      transports: ['websocket'],
      query: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 10000,
    })

    // Eventos de conexão
    this.socket.on('connect', () => {
      console.log(`✅ Conectado ao socket da 3C Plus para empresa ${companyId}!`, this.socket?.id)
      this.isConnected = true
    })

    this.socket.on('connect_error', (err) => {
      console.error(`❌ Erro de conexão para empresa ${companyId}:`, err.message)
      this.isConnected = false
    })

    this.socket.on('disconnect', (reason) => {
      console.warn(`⚠️ Desconectado da empresa ${companyId}:`, reason)
      this.isConnected = false
    })

    // Eventos específicos da 3C Plus
    this.socket.on('agent-is-idle', async (payload) => {
      await this.handleSocketEvent('agent-is-idle', payload)
    })

    this.socket.on('call-was-connected', async (payload) => {
      await this.handleSocketEvent('call-was-connected', payload)
    })

    this.socket.on('call-was-disconnected', async (payload) => {
      await this.handleSocketEvent('call-was-disconnected', payload)
    })

    this.socket.on('agent-status-changed', async (payload) => {
      await this.handleSocketEvent('agent-status-changed', payload)
    })

    this.socket.on('call-started', async (payload) => {
      await this.handleSocketEvent('call-started', payload)
    })

    this.socket.on('call-ended', async (payload) => {
      await this.handleSocketEvent('call-ended', payload)
    })

    // Evento genérico para capturar outros eventos
    this.socket.onAny(async (event, payload) => {
      if (!['connect', 'disconnect', 'connect_error'].includes(event)) {
        await this.handleSocketEvent(event, payload)
      }
    })
  }

  // Função para desconectar do socket
  public disconnectFromSocket(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      console.log(`🔌 Desconectado do socket da empresa ${this.companyId}`)
    }
  }

  // Função para atualizar configurações de webhook
  public updateWebhookConfig(webhooks: WebhookConfig[]): void {
    this.webhookConfigs = webhooks
    console.log(`🔄 Configurações de webhook atualizadas para empresa ${this.companyId}`)
  }

  // Função para obter status da conexão
  public getConnectionStatus(): boolean {
    return this.isConnected
  }

  // Função para obter informações da conexão
  public getConnectionInfo(): { companyId: string; isConnected: boolean; socketId?: string } {
    return {
      companyId: this.companyId,
      isConnected: this.isConnected,
      socketId: this.socket?.id
    }
  }
}

export const webhookSocketService = new WebhookSocketService()
