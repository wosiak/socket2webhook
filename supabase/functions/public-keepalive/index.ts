import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Public keepalive triggered')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log da requisição
    console.log('📡 Keepalive request received at:', new Date().toISOString())
    
    // 1. Ensure all active webhooks are connected
    await ensureAllActiveWebhooksConnected(supabase)
    
    // 2. Wake up all Edge Functions
    await wakeUpEdgeFunctions()
    
    // 3. Force reconnect if needed
    await forceReconnectActiveWebhooks()

    return new Response(
      JSON.stringify({ 
        message: 'Public keepalive completed successfully',
        timestamp: new Date().toISOString(),
        status: 'success'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Public keepalive error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

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

    // Connect each company
    for (const company of companies) {
      try {
        await connectCompany(company)
      } catch (error) {
        console.error(`❌ Error connecting company ${company.name}:`, error)
      }
    }

  } catch (error) {
    console.error('❌ Error ensuring active webhooks connected:', error)
  }
}

async function connectCompany(company: any) {
  try {
    if (!company.api_token) {
      console.log(`⚠️ Company ${company.name} has no API token`)
      return
    }

    console.log(`🔌 Connecting company: ${company.name}`)
    
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
      console.log(`✅ Company ${company.name} connected:`, result.message)
    } else {
      const errorText = await response.text()
      console.error(`❌ Failed to connect company ${company.name}:`, errorText)
    }

  } catch (error) {
    console.error(`❌ Error connecting company ${company.name}:`, error)
  }
}

async function wakeUpEdgeFunctions() {
  try {
    console.log('⏰ Waking up all Edge Functions...')
    
    const functions = [
      'webhook-processor',
      'real-socket-processor', 
      'webhook-monitor',
      'keepalive-scheduler'
    ]

    for (const functionName of functions) {
      try {
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/${functionName}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'ping' })
          }
        )
        
        console.log(`📡 Pinged ${functionName}: ${response.status}`)
      } catch (error) {
        console.log(`⚠️ Could not ping ${functionName}:`, error.message)
      }
    }

  } catch (error) {
    console.error('❌ Error waking up Edge Functions:', error)
  }
}

async function forceReconnectActiveWebhooks() {
  try {
    console.log('🔄 Force reconnecting active webhooks...')
    
    // Call the Node.js server force-reconnect endpoint
    const serverUrl = 'https://socket2webhook.onrender.com/force-reconnect'
    console.log(`📡 Calling Node.js server: ${serverUrl}`)
    
    const serverResponse = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (serverResponse.ok) {
      const serverResult = await serverResponse.json()
      console.log('✅ Node.js server force reconnect completed:', serverResult)
    } else {
      console.log(`⚠️ Node.js server response: ${serverResponse.status} - ${await serverResponse.text()}`)
    }
    
    // Also call the webhook monitor Edge Function
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-monitor`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'force_reconnect_all'
        })
      }
    )

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Edge Function force reconnect completed:', result.message)
    } else {
      console.error('❌ Edge Function force reconnect failed:', await response.text())
    }

  } catch (error) {
    console.error('❌ Error force reconnecting:', error)
  }
}
