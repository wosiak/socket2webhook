import { createClient } from '@supabase/supabase-js'

// Use environment variables for API configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

class ApiService {
  // Health check
  async healthCheck() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('count')
        .limit(1)
      
      if (error) throw error
      
      return { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        message: 'Connected to Supabase successfully'
      }
    } catch (error) {
      console.error('Health check failed:', error)
      throw new Error('Database connection failed')
    }
  }

  // Companies
  async getCompanies() {
    try {
      console.log('🔍 Buscando empresas...')
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Erro ao buscar empresas:', error)
        throw error
      }
      
      console.log('✅ Empresas carregadas:', data?.length || 0)
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('API Request Failed: getCompanies', error)
      throw error
    }
  }

  async createCompany(company: {
    name: string
    company_3c_id: string
    api_token: string
    status?: string
  }) {
    try {
      console.log('Creating company with data:', company)
      
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: company.name,
          company_3c_id: company.company_3c_id,
          api_token: company.api_token,
          status: company.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      
      console.log('Created company:', data)
      return { success: true, data }
    } catch (error) {
      console.error('API Request Failed: createCompany', error)
      throw error
    }
  }

  async updateCompany(id: string, updates: Partial<{
    name: string
    company_3c_id: string
    api_token: string
    status: string
  }>) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      return { success: true, data }
    } catch (error) {
      console.error('API Request Failed: updateCompany', error)
      throw error
    }
  }

  async deleteCompany(id: string) {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      return { success: true, message: 'Company deleted successfully' }
    } catch (error) {
      console.error('API Request Failed: deleteCompany', error)
      throw error
    }
  }

  // Events
  async getEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('display_name', { ascending: true })
      
      if (error) throw error
      
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('API Request Failed: getEvents', error)
      throw error
    }
  }

  // Webhooks
  async getWebhooks(companyId?: string) {
    try {
      console.log('🔍 Buscando webhooks para company_id:', companyId)
      
      let query = supabase
        .from('webhooks')
        .select(`
          *,
          company:companies(name),
          webhook_events(
            event:events(id, name, display_name)
          )
        `)
        .order('created_at', { ascending: false })
      
      if (companyId) {
        query = query.eq('company_id', companyId)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('❌ Erro ao buscar webhooks:', error)
        throw error
      }
      
      // Transform data to match expected format - APENAS status do banco
      const transformedData = (data || []).map(webhook => {
        // Status do banco é a ÚNICA fonte de verdade
        const webhookStatus = webhook.status || 'inactive';
        
        console.log(`🔍 Webhook do banco: ${webhook.name} - Status: ${webhookStatus}`);
        
        return {
          id: webhook.id,
          company_id: webhook.company_id,
          name: webhook.name,
          url: webhook.url,
          is_active: webhookStatus === 'active', // Derivado do status do banco
          status: webhookStatus, // Status original do banco
          event_types: webhook.webhook_events?.map((we: any) => we.event?.name).filter(Boolean) || [],
          webhook_events: webhook.webhook_events || [], // Incluir webhook_events completos para edição
          created_at: webhook.created_at,
          updated_at: webhook.updated_at
        };
      });
      
      return { success: true, data: transformedData }
    } catch (error) {
      console.error('API Request Failed: getWebhooks', error)
      throw error
    }
  }

  async createWebhook(webhook: {
    company_id: string
    name: string
    url: string
    is_active?: boolean
    event_ids?: string[]
  }) {
    try {
      console.log('Creating webhook with data:', webhook)
      
      // Create webhook first
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
      
      if (webhookError) throw webhookError
      
      // Create webhook_events relationships
      console.log('🔍 Criando relacionamentos de eventos:', webhook.event_ids);
      if (webhook.event_ids && webhook.event_ids.length > 0) {
        const webhookEvents = webhook.event_ids.map(eventId => ({
          webhook_id: webhookData.id,
          event_id: eventId,
          created_at: new Date().toISOString()
        }))
        
        console.log('🔍 Webhook events para inserir:', webhookEvents);
        
        const { error: eventsError } = await supabase
          .from('webhook_events')
          .insert(webhookEvents)
        
        if (eventsError) {
          console.error('❌ Erro ao criar webhook_events:', eventsError);
          throw eventsError;
        } else {
          console.log('✅ Webhook events criados com sucesso');
        }
      } else {
        console.log('⚠️ Nenhum evento selecionado para o webhook');
      }
      
      // Get the created webhook with its events
      const result = await this.getWebhookById(webhookData.id)
      return result
    } catch (error) {
      console.error('API Request Failed: createWebhook', error)
      throw error
    }
  }

  async getWebhookById(id: string) {
    try {
      const { data, error } = await supabase
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
      
      if (error) throw error
      
      const transformedData = {
        id: data.id,
        company_id: data.company_id,
        name: data.name,
        url: data.url,
        is_active: data.status === 'active',
        event_types: data.webhook_events?.map((we: any) => we.event?.name).filter(Boolean) || [],
        created_at: data.created_at,
        updated_at: data.updated_at
      }
      
      return { success: true, data: transformedData }
    } catch (error) {
      console.error('API Request Failed: getWebhookById', error)
      throw error
    }
  }

  async updateWebhook(id: string, updates: Partial<{
    name?: string
    url?: string
    is_active?: boolean
    status?: 'active' | 'inactive'
    event_ids?: string[]
  }>) {
    try {
      console.log('Updating webhook:', id, updates)
      
      const { event_ids, ...webhookUpdates } = updates
      
      // Update webhook basic info - PADRONIZADO para usar apenas status
      const webhookUpdateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.name) webhookUpdateData.name = updates.name
      if (updates.url) webhookUpdateData.url = updates.url
      
      // Prioridade: status direto > is_active convertido
      if (updates.status) {
        webhookUpdateData.status = updates.status
      } else if (updates.is_active !== undefined) {
        webhookUpdateData.status = updates.is_active ? 'active' : 'inactive'
      }
      
      const { data: webhookData, error: webhookError } = await supabase
        .from('webhooks')
        .update(webhookUpdateData)
        .eq('id', id)
        .select()
        .single()
      
      if (webhookError) throw webhookError
      
      // Update events if provided
      console.log('🔍 EDIÇÃO - event_ids recebidos:', event_ids);
      if (event_ids !== undefined) {
        console.log('🗑️ EDIÇÃO - Deletando webhook_events existentes para webhook:', id);
        
        // Delete existing webhook_events
        const { error: deleteError } = await supabase
          .from('webhook_events')
          .delete()
          .eq('webhook_id', id)
        
        if (deleteError) {
          console.error('❌ EDIÇÃO - Erro ao deletar webhook_events:', deleteError);
          throw deleteError;
        } else {
          console.log('✅ EDIÇÃO - Webhook_events deletados com sucesso');
        }
        
        // Create new webhook_events
        if (event_ids && event_ids.length > 0) {
          console.log('📝 EDIÇÃO - Criando novos webhook_events:', event_ids);
          
          const webhookEvents = event_ids.map(eventId => ({
            webhook_id: id,
            event_id: eventId,
            created_at: new Date().toISOString()
          }))
          
          console.log('📤 EDIÇÃO - Dados para inserir:', webhookEvents);
          
          const { error: eventsError } = await supabase
            .from('webhook_events')
            .insert(webhookEvents)
          
          if (eventsError) {
            console.error('❌ EDIÇÃO - Erro ao criar novos webhook_events:', eventsError);
            throw eventsError;
          } else {
            console.log('✅ EDIÇÃO - Novos webhook_events criados com sucesso');
          }
        } else {
          console.log('⚠️ EDIÇÃO - Nenhum evento para associar');
        }
      } else {
        console.log('⏭️ EDIÇÃO - event_ids não fornecidos, pulando atualização de eventos');
      }
      
      // Return updated webhook
      const result = await this.getWebhookById(id)
      return result
    } catch (error) {
      console.error('API Request Failed: updateWebhook', error)
      throw error
    }
  }

  async deleteWebhook(id: string) {
    try {
      // Delete webhook_events first (foreign key constraint)
      const { error: eventsError } = await supabase
        .from('webhook_events')
        .delete()
        .eq('webhook_id', id)
      
      if (eventsError) throw eventsError
      
      // Delete webhook
      const { error: webhookError } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id)
      
      if (webhookError) throw webhookError
      
      return { success: true, message: 'Webhook deleted successfully' }
    } catch (error) {
      console.error('API Request Failed: deleteWebhook', error)
      throw error
    }
  }

  // Executions
  async getExecutions(companyId?: string, limit: number = 100, offset: number = 0) {
    try {
      let query = supabase
        .from('webhook_executions')
        .select(`
          *,
          webhook:webhooks(name, url),
          company:companies(name),
          event:events(name, display_name)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (companyId) {
        query = query.eq('company_id', companyId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('API Request Failed: getExecutions', error)
      throw error
    }
  }

  // Webhook connection methods (for socket service)
  async connectWebhook(companyId: string) {
    try {
      console.log('🔌 Conectando webhook para empresa:', companyId)
      
      // Get company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()
      
      if (companyError) throw companyError
      if (!company) throw new Error('Company not found')
      
      // Get active webhooks
      const webhooksResult = await this.getWebhooks(companyId)
      const activeWebhooks = webhooksResult.data.filter(w => w.is_active)
      
      console.log('🔍 Webhooks ativos encontrados:', activeWebhooks.length)
      
      if (activeWebhooks.length === 0) {
        throw new Error('No active webhooks found for this company')
      }
      
      return {
        success: true,
        message: `Ready to connect to 3C Plus socket for company ${companyId}`,
        company,
        activeWebhooks
      }
    } catch (error) {
      console.error('API Request Failed: connectWebhook', error)
      throw error
    }
  }

  async disconnectWebhook(companyId: string) {
    return {
      success: true,
      message: `Disconnected from 3C Plus socket for company ${companyId}`
    }
  }

  async getWebhookStatus() {
    return {
      success: true,
      data: {
        connections: {},
        activeConnections: [],
        totalConnections: 0
      }
    }
  }

  // Metrics
  async getMetrics() {
    try {
      console.log('📊 Buscando métricas...')
      
      // Get total companies
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
      
      // Get total webhooks
      const { count: webhooksCount } = await supabase
        .from('webhooks')
        .select('*', { count: 'exact', head: true })
      
      // Get total executions and success/failure counts
      console.log('📊 Buscando TODAS as execuções para métricas...');
      
      // Primeiro, verificar o count total usando head: true
      const { count: totalExecutionsCount, error: countError } = await supabase
        .from('webhook_executions')
        .select('*', { count: 'exact', head: true })
      
      console.log('📊 COUNT DIRETO DO BANCO:', totalExecutionsCount);
      
      const { data: executionsData, error: executionsError } = await supabase
        .from('webhook_executions')
        .select('status')
        .order('created_at', { ascending: false })
        .limit(10000) // Aumentar limite para garantir que busque todos
      
      if (executionsError) {
        console.error('❌ Erro ao buscar execuções:', executionsError)
        return { success: true, data: {
          totalCompanies: companiesCount || 0,
          totalWebhooks: webhooksCount || 0,
          activeWebhooks: 0,
          totalExecutions: 0,
          successRate: 0,
          averageResponseTime: 0
        }}
      }
      
      // Usar count direto do banco para total
      const totalExecutions = totalExecutionsCount || 0;
      
      // Buscar counts específicos por status
      const { count: successCount } = await supabase
        .from('webhook_executions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success')
      
      const { count: failedCount } = await supabase
        .from('webhook_executions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
      
      const successfulExecutions = successCount || 0;
      const failedExecutions = failedCount || 0;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0
      
      console.log('📊 DADOS DAS EXECUÇÕES PARA MÉTRICAS:');
      console.log('📊 COUNT total do banco:', totalExecutions);
      console.log('📊 Execuções de sucesso (count):', successfulExecutions);
      console.log('📊 Execuções falharam (count):', failedExecutions);
      console.log('📊 Taxa de sucesso:', successRate.toFixed(2) + '%');
      
      // Get active webhooks
      const { count: activeWebhooksCount } = await supabase
        .from('webhooks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
      
      const metrics = {
        totalCompanies: companiesCount || 0,
        totalWebhooks: webhooksCount || 0,
        activeWebhooks: activeWebhooksCount || 0,
        totalExecutions: totalExecutions,
        successfulExecutions: successfulExecutions,
        failedExecutions: failedExecutions,
        successRate: Math.round(successRate * 10) / 10,
        averageResponseTime: 250 // Mock response time in ms
      }
      
      console.log('✅ Métricas carregadas:', metrics)
      return { success: true, data: metrics }
    } catch (error) {
      console.error('❌ Erro ao carregar métricas:', error)
      throw error
    }
  }

  // Metrics by company
  async getMetricsByCompany() {
    try {
      console.log('📊 Buscando métricas por empresa...')
      
      // Get companies first
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, status')
        .order('name', { ascending: true })
      
      if (companiesError) {
        console.error('❌ Erro ao buscar empresas:', companiesError)
        return { success: true, data: [] }
      }
      
      // Process metrics for each company using counts
      const companyMetrics = await Promise.all(
        companiesData?.map(async (company) => {
          console.log(`📊 Calculando métricas para empresa: ${company.name}`);
          
          // Get total executions count for this company
          const { count: totalCount } = await supabase
            .from('webhook_executions')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
          
          // Get successful executions count for this company
          const { count: successCount } = await supabase
            .from('webhook_executions')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('status', 'success')
          
          // Get failed executions count for this company
          const { count: failedCount } = await supabase
            .from('webhook_executions')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('status', 'failed')
          
          const total = totalCount || 0;
          const successful = successCount || 0;
          const failed = failedCount || 0;
          const successRate = total > 0 ? (successful / total) * 100 : 0;
          
          console.log(`📊 ${company.name}: Total=${total}, Sucesso=${successful}, Falha=${failed}, Taxa=${successRate.toFixed(1)}%`);
          
          return {
            company: company.name,
            total,
            successful,
            failed,
            pending: 0, // We don't track pending status yet
            successRate: Math.round(successRate * 10) / 10
          }
        }) || []
      )
      
      console.log('✅ Métricas por empresa carregadas:', companyMetrics.length)
      return { success: true, data: companyMetrics }
    } catch (error) {
      console.error('❌ Erro ao carregar métricas por empresa:', error)
      return { success: true, data: [] }
    }
  }

  // Most used events
  async getMostUsedEvents() {
    try {
      console.log('📊 Buscando eventos mais usados...')
      
      // Get events with their usage count from webhook_events
      const { data, error } = await supabase
        .from('events')
        .select(`
          name,
          display_name,
          webhook_events!inner(webhook_id)
        `)
        .order('display_name', { ascending: true })
        .limit(10)
      
      if (error) {
        console.log('❌ Erro na query complexa, tentando query simples...')
        // Fallback to simple query
        const { data: simpleData, error: simpleError } = await supabase
          .from('events')
          .select('name, display_name')
          .order('display_name', { ascending: true })
          .limit(10)
        
        if (simpleError) throw simpleError
        
        const events = simpleData?.map((item: any) => ({
          name: item.name,
          display_name: item.display_name || item.name,
          count: 1
        })) || []
        
        console.log('✅ Eventos mais usados carregados (fallback):', events.length)
        return { success: true, data: events }
      }
      
      const events = data?.map((item: any) => ({
        name: item.name,
        display_name: item.display_name || item.name,
        count: item.webhook_events?.length || 1
      })) || []
      
      console.log('✅ Eventos mais usados carregados:', events.length)
      console.log('🔍 Primeiro evento:', events[0])
      return { success: true, data: events }
    } catch (error) {
      console.error('❌ Erro ao carregar eventos mais usados:', error)
      // Return empty array instead of throwing error
      return { success: true, data: [] }
    }
  }
}

export const apiService = new ApiService()