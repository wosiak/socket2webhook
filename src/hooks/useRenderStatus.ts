import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

interface RenderStatus {
  isServerRunning: boolean;
  activeCompanies: number;
  totalConnections: number;
  serverUptime?: number;
  lastCheck: string;
  isLoading: boolean;
  error: string | null;
}

interface CompanyConnectionStatus {
  isConnected: boolean;
  status: string;
  lastActivity: string | null;
  webhooksCount: number;
  companyName: string;
}

export function useRenderStatus() {
  const [status, setStatus] = useState<RenderStatus>({
    isServerRunning: false,
    activeCompanies: 0,
    totalConnections: 0,
    lastCheck: new Date().toISOString(),
    isLoading: true,
    error: null
  });

  // Verificar status do servidor
  const checkServerStatus = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      const connectivity = await apiService.healthCheck();
      
      setStatus({
        isServerRunning: connectivity.serverRunning,
        activeCompanies: connectivity.activeCompanies,
        totalConnections: connectivity.totalConnections,
        serverUptime: connectivity.serverUptime,
        lastCheck: new Date().toISOString(),
        isLoading: false,
        error: null
      });

      console.log('✅ Status do servidor Render atualizado:', connectivity);
      
    } catch (error) {
      console.error('❌ Erro ao verificar status do servidor:', error);
      
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  }, []);

  // Verificar status de uma empresa específica
  const checkCompanyStatus = useCallback(async (companyId: string): Promise<CompanyConnectionStatus> => {
    try {
      const companyStatus = await apiService.getCompanyStatus(companyId);
      
      console.log(`🔍 Status da empresa ${companyId}:`, companyStatus);
      
      return companyStatus;
    } catch (error) {
      console.error(`❌ Erro ao verificar status da empresa ${companyId}:`, error);
      
      return {
        isConnected: false,
        status: 'error',
        lastActivity: null,
        webhooksCount: 0,
        companyName: 'Unknown'
      };
    }
  }, []);

  // Forçar reconexão de uma empresa
  const reconnectCompany = useCallback(async (companyId: string) => {
    try {
      const result = await apiService.reconnectCompany(companyId);
      
      // Atualizar status após reconexão
      setTimeout(() => {
        checkServerStatus();
      }, 2000);
      
      return result;
    } catch (error) {
      console.error(`❌ Erro ao reconectar empresa ${companyId}:`, error);
      throw error;
    }
  }, [checkServerStatus]);

  // Verificar se servidor está saudável
  const isHealthy = useCallback((): boolean => {
    return status.isServerRunning && !status.error;
  }, [status.isServerRunning, status.error]);

  // Efeito para verificação inicial e periódica
  useEffect(() => {
    // Verificação inicial
    checkServerStatus();

    // Verificação periódica a cada 30 segundos
    const interval = setInterval(() => {
      checkServerStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkServerStatus]);

  return {
    status,
    checkServerStatus,
    checkCompanyStatus,
    reconnectCompany,
    isHealthy,
    // Helpers
    isConnected: status.isServerRunning,
    hasActiveCompanies: status.activeCompanies > 0,
    serverUptime: status.serverUptime ? Math.floor(status.serverUptime) : 0
  };
}

export default useRenderStatus;
