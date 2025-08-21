import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Monitor state
let monitorActive = false
let monitorInterval: number | null = null
let reconnectionAttempts = new Map()

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action } = await req.json()

    switch (action) {
      case 'start_monitor':
        return await startMonitor(supabase)
      
      case 'stop_monitor':
        return await stopMonitor()
      
      case 'force_reconnect_all':
        return await forceReconnectAll(supabase)
      
      case 'check_monitor_status':
        return await checkMonitorStatus()
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Webhook monitor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function startMonitor(supabase: any) {
  try {
    console.log('🔍 Starting webhook monitor...')
    
    if (monitorActive) {
      return new Response(
        JSON.stringify({ message: 'Monitor already active', status: 'active' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    monitorActive = true
    
    // Initial connection attempt
    await ensureAllActiveWebhooksConnected(supabase)
    
    // Start monitoring every 30 seconds
    monitorInterval = setInterval(async () => {
      try {
        console.log('🔍 Monitor: Checking webhook connections...')
        await ensureAllActiveWebhooksConnected(supabase)
      } catch (error) {
        console.error('❌ Monitor error:', error)
      }
    }, 30000) // Check every 30 seconds

    console.log('✅ Webhook monitor started successfully')

    return new Response(
      JSON.stringify({ 
        message: 'Webhook monitor started',
        status: 'active',
        check_interval: '30 seconds'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error starting monitor:', error)
    throw error
  }
}

async function stopMonitor() {
  console.log('🛑 Stopping webhook monitor...')
  
  monitorActive = false
  
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
  }

  return new Response(
    JSON.stringify({ message: 'Webhook monitor stopped', status: 'stopped' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function ensureAllActiveWebhooksConnected(supabase: any) {
  try {
    console.log('🔍 Ensuring all active webhooks are connected...')
    
    // Get all companies with active webhooks
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id, name, api_token, status,
        webhooks!inner(id, status)
      `)
      .eq('status', 'active')
      .eq('webhooks.status', 'active')

    if (error) {
      console.error('❌ Error fetching companies:', error)
      return
    }

    if (!companies || companies.length === 0) {
      console.log('📭 No companies with active webhooks found')
      return
    }

    console.log(`📋 Found ${companies.length} companies with active webhooks`)

    // Process each company
    for (const company of companies) {
      try {
        await ensureCompanyConnected(supabase, company)
      } catch (error) {
        console.error(`❌ Error ensuring company ${company.name} connected:`, error)
        
        // Track reconnection attempts
        const attempts = reconnectionAttempts.get(company.id) || 0
        reconnectionAttempts.set(company.id, attempts + 1)
        
        if (attempts < 5) { // Max 5 attempts before giving up temporarily
          console.log(`🔄 Will retry company ${company.name} (attempt ${attempts + 1}/5)`)
        }
      }
    }

    console.log('✅ Webhook connection check completed')
  } catch (error) {
    console.error('❌ Error in ensureAllActiveWebhooksConnected:', error)
  }
}

async function ensureCompanyConnected(supabase: any, company: any) {
  try {
    console.log(`🔍 Checking company: ${company.name}`)
    
    if (!company.api_token) {
      console.log(`⚠️ Company ${company.name} has no API token`)
      return
    }

    // Check if company is already connected via real-socket-processor
    const checkResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/real-socket-processor`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'check_connections'
        })
      }
    )

    if (checkResponse.ok) {
      const result = await checkResponse.json()
      const isConnected = result.connections?.some((conn: any) => 
        conn.company_id === company.id && conn.status === 'connected'
      )

      if (isConnected) {
        console.log(`✅ Company ${company.name} already connected`)
        // Reset reconnection attempts on successful connection
        reconnectionAttempts.delete(company.id)
        return
      }
    }

    console.log(`🔌 Connecting company ${company.name} to real socket...`)
    
    // Connect company via real-socket-processor
    const connectResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/real-socket-processor`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'connect_real_socket',
          companyId: company.id
        })
      }
    )

    if (connectResponse.ok) {
      const result = await connectResponse.json()
      console.log(`✅ Company ${company.name} connected successfully:`, result.message)
      
      // Reset reconnection attempts on successful connection
      reconnectionAttempts.delete(company.id)
    } else {
      const errorText = await connectResponse.text()
      throw new Error(`Connection failed: ${connectResponse.status} - ${errorText}`)
    }

  } catch (error) {
    console.error(`❌ Error ensuring company ${company.name} connected:`, error)
    throw error
  }
}

async function forceReconnectAll(supabase: any) {
  try {
    console.log('🔄 Force reconnecting all active webhooks...')
    
    // Clear all reconnection attempts
    reconnectionAttempts.clear()
    
    // First, disconnect all existing connections
    try {
      await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/real-socket-processor`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'disconnect_all'
          })
        }
      )
    } catch (error) {
      console.log('⚠️ Error disconnecting existing connections (continuing anyway):', error)
    }

    // Wait a moment for disconnections to complete
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Now reconnect all active webhooks
    await ensureAllActiveWebhooksConnected(supabase)

    return new Response(
      JSON.stringify({ 
        message: 'Force reconnection completed',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error in force reconnect:', error)
    throw error
  }
}

async function checkMonitorStatus() {
  const status = {
    monitor_active: monitorActive,
    monitor_interval: monitorInterval !== null,
    reconnection_attempts: Object.fromEntries(reconnectionAttempts),
    uptime: monitorActive ? 'Active' : 'Stopped',
    last_check: new Date().toISOString()
  }

  return new Response(
    JSON.stringify({ 
      message: 'Monitor status retrieved',
      status: status
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Auto-start monitor when function loads
console.log('🚀 Webhook monitor function loaded - auto-starting monitor')
// We'll start the monitor via API call from frontend to ensure proper initialization
