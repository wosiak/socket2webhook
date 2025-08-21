import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Keepalive state
let keepaliveActive = false
let keepaliveInterval: number | null = null
let lastKeepalive = new Date()

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action } = await req.json().catch(() => ({ action: 'keepalive' }))

    switch (action) {
      case 'start_keepalive':
        return await startKeepalive(supabase)
      
      case 'stop_keepalive':
        return await stopKeepalive()
      
      case 'keepalive':
        return await handleKeepalive(supabase)
      
      case 'status':
        return await getStatus()
      
      default:
        // Default to keepalive for external schedulers
        return await handleKeepalive(supabase)
    }
  } catch (error) {
    console.error('Keepalive scheduler error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function startKeepalive(supabase: any) {
  try {
    console.log('🔄 Starting keepalive scheduler...')
    
    if (keepaliveActive) {
      return new Response(
        JSON.stringify({ message: 'Keepalive already active', status: 'active' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    keepaliveActive = true
    lastKeepalive = new Date()
    
    // Start keepalive every 20 seconds
    keepaliveInterval = setInterval(async () => {
      try {
        await performKeepalive(supabase)
      } catch (error) {
        console.error('❌ Keepalive error:', error)
      }
    }, 20000) // Every 20 seconds

    // Initial keepalive
    await performKeepalive(supabase)

    console.log('✅ Keepalive scheduler started successfully')

    return new Response(
      JSON.stringify({ 
        message: 'Keepalive scheduler started',
        status: 'active',
        interval: '20 seconds'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error starting keepalive:', error)
    throw error
  }
}

async function stopKeepalive() {
  console.log('🛑 Stopping keepalive scheduler...')
  
  keepaliveActive = false
  
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval)
    keepaliveInterval = null
  }

  return new Response(
    JSON.stringify({ message: 'Keepalive scheduler stopped', status: 'stopped' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleKeepalive(supabase: any) {
  try {
    console.log('🔄 Handling external keepalive request...')
    
    if (!keepaliveActive) {
      await startKeepalive(supabase)
    } else {
      await performKeepalive(supabase)
    }

    return new Response(
      JSON.stringify({ 
        message: 'Keepalive handled successfully',
        timestamp: new Date().toISOString(),
        active: keepaliveActive
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error handling keepalive:', error)
    throw error
  }
}

async function performKeepalive(supabase: any) {
  try {
    console.log('🔄 Performing keepalive operations...')
    lastKeepalive = new Date()
    
    // 1. Ensure webhook monitor is running
    await ensureMonitorRunning()
    
    // 2. Ensure all active webhooks are connected
    await ensureActiveWebhooksConnected(supabase)
    
    // 3. Keep real-socket-processor alive
    await keepRealSocketProcessorAlive()
    
    console.log('✅ Keepalive operations completed')
    
  } catch (error) {
    console.error('❌ Error in keepalive operations:', error)
  }
}

async function ensureMonitorRunning() {
  try {
    console.log('🔍 Ensuring webhook monitor is running...')
    
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-monitor`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'start_monitor' })
      }
    )

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Webhook monitor status:', result.message)
    } else {
      console.error('❌ Failed to ensure webhook monitor:', await response.text())
    }
  } catch (error) {
    console.error('❌ Error ensuring monitor running:', error)
  }
}

async function ensureActiveWebhooksConnected(supabase: any) {
  try {
    console.log('🔌 Ensuring all active webhooks are connected...')
    
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

    // Ensure each company is connected
    for (const company of companies) {
      try {
        await ensureCompanyConnected(company)
      } catch (error) {
        console.error(`❌ Error ensuring company ${company.name} connected:`, error)
      }
    }

  } catch (error) {
    console.error('❌ Error ensuring active webhooks connected:', error)
  }
}

async function ensureCompanyConnected(company: any) {
  try {
    console.log(`🔍 Ensuring company ${company.name} is connected...`)
    
    if (!company.api_token) {
      console.log(`⚠️ Company ${company.name} has no API token`)
      return
    }

    // Try to connect the company
    const response = await fetch(
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

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Company ${company.name} connection ensured:`, result.message)
    } else {
      const errorText = await response.text()
      console.error(`❌ Failed to ensure company ${company.name} connected:`, errorText)
    }

  } catch (error) {
    console.error(`❌ Error ensuring company ${company.name} connected:`, error)
  }
}

async function keepRealSocketProcessorAlive() {
  try {
    console.log('🔄 Keeping real-socket-processor alive...')
    
    const response = await fetch(
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

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Real-socket-processor alive: ${result.active_companies} companies connected`)
    } else {
      console.error('❌ Failed to keep real-socket-processor alive:', await response.text())
    }
  } catch (error) {
    console.error('❌ Error keeping real-socket-processor alive:', error)
  }
}

async function getStatus() {
  const status = {
    keepalive_active: keepaliveActive,
    keepalive_interval: keepaliveInterval !== null,
    last_keepalive: lastKeepalive.toISOString(),
    uptime: keepaliveActive ? 'Active' : 'Stopped',
    current_time: new Date().toISOString()
  }

  return new Response(
    JSON.stringify({ 
      message: 'Keepalive status retrieved',
      status: status
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Auto-start keepalive when function loads
console.log('🚀 Keepalive scheduler function loaded')
// Start keepalive automatically after a short delay
setTimeout(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    await startKeepalive(supabase)
    console.log('🚀 Auto-started keepalive scheduler')
  } catch (error) {
    console.error('❌ Error auto-starting keepalive:', error)
  }
}, 5000) // Start after 5 seconds
