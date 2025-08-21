import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { action, companyId, token } = await req.json()

    switch (action) {
      case 'connect_socket':
        return await connectToSocket(supabase, companyId, token)
      
      case 'disconnect_socket':
        return await disconnectSocket(supabase, companyId)
      
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
    console.error('Error in socket connector:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function connectToSocket(supabase: any, companyId: string, token: string) {
  try {
    console.log(`🔌 Connecting to 3C Plus socket for company: ${companyId}`)
    
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

    // Store connection info
    await supabase
      .from('kv_store')
      .upsert({
        key: `socket_connection_${companyId}`,
        value: JSON.stringify({
          company_id: companyId,
          token: token,
          connected_at: new Date().toISOString(),
          status: 'connected'
        }),
        updated_at: new Date().toISOString()
      })

    // Start webhook processor for this company
    const webhookProcessorUrl = `${supabaseUrl}/functions/v1/webhook-processor`
    
    const response = await fetch(webhookProcessorUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'start_webhook_processor',
        companyId: companyId
      })
    })

    if (!response.ok) {
      throw new Error('Failed to start webhook processor')
    }

    console.log(`✅ Socket connection established for company: ${company.name}`)

    return new Response(
      JSON.stringify({ 
        message: 'Socket connected successfully',
        company_name: company.name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error connecting to socket:', error)
    throw error
  }
}

async function disconnectSocket(supabase: any, companyId: string) {
  try {
    console.log(`🔌 Disconnecting socket for company: ${companyId}`)
    
    // Remove connection info
    await supabase
      .from('kv_store')
      .delete()
      .eq('key', `socket_connection_${companyId}`)

    // Stop webhook processor for this company
    const webhookProcessorUrl = `${supabaseUrl}/functions/v1/webhook-processor`
    
    const response = await fetch(webhookProcessorUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'stop_webhook_processor',
        companyId: companyId
      })
    })

    console.log(`✅ Socket disconnected for company: ${companyId}`)

    return new Response(
      JSON.stringify({ message: 'Socket disconnected successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error disconnecting socket:', error)
    throw error
  }
}
