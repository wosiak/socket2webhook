const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { io } = require('socket.io-client');
const crypto = require('crypto');
require('dotenv').config();

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

// Conexões ativas por empresa (NUNCA hibernam!)
const activeConnections = new Map();
const socketInstances = new Map();

// Cache para deduplicação de eventos (evitar POSTs duplicados)
const eventCache = new Map();
const CACHE_TTL = 120000; // 120 segundos para considerar evento duplicado

// Fila de processamento sequencial para evitar race conditions
const processingQueue = new Map(); // Map de companyId -> Array de eventos
const isProcessing = new Map(); // Map de companyId -> boolean

// Cache para webhooks ativos por empresa (evita consultas múltiplas)
const activeWebhooksCache = new Map();
const WEBHOOK_CACHE_TTL = 10000; // 10 segundos

// Log inicial
console.log('🚀 3C Plus Webhook Proxy Server iniciando...');
console.log('📅 Timestamp:', new Date().toISOString());

// Healthcheck endpoint para Render
app.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    active_companies: activeConnections.size,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: Array.from(activeConnections.keys())
  };
  
  console.log('🏥 Health check:', status);
  res.json(status);
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
    if (now - value.timestamp > CACHE_TTL) {
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
      ttl_seconds: CACHE_TTL / 1000
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

// Endpoint para forçar reconexão completa (usado pelo keepalive)
app.post('/force-reconnect', async (req, res) => {
  try {
    console.log(`🔄 Forçando reconexão completa de todas as empresas ativas...`);
    
    // Reconectar todas as empresas com webhooks ativos
    await connectAllActiveCompanies();
    
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
async function connectCompany(companyId) {
  try {
    console.log(`🔌 Conectando empresa: ${companyId}`);
    
    // Buscar dados da empresa
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
      console.log(`⚠️ Nenhum webhook ativo encontrado para empresa: ${companyId}`);
      return;
    }

    console.log(`📋 Encontrados ${webhooks.length} webhooks ativos para empresa: ${company.name}`);

    // Conectar ao socket 3C Plus
    const socket = await connect3CPlusSocket(company, webhooks);
    
    // Armazenar informações da conexão
    activeConnections.set(companyId, {
      company: company,
      webhooks: webhooks,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      status: 'connected'
    });

    socketInstances.set(companyId, socket);
    
    console.log(`✅ Empresa ${company.name} conectada com sucesso!`);
    
  } catch (error) {
    console.error(`❌ Erro ao conectar empresa ${companyId}:`, error);
    throw error;
  }
}

// Conectar ao socket 3C Plus
async function connect3CPlusSocket(company, webhooks) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`🔌 Estabelecendo conexão WebSocket para empresa: ${company.name}`);
      
      const socket = io('https://socket.3c.plus', {
        query: { token: company.api_token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      socket.on('connect', () => {
        console.log(`✅ Socket 3C Plus conectado para empresa: ${company.name}`);
        console.log(`🔗 [DEBUG] Socket conectado com token: ${company.api_token?.substring(0, 10)}...`);
        
        // Atualizar status da conexão
        const connection = activeConnections.get(company.id);
        if (connection) {
          connection.lastActivity = new Date().toISOString();
          connection.status = 'connected';
        }
        
        resolve(socket);
      });

      socket.on('disconnect', (reason) => {
        console.log(`⚠️ Socket desconectado para empresa ${company.name}:`, reason);
        
        // Atualizar status
        const connection = activeConnections.get(company.id);
        if (connection) {
          connection.status = 'disconnected';
          connection.lastActivity = new Date().toISOString();
        }
      });

      socket.on('connect_error', (error) => {
        console.error(`❌ Erro de conexão socket para empresa ${company.name}:`, error);
        reject(error);
      });

      // Escutar TODOS os eventos com PROCESSAMENTO SEQUENCIAL
      socket.onAny(async (eventName, eventData) => {
        try {
          console.log(`🎯 [SOCKET] Evento recebido: ${eventName} para empresa ${company.name}`);
          // Adicionar evento à fila de processamento sequencial
          addEventToQueue(company.id, eventName, eventData, company.name);
          
        } catch (error) {
          console.error(`❌ Erro ao processar evento ${eventName} para empresa ${company.name}:`, error);
        }
      });

      // Timeout de conexão
      setTimeout(() => {
        if (!socket.connected) {
          reject(new Error('Timeout na conexão do socket'));
        }
      }, 30000);
      
    } catch (error) {
      console.error(`❌ Erro ao configurar socket para empresa ${company.name}:`, error);
      reject(error);
    }
  });
}

// SISTEMA DE DEDUPLICAÇÃO ULTRA-AGRESSIVO
function createEventKey(companyId, eventName, eventData) {
  // Criar hash único baseado no conteúdo completo do evento
  const eventStr = JSON.stringify({
    company: companyId,
    event: eventName,
    data: eventData
  });
  
  // Usar crypto para hash único (já importado no topo)
  const hash = crypto.createHash('md5').update(eventStr).digest('hex').substring(0, 16);
  
  // Chave baseada no hash do conteúdo completo
  const contentKey = `${companyId}:${eventName}:${hash}`;
  
  // FALLBACK: Timestamp com janela de 2 segundos (super agressivo)
  const timestampKey = `${companyId}:${eventName}:${Math.floor(Date.now() / 2000)}`;
  
  console.log(`🔑 DEDUPLICAÇÃO ULTRA-AGRESSIVA:`, {
    companyId,
    eventName,
    contentKey,
    timestampKey,
    dataSize: JSON.stringify(eventData).length
  });
  
  return contentKey;
}

// SISTEMA DE FILA SEQUENCIAL (ELIMINA RACE CONDITIONS)
function addEventToQueue(companyId, eventName, eventData, companyName) {
  // Inicializar fila se não existe
  if (!processingQueue.has(companyId)) {
    processingQueue.set(companyId, []);
  }
  
  // Adicionar evento à fila
  processingQueue.get(companyId).push({
    eventName,
    eventData,
    companyName,
    timestamp: Date.now()
  });
  
  // Iniciar processamento se não está processando
  if (!isProcessing.get(companyId)) {
    processEventQueue(companyId);
  }
}

async function processEventQueue(companyId) {
  if (isProcessing.get(companyId)) {
    return; // Já está processando
  }
  
  isProcessing.set(companyId, true);
  
  try {
    while (processingQueue.get(companyId)?.length > 0) {
      const event = processingQueue.get(companyId).shift();
      
      // Criar chave única para deduplicação
      const eventKey = createEventKey(companyId, event.eventName, event.eventData);
      
      // Verificar se evento já foi processado recentemente
      if (isEventDuplicate(eventKey)) {
        console.log(`🔄 Evento duplicado ignorado para ${event.companyName}: ${event.eventName} (chave: ${eventKey})`);
        continue;
      }
      
      console.log(`📡 Processando evento sequencial para ${event.companyName}: ${event.eventName} (chave: ${eventKey})`);
      
      // Marcar evento como processado ANTES de processar
      markEventAsProcessed(eventKey);
      
      // Atualizar última atividade
      const connection = activeConnections.get(companyId);
      if (connection) {
        connection.lastActivity = new Date().toISOString();
      }

      // Processar evento através dos webhooks (SEQUENCIAL)
      await processEventThroughWebhooks(companyId, event.eventName, event.eventData, null);
      
      // Pequeno delay entre processamentos para estabilidade
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error(`❌ Erro no processamento sequencial para empresa ${companyId}:`, error);
  } finally {
    isProcessing.set(companyId, false);
  }
}

function isEventDuplicate(eventKey) {
  const now = Date.now();
  const cachedEvent = eventCache.get(eventKey);
  
  if (cachedEvent && (now - cachedEvent.timestamp) < CACHE_TTL) {
    const secondsAgo = Math.floor((now - cachedEvent.timestamp) / 1000);
    console.log(`🔄 Evento DUPLICADO detectado: ${eventKey} (processado ${secondsAgo}s atrás)`);
    return true; // Evento duplicado dentro do TTL
  }
  
  console.log(`✅ Evento NOVO: ${eventKey}`);
  return false;
}

function markEventAsProcessed(eventKey) {
  eventCache.set(eventKey, {
    timestamp: Date.now(),
    processed: true
  });
  
  // Limpar cache antigo periodicamente
  if (eventCache.size > 1000) {
    cleanupEventCache();
  }
}

function cleanupEventCache() {
  const now = Date.now();
  let expiredEvents = 0;
  let expiredWebhooks = 0;
  
  // Limpar cache de eventos expirados
  for (const [key, value] of eventCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
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
  console.log(`🔍 applyEventFilters - eventData:`, typeof eventData, !!eventData);
  console.log(`🔍 applyEventFilters - filters:`, filters);
  
  if (!filters || filters.length === 0) {
    console.log(`🔍 Sem filtros configurados - evento aprovado`);
    return true; // Sem filtros, passa todos os eventos
  }

  // Todos os filtros devem passar para o evento ser enviado
  return filters.every((filter, index) => {
    try {
      console.log(`🔍 Aplicando filtro ${index + 1}/${filters.length}:`, filter);
      
      // Extrair valor do campo usando o path (ex: "callHistory.status")
      const fieldValue = getNestedValue(eventData, filter.field_path);
      console.log(`🔍 Valor extraído de ${filter.field_path}:`, fieldValue, typeof fieldValue);
      
      let result = false;
      
      // Aplicar operador
      switch (filter.operator) {
        case 'equals':
          result = fieldValue == filter.value; // Usar == para comparação flexível
          console.log(`🔍 EQUALS: ${fieldValue} == ${filter.value} → ${result}`);
          break;
        case 'not_equals':
          result = fieldValue != filter.value;
          console.log(`🔍 NOT_EQUALS: ${fieldValue} != ${filter.value} → ${result}`);
          break;
        case 'greater_than':
          const numFieldValue = Number(fieldValue);
          const numFilterValue = Number(filter.value);
          result = !isNaN(numFieldValue) && !isNaN(numFilterValue) && numFieldValue > numFilterValue;
          console.log(`🔍 GREATER_THAN: ${fieldValue} (${numFieldValue}) > ${filter.value} (${numFilterValue}) → ${result}`);
          break;
        case 'less_than':
          const numFieldValueLT = Number(fieldValue);
          const numFilterValueLT = Number(filter.value);
          result = !isNaN(numFieldValueLT) && !isNaN(numFilterValueLT) && numFieldValueLT < numFilterValueLT;
          console.log(`🔍 LESS_THAN: ${fieldValue} (${numFieldValueLT}) < ${filter.value} (${numFilterValueLT}) → ${result}`);
          break;
        case 'contains':
          const strFieldValue = String(fieldValue || '').toLowerCase();
          const strFilterValue = String(filter.value || '').toLowerCase();
          result = strFieldValue.includes(strFilterValue);
          console.log(`🔍 CONTAINS: "${fieldValue}" contains "${filter.value}" → ${result}`);
          break;
        case 'not_contains':
          const strFieldValueNC = String(fieldValue || '').toLowerCase();
          const strFilterValueNC = String(filter.value || '').toLowerCase();
          result = !strFieldValueNC.includes(strFilterValueNC);
          console.log(`🔍 NOT_CONTAINS: "${fieldValue}" not contains "${filter.value}" → ${result}`);
          break;
        default:
          console.warn(`🔍 Operador desconhecido: ${filter.operator}`);
          result = true; // Em caso de operador desconhecido, passa o evento
      }
      
      console.log(`🔍 Filtro ${filter.field_path} ${filter.operator} ${filter.value}: ${fieldValue} -> ${result ? 'PASSOU' : 'NÃO PASSOU'}`);
      return result;
    } catch (error) {
      console.warn(`🔍 Erro ao aplicar filtro ${filter.field_path}:`, error);
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
    console.log(`🔄 Processando evento ${eventName} para empresa ${companyId}`);

    // Buscar webhooks ativos atualizados (com cache)
    const currentWebhooks = await getActiveWebhooksForCompany(companyId);

    if (!currentWebhooks || currentWebhooks.length === 0) {
      console.log(`⚠️ Nenhum webhook ATIVO encontrado para empresa: ${companyId}`);
      
      // Se não há webhooks ativos, considerar desconectar a empresa
      await checkAndDisconnectIfNoActiveWebhooks(companyId);
      return;
    }

    // Filtrar webhooks ATIVOS que escutam este evento
    const relevantWebhooks = currentWebhooks.filter(webhook => {
      const eventTypes = webhook.webhook_events?.map(we => we.event?.name) || [];
      const isRelevant = eventTypes.includes(eventName);
      
      console.log(`🔍 Webhook ${webhook.id}: status=active, eventos=[${eventTypes.join(', ')}], relevante=${isRelevant}`);
      
      return isRelevant;
    });

    if (relevantWebhooks.length === 0) {
      console.log(`⚠️ Nenhum webhook ATIVO configurado para evento: ${eventName}`);
      return;
    }

    console.log(`📋 Encontrados ${relevantWebhooks.length} webhooks ATIVOS para evento: ${eventName}`);

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

    console.log(`✅ Evento ${eventName} processado: ${successful} sucessos, ${failed} falhas (${relevantWebhooks.length} webhooks ATIVOS)`);

  } catch (error) {
    console.error(`❌ Erro ao processar evento ${eventName}:`, error);
  }
}

// Executar webhook específico
async function processWebhookExecution(webhook, eventData, eventId, companyId, eventName) {
  try {
    console.log(`🔄 Executando webhook: ${webhook.id} -> ${webhook.url}`);
    
    // Buscar filtros para este evento específico neste webhook
    const webhookEvent = webhook.webhook_events?.find(we => we.event?.name === eventName);
    const eventFilters = webhookEvent?.filters || [];
    
    console.log(`🔍 Webhook ${webhook.id} - evento encontrado:`, webhookEvent);
    console.log(`🔍 Filtros encontrados para ${eventName}:`, eventFilters);
    console.log(`🔍 Aplicando ${eventFilters.length} filtros para evento ${eventName}`);
    
    // Log do payload recebido para debug
    console.log(`🔍 Payload do evento para filtros:`, JSON.stringify(eventData, null, 2));
    
    // Teste específico para call-history-was-created
    if (eventName === 'call-history-was-created' && eventData) {
      console.log(`🔍 TESTE ESPECÍFICO - eventData:`, typeof eventData);
      console.log(`🔍 TESTE - eventData.callHistory:`, eventData.callHistory);
      console.log(`🔍 TESTE - eventData.callHistory?.status:`, eventData.callHistory?.status);
      console.log(`🔍 TESTE - eventData.data?.callHistory:`, eventData.data?.callHistory);
      console.log(`🔍 TESTE - eventData.data?.callHistory?.status:`, eventData.data?.callHistory?.status);
    }
    
    // Aplicar filtros - se não passar, não enviar o webhook
    if (!applyEventFilters(eventData, eventFilters)) {
      console.log(`🔍 Evento ${eventName} NÃO passou nos filtros do webhook ${webhook.id}. Webhook NÃO será executado.`);
      return { success: false, reason: 'Event filtered out' };
    }
    
    console.log(`✅ Evento ${eventName} passou nos filtros do webhook ${webhook.id}. Executando webhook...`);
    
    // Preparar payload do webhook
    const webhookPayload = {
      event_type: eventName,
      company_id: companyId,
      timestamp: new Date().toISOString(),
      data: eventData
    };

    // Headers da requisição
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': '3C-Plus-Webhook-Proxy-Render/1.0'
    };

    // Fazer POST para o webhook
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(webhookPayload)
    });

    const responseText = await response.text();
    const status = response.ok ? 'success' : 'failed';
    const errorMessage = response.ok ? null : `HTTP ${response.status}: ${responseText}`;

    // Salvar execução no banco  
    const { error: executionError } = await supabase
      .from('webhook_executions')
      .insert({
        webhook_id: webhook.id,
        company_id: companyId,
        event_id: eventId,
        status: status,
        response_status: response.status,
        response_body: responseText.length > 1000 ? responseText.substring(0, 1000) + '...' : responseText,
        error_message: errorMessage
      });

    if (executionError) {
      console.error('❌ Erro ao salvar execução do webhook:', executionError);
    } else {
      console.log(`💾 Execução salva com sucesso: webhook_id=${webhook.id}, status=${status}`);
    }

    console.log(`✅ Webhook ${webhook.id} executado: ${status} (${response.status})`);
    
    return {
      webhook_id: webhook.id,
      status,
      response_status: response.status,
      error_message: errorMessage
    };

  } catch (error) {
    console.error(`❌ Erro ao executar webhook ${webhook.id}:`, error);
    
    // Salvar execução com falha
    await supabase
      .from('webhook_executions')
      .insert({
        webhook_id: webhook.id,
        company_id: companyId,
        event_id: eventId,
        status: 'failed',
        error_message: error.message
      });

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
async function connectAllActiveCompanies() {
  try {
    console.log('🚀 Conectando todas as empresas ativas...');
    
    // Buscar empresas com webhooks ativos
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id, name, api_token, status,
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
      companies.map(company => connectCompany(company.id))
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
  console.log('🔍 Iniciando monitor de conexões...');
  
  setInterval(async () => {
    try {
      console.log(`🔍 Monitor: Verificando ${activeConnections.size} conexões...`);
      
      // 1. Verificar empresas inativas e desconectá-las
      await checkAndDisconnectInactiveCompanies();
      
      // 2. Verificar empresas conectadas - se ainda têm webhooks ativos
      for (const [companyId] of activeConnections) {
        await checkAndDisconnectIfNoActiveWebhooks(companyId);
      }
      
      // 2. Verificar empresas desconectadas - se agora têm webhooks ativos
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
            console.log(`🔌 Empresa ${company.name} tem webhooks ativos mas não está conectada - conectando...`);
            await checkAndReconnectIfHasActiveWebhooks(company.id);
          }
        }
      }
      
      // 3. Log de status
      const connections = Array.from(activeConnections.values());
      const connected = connections.filter(c => c.status === 'connected').length;
      const disconnected = connections.filter(c => c.status === 'disconnected').length;
      
      console.log(`📊 Status: ${connected} conectadas, ${disconnected} desconectadas`);
      console.log(`🗄️ Cache de eventos: ${eventCache.size} entradas`);
      
    } catch (error) {
      console.error('❌ Erro no monitor de conexões:', error);
    }
  }, 60000); // A cada 60 segundos
}

// Limpeza automática do cache a cada 5 minutos
function startCacheCleanup() {
  console.log('🧹 Iniciando limpeza automática do cache...');
  
  setInterval(() => {
    try {
      const sizeBefore = eventCache.size;
      cleanupEventCache();
      const sizeAfter = eventCache.size;
      
      if (sizeBefore !== sizeAfter) {
        console.log(`🧹 Cache limpo: ${sizeBefore - sizeAfter} eventos expirados removidos`);
      }
    } catch (error) {
      console.error('❌ Erro na limpeza do cache:', error);
    }
  }, 300000); // A cada 5 minutos
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
  
  for (const [companyId] of activeConnections) {
    await disconnectCompany(companyId);
  }
  
  console.log('✅ Shutdown concluído - Sistema será reativado no próximo evento');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Recebido SIGINT, desconectando empresas...');
  
  for (const [companyId] of activeConnections) {
    await disconnectCompany(companyId);
  }
  
  console.log('✅ Shutdown concluído');
  process.exit(0);
});

// Iniciar servidor
startServer();

