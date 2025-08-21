import { io, Socket } from 'socket.io-client'

interface WebhookConfig {
  id: string
  company_id: string
  url: string
  event_types: string[]
  is_active: boolean
  status?: 'active' | 'inactive' | 'paused' // Status do banco de dados
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
      console.log(`🔄 Enviando POST para: ${config.url}`)
      
      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Webhook HTTP ${response.status} ${response.statusText}: ${errorText}`)
      }

      const responseText = await response.text().catch(() => '')
      console.log(`✅ POST bem-sucedido: ${response.status} - ${config.url}`)
      
      // Save execution to database
      console.log(`💾 Salvando execução (SUCESSO) no banco de dados...`)
      await this.saveExecution(config, payload, 'success', response.status, responseText)
    } catch (error) {
      console.error(`❌ POST falhou: ${config.url} - ${error.message}`)
      
      // Save failed execution to database
      console.log(`💾 Salvando execução (FALHA) no banco de dados...`)
      await this.saveExecution(config, payload, 'failed', 0, error.message)
      
      throw error
    }
  }

  // Função para processar eventos do socket
  private async handleSocketEvent(event: string, payload: any): Promise<void> {
    // Verificar se o evento pertence à empresa conectada
    if (!this.companyId) {
      return
    }

    // Busca webhooks configurados para este evento E para esta empresa específica
    const relevantWebhooks = this.webhookConfigs.filter(webhook => 
      webhook.is_active && 
      webhook.event_types.includes(event) &&
      webhook.company_id === this.companyId // Garantir isolamento por empresa
    )

    if (relevantWebhooks.length === 0) {
      return
    }

    console.log(`📥 Evento configurado: ${event} para empresa ${this.companyId}`)

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
      } catch (error) {
        console.error(`❌ Erro no processamento do webhook:`, error)
      }
    }
  }

  // Função para conectar ao socket da 3C Plus
  public async connectToSocket(companyId: string, token: string, webhooks: WebhookConfig[]): Promise<void> {
    console.log('🔌 WebhookSocketService: Iniciando conexão ao socket')
    console.log('🏢 Company ID:', companyId)
    console.log('📋 Webhooks recebidos:', webhooks.length)

    // Filtrar APENAS webhooks com status 'active' no banco
    const activeWebhooks = webhooks.filter(webhook => webhook.status === 'active');
    console.log('📋 Webhooks ATIVOS no banco:', activeWebhooks.length);

    if (activeWebhooks.length === 0) {
      console.log('❌ Nenhum webhook ativo encontrado - não conectando ao socket');
      return;
    }

    // Desconecta se já existe uma conexão
    if (this.socket) {
      console.log('🔌 Desconectando socket existente...')
      this.disconnectFromSocket()
    }

    this.companyId = companyId
    this.token = token
    this.webhookConfigs = activeWebhooks // Usar apenas webhooks ativos

    console.log('🌐 Conectando ao socket da 3C Plus...')

    // Conecta ao socket da 3C Plus
    this.socket = io('https://socket.3c.plus', {
      transports: ['websocket', 'polling'], // Adicionei polling como fallback
      query: { token },
      reconnection: true,
      reconnectionAttempts: 10, // Limitei para evitar loops infinitos
      reconnectionDelay: 1000, // Aumentei o delay
      reconnectionDelayMax: 5000,
      timeout: 20000, // Timeout de 20 segundos
      forceNew: true // Força uma nova conexão
    })

    // Eventos de conexão
    this.socket.on('connect', async () => {
      console.log(`✅ SOCKET CONECTADO! Empresa: ${companyId}`)
      this.isConnected = true
      
      // Ativar webhooks no banco quando conectar
      await this.activateWebhooksInDatabase()
    })

    this.socket.on('connect_error', (err) => {
      console.error(`❌ ERRO DE CONEXÃO! Empresa: ${companyId}`)
      console.error(`🔍 Detalhes do erro:`, err)
      console.error(`📋 Mensagem: ${err.message}`)
      this.isConnected = false
    })

    this.socket.on('disconnect', (reason) => {
      console.warn(`⚠️ SOCKET DESCONECTADO! Empresa: ${companyId}`)
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

    this.socket.on('call-history-was-created', async (payload) => {
      await this.handleSocketEvent('call-history-was-created', payload)
    })

    this.socket.on('agent-is-busy', async (payload) => {
      await this.handleSocketEvent('agent-is-busy', payload)
    })

    // Evento genérico para capturar outros eventos
    this.socket.onAny(async (event, payload) => {
      if (!['connect', 'disconnect', 'connect_error'].includes(event)) {
        await this.handleSocketEvent(event, payload)
      }
    })
  }

  // Função para desconectar do socket
  public async disconnectFromSocket(): Promise<void> {
    if (this.socket) {
      console.log(`🔌 Desconectando socket da empresa ${this.companyId}...`)
      
      // Desativar todos os webhooks da empresa no banco de dados
      if (this.companyId && this.webhookConfigs.length > 0) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey)
            
            // Desativar todos os webhooks da empresa
            const webhookIds = this.webhookConfigs.map(w => w.id)
            
            const { error } = await supabase
              .from('webhooks')
              .update({ 
                status: 'inactive',
                updated_at: new Date().toISOString()
              })
              .in('id', webhookIds)
            
            if (error) {
              console.error('❌ Erro ao desativar webhooks no banco:', error)
            }
          }
        } catch (error) {
          console.error('❌ Erro ao desativar webhooks:', error)
        }
      }
      
      // Desconectar socket
      this.socket.disconnect()
      this.socket.removeAllListeners()
      this.socket = null
      this.isConnected = false
      this.webhookConfigs = []
      this.companyId = ''
      this.token = ''
      console.log(`✅ Desconectado do socket da empresa ${this.companyId}`)
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

  // Função para ativar webhooks no banco de dados
  private async activateWebhooksInDatabase(): Promise<void> {
    if (!this.companyId || this.webhookConfigs.length === 0) return;

    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const webhookIds = this.webhookConfigs.map(w => w.id)
        
        const { error } = await supabase
          .from('webhooks')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .in('id', webhookIds)
        
        if (error) {
          console.error('❌ Erro ao ativar webhooks no banco:', error)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao ativar webhooks:', error)
    }
  }

  // Save execution to database
  private async saveExecution(config: WebhookConfig, payload: WebhookPayload, status: 'success' | 'failed', responseStatus: number, responseBody: string) {
    try {
      
      const { createClient } = await import('@supabase/supabase-js')
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase credentials not found')
        return
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      // Buscar o event_id correto pelo nome do evento
      let eventId = null;
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id')
          .eq('name', payload.event)
          .single();
        
        if (!eventError && eventData) {
          eventId = eventData.id;
        } else {
          console.error('❌ Evento não encontrado:', payload.event);
          // Usar um UUID padrão se não encontrar o evento
          eventId = '00000000-0000-0000-0000-000000000000';
        }
      } catch (eventSearchError) {
        console.error('❌ Erro ao buscar evento:', eventSearchError);
        // Usar um UUID padrão em caso de erro
        eventId = '00000000-0000-0000-0000-000000000000';
      }

      const executionData = {
        company_id: this.companyId,
        webhook_id: config.id,
        event_id: eventId,
        event_data: payload,
        request_payload: payload,
        response_status: responseStatus,
        response_body: responseBody,
        response_headers: null,
        execution_time_ms: null,
        attempt_number: 1,
        max_attempts: 3,
        status: status,
        error_message: status === 'failed' ? responseBody : null,
        created_at: new Date().toISOString(),
        executed_at: new Date().toISOString(),
        next_retry_at: null
      }
      
      const { data, error } = await supabase
        .from('webhook_executions')
        .insert(executionData)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Erro ao salvar execução no banco:', error)
      } else {
        console.log(`✅ Execução salva no banco com sucesso! ID: ${data.id}`)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar execução:', error)
    }
  }
}

export const webhookSocketService = new WebhookSocketService()
