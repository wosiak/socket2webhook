import { supabase } from './supabase'

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

  // Iniciar processamento para todas as empresas ativas
  async startAllActiveProcessors(): Promise<void> {
    try {
      console.log('🔄 Starting all active webhook processors...')
      
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
            console.log(`✅ Started processor for company: ${company.name}`)
          } catch (error) {
            console.error(`❌ Failed to start processor for company ${company.name}:`, error)
            throw error
          }
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      console.log(`📊 Processors started: ${successful} successful, ${failed} failed`)
    } catch (error) {
      console.error('❌ Error starting active processors:', error)
      throw error
    }
  }

  // Parar processamento para todas as empresas
  async stopAllProcessors(): Promise<void> {
    try {
      console.log('🛑 Stopping all webhook processors...')
      
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
