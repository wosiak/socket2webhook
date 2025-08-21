import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../utils/supabase/info'

// Cliente Supabase para operações
const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey)

interface EdgeFunctionResponse {
  message: string
  [key: string]: any
}

class EdgeFunctionService {
  private supabaseUrl: string
  private anonKey: string

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    this.anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  }

  private async callEdgeFunction(
    functionName: string,
    payload: any
  ): Promise<EdgeFunctionResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || this.anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Edge Function ${functionName} error:`, errorText)
        throw new Error(`Edge Function error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`✅ Edge Function ${functionName} response:`, data)
      return data
    } catch (error) {
      console.error(`❌ Error calling Edge Function ${functionName}:`, error)
      throw error
    }
  }

  // Iniciar processamento de webhooks para uma empresa
  async startWebhookProcessor(companyId: string): Promise<EdgeFunctionResponse> {
    console.log(`🚀 Starting webhook processor for company: ${companyId}`)
    
    return await this.callEdgeFunction('webhook-processor', {
      action: 'start_webhook_processor',
      companyId
    })
  }

  // Parar processamento de webhooks para uma empresa
  async stopWebhookProcessor(companyId: string): Promise<EdgeFunctionResponse> {
    console.log(`🛑 Stopping webhook processor for company: ${companyId}`)
    
    return await this.callEdgeFunction('webhook-processor', {
      action: 'stop_webhook_processor',
      companyId
    })
  }

  // Processar um evento específico
  async processEvent(eventData: {
    company_id: string
    event_type: string
    payload: any
  }): Promise<EdgeFunctionResponse> {
    console.log(`📡 Processing event: ${eventData.event_type} for company: ${eventData.company_id}`)
    
    return await this.callEdgeFunction('webhook-processor', {
      action: 'process_event',
      eventData
    })
  }

  // Conectar ao socket da 3C Plus
  async connectSocket(companyId: string, token: string): Promise<EdgeFunctionResponse> {
    console.log(`🔌 Connecting socket for company: ${companyId}`)
    
    return await this.callEdgeFunction('socket-connector', {
      action: 'connect_socket',
      companyId,
      token
    })
  }

  // Desconectar do socket da 3C Plus
  async disconnectSocket(companyId: string): Promise<EdgeFunctionResponse> {
    console.log(`🔌 Disconnecting socket for company: ${companyId}`)
    
    return await this.callEdgeFunction('socket-connector', {
      action: 'disconnect_socket',
      companyId
    })
  }

  // Conectar empresa ao socket REAL da 3C Plus
  async connectRealSocket(companyId: string): Promise<EdgeFunctionResponse> {
    console.log(`🔌 Connecting REAL socket for company: ${companyId}`)
    
    return await this.callEdgeFunction('real-socket-processor', {
      action: 'connect_real_socket',
      companyId
    })
  }

  // Desconectar empresa do socket REAL da 3C Plus  
  async disconnectRealSocket(companyId: string): Promise<EdgeFunctionResponse> {
    console.log(`🔌 Disconnecting REAL socket for company: ${companyId}`)
    
    return await this.callEdgeFunction('real-socket-processor', {
      action: 'disconnect_real_socket',
      companyId
    })
  }

  // Verificar status das conexões REAIS
  async checkRealConnections(): Promise<EdgeFunctionResponse> {
    console.log(`🔍 Checking REAL socket connections status`)
    
    return await this.callEdgeFunction('real-socket-processor', {
      action: 'check_connections'
    })
  }

  // Iniciar processamento para todas as empresas ativas (Socket REAL da 3C Plus)
  async startAllActiveProcessors(): Promise<void> {
    try {
      console.log('🔄 Starting all active webhook processors (REAL sockets)...')
      
      // 1. Iniciar keepalive scheduler (mantém tudo ativo 24/7)
      await this.startKeepaliveScheduler()
      
      // 2. Iniciar monitor que garante conexões persistentes
      await this.startWebhookMonitor()
      
      // 3. Conectar ao socket REAL da 3C Plus
      await this.connectAllRealSockets()
      
      // 4. Forçar reconexão para garantir que tudo está conectado
      await this.forceReconnectAll()
      
      // 5. Iniciar processadores de backup
      await this.startBackupProcessors()
      
    } catch (error) {
      console.error('❌ Error starting active processors:', error)
      throw error
    }
  }

  // Conectar todas as empresas ativas ao socket REAL da 3C Plus  
  async connectAllRealSockets(): Promise<void> {
    try {
      console.log('🚀 Connecting all companies to REAL 3C Plus sockets...')
      
      const response = await this.callEdgeFunction('real-socket-processor', {
        action: 'ensure_all_active_connected'
      })
      
      console.log('✅ Real socket connections result:', response)
      
    } catch (error) {
      console.error('❌ Error connecting real sockets:', error)
      // Continue anyway, local system will work
    }
  }

  // Iniciar processadores de backup
  async startBackupProcessors(): Promise<void> {
    try {
      console.log('🔄 Starting backup processors...')
      
      // Buscar todas as empresas com webhooks ativos
      const { data: companies, error } = await supabase
        .from('companies')
        .select(`
          id, 
          name, 
          api_token,
          status,
          webhooks!inner(status)
        `)
        .eq('status', 'active')
        .eq('webhooks.status', 'active')

      if (error) {
        console.error('Error fetching companies:', error)
        return
      }

      if (!companies || companies.length === 0) {
        console.log('📭 No companies with active webhooks found')
        return
      }

      console.log(`📋 Found ${companies.length} companies with active webhooks`)

      // Iniciar processador para cada empresa
      const results = await Promise.allSettled(
        companies.map(async (company) => {
          try {
            await this.startWebhookProcessor(company.id)
            console.log(`✅ Started backup processor for company: ${company.name}`)
          } catch (error) {
            console.error(`❌ Failed to start backup processor for company ${company.name}:`, error)
            throw error
          }
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      console.log(`📊 Backup processors started: ${successful} successful, ${failed} failed`)
    } catch (error) {
      console.error('❌ Error starting backup processors:', error)
      throw error
    }
  }

  // Iniciar monitor de webhooks
  async startWebhookMonitor(): Promise<EdgeFunctionResponse> {
    console.log(`🔍 Starting webhook monitor`)
    
    return await this.callEdgeFunction('webhook-monitor', {
      action: 'start_monitor'
    })
  }

  // Parar monitor de webhooks
  async stopWebhookMonitor(): Promise<EdgeFunctionResponse> {
    console.log(`🛑 Stopping webhook monitor`)
    
    return await this.callEdgeFunction('webhook-monitor', {
      action: 'stop_monitor'
    })
  }

  // Forçar reconexão de todos os webhooks
  async forceReconnectAll(): Promise<EdgeFunctionResponse> {
    console.log(`🔄 Force reconnecting all webhooks`)
    
    return await this.callEdgeFunction('webhook-monitor', {
      action: 'force_reconnect_all'
    })
  }

  // Verificar status do monitor
  async checkMonitorStatus(): Promise<EdgeFunctionResponse> {
    console.log(`🔍 Checking monitor status`)
    
    return await this.callEdgeFunction('webhook-monitor', {
      action: 'check_monitor_status'
    })
  }

  // Iniciar keepalive scheduler
  async startKeepaliveScheduler(): Promise<EdgeFunctionResponse> {
    console.log(`🔄 Starting keepalive scheduler`)
    
    return await this.callEdgeFunction('keepalive-scheduler', {
      action: 'start_keepalive'
    })
  }

  // Parar keepalive scheduler
  async stopKeepaliveScheduler(): Promise<EdgeFunctionResponse> {
    console.log(`🛑 Stopping keepalive scheduler`)
    
    return await this.callEdgeFunction('keepalive-scheduler', {
      action: 'stop_keepalive'
    })
  }

  // Verificar status do keepalive
  async checkKeepaliveStatus(): Promise<EdgeFunctionResponse> {
    console.log(`🔍 Checking keepalive status`)
    
    return await this.callEdgeFunction('keepalive-scheduler', {
      action: 'status'
    })
  }

  // Parar processamento para todas as empresas
  async stopAllProcessors(): Promise<void> {
    try {
      console.log('🛑 Stopping all webhook processors...')
      
      // Stop monitor first
      await this.stopWebhookMonitor()
      
      // Disconnect all real sockets
      await this.callEdgeFunction('real-socket-processor', {
        action: 'disconnect_all'
      })
      
      // Buscar todas as empresas
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name')

      if (error) {
        console.error('Error fetching companies:', error)
        return
      }

      if (!companies || companies.length === 0) {
        console.log('📭 No companies found')
        return
      }

      // Parar processador para cada empresa
      const results = await Promise.allSettled(
        companies.map(async (company) => {
          try {
            await this.stopWebhookProcessor(company.id)
            console.log(`✅ Stopped processor for company: ${company.name}`)
          } catch (error) {
            console.error(`❌ Failed to stop processor for company ${company.name}:`, error)
            throw error
          }
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      console.log(`📊 Processors stopped: ${successful} successful, ${failed} failed`)
    } catch (error) {
      console.error('❌ Error stopping processors:', error)
      throw error
    }
  }
}

// Instância singleton
export const edgeFunctionService = new EdgeFunctionService()
export default edgeFunctionService
