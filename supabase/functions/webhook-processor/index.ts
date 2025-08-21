import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookConfig {
  id: string
  company_id: string
  url: string
  status: 'active' | 'inactive'
  event_types: string[]
}

interface ExecutionData {
  webhook_id: string
  company_id: string
  event_id: string
  payload: any
  status: 'success' | 'failed'
  response_status?: number
  response_body?: string
  error_message?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, companyId, eventData } = await req.json()

    switch (action) {
      case 'start_webhook_processor':
        return await startWebhookProcessor(supabase, companyId)
      
      case 'stop_webhook_processor':
        return await stopWebhookProcessor(supabase, companyId)
      
      case 'process_event':
        return await processEvent(supabase, eventData)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('Error in webhook processor:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function startWebhookProcessor(supabase: any, companyId: string) {
  try {
    console.log(`🚀 Starting webhook processor for company: ${companyId}`)
    
    // Get company info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .eq('status', 'active')
      .single()
    
    if (companyError || !company) {
      throw new Error('Company not found or inactive')
    }

    // Get active webhooks for this company
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select(`
        id,
        company_id,
        url,
        status,
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
      return new Response(
        JSON.stringify({ message: 'No active webhooks found for this company' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Transform webhooks to include event types
    const webhookConfigs: WebhookConfig[] = webhooks.map(webhook => ({
      id: webhook.id,
      company_id: webhook.company_id,
      url: webhook.url,
      status: webhook.status,
      event_types: webhook.webhook_events?.map((we: any) => we.event?.name).filter(Boolean) || []
    }))

    console.log(`📋 Found ${webhookConfigs.length} active webhooks for company ${companyId}`)

    // Store webhook configs in KV store for the processor
    await supabase
      .from('kv_store')
      .upsert({
        key: `webhook_configs_${companyId}`,
        value: JSON.stringify(webhookConfigs),
        updated_at: new Date().toISOString()
      })

    // Store company info
    await supabase
      .from('kv_store')
      .upsert({
        key: `company_info_${companyId}`,
        value: JSON.stringify(company),
        updated_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        message: 'Webhook processor started successfully',
        webhooks_count: webhookConfigs.length,
        company_name: company.name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error starting webhook processor:', error)
    throw error
  }
}

async function stopWebhookProcessor(supabase: any, companyId: string) {
  try {
    console.log(`🛑 Stopping webhook processor for company: ${companyId}`)
    
    // Remove webhook configs from KV store
    await supabase
      .from('kv_store')
      .delete()
      .eq('key', `webhook_configs_${companyId}`)
    
    await supabase
      .from('kv_store')
      .delete()
      .eq('key', `company_info_${companyId}`)

    return new Response(
      JSON.stringify({ message: 'Webhook processor stopped successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error stopping webhook processor:', error)
    throw error
  }
}

async function processEvent(supabase: any, eventData: any) {
  try {
    const { company_id, event_type, payload } = eventData
    
    console.log(`📡 Processing event: ${event_type} for company: ${company_id}`)
    
    // Get webhook configs for this company
    const { data: configData } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', `webhook_configs_${company_id}`)
      .single()
    
    if (!configData) {
      console.log(`⚠️ No webhook configs found for company: ${company_id}`)
      return new Response(
        JSON.stringify({ message: 'No webhook configs found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const webhookConfigs: WebhookConfig[] = JSON.parse(configData.value)
    
    // Filter webhooks that listen to this event type
    const relevantWebhooks = webhookConfigs.filter(config => 
      config.event_types.includes(event_type)
    )

    if (relevantWebhooks.length === 0) {
      console.log(`⚠️ No webhooks configured for event: ${event_type}`)
      return new Response(
        JSON.stringify({ message: 'No webhooks configured for this event' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get event ID from database
    const { data: eventData } = await supabase
      .from('events')
      .select('id')
      .eq('name', event_type)
      .single()

    const event_id = eventData?.id

    // Process each relevant webhook
    const results = await Promise.allSettled(
      relevantWebhooks.map(async (webhook) => {
        return await processWebhook(supabase, webhook, payload, event_id, company_id)
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`✅ Processed ${successful} webhooks successfully, ${failed} failed`)

    return new Response(
      JSON.stringify({ 
        message: 'Event processed successfully',
        webhooks_processed: relevantWebhooks.length,
        successful,
        failed
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error processing event:', error)
    throw error
  }
}

async function processWebhook(
  supabase: any, 
  webhook: WebhookConfig, 
  payload: any, 
  event_id: string, 
  company_id: string
) {
  try {
    console.log(`🔄 Processing webhook: ${webhook.id} -> ${webhook.url}`)
    
    // Prepare webhook payload
    const webhookPayload = {
      event_type: payload.event_type,
      company_id: company_id,
      timestamp: new Date().toISOString(),
      data: payload
    }

    // Add HMAC signature if needed
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': '3C-Plus-Webhook-Proxy/1.0'
    }

    // Make POST request to webhook URL
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(webhookPayload)
    })

    const responseText = await response.text()
    
    // Determine execution status
    const status: 'success' | 'failed' = response.ok ? 'success' : 'failed'
    const response_status = response.status
    const response_body = responseText
    const error_message = response.ok ? undefined : `HTTP ${response.status}: ${responseText}`

    // Save execution to database
    const executionData: ExecutionData = {
      webhook_id: webhook.id,
      company_id: company_id,
      event_id: event_id,
      payload: webhookPayload,
      status,
      response_status,
      response_body: response_body.length > 1000 ? response_body.substring(0, 1000) + '...' : response_body,
      error_message
    }

    const { error: executionError } = await supabase
      .from('webhook_executions')
      .insert({
        ...executionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (executionError) {
      console.error('Error saving execution:', executionError)
    }

    console.log(`✅ Webhook ${webhook.id}: ${status} (${response_status})`)
    
    return {
      webhook_id: webhook.id,
      status,
      response_status,
      error_message
    }
  } catch (error) {
    console.error(`❌ Error processing webhook ${webhook.id}:`, error)
    
    // Save failed execution
    const executionData: ExecutionData = {
      webhook_id: webhook.id,
      company_id: company_id,
      event_id: event_id,
      payload: payload,
      status: 'failed',
      error_message: error.message
    }

    await supabase
      .from('webhook_executions')
      .insert({
        ...executionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    throw error
  }
}
