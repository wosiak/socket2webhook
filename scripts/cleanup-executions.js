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
    console.log(`🧹 LIMPEZA DE EXECUÇÕES`);
    console.log(`📊 Manter: ${keepCount} execuções por empresa`);
    console.log(`🔍 Modo: ${dryRun ? 'DRY RUN (apenas visualizar)' : 'EXECUTAR LIMPEZA'}`);
    console.log('─'.repeat(50));

    // 1. Verificar estado atual
    console.log('📈 Analisando estado atual...');
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

    console.log(`📊 Total atual: ${stats.total.toLocaleString()} execuções`);
    console.log(`🏢 Empresas: ${stats.companies}`);
    console.log(`📈 Média por empresa: ${Math.round(stats.total / stats.companies)}`);
    
    // Mostrar top 10 empresas com mais execuções
    const topCompanies = Object.entries(stats.byCompany)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    console.log('\n🔝 Top 10 empresas com mais execuções:');
    topCompanies.forEach(([companyId, count], index) => {
      console.log(`${index + 1}. Empresa ${companyId}: ${count.toLocaleString()} execuções`);
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

    console.log('\n📊 IMPACTO DA LIMPEZA:');
    console.log(`🗑️  Execuções a deletar: ${totalToDelete.toLocaleString()} (${reductionPercent}%)`);
    console.log(`✅ Execuções restantes: ${totalAfter.toLocaleString()}`);
    console.log(`💾 Redução de espaço: ~${Math.round(totalToDelete * 0.5 / 1024)} MB estimados`);

    if (dryRun) {
      console.log('\n🔍 DRY RUN - Nenhuma alteração foi feita.');
      console.log('Para executar a limpeza, rode: node scripts/cleanup-executions.js', keepCount, 'false');
      return;
    }

    // 3. Confirmar antes de executar
    console.log('\n⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!');
    console.log('Pressione Ctrl+C nos próximos 10 segundos para cancelar...');
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 4. Executar limpeza usando a função SQL
    console.log('\n🚀 Executando limpeza...');
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

    console.log(`✅ Limpeza concluída!`);
    console.log(`🗑️  Execuções deletadas: ${deletedCount?.toLocaleString() || 'N/A'}`);
    
    // 5. Verificar resultado
    const { data: finalStats } = await supabase
      .from('webhook_executions')
      .select('id', { count: 'exact' });

    console.log(`📊 Total final: ${finalStats?.length || 0} execuções`);
    console.log(`🎉 Redução: ${((stats.total - (finalStats?.length || 0)) / stats.total * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

// Executar script
const keepCount = parseInt(process.argv[2]) || 10;
const dryRun = process.argv[3] !== 'false';

cleanupExecutions(keepCount, dryRun);
