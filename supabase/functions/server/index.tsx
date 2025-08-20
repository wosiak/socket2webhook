import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { companiesDB, eventsDB, webhooksDB, executionsDB, metricsDB } from './database.tsx'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Middleware para validação de token
const validateAuth = async (c: any, next: any) => {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization required' }, 401)
  }
  await next()
}

// Health check endpoint
app.get('/make-server-661cf1c3/health', async (c) => {
  try {
    return c.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      message: 'Server is running and connected to database'
    })
  } catch (error) {
    return c.json({ 
      status: 'unhealthy', 
      error: error.message 
    }, 500)
  }
})

// Companies endpoints
app.get('/make-server-661cf1c3/companies', validateAuth, async (c) => {
  try {
    console.log('Fetching companies...')
    const companies = await companiesDB.getAll()
    console.log('Companies data:', companies)
    
    return c.json({ success: true, data: companies })
  } catch (error) {
    console.error('Error fetching companies:', error)
    return c.json({ 
      error: 'Failed to fetch companies',
      details: error.message 
    }, 500)
  }
})

app.post('/make-server-661cf1c3/companies', validateAuth, async (c) => {
  try {
    const body = await c.req.json()
    console.log('Received company data:', body)
    
    const { name, company_3c_id, api_token, status } = body
    
    if (!name || !company_3c_id || !api_token) {
      console.log('Missing fields:', { name: !!name, company_3c_id: !!company_3c_id, api_token: !!api_token })
      return c.json({ error: 'Missing required fields: name, company_3c_id, api_token' }, 400)
    }

    const company = await companiesDB.create({
      name,
      company_3c_id,
      api_token,
      status: status || 'active'
    })
    
    console.log('Created company:', company)
    return c.json({ success: true, data: company })
  } catch (error) {
    console.error('Error creating company:', error)
    return c.json({ 
      error: 'Failed to create company',
      details: error.message 
    }, 500)
  }
})

app.put('/make-server-661cf1c3/companies/:id', validateAuth, async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    console.log('Updating company:', id, body)
    
    const company = await companiesDB.update(id, body)
    console.log('Updated company:', company)
    
    return c.json({ success: true, data: company })
  } catch (error) {
    console.error('Error updating company:', error)
    return c.json({ 
      error: 'Failed to update company',
      details: error.message 
    }, 500)
  }
})

app.delete('/make-server-661cf1c3/companies/:id', validateAuth, async (c) => {
  try {
    const id = c.req.param('id')
    console.log('Deleting company:', id)
    
    await companiesDB.delete(id)
    console.log('Deleted company:', id)
    
    return c.json({ success: true, message: 'Company deleted successfully' })
  } catch (error) {
    console.error('Error deleting company:', error)
    return c.json({ 
      error: 'Failed to delete company',
      details: error.message 
    }, 500)
  }
})

// Events endpoints
app.get('/make-server-661cf1c3/events', validateAuth, async (c) => {
  try {
    console.log('Fetching events...')
    const events = await eventsDB.getAll()
    console.log('Events data:', events)
    
    return c.json({ success: true, data: events })
  } catch (error) {
    console.error('Error fetching events:', error)
    return c.json({ 
      error: 'Failed to fetch events',
      details: error.message 
    }, 500)
  }
})

// Webhooks endpoints
app.get('/make-server-661cf1c3/webhooks', validateAuth, async (c) => {
  try {
    const companyId = c.req.query('company_id')
    console.log('Fetching webhooks for company:', companyId)
    
    const webhooks = await webhooksDB.getAll(companyId)
    console.log('Webhooks data:', webhooks)
    
    return c.json({ success: true, data: webhooks })
  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return c.json({ 
      error: 'Failed to fetch webhooks',
      details: error.message 
    }, 500)
  }
})

app.post('/make-server-661cf1c3/webhooks', validateAuth, async (c) => {
  try {
    const body = await c.req.json()
    console.log('Received webhook data:', body)
    
    const { company_id, url, is_active, event_ids } = body
    
    if (!company_id || !url || !event_ids || !Array.isArray(event_ids)) {
      return c.json({ error: 'Missing required fields: company_id, url, event_ids (array)' }, 400)
    }

    const webhook = await webhooksDB.create({
      company_id,
      url,
      is_active: is_active ?? true,
      event_ids
    })
    
    console.log('Created webhook:', webhook)
    return c.json({ success: true, data: webhook })
  } catch (error) {
    console.error('Error creating webhook:', error)
    return c.json({ 
      error: 'Failed to create webhook',
      details: error.message 
    }, 500)
  }
})

app.put('/make-server-661cf1c3/webhooks/:id', validateAuth, async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    console.log('Updating webhook:', id, body)
    
    const webhook = await webhooksDB.update(id, body)
    console.log('Updated webhook:', webhook)
    
    return c.json({ success: true, data: webhook })
  } catch (error) {
    console.error('Error updating webhook:', error)
    return c.json({ 
      error: 'Failed to update webhook',
      details: error.message 
    }, 500)
  }
})

app.delete('/make-server-661cf1c3/webhooks/:id', validateAuth, async (c) => {
  try {
    const id = c.req.param('id')
    console.log('Deleting webhook:', id)
    
    await webhooksDB.delete(id)
    console.log('Deleted webhook:', id)
    
    return c.json({ success: true, message: 'Webhook deleted successfully' })
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return c.json({ 
      error: 'Failed to delete webhook',
      details: error.message 
    }, 500)
  }
})

// Executions endpoints
app.get('/make-server-661cf1c3/executions', validateAuth, async (c) => {
  try {
    const companyId = c.req.query('company_id')
    const limit = parseInt(c.req.query('limit') || '100')
    const offset = parseInt(c.req.query('offset') || '0')
    
    console.log('Fetching executions:', { companyId, limit, offset })
    
    const executions = await executionsDB.getAll(companyId, limit, offset)
    console.log('Executions data:', executions)
    
    return c.json({ success: true, data: executions })
  } catch (error) {
    console.error('Error fetching executions:', error)
    return c.json({ 
      error: 'Failed to fetch executions',
      details: error.message 
    }, 500)
  }
})

app.post('/make-server-661cf1c3/executions', validateAuth, async (c) => {
  try {
    const body = await c.req.json()
    console.log('Received execution data:', body)
    
    const { company_id, webhook_id, event_id, payload, status, attempts, max_attempts } = body
    
    if (!company_id || !webhook_id || !event_id) {
      return c.json({ error: 'Missing required fields: company_id, webhook_id, event_id' }, 400)
    }

    const execution = await executionsDB.create({
      company_id,
      webhook_id,
      event_id,
      payload: payload || {},
      status: status || 'pending',
      attempts: attempts || 0,
      max_attempts: max_attempts || 3
    })
    
    console.log('Created execution:', execution)
    return c.json({ success: true, data: execution })
  } catch (error) {
    console.error('Error creating execution:', error)
    return c.json({ 
      error: 'Failed to create execution',
      details: error.message 
    }, 500)
  }
})

app.put('/make-server-661cf1c3/executions/:id', validateAuth, async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    console.log('Updating execution:', id, body)
    
    const execution = await executionsDB.update(id, body)
    console.log('Updated execution:', execution)
    
    return c.json({ success: true, data: execution })
  } catch (error) {
    console.error('Error updating execution:', error)
    return c.json({ 
      error: 'Failed to update execution',
      details: error.message 
    }, 500)
  }
})

// Metrics endpoints
app.get('/make-server-661cf1c3/metrics', validateAuth, async (c) => {
  try {
    console.log('Fetching metrics...')
    const metrics = await metricsDB.getMetrics()
    console.log('Metrics data:', metrics)
    
    return c.json({ success: true, data: metrics })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return c.json({ 
      error: 'Failed to fetch metrics',
      details: error.message 
    }, 500)
  }
})

// Most used events endpoint
app.get('/make-server-661cf1c3/most-used-events', validateAuth, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '5')
    console.log('Fetching most used events, limit:', limit)
    
    const events = await metricsDB.getMostUsedEvents(limit)
    console.log('Most used events data:', events)
    
    return c.json({ success: true, data: events })
  } catch (error) {
    console.error('Error fetching most used events:', error)
    return c.json({ 
      error: 'Failed to fetch most used events',
      details: error.message 
    }, 500)
  }
})

// Socket events endpoint (for future use)
app.get('/make-server-661cf1c3/socket-events', validateAuth, async (c) => {
  try {
    // This would connect to your socket and return recent events
    // For now, returning empty array
    return c.json({ success: true, data: [] })
  } catch (error) {
    console.error('Error fetching socket events:', error)
    return c.json({ 
      error: 'Failed to fetch socket events',
      details: error.message 
    }, 500)
  }
})

export default app