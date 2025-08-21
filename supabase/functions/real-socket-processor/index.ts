import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Manter conexões ativas por empresa
let activeConnections = new Map()
let socketInstances = new Map()

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, companyId } = await req.json()

    switch (action) {
      case 'connect_real_socket':
        return await connectRealSocket(supabase, companyId)
      
      case 'disconnect_real_socket':
        return await disconnectRealSocket(supabase, companyId)
      
      case 'check_connections':
        return await checkConnections()
      
      case 'ensure_all_active_connected':
        return await ensureAllActiveConnected(supabase)
      
      case 'disconnect_all':
        return await disconnectAll()
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Real socket processor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function connectRealSocket(supabase: any, companyId: string) {
  try {
    console.log(`🔌 Connecting real 3C Plus socket for company: ${companyId}`)
    
    // Get company info and token
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .eq('status', 'active')
      .single()
    
    if (companyError || !company) {
      throw new Error('Company not found or inactive')
    }

    if (!company.api_token) {
      throw new Error('Company API token not found')
    }

    // Get active webhooks
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select(`
        id, url, status,
        webhook_events(
          event:events(name, display_name)
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
    
    if (webhooksError) {
      throw webhooksError
    }

    if (!webhooks || webhooks.length === 0) {
      console.log(`⚠️ No active webhooks found for company: ${companyId}`)
      return new Response(
        JSON.stringify({ message: 'No active webhooks found', webhooks: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If already connected, don't reconnect
    if (activeConnections.has(companyId)) {
      console.log(`✅ Company ${companyId} already connected`)
      return new Response(
        JSON.stringify({ 
          message: 'Already connected',
          company_id: companyId,
          webhooks_count: webhooks.length,
          status: 'connected'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Connect to 3C Plus socket
    const socketConnection = await connect3CPlusSocket(company.api_token, companyId, webhooks, supabase)
    
    // Store connection info
    activeConnections.set(companyId, {
      company: company,
      webhooks: webhooks,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      status: 'connected'
    })

    socketInstances.set(companyId, socketConnection)

    console.log(`✅ Real socket connected for company: ${company.name} with ${webhooks.length} webhooks`)

    return new Response(
      JSON.stringify({ 
        message: 'Real socket connected successfully',
        company_id: companyId,
        company_name: company.name,
        webhooks_count: webhooks.length,
        status: 'connected'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(`❌ Error connecting real socket for ${companyId}:`, error)
    throw error
  }
}

async function connect3CPlusSocket(token: string, companyId: string, webhooks: any[], supabase: any) {
  try {
    console.log(`🔌 Establishing WebSocket connection to 3C Plus for company: ${companyId}`)
    
    // Import socket.io client for Deno
    const { io } = await import('https://esm.sh/socket.io-client@4.7.2')
    
    const socket = io('https://wss-events-api.3cplus.com.br', {
      transports: ['websocket'],
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    })

    socket.on('connect', () => {
      console.log(`✅ 3C Plus socket connected for company: ${companyId}`)
      
      // Update last activity
      const connection = activeConnections.get(companyId)
      if (connection) {
        connection.lastActivity = new Date().toISOString()
        connection.status = 'connected'
      }
    })

    socket.on('disconnect', (reason) => {
      console.log(`⚠️ 3C Plus socket disconnected for company ${companyId}:`, reason)
      
      // Update connection status
      const connection = activeConnections.get(companyId)
      if (connection) {
        connection.status = 'disconnected'
        connection.lastActivity = new Date().toISOString()
      }
    })

    socket.on('connect_error', (error) => {
      console.error(`❌ 3C Plus socket connection error for company ${companyId}:`, error)
    })

    // Listen for events
    socket.onAny(async (eventName, eventData) => {
      try {
        console.log(`📡 Event received for company ${companyId}: ${eventName}`)
        
        // Update last activity
        const connection = activeConnections.get(companyId)
        if (connection) {
          connection.lastActivity = new Date().toISOString()
        }

        // Process event through relevant webhooks
        await processEventThroughWebhooks(supabase, companyId, eventName, eventData, webhooks)
        
      } catch (error) {
        console.error(`❌ Error processing event ${eventName} for company ${companyId}:`, error)
      }
    })

    return socket
  } catch (error) {
    console.error(`❌ Failed to connect to 3C Plus socket for company ${companyId}:`, error)
    throw error
  }
}

async function processEventThroughWebhooks(supabase: any, companyId: string, eventName: string, eventData: any, webhooks: any[]) {
  try {
    console.log(`🔄 Processing event ${eventName} through ${webhooks.length} webhooks for company: ${companyId}`)

    // Filter webhooks that listen to this event
    const relevantWebhooks = webhooks.filter(webhook => {
      const eventTypes = webhook.webhook_events?.map((we: any) => we.event?.name) || []
      return eventTypes.includes(eventName)
    })

    if (relevantWebhooks.length === 0) {
      console.log(`⚠️ No webhooks configured for event: ${eventName}`)
      return
    }

    console.log(`📋 Found ${relevantWebhooks.length} webhooks for event: ${eventName}`)

    // Get event ID from database
    const { data: eventRecord } = await supabase
      .from('events')
      .select('id')
      .eq('name', eventName)
      .single()

    // Process each relevant webhook
    const results = await Promise.allSettled(
      relevantWebhooks.map(async (webhook) => {
        return await processWebhookExecution(supabase, webhook, eventData, eventRecord?.id, companyId, eventName)
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`✅ Event ${eventName} processed: ${successful} successful, ${failed} failed`)

  } catch (error) {
    console.error(`❌ Error processing event ${eventName} through webhooks:`, error)
  }
}

async function processWebhookExecution(supabase: any, webhook: any, eventData: any, eventId: string, companyId: string, eventName: string) {
  try {
    console.log(`🔄 Executing webhook: ${webhook.id} -> ${webhook.url}`)
    
    // Prepare webhook payload
    const webhookPayload = {
      event_type: eventName,
      company_id: companyId,
      timestamp: new Date().toISOString(),
      data: eventData
    }

    // Make POST request to webhook URL
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '3C-Plus-Real-Socket-Processor/1.0'
      },
      body: JSON.stringify(webhookPayload)
    })

    const responseText = await response.text()
    const status = response.ok ? 'success' : 'failed'
    const errorMessage = response.ok ? null : `HTTP ${response.status}: ${responseText}`

    // Save execution to database
    const { error: executionError } = await supabase
      .from('webhook_executions')
      .insert({
        webhook_id: webhook.id,
        company_id: companyId,
        event_id: eventId,
        payload: webhookPayload,
        status: status,
        response_status: response.status,
        response_body: responseText.length > 1000 ? responseText.substring(0, 1000) + '...' : responseText,
        error_message: errorMessage,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (executionError) {
      console.error('❌ Error saving webhook execution:', executionError)
    }

    console.log(`✅ Webhook ${webhook.id} executed: ${status} (${response.status})`)
    
    return {
      webhook_id: webhook.id,
      status,
      response_status: response.status,
      error_message: errorMessage
    }
  } catch (error) {
    console.error(`❌ Error executing webhook ${webhook.id}:`, error)
    
    // Save failed execution
    await supabase
      .from('webhook_executions')
      .insert({
        webhook_id: webhook.id,
        company_id: companyId,
        event_id: eventId,
        payload: eventData,
        status: 'failed',
        error_message: error.message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    throw error
  }
}

async function disconnectRealSocket(supabase: any, companyId: string) {
  try {
    console.log(`🔌 Disconnecting real socket for company: ${companyId}`)
    
    const socket = socketInstances.get(companyId)
    if (socket) {
      socket.disconnect()
      socketInstances.delete(companyId)
    }
    
    activeConnections.delete(companyId)

    return new Response(
      JSON.stringify({ 
        message: 'Real socket disconnected successfully',
        company_id: companyId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(`❌ Error disconnecting real socket for ${companyId}:`, error)
    throw error
  }
}

async function checkConnections() {
  const connections = Array.from(activeConnections.entries()).map(([companyId, data]) => ({
    company_id: companyId,
    company_name: data.company.name,
    webhooks_count: data.webhooks.length,
    connected_at: data.connectedAt,
    last_activity: data.lastActivity,
    status: data.status
  }))

  return new Response(
    JSON.stringify({ 
      message: 'Connections status retrieved',
      active_companies: connections.length,
      connections: connections
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function ensureAllActiveConnected(supabase: any) {
  try {
    console.log(`🔄 Ensuring all active companies are connected...`)
    
    // Get all companies with active webhooks
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id, name, api_token, status,
        webhooks!inner(status)
      `)
      .eq('status', 'active')
      .eq('webhooks.status', 'active')

    if (error) {
      throw error
    }

    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No companies with active webhooks found',
          connected: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${companies.length} companies with active webhooks`)

    // Connect each company that isn't already connected
    const results = await Promise.allSettled(
      companies.map(async (company) => {
        if (!activeConnections.has(company.id)) {
          console.log(`🔌 Connecting company: ${company.name}`)
          return await connectRealSocket(supabase, company.id)
        } else {
          console.log(`✅ Company ${company.name} already connected`)
          return Promise.resolve()
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return new Response(
      JSON.stringify({ 
        message: 'All active companies connection check completed',
        total_companies: companies.length,
        successful_connections: successful,
        failed_connections: failed,
        currently_connected: activeConnections.size
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(`❌ Error ensuring all active companies connected:`, error)
    throw error
  }
}

async function disconnectAll() {
  try {
    console.log(`🛑 Disconnecting all companies...`)
    
    const disconnectedCompanies = []
    
    // Disconnect all active connections
    for (const [companyId, connection] of activeConnections.entries()) {
      try {
        const socket = socketInstances.get(companyId)
        if (socket) {
          socket.disconnect()
          socketInstances.delete(companyId)
        }
        disconnectedCompanies.push({
          company_id: companyId,
          company_name: connection.company?.name || 'Unknown'
        })
      } catch (error) {
        console.error(`❌ Error disconnecting company ${companyId}:`, error)
      }
    }
    
    // Clear all connections
    activeConnections.clear()
    socketInstances.clear()

    console.log(`✅ Disconnected ${disconnectedCompanies.length} companies`)

    return new Response(
      JSON.stringify({ 
        message: 'All companies disconnected',
        disconnected_count: disconnectedCompanies.length,
        disconnected_companies: disconnectedCompanies
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(`❌ Error disconnecting all companies:`, error)
    throw error
  }
}
