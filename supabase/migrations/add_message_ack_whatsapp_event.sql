-- ================================================
-- Migration: Adicionar eventos message-ack-whatsapp e message-error-whatsapp
-- Data: 2026-03-27
-- Descrição: Adiciona eventos de confirmação de leitura/entrega 
--            e erro de mensagens WhatsApp
-- ================================================

-- Inserir evento message-ack-whatsapp
INSERT INTO public.events (
  name,
  display_name,
  created_at,
  updated_at
)
VALUES (
  'message-ack-whatsapp',
  'WhatsApp - Confirmação de Mensagem (ACK)',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Inserir evento message-error-whatsapp
INSERT INTO public.events (
  name,
  display_name,
  created_at,
  updated_at
)
VALUES (
  'message-error-whatsapp',
  'WhatsApp - Erro no Envio de Mensagem',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Verificar se os eventos foram inseridos
SELECT 
  id,
  name,
  display_name,
  created_at
FROM public.events
WHERE name IN ('message-ack-whatsapp', 'message-error-whatsapp')
ORDER BY name;

-- ================================================
-- Informações dos Eventos
-- ================================================

-- 1. message-ack-whatsapp
-- Nome técnico: message-ack-whatsapp
-- Display name: WhatsApp - Confirmação de Mensagem (ACK)
-- Descrição: Disparado quando o status de uma mensagem WhatsApp muda
--            (enviada → entregue → lida)
-- Campos principais:
--   - message.id: ID único da mensagem
--   - message.ack: Status (server, device, read, played)
--   - message.number: Número do destinatário
--   - message.from/to: Remetente e destinatário
-- Identificador único: message.id
-- Categoria: WhatsApp

-- 2. message-error-whatsapp
-- Nome técnico: message-error-whatsapp
-- Display name: WhatsApp - Erro no Envio de Mensagem
-- Descrição: Disparado quando uma mensagem WhatsApp falha ao ser enviada
--            (bloqueio por spam, número inválido, etc)
-- Campos principais:
--   - message.id: ID único da mensagem
--   - message.has_error: true (indica erro)
--   - message.original_error_message: Mensagem de erro original
--   - message.translated_error_message: Mensagem traduzida
--   - message.number: Número do destinatário
--   - message.type: Tipo da mensagem (template, chat, etc)
-- Identificador único: message.id
-- Categoria: WhatsApp
-- ================================================
