export interface Company {
  id: string;
  company_3c_id: string;
  name: string;
  api_token: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string; // UUID do Supabase
  uuid: string;
  name: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: string;
  company_id: string;
  name: string;
  url: string;
  status: 'active' | 'inactive' | 'paused';
  is_active?: boolean; // Para compatibilidade com a API
  event_types?: string[]; // Para compatibilidade com a API
  event_ids?: string[]; // IDs dos eventos para edição
  created_at: string;
  updated_at: string;
  company?: {
    name: string;
  };
  webhook_events?: Array<{
    event: {
      id: string;
      name: string;
      display_name: string;
    };
  }>;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_id: string;
  created_at: string;
}

export interface ExecutionHistory {
  id: string;
  company_id: string;
  webhook_id: string;
  event_id: string;
  event_type?: string; // Nome do evento para exibição
  payload: any;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  max_attempts: number;
  response_status?: number;
  response_body?: string;
  error_message?: string;
  last_attempt?: string;
  next_retry?: string;
  created_at: string;
  updated_at: string;
  company?: {
    name: string;
  };
  webhook?: {
    url: string;
  };
  event?: {
    name: string;
    description: string;
  };
}

export interface Metrics {
  company_id: string;
  company_name: string;
  total_events: number;
  successful_events: number;
  failed_events: number;
  retrying_events: number;
  success_rate: number;
  last_event_at?: string;
}

export interface MostUsedEvent {
  event_name: string;
  event_description: string;
  usage_count: number;
}

export interface SocketEvent {
  id: string;
  company_id: string;
  event_type: string;
  payload: any;
  timestamp: string;
}

// Para compatibilidade com código existente
export interface EventSubscription {
  id: string;
  company_id: string;
  event_type: string;
  event_types?: string[];
  webhook_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const AVAILABLE_EVENT_TYPES = [
  'recording-started',
  'campaign-paused',
  'queue-call-abandoned',
  'agent-logged-out',
  'sms-sent',
  'sms-delivery-confirmed',
  'agent-status-changed',
  'email-opened',
  'contact-created',
  'call-was-transferred',
  'email-sent',
  'campaign-started',
  'contact-deleted',
  'call-history-was-created'
] as const;

export type EventType = typeof AVAILABLE_EVENT_TYPES[number];