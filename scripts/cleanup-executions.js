#!/usr/bin/env node

/**
 * 🚨 SCRIPT DE EMERGÊNCIA: Limpeza de Execuções de Webhook
 * 
 * Este script remove execuções antigas mantendo apenas as N mais recentes por empresa.
 * Use quando o banco estiver sobrecarregado com muitas execuções.
 * 
 * Uso:
 * node scripts/cleanup-executions.js [keep_count] [dry_run]
 * 
 * Exemplos:
 * node scripts/cleanup-executions.js 10 true    # Ver o que seria deletado (dry run)
 * node scripts/cleanup-executions.js 10 false   # Executar limpeza mantendo 10 por empresa
 * node scripts/cleanup-executions.js 0 false    # PERIGO: Deletar TODAS as execuções
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupExecutions(keepCount = 10, dryRun = true) {
  try {

    // 1. Verificar estado atual
    const { data: stats, error: statsError } = await supabase
      .from('webhook_executions')
      .select('company_id')
      .then(result => {
        if (result.error) throw result.error;
        
        const companyCounts = {};
        result.data.forEach(exec => {
          companyCounts[exec.company_id] = (companyCounts[exec.company_id] || 0) + 1;
        });
        
        return {
          data: {
            total: result.data.length,
            companies: Object.keys(companyCounts).length,
            byCompany: companyCounts
          },
          error: null
        };
      });

    if (statsError) throw statsError;

    
    // Mostrar top 10 empresas com mais execuções
    const topCompanies = Object.entries(stats.byCompany)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    topCompanies.forEach(([companyId, count], index) => {
    });

    // 2. Calcular o que seria deletado
    let totalToDelete = 0;
    for (const [companyId, count] of Object.entries(stats.byCompany)) {
      if (count > keepCount) {
        totalToDelete += count - keepCount;
      }
    }

    const totalAfter = stats.total - totalToDelete;
    const reductionPercent = Math.round((totalToDelete / stats.total) * 100);


    if (dryRun) {
      return;
    }

    // 3. Confirmar antes de executar
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 4. Executar limpeza usando a função SQL
    const companyIds = Object.keys(stats.byCompany).map(id => parseInt(id));
    
    const { data: deletedCount, error: cleanupError } = await supabase
      .rpc('cleanup_old_executions_batch', {
        company_ids: companyIds,
        keep_count: keepCount
      });

    if (cleanupError) {
      console.error('❌ Erro na limpeza:', cleanupError);
      process.exit(1);
    }

    
    // 5. Verificar resultado
    const { data: finalStats } = await supabase
      .from('webhook_executions')
      .select('id', { count: 'exact' });


  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

// Executar script
const keepCount = parseInt(process.argv[2]) || 10;
const dryRun = process.argv[3] !== 'false';

cleanupExecutions(keepCount, dryRun);
