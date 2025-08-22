import { useState, useEffect, useCallback } from 'react'
import { apiService } from '../services/api'
import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Company, Event, Webhook, Execution, Metrics, MostUsedEvent, SocketEvent } from '../types'
import { webhookSocketService } from '../services/webhookSocketService'
import { edgeFunctionService } from '../services/edgeFunctionService'

// Cliente Supabase para busca direta
const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey)



export const useWebhookManager = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [metrics, setMetrics] = useState<Metrics[]>([])
  const [companyMetrics, setCompanyMetrics] = useState<any[]>([])
  const [mostUsedEvents, setMostUsedEvents] = useState<MostUsedEvent[]>([])
  const [socketEvents, setSocketEvents] = useState<SocketEvent[]>([])
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Função para buscar eventos diretamente do Supabase
  const loadEventsDirectly = useCallback(async () => {
    try {
      console.log('Buscando eventos diretamente do Supabase...')
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Erro ao buscar eventos diretamente:', error)
        return []
      }
      
      console.log('Eventos encontrados:', data)
      return data || []
    } catch (error) {
      console.error('Erro na busca direta de eventos:', error)
      return []
    }
  }, [])

  // Função para conectar automaticamente todas as empresas com webhooks ativos (Sistema Local + Edge Functions)
  const connectAllActiveCompanies = useCallback(async () => {
    try {
      console.log('🚀 Initializing webhook system (Local + Edge Functions)...')
      
      // Verificar se já está conectado
      const connectionInfo = webhookSocketService.getConnectionInfo()
      if (connectionInfo.isConnected) {
        console.log(`✅ Already connected to company ${connectionInfo.companyId}`)
        return
      }
      
      // Buscar a primeira empresa com webhooks ativos (uma por vez para estabilidade)
      const companyWithActiveWebhooks = companies.find(company => {
        const companyWebhooks = webhooks.filter(w => w.company_id === company.id)
        const activeWebhooks = companyWebhooks.filter(w => w.is_active || w.status === 'active')
        return activeWebhooks.length > 0 && company.api_token && company.status === 'active'
      })
      
      if (!companyWithActiveWebhooks) {
        console.log('📭 No companies with active webhooks found')
        return
      }
      
      console.log(`🔌 Connecting to company: ${companyWithActiveWebhooks.name}`)
      
      const companyWebhooks = webhooks.filter(w => w.company_id === companyWithActiveWebhooks.id)
      const activeWebhooks = companyWebhooks.filter(w => w.is_active || w.status === 'active')
      
      // Converter webhooks para o formato esperado
      const webhookConfigs = activeWebhooks.map(webhook => ({
        id: webhook.id,
        company_id: webhook.company_id,
        url: webhook.url,
        is_active: webhook.is_active || webhook.status === 'active',
        event_types: webhook.event_types || webhook.webhook_events?.map(we => we.event.name) || []
      }))
      
      // Frontend socket desabilitado - usando apenas backend Render 24/7
      // await webhookSocketService.connectToSocket(companyWithActiveWebhooks.id, companyWithActiveWebhooks.api_token, webhookConfigs)
      console.log(`⚠️ Frontend socket disabled - using backend Render 24/7 for: ${companyWithActiveWebhooks.name}`)
      
      // Tentar inicializar Edge Function como backup (sem bloquear se falhar)
      try {
        console.log(`🚀 Starting Edge Function backup for: ${companyWithActiveWebhooks.name}`)
        await Promise.race([
          edgeFunctionService.startWebhookProcessor(companyWithActiveWebhooks.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ])
        console.log(`✅ Edge Function backup started for: ${companyWithActiveWebhooks.name}`)
      } catch (error) {
        console.log(`⚠️ Edge Function backup failed (using local only): ${error.message}`)
      }
      
    } catch (error) {
      console.error('❌ Error in webhook system initialization:', error)
    }
  }, [companies, webhooks])

  // Conectar automaticamente quando dados são carregados (apenas uma vez)
  useEffect(() => {
    if (companies.length > 0 && webhooks.length > 0 && !loading) {
      console.log('🚀 Dados carregados, iniciando conexão automática...')
      // Delay para evitar múltiplas conexões
      const timer = setTimeout(() => {
        connectAllActiveCompanies()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [companies, webhooks, loading, connectAllActiveCompanies])

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Starting data load...')

      // First check if server is available
      try {
        await apiService.healthCheck()
        console.log('Health check passed')
      } catch (healthError) {
        console.error('Health check failed:', healthError)
        throw new Error(`Servidor não disponível: ${healthError.message}`)
      }

      // Load data in parallel
      const results = await Promise.allSettled([
        apiService.getCompanies(),
        apiService.getEvents(),
        apiService.getWebhooks(),
        apiService.getExecutions(undefined, 100),
        apiService.getMetrics(),
        apiService.getMostUsedEvents(),
        apiService.getMetricsByCompany()
      ])

      console.log('API results:', results)

      // Process companies
      if (results[0].status === 'fulfilled') {
        setCompanies(results[0].value.data || [])
      } else {
        console.error('Failed to load companies:', results[0].reason)
        throw new Error(`Erro ao carregar empresas: ${results[0].reason.message}`)
      }

      // Process events - with fallback to direct Supabase
      if (results[1].status === 'fulfilled') {
        setEvents(results[1].value.data || [])
      } else {
        console.error('Failed to load events from API:', results[1].reason)
        console.log('Tentando buscar eventos diretamente...')
        const directEvents = await loadEventsDirectly()
        setEvents(directEvents)
      }

      // Process webhooks - with fallback to direct Supabase
      if (results[2].status === 'fulfilled') {
        setWebhooks(results[2].value.data || [])
      } else {
        console.error('Failed to load webhooks from API:', results[2].reason)
        console.log('Tentando buscar webhooks diretamente...')
        
        try {
          const { data: webhooksData, error } = await supabase
            .from('webhooks')
            .select(`
              *,
              company:companies(name),
              webhook_events(
                event:events(id, name, display_name)
              )
            `)
            .order('created_at', { ascending: false })
          
          if (error) {
            console.error('Erro ao buscar webhooks diretamente:', error)
          } else {
            console.log('Webhooks encontrados:', webhooksData)
            console.log('Primeiro webhook webhook_events:', webhooksData?.[0]?.webhook_events)
            setWebhooks(webhooksData || [])
          }
        } catch (directError) {
          console.error('Erro na busca direta de webhooks:', directError)
        }
      }

      // Process executions
      if (results[3].status === 'fulfilled') {
        const executionsData = results[3].value.data || []
        // Transform executions data to match Dashboard interface
        const transformedExecutions = executionsData.map((execution: any) => ({
          id: execution.id,
          company_id: execution.company_id,
          event_type: execution.event?.name || execution.event_id || 'Evento',
          status: execution.status,
          webhook_url: execution.webhook?.url || 'N/A',
          webhook_name: execution.webhook?.name || 'Webhook',
          timestamp: execution.created_at || execution.executed_at,
          error_message: execution.error_message,
          response_status: execution.response_status
        }))
        setExecutions(transformedExecutions)
        console.log('Executions transformed:', transformedExecutions.length)
      } else {
        console.error('Failed to load executions:', results[3].reason)
      }

      // Process metrics (general metrics)
      if (results[4].status === 'fulfilled') {
        const metricsData = results[4].value.data
        console.log('📊 Métricas recebidas da API:', metricsData)
        
        // Usar os dados reais da API de métricas
        const metricsArray = [{
          total_events: metricsData.totalExecutions || 0,
          successful_events: metricsData.successfulExecutions || 0,
          failed_events: metricsData.failedExecutions || 0,
          retrying_events: 0, // Não temos dados de retry ainda
          success_rate: metricsData.successRate || 0,
          company_id: 'global',
          company_name: 'Global'
        }]
        
        console.log('📊 Métricas transformadas para Dashboard:', metricsArray)
        setMetrics(metricsArray)
      } else {
        console.error('Failed to load metrics:', results[4].reason)
        setMetrics([{
          total_events: 0,
          successful_events: 0,
          failed_events: 0,
          retrying_events: 0,
          success_rate: 0,
          company_id: 'global',
          company_name: 'Global'
        }])
      }

      // Process metrics by company
      if (results[6].status === 'fulfilled') {
        const companyMetricsData = results[6].value.data
        setCompanyMetrics(companyMetricsData || [])
        console.log('✅ Métricas por empresa carregadas:', companyMetricsData?.length || 0)
      } else {
        console.error('Failed to load company metrics:', results[6].reason)
        setCompanyMetrics([])
      }

      // Process most used events
      if (results[5].status === 'fulfilled') {
        setMostUsedEvents(results[5].value.data || [])
      } else {
        console.error('Failed to load most used events:', results[5].reason)
      }

    } catch (error) {
      console.error('Error loading data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [loadEventsDirectly])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Companies operations
  const addCompany = useCallback(async (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await apiService.createCompany(company)
      const newCompany = response.data
      setCompanies(prev => [newCompany, ...prev])
      return newCompany
    } catch (error) {
      console.error('Error adding company:', error)
      throw error
    }
  }, [])

  const updateCompany = useCallback(async (id: string, updates: Partial<Company>) => {
    try {
      const response = await apiService.updateCompany(id, updates)
      const updatedCompany = response.data
      setCompanies(prev => prev.map(c => c.id === id ? updatedCompany : c))
      return updatedCompany
    } catch (error) {
      console.error('Error updating company:', error)
      throw error
    }
  }, [])

  const deleteCompany = useCallback(async (id: string) => {
    try {
      await apiService.deleteCompany(id)
      setCompanies(prev => prev.filter(c => c.id !== id))
    } catch (error) {
      console.error('Error deleting company:', error)
      throw error
    }
  }, [])

  // Webhooks operations
  const addWebhook = useCallback(async (webhook: {
    company_id: string
    name: string
    url: string
    is_active?: boolean
    event_ids: string[]
  }) => {
    try {
      console.log('Tentando criar webhook via API...')
      const response = await apiService.createWebhook(webhook)
      const newWebhook = response.data
      setWebhooks(prev => [newWebhook, ...prev])
      return newWebhook
    } catch (error) {
      console.error('Erro na API, tentando criar webhook diretamente:', error)
      
      // Fallback: criar webhook diretamente no Supabase
      try {
        const { data: webhookData, error: webhookError } = await supabase
          .from('webhooks')
          .insert({
            company_id: webhook.company_id,
            name: webhook.name || `Webhook ${new Date().getTime()}`,
            url: webhook.url,
            status: webhook.is_active !== false ? 'active' : 'inactive',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (webhookError) {
          throw new Error(`Erro ao criar webhook: ${webhookError.message}`)
        }
        
        // Criar relacionamentos webhook_events
        if (webhook.event_ids.length > 0) {
          const webhookEvents = webhook.event_ids.map(eventId => ({
            webhook_id: webhookData.id,
            event_id: eventId,
            created_at: new Date().toISOString()
          }))
          
          const { error: eventsError } = await supabase
            .from('webhook_events')
            .insert(webhookEvents)
          
          if (eventsError) {
            console.error('Erro ao criar webhook_events:', eventsError)
          }
        }
        
        // Buscar webhook completo com relacionamentos
        const { data: fullWebhook, error: fetchError } = await supabase
          .from('webhooks')
          .select(`
            *,
            company:companies(name),
            webhook_events(
              event:events(id, name, display_name)
            )
          `)
          .eq('id', webhookData.id)
          .single()
        
        if (fetchError) {
          console.error('Erro ao buscar webhook completo:', fetchError)
          return webhookData
        }
        
        setWebhooks(prev => [fullWebhook, ...prev])
        return fullWebhook
      } catch (directError) {
        console.error('Erro na criação direta:', directError)
        throw directError
      }
    }
  }, [])

  const updateWebhook = useCallback(async (id: string, updates: Partial<Webhook> & { event_ids?: string[] }) => {
    try {
      console.log('Tentando atualizar webhook via API...')
      const response = await apiService.updateWebhook(id, updates)
      const updatedWebhook = response.data
      setWebhooks(prev => prev.map(w => w.id === id ? updatedWebhook : w))
      return updatedWebhook
    } catch (error) {
      console.error('Erro na API, tentando atualizar webhook diretamente:', error)
      
      // Fallback: atualizar webhook diretamente no Supabase
      try {
        const { event_ids, ...webhookUpdates } = updates
        
        // Atualizar dados básicos do webhook
        const webhookUpdateData: any = {
          updated_at: new Date().toISOString()
        }
        
        if (webhookUpdates.name) webhookUpdateData.name = webhookUpdates.name
        if (webhookUpdates.url) webhookUpdateData.url = webhookUpdates.url
        if (webhookUpdates.status) webhookUpdateData.status = webhookUpdates.status
        
        const { data: webhookData, error: webhookError } = await supabase
          .from('webhooks')
          .update(webhookUpdateData)
          .eq('id', id)
          .select()
          .single()
        
        if (webhookError) {
          throw new Error(`Erro ao atualizar webhook: ${webhookError.message}`)
        }
        
        // Atualizar eventos se fornecidos
        if (event_ids !== undefined) {
          // Deletar eventos existentes
          const { error: deleteError } = await supabase
            .from('webhook_events')
            .delete()
            .eq('webhook_id', id)
          
          if (deleteError) {
            console.error('Erro ao deletar webhook_events:', deleteError)
          }
          
          // Criar novos eventos
          if (event_ids.length > 0) {
            const webhookEvents = event_ids.map(eventId => ({
              webhook_id: id,
              event_id: eventId,
              created_at: new Date().toISOString()
            }))
            
            const { error: eventsError } = await supabase
              .from('webhook_events')
              .insert(webhookEvents)
            
            if (eventsError) {
              console.error('Erro ao criar webhook_events:', eventsError)
            }
          }
        }
        
        // Buscar webhook completo com relacionamentos
        const { data: fullWebhook, error: fetchError } = await supabase
          .from('webhooks')
          .select(`
            *,
            company:companies(name),
            webhook_events(
              event:events(id, name, display_name)
            )
          `)
          .eq('id', id)
          .single()
        
        if (fetchError) {
          console.error('Erro ao buscar webhook completo:', fetchError)
          return webhookData
        }
        
        console.log('Webhook atualizado com sucesso')
        setWebhooks(prev => prev.map(w => w.id === id ? fullWebhook : w))
        return fullWebhook
      } catch (directError) {
        console.error('Erro na atualização direta:', directError)
        throw directError
      }
    }
  }, [])

  const deleteWebhook = useCallback(async (id: string) => {
    try {
      console.log('Tentando deletar webhook via API...')
      await apiService.deleteWebhook(id)
      setWebhooks(prev => prev.filter(w => w.id !== id))
    } catch (error) {
      console.error('Erro na API, tentando deletar webhook diretamente:', error)
      
      // Fallback: deletar webhook diretamente no Supabase
      try {
        // Primeiro deletar os relacionamentos webhook_events
        const { error: eventsError } = await supabase
          .from('webhook_events')
          .delete()
          .eq('webhook_id', id)
        
        if (eventsError) {
          console.error('Erro ao deletar webhook_events:', eventsError)
        }
        
        // Depois deletar o webhook
        const { error: webhookError } = await supabase
          .from('webhooks')
          .delete()
          .eq('id', id)
        
        if (webhookError) {
          throw new Error(`Erro ao deletar webhook: ${webhookError.message}`)
        }
        
        console.log('Webhook deletado com sucesso')
        setWebhooks(prev => prev.filter(w => w.id !== id))
      } catch (directError) {
        console.error('Erro na deleção direta:', directError)
        throw directError
      }
    }
  }, [])

  // Executions operations
  const addExecution = useCallback(async (execution: {
    company_id: string
    webhook_id: string
    event_id: string
    payload?: any
    status?: 'pending' | 'success' | 'failed' | 'retrying'
    attempts?: number
    max_attempts?: number
  }) => {
    try {
      const response = await apiService.createExecution(execution)
      const newExecution = response.data
      setExecutions(prev => [newExecution, ...prev])
      return newExecution
    } catch (error) {
      console.error('Error adding execution:', error)
      throw error
    }
  }, [])

  const updateExecution = useCallback(async (id: string, updates: Partial<Execution>) => {
    try {
      const response = await apiService.updateExecution(id, updates)
      const updatedExecution = response.data
      setExecutions(prev => prev.map(e => e.id === id ? updatedExecution : e))
      return updatedExecution
    } catch (error) {
      console.error('Error updating execution:', error)
      throw error
    }
  }, [])

  // Metrics
  const getMetrics = useCallback(() => {
    return metrics
  }, [metrics])

  const getMostUsedEvents = useCallback(() => {
    return mostUsedEvents
  }, [mostUsedEvents])

  // Refresh data
  const refresh = useCallback(() => {
    loadData()
  }, [loadData])

  return {
    companies,
    events,
    webhooks,
    executions,
    metrics,
    companyMetrics,
    mostUsedEvents,
    socketEvents,
    isSocketConnected,
    loading,
    error,
    addCompany,
    updateCompany,
    deleteCompany,
    addWebhook,
    updateWebhook,
    deleteWebhook,
    addExecution,
    updateExecution,
    getMetrics,
    getMostUsedEvents,
    refresh
  }
}