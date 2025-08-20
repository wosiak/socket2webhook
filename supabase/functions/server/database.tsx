import { createClient } from "jsr:@supabase/supabase-js@2";

const client = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Companies table operations
export const companiesDB = {
  // Get all companies
  async getAll() {
    const supabase = client();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Error fetching companies: ${error.message}`);
    }
    
    return data || [];
  },

  // Get company by ID
  async getById(id: string) {
    const supabase = client();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`Error fetching company: ${error.message}`);
    }
    
    return data;
  },

  // Create new company
  async create(company: {
    name: string;
    company_3c_id: string;
    api_token: string;
    status?: 'active' | 'inactive';
  }) {
    const supabase = client();
    const { data, error } = await supabase
      .from('companies')
      .insert({
        ...company,
        status: company.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error creating company: ${error.message}`);
    }
    
    return data;
  },

  // Update company
  async update(id: string, updates: Partial<{
    name: string;
    company_3c_id: string;
    api_token: string;
    status: 'active' | 'inactive';
  }>) {
    const supabase = client();
    const { data, error } = await supabase
      .from('companies')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error updating company: ${error.message}`);
    }
    
    return data;
  },

  // Delete company
  async delete(id: string) {
    const supabase = client();
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(`Error deleting company: ${error.message}`);
    }
  }
};

// Events table operations
export const eventsDB = {
  // Get all events
  async getAll() {
    const supabase = client();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('name');
    
    if (error) {
      throw new Error(`Error fetching events: ${error.message}`);
    }
    
    return data || [];
  },

  // Get event by ID
  async getById(id: string) {
    const supabase = client();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`Error fetching event: ${error.message}`);
    }
    
    return data;
  }
};

// Webhooks table operations
export const webhooksDB = {
  // Get all webhooks (optionally filtered by company)
  async getAll(companyId?: string) {
    const supabase = client();
    let query = supabase
      .from('webhooks')
      .select(`
        *,
        company:companies(name),
        webhook_events(
          event:events(name, display_name)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Error fetching webhooks: ${error.message}`);
    }
    
    return data || [];
  },

  // Get webhook by ID
  async getById(id: string) {
    const supabase = client();
    const { data, error } = await supabase
      .from('webhooks')
      .select(`
        *,
        company:companies(name),
        webhook_events(
          event:events(name, display_name)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`Error fetching webhook: ${error.message}`);
    }
    
    return data;
  },

  // Create new webhook with events
  async create(webhook: {
    company_id: string;
    url: string;
    is_active?: boolean;
    event_ids: string[];
  }) {
    const supabase = client();
    
    // Create webhook first
    const { data: webhookData, error: webhookError } = await supabase
      .from('webhooks')
      .insert({
        company_id: webhook.company_id,
        name: `Webhook ${new Date().getTime()}`, // Nome gerado automaticamente
        url: webhook.url,
        status: webhook.is_active !== false ? 'active' : 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (webhookError) {
      throw new Error(`Error creating webhook: ${webhookError.message}`);
    }
    
    // Create webhook_events relationships
    if (webhook.event_ids.length > 0) {
      const webhookEvents = webhook.event_ids.map(eventId => ({
        webhook_id: webhookData.id,
        event_id: eventId,
        created_at: new Date().toISOString()
      }));
      
      const { error: eventsError } = await supabase
        .from('webhook_events')
        .insert(webhookEvents);
      
      if (eventsError) {
        throw new Error(`Error creating webhook events: ${eventsError.message}`);
      }
    }
    
    // Return the created webhook with its events
    return this.getById(webhookData.id);
  },

  // Update webhook
  async update(id: string, updates: Partial<{
    url: string;
    is_active: boolean;
    event_ids?: string[];
  }>) {
    const supabase = client();
    
    const { event_ids, ...webhookUpdates } = updates;
    
    // Update webhook basic info
    const webhookUpdateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.url) webhookUpdateData.url = updates.url;
    if (updates.is_active !== undefined) {
      webhookUpdateData.status = updates.is_active ? 'active' : 'inactive';
    }
    
    const { data: webhookData, error: webhookError } = await supabase
      .from('webhooks')
      .update(webhookUpdateData)
      .eq('id', id)
      .select()
      .single();
    
    if (webhookError) {
      throw new Error(`Error updating webhook: ${webhookError.message}`);
    }
    
    // Update events if provided
    if (event_ids !== undefined) {
      // Delete existing webhook_events
      const { error: deleteError } = await supabase
        .from('webhook_events')
        .delete()
        .eq('webhook_id', id);
      
      if (deleteError) {
        throw new Error(`Error deleting webhook events: ${deleteError.message}`);
      }
      
      // Create new webhook_events
      if (event_ids.length > 0) {
        const webhookEvents = event_ids.map(eventId => ({
          webhook_id: id,
          event_id: eventId,
          created_at: new Date().toISOString()
        }));
        
        const { error: eventsError } = await supabase
          .from('webhook_events')
          .insert(webhookEvents);
        
        if (eventsError) {
          throw new Error(`Error creating webhook events: ${eventsError.message}`);
        }
      }
    }
    
    // Return the updated webhook with its events
    return this.getById(id);
  },

  // Delete webhook
  async delete(id: string) {
    const supabase = client();
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(`Error deleting webhook: ${error.message}`);
    }
  }
};

// Executions table operations
export const executionsDB = {
  // Get executions (with pagination and optional company filter)
  async getAll(companyId?: string, limit: number = 100, offset: number = 0) {
    const supabase = client();
    let query = supabase
      .from('webhook_executions')
      .select(`
        *,
        company:companies(name),
        webhook:webhooks(url),
        event:events(name, display_name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Error fetching executions: ${error.message}`);
    }
    
    return data || [];
  },

  // Get execution by ID
  async getById(id: string) {
    const supabase = client();
    const { data, error } = await supabase
      .from('webhook_executions')
      .select(`
        *,
        company:companies(name),
        webhook:webhooks(url),
        event:events(name, display_name)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`Error fetching execution: ${error.message}`);
    }
    
    return data;
  },

  // Create new execution
  async create(execution: {
    company_id: string;
    webhook_id: string;
    event_id: string;
    payload: any;
    status?: 'pending' | 'success' | 'failed' | 'retrying';
    attempts?: number;
    max_attempts?: number;
  }) {
    const supabase = client();
    const { data, error } = await supabase
      .from('webhook_executions')
      .insert({
        company_id: execution.company_id,
        webhook_id: execution.webhook_id,
        event_id: execution.event_id,
        event_data: execution.payload,
        status: execution.status || 'pending',
        attempt_number: execution.attempts || 1,
        max_attempts: execution.max_attempts || 3,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error creating execution: ${error.message}`);
    }
    
    return data;
  },

  // Update execution
  async update(id: string, updates: Partial<{
    status: 'pending' | 'success' | 'failed' | 'retrying';
    attempts: number;
    response_status: number;
    response_body: string;
    error_message: string;
    executed_at: string;
    next_retry_at: string;
  }>) {
    const supabase = client();
    
    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.attempts) updateData.attempt_number = updates.attempts;
    if (updates.response_status) updateData.response_status = updates.response_status;
    if (updates.response_body) updateData.response_body = updates.response_body;
    if (updates.error_message) updateData.error_message = updates.error_message;
    if (updates.executed_at) updateData.executed_at = updates.executed_at;
    if (updates.next_retry_at) updateData.next_retry_at = updates.next_retry_at;
    
    const { data, error } = await supabase
      .from('webhook_executions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error updating execution: ${error.message}`);
    }
    
    return data;
  }
};

// Metrics calculation
export const metricsDB = {
  async getMetrics() {
    const supabase = client();
    
    // Get companies with their execution counts
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name');
    
    if (companiesError) {
      throw new Error(`Error fetching companies for metrics: ${companiesError.message}`);
    }
    
    const metrics = await Promise.all(
      companies.map(async (company) => {
        const { data: executions } = await supabase
          .from('webhook_executions')
          .select('status')
          .eq('company_id', company.id);
        
        const successful = executions?.filter(e => e.status === 'success').length || 0;
        const failed = executions?.filter(e => e.status === 'failed').length || 0;
        const pending = executions?.filter(e => e.status === 'pending' || e.status === 'retrying').length || 0;
        const total = executions?.length || 0;
        
        return {
          company_id: company.id,
          company_name: company.name,
          successful_events: successful,
          failed_events: failed,
          retrying_events: pending,
          total_events: total,
          success_rate: total > 0 ? (successful / total) * 100 : 0
        };
      })
    );
    
    return metrics;
  },

  // Get most used events
  async getMostUsedEvents(limit: number = 5) {
    const supabase = client();
    
    const { data, error } = await supabase
      .rpc('get_most_used_events', { limit_count: limit });
    
    if (error) {
      throw new Error(`Error fetching most used events: ${error.message}`);
    }
    
    return data || [];
  }
};
