-- ================================================
-- Migration: Adicionar evento message-ack-whatsapp
-- Data: 2026-03-27
-- Descrição: Adiciona o evento de confirmação de leitura/entrega 
--            de mensagens WhatsApp (ACK status)
-- ================================================

-- Inserir novo evento na tabela events
INSERT INTO public.events (
  uuid,
  name,
  display_name,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'message-ack-whatsapp',
  'WhatsApp - Confirmação de Mensagem (ACK)',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING; -- Evita duplicação se já existir

-- Verificar se o evento foi inserido
SELECT 
  id,
  name,
  display_name,
  created_at
FROM public.events
WHERE name = 'message-ack-whatsapp';

-- ================================================
-- Informações do Evento
-- ================================================
-- Nome técnico: message-ack-whatsapp
-- Display name: WhatsApp - Confirmação de Mensagem (ACK)
-- Descrição: Disparado quando o status de uma mensagem WhatsApp muda
--            (enviada → entregue → lida)
-- 
-- Campos principais do payload:
-- - message.id: ID único da mensagem
-- - message.ack: Status (server, device, read, played)
-- - message.number: Número do destinatário
-- - message.from: Remetente
-- - message.to: Destinatário
-- - message.body: Corpo da mensagem
-- - message.agent: Dados do agente que enviou
-- - message.instance: Dados da instância WhatsApp
-- 
-- Identificador único: message.id
-- Categoria: WhatsApp
-- ================================================
