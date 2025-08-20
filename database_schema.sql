-- Schema para o Webhook Proxy 3C Plus
-- Execute este SQL no seu banco de dados Supabase

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company_3c_id VARCHAR(255) NOT NULL UNIQUE,
  api_token TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de eventos disponíveis
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relacionamento entre webhooks e eventos (many-to-many)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(webhook_id, event_id)
);

-- Tabela de execuções de webhook
CREATE TABLE IF NOT EXISTS executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  last_attempt TIMESTAMP WITH TIME ZONE,
  next_retry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir eventos padrão baseados na tabela events real do Supabase
INSERT INTO events (name, description) VALUES
  ('recording-started', 'Gravação Iniciada'),
  ('campaign-paused', 'Campanha Pausada'),
  ('queue-call-abandoned', 'Chamada da Fila Abandonada'),
  ('agent-logged-out', 'Agente Deslogado'),
  ('sms-sent', 'SMS Enviado'),
  ('sms-delivery-confirmed', 'Entrega de SMS Confirmada'),
  ('agent-status-changed', 'Status do Agente Alterado'),
  ('email-opened', 'Email Aberto'),
  ('contact-created', 'Contato Criado'),
  ('call-was-transferred', 'Chamada Transferida'),
  ('email-sent', 'Email Enviado'),
  ('campaign-started', 'Campanha Iniciada'),
  ('contact-deleted', 'Contato Deletado'),
  ('call-history-was-created', 'Histórico de Chamada Criado')
ON CONFLICT (name) DO NOTHING;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_3c_id ON companies(company_3c_id);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_company_id ON webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_executions_company_id ON executions(company_id);
CREATE INDEX IF NOT EXISTS idx_executions_webhook_id ON executions(webhook_id);
CREATE INDEX IF NOT EXISTS idx_executions_event_id ON executions(event_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC);

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at 
  BEFORE UPDATE ON webhooks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_executions_updated_at 
  BEFORE UPDATE ON executions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança RLS (Row Level Security)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acesso total (você pode ajustar conforme necessário)
CREATE POLICY "Allow all operations on companies" ON companies
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on events" ON events
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on webhooks" ON webhooks
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on webhook_events" ON webhook_events
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on executions" ON executions
  FOR ALL USING (true);

-- Função para obter eventos mais utilizados
CREATE OR REPLACE FUNCTION get_most_used_events(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  event_name VARCHAR(100),
  event_description TEXT,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.name,
    e.description,
    COUNT(we.id) as usage_count
  FROM events e
  LEFT JOIN webhook_events we ON e.id = we.event_id
  LEFT JOIN webhooks w ON we.webhook_id = w.id
  WHERE e.is_active = true AND (w.is_active = true OR w.is_active IS NULL)
  GROUP BY e.id, e.name, e.description
  ORDER BY usage_count DESC, e.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE companies IS 'Tabela de empresas que utilizam o sistema de webhooks';
COMMENT ON TABLE events IS 'Tabela de tipos de eventos disponíveis no sistema';
COMMENT ON TABLE webhooks IS 'Tabela de URLs de webhooks configuradas por empresa';
COMMENT ON TABLE webhook_events IS 'Tabela de relacionamento entre webhooks e eventos';
COMMENT ON TABLE executions IS 'Tabela de execuções de webhooks com histórico';

COMMENT ON COLUMN companies.company_3c_id IS 'ID único da empresa no sistema 3C Plus';
COMMENT ON COLUMN companies.api_token IS 'Token de API para autenticação com o 3C Plus';
COMMENT ON COLUMN events.name IS 'Nome único do tipo de evento';
COMMENT ON COLUMN webhooks.url IS 'URL do webhook configurada pela empresa';
COMMENT ON COLUMN executions.payload IS 'Dados do evento que foram enviados no webhook';
COMMENT ON COLUMN executions.next_retry IS 'Próxima tentativa de reenvio em caso de falha';
