// Use environment variables for API configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Use Supabase Edge Functions directly
const API_BASE_URL = `${SUPABASE_URL}/functions/v1/make-server-661cf1c3`

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    
    try {
      console.log(`Making API request to: ${endpoint}`)
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          ...options.headers,
        },
      })

      console.log(`API Response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error Response:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${errorData.details || 'Unknown error'}`)
      }

      const data = await response.json()
      console.log(`API Success for ${endpoint}:`, data)
      return data
    } catch (error) {
      console.error('API Request Failed:', { endpoint, error })
      throw error
    }
  }

  // Health check first to test connection
  async healthCheck() {
    return this.request('/health')
  }

  // Companies
  async getCompanies() {
    return this.request('/companies')
  }

  async createCompany(company: {
    name: string
    company_3c_id: string
    api_token: string
    status?: string
  }) {
    console.log('Creating company with data:', company)
    return this.request('/companies', {
      method: 'POST',
      body: JSON.stringify(company),
    })
  }

  async updateCompany(id: string, updates: Partial<{
    name: string
    company_3c_id: string
    api_token: string
    status: string
  }>) {
    return this.request(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteCompany(id: string) {
    return this.request(`/companies/${id}`, {
      method: 'DELETE',
    })
  }

  // Events
  async getEvents() {
    return this.request('/events')
  }

  // Webhooks
  async getWebhooks(companyId?: string) {
    const query = companyId ? `?company_id=${companyId}` : ''
    return this.request(`/webhooks${query}`)
  }

  async createWebhook(webhook: {
    company_id: string
    url: string
    is_active?: boolean
    event_ids: string[]
  }) {
    return this.request('/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook),
    })
  }

  async updateWebhook(id: string, updates: Partial<{
    url: string
    is_active: boolean
    event_ids?: string[]
  }>) {
    return this.request(`/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteWebhook(id: string) {
    return this.request(`/webhooks/${id}`, {
      method: 'DELETE',
    })
  }

  // Executions
  async getExecutions(companyId?: string, limit?: number, offset?: number) {
    const params = new URLSearchParams()
    if (companyId) params.append('company_id', companyId)
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())
    
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request(`/executions${query}`)
  }

  async createExecution(execution: {
    company_id: string
    webhook_id: string
    event_id: string
    payload?: any
    status?: 'pending' | 'success' | 'failed' | 'retrying'
    attempts?: number
    max_attempts?: number
  }) {
    return this.request('/executions', {
      method: 'POST',
      body: JSON.stringify(execution),
    })
  }

  async updateExecution(id: string, updates: Partial<{
    status: 'pending' | 'success' | 'failed' | 'retrying'
    attempts: number
    response_status: number
    response_body: string
    error_message: string
    last_attempt: string
    next_retry: string
  }>) {
    return this.request(`/executions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  // Metrics
  async getMetrics() {
    return this.request('/metrics')
  }

  async getMostUsedEvents(limit?: number) {
    const query = limit ? `?limit=${limit}` : ''
    return this.request(`/most-used-events${query}`)
  }

  // Socket events (for future use)
  async getSocketEvents() {
    return this.request('/socket-events')
  }

  // Webhook connection management
  async connectWebhook(companyId: string) {
    return this.request('/webhook/connect', {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId }),
    })
  }

  async disconnectWebhook(companyId: string) {
    return this.request('/webhook/disconnect', {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId }),
    })
  }

  async getWebhookStatus() {
    return this.request('/webhook/status')
  }
}

export const apiService = new ApiService()