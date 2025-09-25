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

// Função para manter apenas as 10 últimas execuções por empresa
async function cleanupOldExecutions(companyId) {
  try {
    // Buscar todas as execuções da empresa, ordenadas por data (mais recentes primeiro)
    const { data: executions, error } = await supabase
      .from('webhook_executions')
      .select('id, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar execuções para limpeza:', error);
      return;
    }

    // Se temos mais de 10 execuções, deletar as mais antigas
    if (executions && executions.length > 10) {
      const executionsToDelete = executions.slice(10); // Pegar tudo além das 10 primeiras
      const idsToDelete = executionsToDelete.map(exec => exec.id);

      const { error: deleteError } = await supabase
        .from('webhook_executions')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('❌ Erro ao deletar execuções antigas:', deleteError);
      } else {
        console.log(`🧹 Limpeza automática: ${idsToDelete.length} execuções antigas removidas para empresa ${companyId}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro na limpeza automática de execuções:', error);
  }
}

// Conexões ativas por empresa (NUNCA hibernam!)
const activeConnections = new Map();
const socketInstances = new Map();

// Cache para deduplicação de POSTs (evitar POSTs duplicados do mesmo webhook+evento)
const postCache = new Map();
const POST_CACHE_TTL = 3000; // 3 segundos - janela razoável para prevenir duplicatas
const MAX_POST_CACHE_SIZE = 1000;

// Fila de processamento sequencial para evitar race conditions  
const processingQueue = new Map(); // Map de companyId -> Array de eventos
const isProcessing = new Map(); // Map de companyId -> boolean
const processingTimestamps = new Map(); // Map de companyId -> timestamp (para timeout)
const MAX_QUEUE_SIZE = 1000; // ✅ GARANTIA: 1000 eventos - NUNCA perder POSTs

// ✅ THROTTLING: Rate limiting para prevenir picos de CPU
const REQUEST_THROTTLE = new Map(); // Map de companyId -> última execução
const MIN_REQUEST_INTERVAL = 100; // ✅ CORREÇÃO: 100ms para suportar 10 req/s (era 500ms = só 2 req/s)

// Cache para webhooks ativos por empresa (evita consultas múltiplas)
const activeWebhooksCache = new Map();
const WEBHOOK_CACHE_TTL = 10000; // 10 segundos
const MAX_WEBHOOK_CACHE_SIZE = 100; // ✅ LIMITE: Máximo 100 empresas em cache

// Log inicial
console.log('🚀 3C Plus Webhook Proxy Server iniciando...');
console.log('📅 Timestamp:', new Date().toISOString());

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
    cache_size: postCache.size,
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
      // ✅ LIMPO: Empresa sem webhooks é normal, não precisa log
      return;
    }

    // ✅ LIMPO: Removido log verboso de webhooks encontrados

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
    
    // ✅ LIMPO: Removido log de conexão bem-sucedida
    
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
        
        // Atualizar status da conexão
        const connection = activeConnections.get(company.id);
        if (connection) {
          connection.lastActivity = new Date().toISOString();
          connection.status = 'connected';
        }
        
        resolve(socket);
      });

      socket.on('disconnect', (reason) => {
        console.log(`🚨 CRÍTICO: Socket desconectado ${company.name}: ${reason} - TENTANDO RECONECTAR!`);
        
        // Atualizar status
        const connection = activeConnections.get(company.id);
        if (connection) {
          connection.status = 'disconnected';
          connection.lastActivity = new Date().toISOString();
          connection.disconnectReason = reason;
          connection.lastDisconnect = new Date().toISOString();
        }
        
        // 🛡️ RECONEXÃO AUTOMÁTICA IMEDIATA (não esperar 120s do monitor)
        setTimeout(async () => {
          try {
            console.log(`🔄 RECONECTANDO empresa ${company.name} após desconexão...`);
            await connectCompany(company.id);
            console.log(`✅ SUCESSO: Empresa ${company.name} reconectada automaticamente!`);
          } catch (error) {
            console.error(`❌ FALHA na reconexão automática de ${company.name}:`, error);
            
            // 🛡️ RETRY COM BACKOFF: tentar novamente em 30s, 60s, 120s
            setTimeout(() => attemptReconnectWithBackoff(company.id, company.name, 1), 30000);
          }
        }, 5000); // Tentar reconectar em 5 segundos
      });

      socket.on('connect_error', (error) => {
        console.error(`❌ Erro de conexão socket para empresa ${company.name}:`, error);
        reject(error);
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
      
      // Limpar heartbeat ao desconectar
      socket.on('disconnect', () => {
        clearInterval(heartbeatInterval);
      });
      
      // Escutar TODOS os eventos com PROCESSAMENTO SEQUENCIAL
      socket.onAny(async (eventName, eventData) => {
        try {
          // ✅ OTIMIZAÇÃO: Log apenas POST attempts conforme preferência do usuário
          // Removido log para cada evento recebido (reduz 60% CPU)
          
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
  
  try {
    console.log(`🔄 RETRY ${attempt}/${maxAttempts}: Reconectando ${companyName}...`);
    await connectCompany(companyId);
    console.log(`✅ SUCESSO: Empresa ${companyName} reconectada no retry ${attempt}!`);
  } catch (error) {
    console.error(`❌ RETRY ${attempt} FALHOU para ${companyName}:`, error);
    
    const delay = delays[attempt - 1] || delays[delays.length - 1];
    console.log(`⏰ Próxima tentativa para ${companyName} em ${delay/1000}s...`);
    
    setTimeout(() => attemptReconnectWithBackoff(companyId, companyName, attempt + 1), delay);
  }
}

// ✅ REMOVIDO: Sistema de deduplicação incorreto que estava filtrando eventos legítimos

// ✅ FUNÇÃO: Limpeza agressiva de memória para evitar crashes
function cleanupMemory() {
  try {
    // 1. Limpar cache de eventos quando necessário
    if (eventCache.size > MAX_CACHE_SIZE * 0.8) { // 80% do limite em vez de 50%
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

// SISTEMA DE FILA SEQUENCIAL (ELIMINA RACE CONDITIONS)
function addEventToQueue(companyId, eventName, eventData, companyName) {
  // Inicializar fila se não existe
  if (!processingQueue.has(companyId)) {
    processingQueue.set(companyId, []);
  }
  
  // 🔥 PROTEÇÃO EXTRA: Verificar memória ANTES de adicionar eventos
  const memUsage = process.memoryUsage();
  const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  const rssPercent = Math.round((memUsage.rss / (2 * 1024 * 1024 * 1024)) * 100); // 2GB Standard plan
  
  // ✅ PROTEÇÃO CRÍTICA INTELIGENTE: Só descartar se realmente crítico
  if (heapPercent > 95 || rssPercent > 95) {
    console.log(`🚫 MEMÓRIA EXTREMA: Heap:${heapPercent}% RSS:${rssPercent}% - Descartando ${eventName} para evitar crash`);
    cleanupMemory(); // Forçar limpeza agressiva
    return; // Não adicionar o evento apenas em casos EXTREMOS
  }
  
  // ✅ ALERTA PREVENTIVO: Alertar mas continuar processando
  if (heapPercent > 85 || rssPercent > 90) {
    console.log(`⚠️ MEMÓRIA ALTA: Heap:${heapPercent}% RSS:${rssPercent}% - Limpeza preventiva`);
    cleanupMemory(); // Limpeza preventiva mas continua processando
  }
  
  const queue = processingQueue.get(companyId);
  
  // ✅ PROTEÇÃO: Só alertar quando fila fica muito grande, MAS NUNCA REMOVER
  if (queue.length >= MAX_QUEUE_SIZE * 0.8) { // 80% = 800 eventos
    console.log(`⚠️ ALERTA: Fila da empresa ${companyName} com ${queue.length} eventos - sistema pode estar sobrecarregado`);
  }
  
  // ✅ GARANTIA UNIVERSAL: NUNCA remover eventos da fila - TODAS as empresas têm 100% dos POSTs garantidos!
  
  // Adicionar evento à fila
  queue.push({
    eventName,
    eventData,
    companyName,
    timestamp: Date.now()
  });
  
  // ✅ PROCESSAMENTO ACELERADO: Se fila está grande, processar mais rápido
  if (queue.length > 100) {
    // Remover throttling temporariamente para acelerar processamento
    REQUEST_THROTTLE.delete(companyId);
  }
  
  // ✅ PROTEÇÃO: Executar limpeza de memória se necessário
  if (queue.length > MAX_QUEUE_SIZE * 0.8) {
    cleanupMemory();
  }
  
  // ✅ FORÇA RESET: Se fila > 1000 eventos OU processamento > 5 minutos, forçar reset
  const currentQueueSize = queue.length;
  const processingStart = processingTimestamps.get(companyId);
  const isStuck = processingStart && (Date.now() - processingStart) > 300000; // 5 minutos
  
  if ((currentQueueSize > 1000 || isStuck) && isProcessing.get(companyId)) {
    const reason = isStuck ? 'TIMEOUT 5min' : `${currentQueueSize} eventos`;
    console.log(`🔄 FORCE RESET: Empresa ${companyName} (${reason}) - FORÇANDO reset do processamento travado`);
    isProcessing.set(companyId, false);
    processingTimestamps.delete(companyId);
  }

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
  processingTimestamps.set(companyId, Date.now()); // ✅ TIMEOUT: Marcar início
  
  try {
    while (processingQueue.get(companyId)?.length > 0) {
      const event = processingQueue.get(companyId).shift();
      
      // ✅ LOG ESSENCIAL: Evento desejado recebido (conforme pedido do usuário)
      console.log(`🎯 EVENTO: ${event.eventName} recebido de ${event.companyName}`);
      
      // Atualizar última atividade
      const connection = activeConnections.get(companyId);
      if (connection) {
        connection.lastActivity = new Date().toISOString();
      }

      // ✅ THROTTLING INTELIGENTE: Acelerar quando fila está grande
      const queueSize = processingQueue.get(companyId)?.length || 0;
      const lastExecution = REQUEST_THROTTLE.get(companyId) || 0;
      const timeSinceLastExecution = Date.now() - lastExecution;
      
      // Se fila > 100 eventos, remover throttling para acelerar
      const currentInterval = queueSize > 100 ? 0 : MIN_REQUEST_INTERVAL;
      
      if (timeSinceLastExecution < currentInterval) {
        const waitTime = currentInterval - timeSinceLastExecution;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Processar evento através dos webhooks (SEQUENCIAL)
      await processEventThroughWebhooks(companyId, event.eventName, event.eventData, null);
      
      // Atualizar timestamp da última execução
      REQUEST_THROTTLE.set(companyId, Date.now());
      
      // ✅ DELAY INTELIGENTE: Acelerar quando fila está grande
      const finalQueueSize = processingQueue.get(companyId)?.length || 0;
      const delay = finalQueueSize > 100 ? 0 : 10; // Zero delay se fila grande
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } catch (error) {
    console.error(`❌ Erro no processamento sequencial para empresa ${companyId}:`, error);
  } finally {
    isProcessing.set(companyId, false);
    processingTimestamps.delete(companyId); // ✅ TIMEOUT: Limpar timestamp
  }
}

// ✅ REMOVIDAS: Funções de deduplicação incorretas que estavam bloqueando eventos legítimos

function cleanupCaches() {
  const now = Date.now();
  let expiredPosts = 0;
  let expiredWebhooks = 0;
  
  // Limpar cache de POSTs expirados
  for (const [key, value] of postCache.entries()) {
    if (now - value.timestamp > POST_CACHE_TTL) {
      postCache.delete(key);
      expiredPosts++;
    }
  }
  
  // Limpar cache de webhooks expirados
  for (const [key, value] of activeWebhooksCache.entries()) {
    if (now - value.timestamp > WEBHOOK_CACHE_TTL) {
      activeWebhooksCache.delete(key);
      expiredWebhooks++;
    }
  }
  
  if (expiredPosts > 0 || expiredWebhooks > 0) {
    console.log(`🧹 Cache limpo: ${expiredPosts} POSTs e ${expiredWebhooks} webhooks expirados removidos`);
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
    // Buscar webhooks ativos atualizados (com cache)
    const currentWebhooks = await getActiveWebhooksForCompany(companyId);

    if (!currentWebhooks || currentWebhooks.length === 0) {
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
    // ✅ DEDUPLICAÇÃO CORRETA: Verificar se este POST específico já foi feito recentemente
    const postKey = `${webhook.id}:${eventName}:${companyId}:${JSON.stringify(eventData).substring(0, 100)}`;
    const now = Date.now();
    const existingPost = postCache.get(postKey);
    
    if (existingPost && (now - existingPost.timestamp) < POST_CACHE_TTL) {
      console.log(`🔄 POST DUPLICADO: ${webhook.url} - já enviado há ${Math.round((now - existingPost.timestamp)/1000)}s`);
      return { success: false, reason: 'Duplicate POST prevented' };
    }
    
    // Marcar POST como sendo executado
    postCache.set(postKey, { timestamp: now });
    
    // Limpar cache se muito grande
    if (postCache.size > MAX_POST_CACHE_SIZE) {
      cleanupCaches();
    }
    
    // ✅ LOG ESSENCIAL: POST sendo executado (conforme pedido do usuário)
    console.log(`📤 POST: ${webhook.url}`);
    
    // Buscar filtros para este evento específico neste webhook
    const webhookEvent = webhook.webhook_events?.find(we => we.event?.name === eventName);
    const eventFilters = webhookEvent?.filters || [];
    
    // ✅ OTIMIZAÇÃO: Log apenas filtros quando há falha (reduz 90% dos logs)
    
    // ✅ CRÍTICO: Removidos 180+ linhas de logs de debug que consumiam 40% da CPU
    
    // Aplicar filtros - se não passar, não enviar o webhook
    if (!applyEventFilters(eventData, eventFilters)) {
      // ✅ LIMPO: Removido log verboso de filtros (muito spam)
      return { success: false, reason: 'Event filtered out' };
    }
    
    // ✅ OTIMIZAÇÃO: Log reduzido (já logamos POST attempt acima)
    
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
      // ✅ LIMPO: Removido log de database write (muito verboso)
      // Executar limpeza automática para manter apenas 10 execuções por empresa
      await cleanupOldExecutions(companyId);
    }

    // ✅ LOG ESSENCIAL: Apenas falhas são importantes
    if (status === 'failed') {
      console.log(`❌ POST falhou: ${webhook.url} - ${response.status}`);
    }
    
    return {
      webhook_id: webhook.id,
      status,
      response_status: response.status,
      error_message: errorMessage
    };

  } catch (error) {
    console.error(`❌ Erro ao executar webhook ${webhook.id}:`, error);
    
    // Salvar execução com falha
    const { error: failedExecutionError } = await supabase
      .from('webhook_executions')
      .insert({
        webhook_id: webhook.id,
        company_id: companyId,
        event_id: eventId,
        status: 'failed',
        error_message: error.message
      });

    if (!failedExecutionError) {
      // Executar limpeza automática para manter apenas 10 execuções por empresa
      await cleanupOldExecutions(companyId);
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
      
      // 🛡️ WATCHDOG 3: Verificar filas travadas
      for (const [companyId, queue] of processingQueue.entries()) {
        if (queue.length > 50 && isProcessing.get(companyId)) {
          const processingStart = processingTimestamps.get(companyId);
          if (processingStart && (now - processingStart) > 300000) { // 5 minutos
            console.log(`🚨 WATCHDOG: Fila da empresa ${companyId} travada há 5min+ - DESTRAVANDO!`);
            isProcessing.set(companyId, false);
            processingTimestamps.delete(companyId);
            processEventQueue(companyId);
          }
        }
      }
      
      // 🛡️ WATCHDOG 4: Verificar empresas desconectadas há muito tempo
      await checkAndDisconnectInactiveCompanies();
      for (const [companyId] of activeConnections) {
        await checkAndDisconnectIfNoActiveWebhooks(companyId);
      }
      
      // 📊 Status resumido
      const connections = Array.from(activeConnections.values());
      const connected = connections.filter(c => c.status === 'connected').length;
      const disconnected = connections.filter(c => c.status === 'disconnected').length;
      
      console.log(`🛡️ WATCHDOG: ${connected} conectadas, ${disconnected} desconectadas, ${postCache.size} POSTs em cache`);
      
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
        
        // 🛡️ LIMPEZA SEGURA: NÃO limpar filas de processamento (pode perder eventos!)
        // eventCache.clear(); // ✅ REMOVIDO: Era referência antiga
        
        // Limpar apenas caches seguros
        activeWebhooksCache.clear();
        
        // ⚠️ CUIDADO: NÃO limpar processingQueue (perderia eventos!)
        // Apenas reduzir filas muito grandes (manter últimos 100)
        for (const [companyId, queue] of processingQueue.entries()) {
          if (queue.length > 200) {
            const keptEvents = queue.slice(-100); // Manter últimos 100
            processingQueue.set(companyId, keptEvents);
            console.log(`🔧 REDUZINDO fila da empresa ${companyId}: ${queue.length} -> ${keptEvents.length} eventos`);
          }
        }
        
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

