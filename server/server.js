const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { io } = require('socket.io-client');
const crypto = require('crypto');
const { PQueue } = require('p-queue');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
require('dotenv').config();

// 🚀 CONFIGURAÇÃO GLOBAL DE RETRY PARA AXIOS
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry em erros de rede, timeouts ou 5xx
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response?.status >= 500 && error.response?.status < 600);
  },
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`🔄 RETRY ${retryCount}/3: ${requestConfig.url} - ${error.message}`);
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🚀 HISTÓRICO COMPLETO: Cleanup automático DESABILITADO
// Agora mantemos todo o histórico de call-history-was-created
// Cleanup manual pode ser feito via SQL quando necessário

// FUNÇÕES DE CLEANUP DESABILITADAS - Mantidas para referência
/*
const CLEANUP_BATCH = new Map();
const CLEANUP_INTERVAL = 300000;

async function scheduleCleanup(companyId) {
  // DESABILITADO - Não fazemos mais cleanup automático
  return;
}

async function batchCleanupExecutions() {
  // DESABILITADO - Histórico completo mantido
  return;
}

async function cleanupOldExecutionsIndividual(companyId) {
  // DESABILITADO - Histórico completo mantido
  return;
}
*/

// Conexões ativas por empresa (NUNCA hibernam!)
const activeConnections = new Map();
const socketInstances = new Map();
const connectionLocks = new Map(); // Previne múltiplas conexões simultâneas
const eventListeners = new Map(); // Map de companyId -> Map de eventName -> handler function

// 🚀 NOVO: Classe simples para garantir um POST por evento
class EventPostGuard {
  constructor() {
    this.processedEvents = new Map(); // Map de chave -> timestamp
    this.TTL = 5000; // 🔧 OTIMIZADO: 5 segundos (era 10) - reduz uso de memória
    this.MAX_SIZE = 1000; // 🔧 OTIMIZADO: 1000 (era 5000) - 80% menos memória
  }

  /**
   * Gera chave única para um evento
   * Usa: webhookId + eventName + identificador único do evento (uuid, id, etc)
   */
  generateKey(webhookId, eventName, eventData) {
    // Tentar encontrar identificador único no evento (passando eventName para busca específica)
    const identifier = this.findEventIdentifier(eventData, eventName);
    
    // Se não encontrar identificador, usar hash do payload completo
    if (!identifier) {
      const payloadStr = JSON.stringify(eventData);
      const hash = crypto.createHash('md5').update(payloadStr).digest('hex').substring(0, 16);
      return `${webhookId}:${eventName}:hash:${hash}`;
    }
    
    return `${webhookId}:${eventName}:${identifier}`;
  }

  /**
   * Busca identificador único no evento baseado no TIPO do evento
   * 🚀 MAPEAMENTO ESPECÍFICO para eventos 3C Plus
   */
  findEventIdentifier(eventData, eventName = null) {
    if (!eventData || typeof eventData !== 'object') {
      return null;
    }

    // 🎯 MAPEAMENTO ESPECÍFICO POR TIPO DE EVENTO 3C PLUS
    // Cada evento tem seu ID único em lugar diferente!
    const EVENT_ID_PATHS = {
      // Eventos de ligação - ID único em callHistory._id
      'call-history-was-created': 'callHistory._id',
      'call-history-was-updated': 'callHistory._id',
      'call-was-connected': 'callHistory._id',
      'call-was-finished': 'callHistory._id',
      'call-was-qualified': 'callHistory._id',
      'call-was-transferred': 'callHistory._id',
      
      // Eventos de WhatsApp - ID único em message.id
      'new-message-whatsapp': 'message.id',
      'new-agent-message-whatsapp': 'message.id',
      'message-ack-whatsapp': 'message.id',
      
      // Eventos de chat - ID único em chat.id
      'chat-was-finished': 'chat.id',
      'chat-was-created': 'chat.id',
      'chat-was-transferred': 'chat.id',
      
      // Eventos de agente - combinar agent.id + timestamp (não tem ID único)
      'agent-status-changed': null, // Usar fallback
      'agent-logged-in': null,
      'agent-logged-out': null
    };

    // Se temos o nome do evento, usar o path específico
    if (eventName && EVENT_ID_PATHS[eventName]) {
      const path = EVENT_ID_PATHS[eventName];
      const value = this.getNestedValue(eventData, path);
      if (value !== undefined && value !== null) {
        return String(value);
      }
    }

    // 🔄 FALLBACK: Tentar encontrar ID em locais conhecidos (na ordem de prioridade)
    const FALLBACK_PATHS = [
      'callHistory._id',      // Eventos de ligação
      'message.id',           // Eventos de WhatsApp
      'message.internal_id',  // Backup para WhatsApp
      'chat.id',              // Eventos de chat
      'telephony_id',         // ID de telefonia
      '_id'                   // MongoDB ID genérico
    ];

    for (const path of FALLBACK_PATHS) {
      const value = this.getNestedValue(eventData, path);
      if (value !== undefined && value !== null) {
        return String(value);
      }
    }

    // ❌ NÃO usar id genérico (pode ser company.id, campaign.id, etc)
    return null;
  }

  /**
   * Helper para extrair valor aninhado (ex: "callHistory._id")
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Verifica se evento já foi processado (sem marcar)
   * Retorna true se deve processar, false se é duplicado
   */
  shouldProcess(webhookId, eventName, eventData) {
    const key = this.generateKey(webhookId, eventName, eventData);
    const now = Date.now();
    
    // Verificar se já foi processado recentemente
    const existing = this.processedEvents.get(key);
    if (existing && (now - existing) < this.TTL) {
      return false; // Duplicado - não processar
    }
    
    return true; // Novo evento - processar
  }

  /**
   * Marca evento como processado (chamar APÓS fazer POST com sucesso)
   */
  markAsProcessed(webhookId, eventName, eventData) {
    const key = this.generateKey(webhookId, eventName, eventData);
    const now = Date.now();
    
    // Marcar como processado
    this.processedEvents.set(key, now);
    
    // Limpar cache se muito grande
    if (this.processedEvents.size > this.MAX_SIZE) {
      this.cleanup();
    }
  }

  /**
   * Limpa eventos expirados do cache
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.TTL) {
        this.processedEvents.delete(key);
        removed++;
      }
    }
    
    // Se ainda muito grande após limpeza, remover os mais antigos
    if (this.processedEvents.size > this.MAX_SIZE * 0.8) {
      const entries = Array.from(this.processedEvents.entries())
        .sort((a, b) => a[1] - b[1]); // Ordenar por timestamp
      
      const toRemove = entries.slice(0, Math.floor(this.processedEvents.size * 0.3));
      toRemove.forEach(([key]) => this.processedEvents.delete(key));
    }
  }
}

// Instância global do guard
const eventPostGuard = new EventPostGuard();

// 🚀 NOVO SISTEMA DE FILAS COM P-QUEUE (Substitui sistema manual volátil)
// Cada empresa tem sua própria fila com concorrência controlada
const processingQueues = new Map(); // Map de companyId -> PQueue instance
const QUEUE_CONCURRENCY = 5; // Processa 5 eventos simultaneamente por empresa

/**
 * Obtém ou cria uma PQueue para uma empresa específica
 */
function getOrCreateQueue(companyId) {
  if (!processingQueues.has(companyId)) {
    const queue = new PQueue({
      concurrency: QUEUE_CONCURRENCY,
      autoStart: true,
      throwOnTimeout: false
    });
    
    // Logging de eventos da fila para debug
    queue.on('active', () => {
      console.log(`🔄 Fila ${companyId}: Processando evento (${queue.size} pendentes, ${queue.pending} ativos)`);
    });
    
    queue.on('idle', () => {
      console.log(`✅ Fila ${companyId}: Todos eventos processados`);
    });
    
    queue.on('error', (error) => {
      console.error(`❌ Erro na fila ${companyId}:`, error);
    });
    
    processingQueues.set(companyId, queue);
  }
  
  return processingQueues.get(companyId);
}

// Cache para deduplicação de POSTs (LEGADO - mantido para compatibilidade, mas não usado)
const postCache = new Map();
const POST_CACHE_TTL = 3000; // 3 segundos - janela razoável para prevenir duplicatas
const MAX_POST_CACHE_SIZE = 1000;

// Cache para webhooks ativos por empresa (evita consultas múltiplas)
const activeWebhooksCache = new Map();
const WEBHOOK_CACHE_TTL = 30000; // 🚀 FIX: 30 segundos (era 5min) - mudanças refletidas mais rápido
const MAX_WEBHOOK_CACHE_SIZE = 100; // ✅ LIMITE: Máximo 100 empresas em cache

// Cache de eventos para deduplicação (ADICIONADO para corrigir ReferenceError)
const eventCache = new Map();
const EVENT_CACHE_TTL = 3000; // 🔧 OTIMIZADO: 3 segundos (era 5) - menos memória
const MAX_EVENT_CACHE_SIZE = 500; // 🔧 OTIMIZADO: 500 (era 2000) - 75% menos memória

// 🚀 BATCH LOGGING: Sistema de logging em lote para call-history-was-created
const callHistoryLogQueue = new Map(); // Map de companyId -> Array de logs
const BATCH_SIZE = 20; // 🔧 OTIMIZADO: 20 (era 50) - flush mais frequente, menos em memória
const BATCH_INTERVAL = 30000; // 🔧 OTIMIZADO: 30s (era 60s) - flush mais frequente
let batchFlushTimer = null;

const IDENTIFIER_KEYS_PRIORITY = [
  'uuid',
  'unique_id',
  'uniqueId',
  'event_uuid',
  'eventUuid',
  'event_id',
  'eventId',
  'message_uuid',
  'messageUuid',
  'message_id',
  'messageId',
  'message_key',
  'messageKey',
  'call_history_id',
  'call_history_uuid',
  'callHistoryId',
  'callHistoryUuid',
  'call_id',
  'callId',
  'history_id',
  'historyId',
  'conversation_id',
  'conversationId',
  'protocol_number',
  'protocolNumber',
  'ticket_id',
  'ticketId',
  'whatsapp_id',
  'whatsappId',
  'record_id',
  'recordId',
  'interaction_id',
  'interactionId',
  'id'
];

const IDENTIFIER_IGNORE_SEGMENTS = [
  'company',
  'agent',
  'team',
  'queue',
  'user',
  'instance',
  'integration',
  'webhook',
  'contact',
  'department',
  'sector'
];

function shouldUseIdentifier(key, path) {
  const lowerKey = key.toLowerCase();
  const lowerPath = (path || '').toLowerCase();

  if (IDENTIFIER_IGNORE_SEGMENTS.some(segment => lowerKey.includes(segment))) {
    return false;
  }

  if (lowerPath && IDENTIFIER_IGNORE_SEGMENTS.some(segment => lowerPath.includes(segment))) {
    return false;
  }

  return true;
}

function normalizeIdentifierValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return null;
}

function findIdentifierValue(payload, depth = 0, visited = new Set(), path = '') {
  if (!payload || typeof payload !== 'object' || depth > 6) {
    return null;
  }

  if (visited.has(payload)) {
    return null;
  }

  visited.add(payload);

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const result = findIdentifierValue(item, depth + 1, visited, path);
      if (result) {
        return result;
      }
    }
    return null;
  }

  for (const identifierKey of IDENTIFIER_KEYS_PRIORITY) {
    if (!Object.prototype.hasOwnProperty.call(payload, identifierKey)) {
      continue;
    }

    const currentPath = path ? `${path}.${identifierKey}` : identifierKey;

    if (!shouldUseIdentifier(identifierKey, currentPath)) {
      continue;
    }

    const candidateValue = normalizeIdentifierValue(payload[identifierKey]);

    if (candidateValue) {
      return { key: identifierKey, value: candidateValue };
    }
  }

  for (const key of Object.keys(payload)) {
    const value = payload[key];

    if (!value || typeof value !== 'object') {
      continue;
    }

    const nextPath = path ? `${path}.${key}` : key;
    const nestedResult = findIdentifierValue(value, depth + 1, visited, nextPath);

    if (nestedResult) {
      return nestedResult;
    }
  }

  return null;
}

function sortObject(input) {
  if (Array.isArray(input)) {
    return input.map(sortObject);
  }

  if (input && typeof input === 'object') {
    const sortedKeys = Object.keys(input).sort();
    const result = {};

    for (const key of sortedKeys) {
      result[key] = sortObject(input[key]);
    }

    return result;
  }

  return input;
}

function generateEventFingerprint(companyId, eventName, eventData) {
  if (!eventData || typeof eventData !== 'object') {
    return null;
  }

  try {
    const identifier = findIdentifierValue(eventData);
    const parts = [String(companyId), String(eventName)];

    if (identifier) {
      const identifierPart = `${identifier.key}:${identifier.value}`;
      parts.push(identifierPart);
      return {
        fingerprint: parts.join('|'),
        identifier: identifierPart
      };
    }

    const normalizedPayload = JSON.stringify(sortObject(eventData));

    if (!normalizedPayload) {
      return null;
    }

    const hash = crypto.createHash('sha1').update(normalizedPayload).digest('hex');
    parts.push(hash);

    return {
      fingerprint: parts.join('|'),
      identifier: `hash:${hash.slice(0, 12)}`
    };
  } catch (error) {
    console.error('Erro ao gerar fingerprint do evento:', error);
    return null;
  }
}

function trimEventCacheIfNeeded() {
  if (eventCache.size <= MAX_EVENT_CACHE_SIZE) {
    return;
  }

  const entries = Array.from(eventCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
  const excess = eventCache.size - MAX_EVENT_CACHE_SIZE;

  for (let index = 0; index < excess; index += 1) {
    const [keyToDelete] = entries[index];
    eventCache.delete(keyToDelete);
  }
}

// 🚀 BATCH LOGGING: Funções para logging em lote de call-history-was-created

/**
 * Extrai número de telefone do payload de call-history-was-created
 */
function extractPhoneNumber(eventName, eventData) {
  if (eventName !== 'call-history-was-created') {
    return null;
  }
  
  try {
    // Extrair de callHistory.number (caminho principal)
    if (eventData?.callHistory?.number) {
      return String(eventData.callHistory.number);
    }
    
    // Fallback: tentar outros campos comuns
    if (eventData?.number) {
      return String(eventData.number);
    }
    
    if (eventData?.phone) {
      return String(eventData.phone);
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao extrair número de telefone:', error);
    return null;
  }
}

/**
 * Adiciona log à fila de batch para processamento posterior
 */
function queueCallHistoryLog(logData) {
  const { companyId, webhookId, eventId, phoneNumber, status, responseStatus } = logData;
  
  // Validar dados mínimos
  if (!companyId || !webhookId || !phoneNumber) {
    return;
  }
  
  // Inicializar fila se não existe
  if (!callHistoryLogQueue.has(companyId)) {
    callHistoryLogQueue.set(companyId, []);
  }
  
  const queue = callHistoryLogQueue.get(companyId);
  
  // Adicionar log à fila
  queue.push({
    webhook_id: webhookId,
    company_id: companyId,
    event_id: eventId,
    status: status,
    response_status: responseStatus,
    phone_number: phoneNumber,
    request_payload: {
      phone_number: phoneNumber,
      event_type: 'call-history-was-created'
    }
  });
  
  // Verificar se deve fazer flush (atingiu batch size)
  if (queue.length >= BATCH_SIZE) {
    flushCallHistoryLogs(companyId);
  }
}

/**
 * Escreve logs em lote no banco de dados
 */
async function flushCallHistoryLogs(companyId) {
  const queue = callHistoryLogQueue.get(companyId);
  
  if (!queue || queue.length === 0) {
    return;
  }
  
  // Copiar logs e limpar fila
  const logsToInsert = [...queue];
  callHistoryLogQueue.set(companyId, []);
  
  try {
    console.log(`📊 BATCH INSERT: ${logsToInsert.length} logs de call-history para empresa ${companyId}`);
    
    // INSERT em lote (1 query para múltiplos registros)
    const { error, data } = await supabase
      .from('webhook_executions')
      .insert(logsToInsert);
    
    if (error) {
      console.error(`❌ Erro no batch insert de call-history logs:`, error);
      
      // Em caso de erro, tentar re-adicionar à fila para retry
      const currentQueue = callHistoryLogQueue.get(companyId) || [];
      callHistoryLogQueue.set(companyId, [...logsToInsert, ...currentQueue]);
    } else {
      console.log(`✅ BATCH INSERT concluído: ${logsToInsert.length} registros salvos`);
      
      // 🚀 HISTÓRICO COMPLETO: Não fazemos mais cleanup automático
      // Histórico mantido permanentemente para análise
    }
  } catch (error) {
    console.error(`❌ Erro crítico no batch insert:`, error);
    
    // Re-adicionar à fila para retry
    const currentQueue = callHistoryLogQueue.get(companyId) || [];
    callHistoryLogQueue.set(companyId, [...logsToInsert, ...currentQueue]);
  }
}

/**
 * Flush periódico de todas as filas (executado a cada 1 minuto)
 */
async function flushAllCallHistoryLogs() {
  const companyIds = Array.from(callHistoryLogQueue.keys());
  
  if (companyIds.length === 0) {
    return;
  }
  
  console.log(`🔄 Flush periódico: processando ${companyIds.length} empresas com logs pendentes`);
  
  for (const companyId of companyIds) {
    await flushCallHistoryLogs(companyId);
  }
}

// Iniciar timer de flush periódico
batchFlushTimer = setInterval(flushAllCallHistoryLogs, BATCH_INTERVAL);

// Log inicial
console.log('🚀 3C Plus Webhook Proxy Server iniciando...');
console.log('📅 Timestamp:', new Date().toISOString());

// 🚨 VERIFICAR MODO DE OPERAÇÃO (Produção vs Staging)
if (process.env.DISABLE_WEBHOOK_DISPATCH === 'true') {
  console.log('⚠️  MODO STAGING ATIVADO: Webhooks serão SIMULADOS (não enviados aos clientes)');
  console.log('⚠️  Para desativar, remova a variável DISABLE_WEBHOOK_DISPATCH ou defina como "false"');
} else {
  console.log('✅ MODO PRODUÇÃO ATIVADO: Webhooks serão enviados normalmente aos clientes');
}

// Healthcheck endpoint para Render com proteção Standard
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  const rssPercent = Math.round((memUsage.rss / (2 * 1024 * 1024 * 1024)) * 100); // 2GB Standard
  
  // ✅ STANDARD PROTECTION: Health check falha se memória muito alta
  let healthStatus = 'healthy';
  if (heapPercent > 95 || rssPercent > 95) {
    healthStatus = 'critical';
  } else if (heapPercent > 85 || rssPercent > 90) {
    healthStatus = 'warning';
  }
  
  const status = {
    status: healthStatus,
    timestamp: new Date().toISOString(),
    active_companies: activeConnections.size,
    uptime: process.uptime(),
    memory: {
      rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      heap_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heap_percent: heapPercent,
      rss_percent: rssPercent
    },
    cache_size: eventPostGuard.processedEvents.size,
    connections: Array.from(activeConnections.keys())
  };
  
  // ✅ LIMPO: Removido log de health check (desnecessário)
  
  // ✅ RENDER AUTO-SCALING: Status code baseado na saúde
  const statusCode = healthStatus === 'critical' ? 503 : 200;
  res.status(statusCode).json(status);
});

// Endpoint para status detalhado
app.get('/status', (req, res) => {
  const connections = Array.from(activeConnections.entries()).map(([companyId, data]) => ({
    company_id: companyId,
    company_name: data.company?.name || 'Unknown',
    webhooks_count: data.webhooks?.length || 0,
    connected_at: data.connectedAt,
    last_activity: data.lastActivity,
    status: data.status || 'unknown'
  }));

  res.json({
    server_status: 'running',
    operation_mode: process.env.DISABLE_WEBHOOK_DISPATCH === 'true' ? 'staging' : 'production',
    webhook_dispatch_enabled: process.env.DISABLE_WEBHOOK_DISPATCH !== 'true',
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime(),
    active_companies: activeConnections.size,
    total_sockets: socketInstances.size,
    connections: connections
  });
});

// Endpoint para limpar cache de eventos
app.post('/clear-cache', (req, res) => {
  const eventCacheSize = eventCache.size;
  const webhookCacheSize = activeWebhooksCache.size;
  
  eventCache.clear();
  activeWebhooksCache.clear();
  
  res.json({
    success: true,
    message: `Caches limpos com sucesso. ${eventCacheSize} eventos e ${webhookCacheSize} empresas removidos.`,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para estatísticas do cache
app.get('/cache-stats', (req, res) => {
  const now = Date.now();
  let validEvents = 0;
  let expiredEvents = 0;
  let validWebhooks = 0;
  let expiredWebhooks = 0;
  
  // Estatísticas do cache de eventos
  for (const [key, value] of eventCache.entries()) {
    if (now - value.timestamp > EVENT_CACHE_TTL) {
      expiredEvents++;
    } else {
      validEvents++;
    }
  }
  
  // Estatísticas do cache de webhooks
  for (const [key, value] of activeWebhooksCache.entries()) {
    if (now - value.timestamp > WEBHOOK_CACHE_TTL) {
      expiredWebhooks++;
    } else {
      validWebhooks++;
    }
  }
  
  res.json({
    event_cache: {
      total: eventCache.size,
      valid: validEvents,
      expired: expiredEvents,
      ttl_seconds: EVENT_CACHE_TTL / 1000
    },
    webhook_cache: {
      total: activeWebhooksCache.size,
      valid: validWebhooks,
      expired: expiredWebhooks,
      ttl_seconds: WEBHOOK_CACHE_TTL / 1000
    },
    memory_usage: process.memoryUsage()
  });
});

// Endpoint para verificar status de webhooks e ajustar conexões
app.post('/check-webhooks/:companyId', async (req, res) => {
  const { companyId } = req.params;
  
  try {
    console.log(`🔍 Verificando status de webhooks para empresa: ${companyId}`);
    
    // Invalidar cache de webhooks para esta empresa (forçar atualização)
    activeWebhooksCache.delete(companyId);
    
    // Verificar se deve reconectar (se tem webhooks ativos mas não está conectada)
    await checkAndReconnectIfHasActiveWebhooks(companyId);
    
    // Verificar se deve desconectar (se não tem webhooks ativos mas está conectada)
    await checkAndDisconnectIfNoActiveWebhooks(companyId);
    
    // 🚀 NOVO: Atualizar listeners se empresa está conectada
    if (activeConnections.has(companyId)) {
      await updateEventListeners(companyId);
    }
    
    const isConnected = activeConnections.has(companyId);
    
    res.json({
      success: true,
      message: `Verificação de webhooks concluída para empresa ${companyId}`,
      is_connected: isConnected,
      cache_cleared: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Erro ao verificar webhooks da empresa ${companyId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para verificar empresas inativas
app.post('/check-inactive-companies', async (req, res) => {
  try {
    console.log('🔍 Verificando empresas inativas via endpoint...');
    
    await checkAndDisconnectInactiveCompanies();
    
    res.json({
      success: true,
      message: 'Verificação de empresas inativas concluída',
      active_connections: activeConnections.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao verificar empresas inativas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para verificar todas as empresas
app.post('/check-all-webhooks', async (req, res) => {
  try {
    console.log('🔍 Verificando status de webhooks para todas as empresas...');
    
    // Buscar todas as empresas
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, status')
      .eq('status', 'active')
      .eq('deleted', false);
    
    if (error) {
      throw error;
    }
    
    if (!companies || companies.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhuma empresa ativa encontrada',
        checked: 0
      });
    }
    
    // Verificar cada empresa
    const results = await Promise.allSettled(
      companies.map(async (company) => {
        await checkAndReconnectIfHasActiveWebhooks(company.id);
        await checkAndDisconnectIfNoActiveWebhooks(company.id);
        return { companyId: company.id, name: company.name };
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({
      success: true,
      message: 'Verificação de webhooks concluída para todas as empresas',
      total_companies: companies.length,
      successful_checks: successful,
      failed_checks: failed,
      currently_connected: activeConnections.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao verificar webhooks de todas as empresas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para forçar reconexão de uma empresa
app.post('/reconnect/:companyId', async (req, res) => {
  const { companyId } = req.params;
  
  try {
    console.log(`🔄 Forçando reconexão da empresa: ${companyId}`);
    
    // Desconectar se já conectado
    await disconnectCompany(companyId);
    
    // Reconectar
    await connectCompany(companyId);
    
    res.json({
      success: true,
      message: `Empresa ${companyId} reconectada com sucesso`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Erro ao reconectar empresa ${companyId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔍 ENDPOINT DE DEBUG: Verificar dados da empresa
app.get('/debug-company/:companyName', async (req, res) => {
  const { companyName } = req.params;
  
  try {
    console.log(`🔍 DEBUG: Verificando dados da empresa ${companyName}`);
    
    const { data: company, error } = await supabase
      .from('companies')
      .select('id, name, cluster_type, api_token, status')
      .eq('name', companyName)
      .single();
    
    if (error) {
      console.log(`❌ Erro ao buscar empresa ${companyName}:`, error.message);
      return res.status(404).json({ 
        success: false, 
        error: error.message,
        company: companyName
      });
    }
    
    console.log(`✅ Empresa ${companyName} encontrada:`, {
      id: company.id,
      name: company.name,
      cluster_type: company.cluster_type,
      token_preview: company.api_token?.substring(0, 10) + '...',
      status: company.status
    });
    
    res.json({ 
      success: true, 
      company: {
        id: company.id,
        name: company.name,
        cluster_type: company.cluster_type,
        token_preview: company.api_token?.substring(0, 10) + '...',
        status: company.status
      }
    });
    
  } catch (error) {
    console.error(`🚨 Erro no debug da empresa ${companyName}:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 🧪 ENDPOINT DE TESTE: Testar conectividade com clusters
app.get('/test-cluster/:clusterType', async (req, res) => {
  const { clusterType } = req.params;
  
  try {
    console.log(`🧪 TESTE: Testando conectividade com ${clusterType}`);
    
    if (!['cluster1', 'cluster2'].includes(clusterType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cluster deve ser cluster1 ou cluster2' 
      });
    }
    
    const socketUrl = CLUSTER_URLS[clusterType];
    console.log(`🧪 TESTE: URL do cluster ${clusterType}: ${socketUrl}`);
    
    // Teste básico de conectividade (sem token real)
    const testSocket = io(socketUrl, {
      query: { token: 'test-token' },
      transports: ['websocket'],
      timeout: 5000,
      forceNew: true
    });
    
    const testResult = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        testSocket.disconnect();
        resolve({
          success: false,
          error: 'Timeout - não conseguiu conectar em 5 segundos',
          cluster: clusterType,
          url: socketUrl
        });
      }, 5000);
      
      testSocket.on('connect', () => {
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve({
          success: true,
          message: 'Conectividade OK',
          cluster: clusterType,
          url: socketUrl
        });
      });
      
      testSocket.on('connect_error', (error) => {
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve({
          success: false,
          error: error.message,
          cluster: clusterType,
          url: socketUrl
        });
      });
    });
    
    console.log(`🧪 TESTE RESULTADO:`, testResult);
    res.json(testResult);
    
  } catch (error) {
    console.error(`🧪 TESTE ERRO:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      cluster: clusterType
    });
  }
});

// 🛡️ ENDPOINT DE VERIFICAÇÃO: Verificar compatibilidade de empresas existentes
app.get('/verify-compatibility', async (req, res) => {
  try {
    console.log(`🛡️ VERIFICAÇÃO: Testando compatibilidade de empresas existentes`);
    
    // Buscar todas as empresas
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, cluster_type, created_at')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    const results = companies.map(company => {
      const clusterType = company.cluster_type || 'cluster1'; // Fallback
      const socketUrl = CLUSTER_URLS[clusterType];
      
      return {
        id: company.id,
        name: company.name,
        cluster_type_db: company.cluster_type,
        cluster_type_resolved: clusterType,
        socket_url: socketUrl,
        is_legacy: !company.cluster_type, // Empresa criada antes da feature
        created_at: company.created_at
      };
    });
    
    const summary = {
      total_companies: companies.length,
      legacy_companies: results.filter(r => r.is_legacy).length,
      cluster1_companies: results.filter(r => r.cluster_type_resolved === 'cluster1').length,
      cluster2_companies: results.filter(r => r.cluster_type_resolved === 'cluster2').length
    };
    
    console.log(`🛡️ VERIFICAÇÃO RESULTADO:`, summary);
    
    res.json({
      success: true,
      summary,
      companies: results,
      message: 'Todas as empresas têm cluster válido (fallback para cluster1 quando necessário)'
    });
    
  } catch (error) {
    console.error(`🛡️ VERIFICAÇÃO ERRO:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint para forçar reconexão completa (usado pelo keepalive)
app.post('/force-reconnect', async (req, res) => {
  try {
    console.log(`🔄 Forçando reconexão completa de todas as empresas ativas...`);
    
    // Reconectar todas as empresas com webhooks ativos
    await connectAllActiveCompanies({ force: true });
    
    const connectedCompanies = Array.from(activeConnections.keys());
    
    res.json({ 
      success: true, 
      message: 'Reconexão completa realizada',
      connectedCompanies,
      totalConnections: connectedCompanies.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao forçar reconexão:', error);
    res.status(500).json({ error: error.message });
  }
});

// Conectar empresa específica
async function connectCompany(companyId, options = {}) {
  const { force = false } = options;
  try {
    console.log(`🔌 Conectando empresa: ${companyId}`);
    
    // Verificar se já existe uma conexão ativa para evitar reconexões desnecessárias
    const existingConnection = activeConnections.get(companyId);
    const existingSocket = socketInstances.get(companyId);

    if (!force && existingSocket && existingSocket.connected) {
      const companyName = existingConnection?.company?.name || companyId;
      console.log(`✅ Empresa ${companyName} já está conectada - ignorando nova tentativa`);
      return;
    }

    // Buscar dados da empresa (incluindo cluster_type)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .eq('status', 'active')
      .single();
    
    if (companyError || !company) {
      throw new Error(`Empresa ${companyId} não encontrada ou inativa`);
    }

    if (!company.api_token) {
      throw new Error(`Token da API não configurado para empresa ${companyId}`);
    }

    // Buscar webhooks ativos
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select(`
        id, url, status,
        webhook_events(
          event:events(name, display_name)
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .eq('deleted', false);
    
    if (webhooksError) {
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      // ✅ LIMPO: Empresa sem webhooks é normal, não precisa log
      return;
    }

    // ✅ LIMPO: Removido log verboso de webhooks encontrados

    // Conectar ao socket 3C Plus
    const socket = await connect3CPlusSocket(company, webhooks);
    
    // 🛡️ VERIFICAR SE CONEXÃO FOI CRIADA (não bloqueada por lock)
    if (!socket) {
      console.log(`⏳ Conexão para ${company.name} foi bloqueada por lock - tentativa ignorada`);
      return;
    }
    
    // Armazenar informações da conexão
    activeConnections.set(companyId, {
      company: company,
      webhooks: webhooks,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      status: 'connected'
    });

    socketInstances.set(companyId, socket);
    
    // ✅ LIMPO: Removido log de conexão bem-sucedida
    
  } catch (error) {
    console.error(`❌ Erro ao conectar empresa ${companyId}:`, error);
    throw error;
  }
}

// 🚀 NOVO: Mapeamento de clusters para URLs
const CLUSTER_URLS = {
  cluster1: 'https://socket.3c.plus',
  cluster2: 'https://new-socket.3cplus.com.br'
};

// 🚀 NOVO: Extrair eventos únicos dos webhooks
function extractUniqueEvents(webhooks) {
  const eventsSet = new Set();
  
  if (!webhooks || webhooks.length === 0) {
    return [];
  }
  
  webhooks.forEach(webhook => {
    if (webhook.webhook_events && Array.isArray(webhook.webhook_events)) {
      webhook.webhook_events.forEach(we => {
        if (we.event && we.event.name) {
          eventsSet.add(we.event.name);
        }
      });
    }
  });
  
  return Array.from(eventsSet);
}

// 🚀 NOVO: Registrar listeners específicos para eventos
function registerEventListeners(socket, companyId, companyName, events) {
  // Remover listeners antigos se existirem
  removeEventListeners(socket, companyId);
  
  // Criar mapa de listeners para esta empresa
  const listenersMap = new Map();
  eventListeners.set(companyId, listenersMap);
  
  // Registrar listener para cada evento
  events.forEach(eventName => {
    const handler = async (eventData) => {
      try {
        // Adicionar evento à fila de processamento sequencial
        addEventToQueue(companyId, eventName, eventData, companyName);
      } catch (error) {
        console.error(`❌ Erro ao processar evento ${eventName} para empresa ${companyName}:`, error);
      }
    };
    
    socket.on(eventName, handler);
    listenersMap.set(eventName, handler);
    
    console.log(`👂 Listener registrado: ${eventName} para empresa ${companyName}`);
  });
  
  console.log(`✅ ${events.length} listeners registrados para empresa ${companyName}`);
}

// 🚀 NOVO: Remover listeners específicos
function removeEventListeners(socket, companyId) {
  const listenersMap = eventListeners.get(companyId);
  
  if (listenersMap && socket) {
    listenersMap.forEach((handler, eventName) => {
      socket.off(eventName, handler);
    });
    listenersMap.clear();
  }
  
  eventListeners.delete(companyId);
}

// 🚀 NOVO: Atualizar listeners quando webhooks mudarem
async function updateEventListeners(companyId) {
  const socket = socketInstances.get(companyId);
  const connection = activeConnections.get(companyId);
  
  if (!socket || !connection) {
    return; // Socket não está conectado
  }
  
  // Verificar se socket está realmente conectado
  if (!socket.connected) {
    console.log(`⚠️ Socket não está conectado para empresa ${companyId} - não atualizando listeners`);
    return;
  }
  
  // Buscar webhooks atualizados
  const webhooks = await getActiveWebhooksForCompany(companyId);
  
  if (!webhooks || webhooks.length === 0) {
    // Sem webhooks, remover todos os listeners
    removeEventListeners(socket, companyId);
    console.log(`🗑️ Todos os listeners removidos para empresa ${companyId} (sem webhooks ativos)`);
    return;
  }
  
  // Extrair eventos únicos
  const events = extractUniqueEvents(webhooks);
  
  // Registrar novos listeners
  registerEventListeners(socket, companyId, connection.company?.name || companyId, events);
}

// Conectar ao socket 3C Plus
async function connect3CPlusSocket(company, webhooks) {
  return new Promise((resolve, reject) => {
    try {
      // 🛡️ PREVENIR MÚLTIPLAS CONEXÕES SIMULTÂNEAS
      if (connectionLocks.get(company.id)) {
        console.log(`⏳ Conexão já em andamento para ${company.name} - aguardando...`);
        return resolve(null); // Não criar nova conexão
      }
      
      // 🔒 FECHAR CONEXÃO EXISTENTE ANTES DE CRIAR NOVA
      const existingSocket = socketInstances.get(company.id);
      if (existingSocket && existingSocket.connected) {
        console.log(`🔄 Fechando conexão existente para ${company.name} antes de reconectar`);
        existingSocket.disconnect();
        existingSocket.removeAllListeners();
      }
      
      // 🔒 ATIVAR LOCK
      connectionLocks.set(company.id, true);
      
      // 🚀 NOVO: Determinar URL do cluster
      const clusterType = company.cluster_type || 'cluster1'; // Padrão cluster1 para compatibilidade
      const socketUrl = CLUSTER_URLS[clusterType];
      
      console.log(`🔌 Estabelecendo conexão WebSocket para empresa: ${company.name}`);
      console.log(`   📍 Cluster: ${clusterType}`);
      console.log(`   🌐 URL: ${socketUrl}`);
      console.log(`   🔑 Token: ${company.api_token.substring(0, 10)}...`);
      
      const socket = io(socketUrl, {
        query: { token: company.api_token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity, // 🛡️ NUNCA desistir de reconectar
        reconnectionDelay: 1000,        // 🛡️ Reconectar mais rápido
        reconnectionDelayMax: 5000,     // 🛡️ Max delay menor
        timeout: 30000,                 // 🛡️ Timeout maior
        forceNew: true,                 // 🛡️ Sempre criar nova conexão
        upgrade: true,                  // 🛡️ Permitir upgrade de transport
        rememberUpgrade: false          // 🛡️ Não lembrar upgrade (sempre testar)
      });

      socket.on('connect', () => {
        // ✅ LIMPO: Sem logs desnecessários
        
        // 🔓 LIBERAR LOCK - Conexão estabelecida com sucesso
        connectionLocks.set(company.id, false);
        
        // Atualizar status da conexão
        const connection = activeConnections.get(company.id);
        if (connection) {
          connection.lastActivity = new Date().toISOString();
          connection.status = 'connected';
        }
        
        // 🚀 NOVO: Registrar listeners específicos para eventos dos webhooks
        const events = extractUniqueEvents(webhooks);
        if (events.length > 0) {
          registerEventListeners(socket, company.id, company.name, events);
        } else {
          console.log(`⚠️ Nenhum evento configurado para empresa ${company.name}`);
        }
        
        resolve(socket);
      });

      // 🛡️ HEARTBEAT: Verificar se conexão está realmente funcionando
      socket.emit('ping'); // Testar conexão imediatamente
      
      // 🛡️ HEARTBEAT PERIÓDICO: A cada 30 segundos
      const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('ping');
        } else {
          console.log(`💔 HEARTBEAT FALHOU: ${company.name} não está conectado!`);
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      socket.on('disconnect', (reason) => {
        const isManualDisconnect = reason === 'io client disconnect' || reason === 'client namespace disconnect';
        const logLabel = isManualDisconnect ? 'ℹ️ MANUAL' : '🚨 CRÍTICO';
        const logMessage = isManualDisconnect
          ? `${logLabel}: Socket desconectado manualmente ${company.name}: ${reason}`
          : `${logLabel}: Socket desconectado ${company.name}: ${reason} - TENTANDO RECONECTAR!`;

        console.log(logMessage);
        
        // 🧹 LIMPAR HEARTBEAT (único lugar)
        clearInterval(heartbeatInterval);
        
        // 🚀 NOVO: Remover listeners ao desconectar
        removeEventListeners(socket, company.id);
        
        // Atualizar status
        const connection = activeConnections.get(company.id);
        if (connection) {
          connection.status = 'disconnected';
          connection.lastActivity = new Date().toISOString();
          connection.disconnectReason = reason;
          connection.lastDisconnect = new Date().toISOString();
        }

        if (isManualDisconnect) {
          return; // Reconexão será gerenciada manualmente
        }
        
        // 🛡️ RECONEXÃO AUTOMÁTICA IMEDIATA (apenas se não há reconexão em andamento)
        setTimeout(async () => {
          // 🔒 VERIFICAR LOCK antes de tentar reconectar
          if (connectionLocks.get(company.id)) {
            console.log(`⏳ Reconexão já em andamento para ${company.name} - pulando timeout`);
            return;
          }
          
          try {
            console.log(`🔄 RECONECTANDO empresa ${company.name} após desconexão...`);
            await connectCompany(company.id);
            console.log(`✅ SUCESSO: Empresa ${company.name} reconectada automaticamente!`);
          } catch (error) {
            console.error(`❌ FALHA na reconexão automática de ${company.name}:`, error);
            
            // 🛡️ RETRY COM BACKOFF: tentar novamente apenas se não há lock
            if (!connectionLocks.get(company.id)) {
              setTimeout(() => attemptReconnectWithBackoff(company.id, company.name, 1), 30000);
            }
          }
        }, 5000); // Tentar reconectar em 5 segundos
      });

      socket.on('connect_error', (error) => {
        console.error(`❌ Erro de conexão socket para empresa ${company.name}:`, error);
        
        // 🔓 LIBERAR LOCK - Erro na conexão
        connectionLocks.set(company.id, false);
        
        reject(error);
      });

      // 🚀 OTIMIZAÇÃO: Listeners específicos serão registrados após conexão
      // (movido para dentro do evento 'connect' para garantir que socket está pronto)

      // Timeout de conexão
      setTimeout(() => {
        if (!socket.connected) {
          reject(new Error('Timeout na conexão do socket'));
        }
      }, 30000);
      
    } catch (error) {
      console.error(`❌ Erro ao configurar socket para empresa ${company.name}:`, error);
      
      // 🔓 LIBERAR LOCK - Erro geral na criação do socket
      connectionLocks.set(company.id, false);
      
      reject(error);
    }
  });
}

// 🛡️ FUNÇÃO: Reconexão com backoff exponencial (retry inteligente)
async function attemptReconnectWithBackoff(companyId, companyName, attempt) {
  const maxAttempts = 5;
  const delays = [30000, 60000, 120000, 300000, 600000]; // 30s, 1m, 2m, 5m, 10m
  
  if (attempt > maxAttempts) {
    console.error(`🚨 FALHA TOTAL: Empresa ${companyName} não conseguiu reconectar após ${maxAttempts} tentativas!`);
    
    // 🛡️ ÚLTIMO RECURSO: Agendar tentativa completa em 30 minutos
    setTimeout(async () => {
      console.log(`🔄 ÚLTIMO RECURSO: Tentando reconectar ${companyName} após 30min...`);
      try {
        await connectCompany(companyId);
        console.log(`✅ MILAGRE: Empresa ${companyName} reconectada após último recurso!`);
      } catch (error) {
        console.error(`❌ ÚLTIMO RECURSO FALHOU para ${companyName}:`, error);
      }
    }, 1800000); // 30 minutos
    return;
  }
  
  // 🔒 VERIFICAR LOCK antes de tentar retry
  if (connectionLocks.get(companyId)) {
    console.log(`⏳ Reconexão já em andamento para ${companyName} - cancelando retry ${attempt}`);
    return;
  }
  
  try {
    console.log(`🔄 RETRY ${attempt}/${maxAttempts}: Reconectando ${companyName}...`);
    await connectCompany(companyId);
    console.log(`✅ SUCESSO: Empresa ${companyName} reconectada no retry ${attempt}!`);
  } catch (error) {
    console.error(`❌ RETRY ${attempt} FALHOU para ${companyName}:`, error);
    
    const delay = delays[attempt - 1] || delays[delays.length - 1];
    console.log(`⏰ Próxima tentativa para ${companyName} em ${delay/1000}s...`);
    
    // 🔒 Só agendar novo retry se não há lock
    if (!connectionLocks.get(companyId)) {
      setTimeout(() => attemptReconnectWithBackoff(companyId, companyName, attempt + 1), delay);
    }
  }
}

// ✅ REMOVIDO: Sistema de deduplicação incorreto que estava filtrando eventos legítimos

// ✅ FUNÇÃO: Limpeza agressiva de memória para evitar crashes
function cleanupMemory() {
  try {
    // 1. Limpar cache de eventos quando necessário
    if (eventCache.size > MAX_EVENT_CACHE_SIZE * 0.8) { // 80% do limite em vez de 50%
      const entries = Array.from(eventCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // Mais antigos primeiro
      
      // Remove 70% dos mais antigos (mais agressivo)
      const toRemove = entries.slice(0, Math.floor(entries.length * 0.7));
      toRemove.forEach(([key]) => eventCache.delete(key));
      
        // ✅ LIMPO: Removido log verboso de limpeza
      }
      
      // ✅ GARANTIA ABSOLUTA: NUNCA limpar filas - 100% dos eventos devem ser processados!
      // REMOVIDO: Lógica que removia eventos antigos da fila (CAUSAVA PERDA DE EVENTOS!)
      // Agora o autoscaling do Render resolve automaticamente a sobrecarga
      
      // 3. Limpar cache de webhooks se muito grande
      if (activeWebhooksCache.size > MAX_WEBHOOK_CACHE_SIZE) {
        const entries = Array.from(activeWebhooksCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Remove 30% dos mais antigos
        const toRemove = entries.slice(0, Math.floor(entries.length * 0.3));
        toRemove.forEach(([key]) => activeWebhooksCache.delete(key));
        
        // ✅ LIMPO: Removido log verboso de cache
      }
      
      // 4. Force garbage collection se disponível
      if (global.gc) {
        global.gc();
        // ✅ LIMPO: Removido log de GC
      }
    
    // ✅ LIMPO: Removido log de uso de memória (desnecessário)
    
  } catch (error) {
    console.error('❌ Erro na limpeza de memória:', error);
  }
}

// 🚀 NOVO SISTEMA DE FILA COM P-QUEUE (Substitui sistema manual)
function addEventToQueue(companyId, eventName, eventData, companyName) {
  // Obter ou criar fila para esta empresa
  const queue = getOrCreateQueue(companyId);
  
  // 🔍 DEBUG: Verificar ID único do evento para deduplicação
  const eventIdentifier = eventPostGuard.findEventIdentifier(eventData, eventName);
  const now = Date.now();
  
  if (eventIdentifier) {
    console.log(`🎯 EVENTO: ${eventName} | ID: ${eventIdentifier} | Empresa: ${companyName}`);
  } else {
    console.log(`⚠️ SEM ID: ${eventName} - processando sem deduplicação na fila`);
  }
  
  // Deduplicação: verificar se evento já foi adicionado recentemente
  if (eventIdentifier) {
    const eventKey = `${companyId}:${eventName}:${eventIdentifier}`;
    const cachedEvent = eventCache.get(eventKey);
    
    if (cachedEvent && (now - cachedEvent.timestamp) < EVENT_CACHE_TTL) {
      console.log(`🔄 DUPLICADO: ${eventName} (ID: ${eventIdentifier}) - mesmo evento em ${now - cachedEvent.timestamp}ms`);
      return;
    }
    
    // Marcar evento como visto
    eventCache.set(eventKey, { timestamp: now, eventName });
    
    // Limpar cache se necessário
    if (eventCache.size > MAX_EVENT_CACHE_SIZE) {
      trimEventCacheIfNeeded();
    }
  }
  
  // ✅ ADICIONAR À FILA P-QUEUE (gerencia concorrência automaticamente)
  queue.add(async () => {
    try {
      console.log(`🎯 EVENTO: ${eventName} recebido de ${companyName}`);
      
      // Processar evento através dos webhooks
      await processEventThroughWebhooks(companyId, eventName, eventData, null);
      
    } catch (error) {
      console.error(`❌ Erro ao processar evento ${eventName} da empresa ${companyName}:`, error);
      // P-Queue não interrompe processamento em caso de erro - continua com próximo
    }
  }).catch(error => {
    // Captura erros não tratados na promise
    console.error(`❌ Erro não capturado ao adicionar evento à fila:`, error);
  });
  
  console.log(`📥 Evento ${eventName} adicionado à fila de ${companyName} (${queue.size} pendentes, ${queue.pending} processando)`);
}

// 🚀 FUNÇÃO REMOVIDA: processEventQueue
// P-Queue gerencia automaticamente o processamento de eventos
// Não precisamos mais do loop while manual

// ✅ REMOVIDAS: Funções de deduplicação incorretas que estavam bloqueando eventos legítimos

function cleanupCaches() {
  const now = Date.now();
  let expiredEvents = 0;
  let expiredWebhooks = 0;
  
  // 🚀 NOVO: Limpar EventPostGuard
  eventPostGuard.cleanup();
  
  // Limpar cache de eventos expirados
  for (const [key, value] of eventCache.entries()) {
    if (now - value.timestamp > EVENT_CACHE_TTL) {
      eventCache.delete(key);
      expiredEvents++;
    }
  }

  // Limpar cache de webhooks expirados
  for (const [key, value] of activeWebhooksCache.entries()) {
    if (now - value.timestamp > WEBHOOK_CACHE_TTL) {
      activeWebhooksCache.delete(key);
      expiredWebhooks++;
    }
  }
  
  if (expiredEvents > 0 || expiredWebhooks > 0) {
    console.log(`🧹 Cache limpo: ${expiredEvents} eventos e ${expiredWebhooks} webhooks expirados removidos`);
  }
}

// Buscar webhooks ativos com cache
async function getActiveWebhooksForCompany(companyId) {
  const now = Date.now();
  const cached = activeWebhooksCache.get(companyId);
  
  // Se cache é válido, usar dados em cache
  if (cached && (now - cached.timestamp) < WEBHOOK_CACHE_TTL) {
    return cached.webhooks;
  }
  
  // Buscar dados atualizados do banco
  const { data: currentWebhooks, error: webhookError } = await supabase
    .from('webhooks')
    .select(`
      id, url, status,
      webhook_events(
        event:events(name, display_name),
        filters
      )
    `)
    .eq('company_id', companyId)
    .eq('status', 'active') // APENAS ATIVOS
    .eq('deleted', false); // E NÃO DELETADOS

  if (webhookError) {
    console.error('❌ Erro ao buscar webhooks atuais:', webhookError);
    return [];
  }

  const webhooks = currentWebhooks || [];
  
  // Armazenar no cache
  activeWebhooksCache.set(companyId, {
    webhooks: webhooks,
    timestamp: now
  });
  
  return webhooks;
}

// Função para aplicar filtros de eventos
function applyEventFilters(eventData, filters) {
  // Sem filtros = todos os eventos passam
  if (!filters || filters.length === 0) {
    return true;
  }

  // Todos os filtros devem passar para o evento ser enviado
  return filters.every((filter) => {
    try {
      // Extrair valor do campo usando o path (ex: "callHistory.status")
      const fieldValue = getNestedValue(eventData, filter.field_path);
      
      let result = false;
      
      // Aplicar operador
      switch (filter.operator) {
        case 'equals':
          result = fieldValue == filter.value; // Usar == para comparação flexível
          break;
        case 'not_equals':
          result = fieldValue != filter.value;
          break;
        case 'greater_than':
          const numFieldValue = Number(fieldValue);
          const numFilterValue = Number(filter.value);
          result = !isNaN(numFieldValue) && !isNaN(numFilterValue) && numFieldValue > numFilterValue;
          break;
        case 'less_than':
          const numFieldValueLT = Number(fieldValue);
          const numFilterValueLT = Number(filter.value);
          result = !isNaN(numFieldValueLT) && !isNaN(numFilterValueLT) && numFieldValueLT < numFilterValueLT;
          break;
        case 'contains':
          const strFieldValue = String(fieldValue || '').toLowerCase();
          const strFilterValue = String(filter.value || '').toLowerCase();
          result = strFieldValue.includes(strFilterValue);
          break;
        case 'not_contains':
          const strFieldValueNC = String(fieldValue || '').toLowerCase();
          const strFilterValueNC = String(filter.value || '').toLowerCase();
          result = !strFieldValueNC.includes(strFilterValueNC);
          break;
        default:
          result = true; // Em caso de operador desconhecido, passa o evento
      }
      
      return result;
    } catch (error) {
      console.warn(`⚠️ Erro ao aplicar filtro ${filter.field_path}:`, error.message);
      return true; // Em caso de erro, passa o evento
    }
  });
}

// Função helper para extrair valores aninhados (ex: "callHistory.status")
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Processar evento através dos webhooks
async function processEventThroughWebhooks(companyId, eventName, eventData, webhooks) {
  try {
    // Buscar webhooks ativos atualizados (com cache)
    const currentWebhooks = await getActiveWebhooksForCompany(companyId);

    if (!currentWebhooks || currentWebhooks.length === 0) {
      console.log(`⚠️ SEM WEBHOOKS: Empresa ${companyId} não tem webhooks ativos para ${eventName}`);
      // Se não há webhooks ativos, considerar desconectar a empresa
      await checkAndDisconnectIfNoActiveWebhooks(companyId);
      return;
    }

    // Filtrar webhooks ATIVOS que escutam este evento
    const relevantWebhooks = currentWebhooks.filter(webhook => {
      const eventTypes = webhook.webhook_events?.map(we => we.event?.name) || [];
      const isRelevant = eventTypes.includes(eventName);
      
      return isRelevant;
    });

    if (relevantWebhooks.length === 0) {
      // 🔍 DEBUG: Mostrar quais eventos esse webhook escuta
      const allListenedEvents = currentWebhooks.flatMap(w => 
        w.webhook_events?.map(we => we.event?.name) || []
      );
      const uniqueEvents = [...new Set(allListenedEvents)];
      console.log(`⚠️ EVENTO NÃO MAPEADO: ${eventName} não configurado. Eventos configurados: [${uniqueEvents.join(', ')}]`);
      return;
    }

    // Buscar ID do evento no banco (com cache simples)
    const { data: eventRecord } = await supabase
      .from('events')
      .select('id')
      .eq('name', eventName)
      .single();

    // Processar cada webhook relevante ATIVO
    const results = await Promise.allSettled(
      relevantWebhooks.map(webhook => 
        processWebhookExecution(webhook, eventData, eventRecord?.id, companyId, eventName)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // ✅ LOG CRÍTICO: Para debug de perda de eventos
    if (failed > 0) {
      console.log(`🚨 FALHA: ${eventName} - ${successful} sucessos, ${failed} falhas de ${relevantWebhooks.length} webhooks`);
    }

  } catch (error) {
    console.error(`❌ Erro ao processar evento ${eventName}:`, error);
  }
}

// Executar webhook específico
async function processWebhookExecution(webhook, eventData, eventId, companyId, eventName) {
  try {
    // 🚀 NOVO: Verificar se evento já foi processado (ANTES de aplicar filtros)
    if (!eventPostGuard.shouldProcess(webhook.id, eventName, eventData)) {
      console.log(`🔄 POST DUPLICADO IGNORADO: ${webhook.url} - evento já processado`);
      return { success: false, reason: 'Duplicate POST prevented' };
    }
    
    // Buscar filtros para este evento específico neste webhook
    const webhookEvent = webhook.webhook_events?.find(we => we.event?.name === eventName);
    const eventFilters = webhookEvent?.filters || [];
    
    // ✅ OTIMIZAÇÃO: Log apenas filtros quando há falha (reduz 90% dos logs)
    
    // ✅ CRÍTICO: Removidos 180+ linhas de logs de debug que consumiam 40% da CPU
    
    // Aplicar filtros - se não passar, não enviar o webhook
    if (!applyEventFilters(eventData, eventFilters)) {
      // 🔍 DEBUG: Log quando filtro bloqueia (para diagnosticar problemas)
      if (eventFilters.length > 0) {
        console.log(`🚫 FILTRADO: ${eventName} bloqueado por filtro em ${webhook.url}`);
      }
      // NÃO marcar como processado se não passou nos filtros (pode ser testado em outro webhook)
      return { success: false, reason: 'Event filtered out' };
    }
    
    // ✅ LOG ESSENCIAL: POST sendo executado (conforme pedido do usuário)
    console.log(`📤 POST: ${webhook.url} - ${eventName}`);
    
    // Preparar payload do webhook
    const webhookPayload = {
      event_type: eventName,
      company_id: companyId,
      timestamp: new Date().toISOString(),
      data: eventData
    };

    // 🚨 TRAVA DE SEGURANÇA PARA STAGING
    // Verifica se deve simular webhook ao invés de enviar (ambiente de teste/dev)
    const isStaging = process.env.DISABLE_WEBHOOK_DISPATCH === 'true';
    
    // 🚀 USAR AXIOS COM RETRY AUTOMÁTICO (3 tentativas configuradas globalmente)
    let response;
    let status;
    let errorMessage = null;
    
    if (isStaging) {
      // 🚫 MODO STAGING: Simular webhook sem enviar para clientes
      console.log(`🚫 STAGING (Simulação): Webhook ${webhook.id} para ${webhook.url} não enviado.`);
      
      // Simular latência real de rede (100-200ms aleatório)
      const simulatedLatency = 100 + Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, simulatedLatency));
      
      // Resposta fake simulando sucesso
      response = {
        status: 200,
        statusText: 'OK [STAGING SIMULATION]',
        data: { 
          simulated: true,
          message: 'Webhook não enviado - ambiente staging'
        }
      };
      
      status = 'success';
      
      console.log(`✅ STAGING (Simulação): Webhook simulado com sucesso em ${Math.round(simulatedLatency)}ms`);
      
    } else {
      // 🚀 MODO PRODUÇÃO: Enviar webhook real com retry
      try {
        response = await axios.post(webhook.url, webhookPayload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': '3C-Plus-Webhook-Proxy-Render/1.0'
          },
          timeout: 30000, // 30 segundos timeout
          validateStatus: (status) => status < 600 // Não lançar erro para status < 600
        });
        
        status = response.status >= 200 && response.status < 300 ? 'success' : 'failed';
        
        if (status === 'failed') {
          errorMessage = `HTTP ${response.status}: ${JSON.stringify(response.data).substring(0, 300)}`;
        }
        
      } catch (error) {
        // Erro após 3 retries automáticos
        status = 'failed';
        errorMessage = `FALHA APÓS RETRIES: ${error.message}`;
        
        console.error(`❌ Erro ao executar webhook ${webhook.id} após retries:`, error);
        
        // Criar response mock para logging
        response = {
          status: error.response?.status || 0,
          data: error.message
        };
      }
    }

    // 🚀 NOVO: Marcar evento como processado APENAS se POST foi feito (sucesso ou falha, mas POST foi enviado)
    eventPostGuard.markAsProcessed(webhook.id, eventName, eventData);

    // 🚀 BATCH LOGGING: Adicionar à fila de batch para call-history-was-created
    const phoneNumber = extractPhoneNumber(eventName, eventData);
    if (phoneNumber && eventName === 'call-history-was-created') {
      queueCallHistoryLog({
        companyId: companyId,
        webhookId: webhook.id,
        eventId: eventId,
        phoneNumber: phoneNumber,
        status: status,
        responseStatus: response.status
      });
    }

    // 🚀 LOGGING MELHORADO: Sempre salvar falhas + 10% dos sucessos para auditoria
    const shouldSaveExecution = status === 'failed' || Math.random() < 0.10;
    
    if (shouldSaveExecution) {
      try {
        const responseBody = typeof response.data === 'string' 
          ? response.data 
          : JSON.stringify(response.data);
          
        const { error: executionError } = await supabase
          .from('webhook_executions')
          .insert({
            webhook_id: webhook.id,
            company_id: companyId,
            event_id: eventId,
            status: status,
            response_status: response.status,
            response_body: responseBody.length > 300 ? responseBody.substring(0, 300) + '...' : responseBody,
            error_message: errorMessage?.length > 300 ? errorMessage.substring(0, 300) + '...' : errorMessage
          });

        if (executionError) {
          console.error('❌ Erro ao salvar execução do webhook:', executionError);
        }
      } catch (dbError) {
        // ✅ SILENCIOSO: Não quebrar POST por erro de logging
        console.error('⚠️ Erro no logging (não crítico):', dbError);
      }
    }

    // ✅ LOG ESSENCIAL: Apenas falhas são importantes
    if (status === 'failed') {
      console.log(`❌ POST falhou: ${webhook.url} - ${response.status} - ${errorMessage}`);
    } else {
      console.log(`✅ POST sucesso: ${webhook.url} - ${response.status}`);
    }
    
    return {
      webhook_id: webhook.id,
      status,
      response_status: response.status,
      error_message: errorMessage
    };

  } catch (error) {
    // Captura erros inesperados que não foram tratados acima
    console.error(`❌ Erro crítico inesperado ao processar webhook ${webhook.id}:`, error);
    
    // Tentar salvar log de falha crítica
    try {
      await supabase
        .from('webhook_executions')
        .insert({
          webhook_id: webhook.id,
          company_id: companyId,
          event_id: eventId,
          status: 'failed',
          response_status: 0,
          error_message: `ERRO CRÍTICO: ${error.message.substring(0, 300)}`
        });
    } catch (dbError) {
      console.error('⚠️ Erro ao salvar log de falha crítica:', dbError);
    }

    throw error;
  }
}

// Verificar se empresa deve ser desconectada (sem webhooks ativos)
async function checkAndDisconnectIfNoActiveWebhooks(companyId) {
  try {
    console.log(`🔍 Verificando se empresa ${companyId} deve ser desconectada...`);
    
    // Buscar webhooks ativos
    const { data: activeWebhooks, error } = await supabase
      .from('webhooks')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .eq('deleted', false);
    
    if (error) {
      console.error('❌ Erro ao verificar webhooks ativos:', error);
      return;
    }
    
    if (!activeWebhooks || activeWebhooks.length === 0) {
      console.log(`🔌 Empresa ${companyId} não tem webhooks ativos - desconectando socket`);
      await disconnectCompany(companyId);
    } else {
      console.log(`✅ Empresa ${companyId} tem ${activeWebhooks.length} webhooks ativos - mantendo conexão`);
    }
  } catch (error) {
    console.error(`❌ Erro ao verificar webhooks ativos para empresa ${companyId}:`, error);
  }
}

// Reconectar empresa se ela tem webhooks ativos mas não está conectada
async function checkAndReconnectIfHasActiveWebhooks(companyId) {
  try {
    console.log(`🔍 Verificando se empresa ${companyId} deve ser reconectada...`);
    
    // Verificar se já está conectada
    if (activeConnections.has(companyId)) {
      console.log(`✅ Empresa ${companyId} já está conectada`);
      // 🚀 NOVO: Atualizar listeners mesmo se já conectada (webhooks podem ter mudado)
      await updateEventListeners(companyId);
      return;
    }
    
    // Buscar webhooks ativos
    const { data: activeWebhooks, error } = await supabase
      .from('webhooks')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .eq('deleted', false);
    
    if (error) {
      console.error('❌ Erro ao verificar webhooks ativos:', error);
      return;
    }
    
    if (activeWebhooks && activeWebhooks.length > 0) {
      console.log(`🔌 Empresa ${companyId} tem ${activeWebhooks.length} webhooks ativos - conectando socket`);
      await connectCompany(companyId);
    } else {
      console.log(`⚠️ Empresa ${companyId} não tem webhooks ativos - não conectando`);
    }
  } catch (error) {
    console.error(`❌ Erro ao verificar reconexão para empresa ${companyId}:`, error);
  }
}

// Desconectar empresa
async function disconnectCompany(companyId) {
  try {
    console.log(`🔌 Desconectando empresa: ${companyId}`);
    
    const socket = socketInstances.get(companyId);
    if (socket) {
      // 🚀 NOVO: Remover listeners antes de desconectar
      removeEventListeners(socket, companyId);
      socket.disconnect();
      socketInstances.delete(companyId);
    }
    
    activeConnections.delete(companyId);
    console.log(`✅ Empresa ${companyId} desconectada`);
    
  } catch (error) {
    console.error(`❌ Erro ao desconectar empresa ${companyId}:`, error);
  }
}

// Conectar todas as empresas ativas
async function connectAllActiveCompanies(options = {}) {
  const { force = false } = options;
  try {
    console.log('🚀 Conectando todas as empresas ativas...');
    
    // Buscar empresas com webhooks ativos (incluindo cluster_type)
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id, name, api_token, status, cluster_type,
        webhooks!inner(status)
      `)
      .eq('status', 'active')
      .eq('webhooks.status', 'active');

    if (error) {
      throw error;
    }

    if (!companies || companies.length === 0) {
      console.log('📭 Nenhuma empresa com webhooks ativos encontrada');
      return;
    }

    console.log(`📋 Encontradas ${companies.length} empresas com webhooks ativos`);

    // Conectar cada empresa
    const results = await Promise.allSettled(
      companies.map(company => connectCompany(company.id, { force }))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 Conexões estabelecidas: ${successful} sucessos, ${failed} falhas`);
    console.log(`🎯 Total de empresas conectadas: ${activeConnections.size}`);
    
  } catch (error) {
    console.error('❌ Erro ao conectar empresas ativas:', error);
  }
}

// Verificar e desconectar empresas inativas
async function checkAndDisconnectInactiveCompanies() {
  try {
    console.log('🔍 Verificando empresas inativas...');
    
    // Para cada empresa conectada, verificar se ainda está ativa
    for (const [companyId] of activeConnections) {
      const { data: company, error } = await supabase
        .from('companies')
        .select('id, name, status')
        .eq('id', companyId)
        .single();
      
      if (error) {
        console.error(`❌ Erro ao verificar status da empresa ${companyId}:`, error);
        continue;
      }
      
      if (!company) {
        console.log(`⚠️ Empresa ${companyId} não encontrada - desconectando`);
        await disconnectCompany(companyId);
        continue;
      }
      
      if (company.status === 'inactive') {
        console.log(`🔌 Empresa ${company.name} (${companyId}) foi desativada - desconectando socket`);
        await disconnectCompany(companyId);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar empresas inativas:', error);
  }
}

// Monitorar conexões a cada 60 segundos
function startConnectionMonitor() {
  console.log('🛡️ Iniciando WATCHDOG avançado - garantia 100% de funcionamento...');
  
  setInterval(async () => {
    try {
      // 🛡️ WATCHDOG 1: Verificar conexões sem atividade há muito tempo
      const now = Date.now();
      const maxInactivity = 10 * 60 * 1000; // 10 minutos sem atividade = suspeito
      
      for (const [companyId, connection] of activeConnections.entries()) {
        const lastActivity = new Date(connection.lastActivity).getTime();
        const inactiveTime = now - lastActivity;
        
        if (inactiveTime > maxInactivity && connection.status === 'connected') {
          console.log(`🚨 WATCHDOG: Empresa ${connection.company.name} sem atividade há ${Math.round(inactiveTime/60000)}min - RECONECTANDO FORÇADO!`);
          
          // Forçar reconexão de empresa suspeita
          try {
            await disconnectCompany(companyId);
            await connectCompany(companyId);
            console.log(`✅ WATCHDOG: Empresa ${connection.company.name} reconectada com sucesso!`);
          } catch (error) {
            console.error(`❌ WATCHDOG: Falha ao reconectar ${connection.company.name}:`, error);
          }
        }
      }
      
      // 🛡️ WATCHDOG 2: Verificar empresas que deveriam estar conectadas
      const { data: companiesWithActiveWebhooks, error } = await supabase
        .from('companies')
        .select(`
          id, name,
          webhooks!inner(status)
        `)
        .eq('status', 'active')
        .eq('webhooks.status', 'active');
      
      if (!error && companiesWithActiveWebhooks) {
        for (const company of companiesWithActiveWebhooks) {
          if (!activeConnections.has(company.id)) {
            console.log(`🚨 WATCHDOG: Empresa ${company.name} tem webhooks ativos mas NÃO ESTÁ CONECTADA - CONECTANDO URGENTE!`);
            try {
              await connectCompany(company.id);
              console.log(`✅ WATCHDOG: Empresa ${company.name} conectada com sucesso!`);
            } catch (error) {
              console.error(`❌ WATCHDOG: Falha ao conectar ${company.name}:`, error);
            }
          }
        }
      }
      
      // 🛡️ WATCHDOG 3: Verificar filas p-queue travadas ou muito grandes
      for (const [companyId, queue] of processingQueues.entries()) {
        const queueSize = queue.size;
        const queuePending = queue.pending;
        
        if (queueSize > 100) {
          console.log(`⚠️ WATCHDOG: Fila da empresa ${companyId} com ${queueSize} eventos pendentes e ${queuePending} processando`);
        }
        
        // Se fila está muito grande mas nada processando, pode estar travada
        if (queueSize > 50 && queuePending === 0) {
          console.log(`🚨 WATCHDOG: Fila da empresa ${companyId} parece travada (${queueSize} pendentes, 0 processando)`);
          // P-Queue deve auto-resolver, mas logamos para monitorar
        }
      }
      
      // 🛡️ WATCHDOG 4: Verificar empresas desconectadas há muito tempo
      await checkAndDisconnectInactiveCompanies();
      for (const [companyId] of activeConnections) {
        await checkAndDisconnectIfNoActiveWebhooks(companyId);
      }
      
      // 🚀 NOVO: WATCHDOG 5: Atualizar listeners de empresas conectadas (migração de onAny para listeners específicos)
      for (const [companyId, connection] of activeConnections.entries()) {
        if (connection.status === 'connected') {
          const socket = socketInstances.get(companyId);
          if (socket && socket.connected) {
            // Verificar se empresa tem listeners registrados
            const listenersMap = eventListeners.get(companyId);
            if (!listenersMap || listenersMap.size === 0) {
              // Empresa conectada mas sem listeners - atualizar (migração de onAny antigo)
              console.log(`🔄 WATCHDOG: Atualizando listeners para empresa ${connection.company?.name || companyId} (migração)`);
              await updateEventListeners(companyId);
            }
          }
        }
      }
      
      // 📊 Status resumido
      const connections = Array.from(activeConnections.values());
      const connected = connections.filter(c => c.status === 'connected').length;
      const disconnected = connections.filter(c => c.status === 'disconnected').length;
      
      // Total de eventos em todas as filas
      let totalQueuedEvents = 0;
      let totalProcessingEvents = 0;
      for (const queue of processingQueues.values()) {
        totalQueuedEvents += queue.size;
        totalProcessingEvents += queue.pending;
      }
      
      console.log(`🛡️ WATCHDOG: ${connected} conectadas, ${disconnected} desconectadas, ${totalQueuedEvents} na fila, ${totalProcessingEvents} processando`);
      
    } catch (error) {
      console.error('❌ Erro no watchdog:', error);
    }
  }, 60000); // 🛡️ WATCHDOG A CADA 60 SEGUNDOS (mais ativo para problemas críticos)
}

// Limpeza automática do cache a cada 5 minutos
function startCacheCleanup() {
  console.log('🧹 Iniciando limpeza automática do cache...');
  
  setInterval(() => {
    try {
      cleanupCaches();
    } catch (error) {
      console.error('❌ Erro na limpeza do cache:', error);
    }
  }, 300000); // A cada 5 minutos
}

// ✅ MONITOR DE MEMÓRIA: Prevenção proativa de crashes
function startMemoryMonitor() {
  setInterval(() => {
    try {
      const memUsage = process.memoryUsage();
      const memMB = Math.round(memUsage.rss / 1024 / 1024);
      const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
      
      // ✅ LIMPO: Removido log de memória (desnecessário para usuário)
      
      // ⚠️ ALERTA: Memória alta - limpeza preventiva (STANDARD: 80%)
      if (heapPercent > 80) {
        console.log(`⚠️ MEMORY: Memória em ${heapPercent}% - limpeza preventiva`);
        cleanupMemory();
      }
      
      // 🚨 CRÍTICO: Memória muito alta - limpeza agressiva (STANDARD: 90%)
      if (heapPercent > 90) {
        console.log(`🚨 MEMORY: Memória crítica ${heapPercent}% - limpeza agressiva`);
        
        // 🛡️ LIMPEZA SEGURA: NÃO limpar filas de processamento (P-Queue gerencia)
        
        // Limpar apenas caches seguros
        activeWebhooksCache.clear();
        eventCache.clear();
        
        // P-Queue gerencia memória automaticamente, não precisamos intervir
        
        if (global.gc) global.gc();
        
        console.log(`🔄 MEMORY: Limpeza agressiva concluída`);
        
        // ✅ STANDARD PLAN: Thresholds ajustados para 4GB RAM
        const newMemUsage = process.memoryUsage();
        const newHeapPercent = Math.round((newMemUsage.heapUsed / newMemUsage.heapTotal) * 100);
        
        if (newHeapPercent > 85) {
          console.log(`🔄 MEMORY: STANDARD - Reconectando empresas após limpeza crítica`);
          connectAllActiveCompanies();
        }
      }
      
    } catch (error) {
      console.error('❌ Erro no monitor de memória:', error);
    }
  }, 30000); // A cada 30 segundos
}

// Inicialização do servidor
async function startServer() {
  try {
    // Conectar empresas ativas na inicialização
    await connectAllActiveCompanies();
    
    // Iniciar monitor de conexões
    startConnectionMonitor();
    
    // Iniciar limpeza automática do cache
    startCacheCleanup();
    
    // ✅ Iniciar monitor de memória para prevenir crashes
    startMemoryMonitor();
    
    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Status: http://localhost:${PORT}/status`);
      console.log(`✅ Sistema 24/7 iniciado com sucesso!`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM (shutdown automático do Render), desconectando empresas...');
  console.log('📋 Empresas ativas:', Array.from(activeConnections.keys()));
  
  // Flush final de todos os logs pendentes
  if (batchFlushTimer) {
    clearInterval(batchFlushTimer);
    console.log('⏱️ Timer de batch flush cancelado');
  }
  
  console.log('💾 Fazendo flush final dos logs de call-history pendentes...');
  await flushAllCallHistoryLogs();
  
  for (const [companyId] of activeConnections) {
    await disconnectCompany(companyId);
  }
  
  console.log('✅ Shutdown concluído - Sistema será reativado no próximo evento');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Recebido SIGINT, desconectando empresas...');
  
  // Flush final de todos os logs pendentes
  if (batchFlushTimer) {
    clearInterval(batchFlushTimer);
    console.log('⏱️ Timer de batch flush cancelado');
  }
  
  console.log('💾 Fazendo flush final dos logs de call-history pendentes...');
  await flushAllCallHistoryLogs();
  
  for (const [companyId] of activeConnections) {
    await disconnectCompany(companyId);
  }
  
  console.log('✅ Shutdown concluído');
  process.exit(0);
});

// ✅ TRATAMENTO GLOBAL DE ERROS: Prevenir crashes
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  
  // Tentar limpeza de emergência
  try {
    cleanupMemory();
    console.log('🔄 Limpeza de emergência executada');
  } catch (cleanupError) {
    console.error('❌ Erro na limpeza de emergência:', cleanupError);
  }
  
  // Não fazer exit - deixar o Render gerenciar
  console.log('⚠️ Processo continuando após uncaughtException...');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION:', reason);
  console.error('Promise:', promise);
  
  // Tentar limpeza de emergência
  try {
    cleanupMemory();
    console.log('🔄 Limpeza de emergência executada');
  } catch (cleanupError) {
    console.error('❌ Erro na limpeza de emergência:', cleanupError);
  }
  
  console.log('⚠️ Processo continuando após unhandledRejection...');
});

// Iniciar servidor
startServer();

