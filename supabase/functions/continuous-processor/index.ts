import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simulação de conexão com 3C Plus Socket
let activeConnections = new Map()

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, companyId, eventData } = await req.json()

    switch (action) {
      case 'start_continuous_processing':
        return await startContinuousProcessing(supabase, companyId)
      
      case 'stop_continuous_processing':
        return await stopContinuousProcessing(supabase, companyId)
      
      case 'simulate_event':
        return await simulateEvent(supabase, eventData)
      
      case 'check_status':
        return await checkStatus()
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Continuous processor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function startContinuousProcessing(supabase: any, companyId: string) {
  try {
    console.log(`🚀 Starting continuous processing for company: ${companyId}`)
    
    // Get active webhooks for this company
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select(`
        id, url, status,
        company_id,
        webhook_events(
          event:events(name, display_name)
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
    
    if (error || !webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active webhooks found', webhooks: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store active connection
    activeConnections.set(companyId, {
      webhooks: webhooks,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      status: 'active'
    })

    // Start simulated event processing (In real scenario, this would connect to 3C Plus socket)
    startEventSimulation(supabase, companyId, webhooks)

    console.log(`✅ Continuous processing started for ${companyId} with ${webhooks.length} webhooks`)

    return new Response(
      JSON.stringify({ 
        message: 'Continuous processing started',
        webhooks_count: webhooks.length,
        company_id: companyId,
        status: 'active'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error starting continuous processing:', error)
    throw error
  }
}

async function stopContinuousProcessing(supabase: any, companyId: string) {
  activeConnections.delete(companyId)
  
  return new Response(
    JSON.stringify({ message: 'Continuous processing stopped', company_id: companyId }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function checkStatus() {
  const status = Array.from(activeConnections.entries()).map(([companyId, data]) => ({
    company_id: companyId,
    webhooks_count: data.webhooks.length,
    start_time: data.startTime,
    last_activity: data.lastActivity,
    status: data.status
  }))

  return new Response(
    JSON.stringify({ 
      message: 'Status retrieved',
      active_companies: status.length,
      connections: status
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Simulate event processing (replace with real 3C Plus socket connection)
function startEventSimulation(supabase: any, companyId: string, webhooks: any[]) {
  const interval = setInterval(async () => {
    const connection = activeConnections.get(companyId)
    if (!connection) {
      clearInterval(interval)
      return
    }

    // Simulate event every 30 seconds for testing
    const simulatedEvent = {
      event_type: 'call-was-connected',
      call_id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      company_id: companyId
    }

    console.log(`📡 Simulated event for ${companyId}:`, simulatedEvent.event_type)

    // Process webhooks for this event
    for (const webhook of webhooks) {
      const eventTypes = webhook.webhook_events?.map((we: any) => we.event?.name) || []
      
      if (eventTypes.includes(simulatedEvent.event_type)) {
        await processWebhookEvent(supabase, webhook, simulatedEvent)
      }
    }

    // Update last activity
    connection.lastActivity = new Date().toISOString()
  }, 30000) // Every 30 seconds
}

async function processWebhookEvent(supabase: any, webhook: any, eventData: any) {
  try {
    console.log(`🔄 Processing webhook: ${webhook.id} -> ${webhook.url}`)
    
    const payload = {
      event_type: eventData.event_type,
      company_id: eventData.company_id,
      timestamp: eventData.timestamp,
      data: eventData
    }

    // Make POST request to webhook URL
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '3C-Plus-Continuous-Processor/1.0'
      },
      body: JSON.stringify(payload)
    })

    const responseText = await response.text()
    const status = response.ok ? 'success' : 'failed'

    // Get event ID
    const { data: eventData } = await supabase
      .from('events')
      .select('id')
      .eq('name', eventData.event_type)
      .single()

    // Save execution to database
    const { error: executionError } = await supabase
      .from('webhook_executions')
      .insert({
        webhook_id: webhook.id,
        company_id: eventData.company_id,
        event_id: eventData?.id,
        payload: payload,
        status: status,
        response_status: response.status,
        response_body: responseText.length > 1000 ? responseText.substring(0, 1000) + '...' : responseText,
        error_message: response.ok ? null : `HTTP ${response.status}: ${responseText}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (executionError) {
      console.error('Error saving execution:', executionError)
    }

    console.log(`✅ Webhook processed: ${status} (${response.status})`)
    
  } catch (error) {
    console.error(`❌ Error processing webhook ${webhook.id}:`, error)
    
    // Save failed execution
    await supabase
      .from('webhook_executions')
      .insert({
        webhook_id: webhook.id,
        company_id: eventData.company_id,
        event_id: null,
        payload: eventData,
        status: 'failed',
        error_message: error.message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
  }
}

async function simulateEvent(supabase: any, eventData: any) {
  const { company_id, event_type } = eventData
  
  console.log(`📡 Manual event simulation for company: ${company_id}`)
  
  const connection = activeConnections.get(company_id)
  if (!connection) {
    return new Response(
      JSON.stringify({ message: 'Company not connected', company_id }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Process all webhooks for this company
  for (const webhook of connection.webhooks) {
    const eventTypes = webhook.webhook_events?.map((we: any) => we.event?.name) || []
    
    if (eventTypes.includes(event_type)) {
      await processWebhookEvent(supabase, webhook, eventData)
    }
  }

  return new Response(
    JSON.stringify({ 
      message: 'Event simulated successfully',
      company_id,
      event_type,
      processed_webhooks: connection.webhooks.length
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
