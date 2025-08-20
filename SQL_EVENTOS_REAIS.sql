-- SQL para inserir os eventos reais da tabela events do Supabase
-- Execute este SQL no seu banco de dados Supabase

-- Inserir eventos baseados na tabela events real do Supabase
INSERT INTO events (name, display_name) VALUES
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

-- Verificar se os eventos foram inseridos
SELECT id, name, display_name FROM events ORDER BY name;
