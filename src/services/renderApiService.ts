// Render API Service - Substitui Edge Functions
const RENDER_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://webhook-proxy-server.onrender.com'
  : 'http://localhost:3000';

interface RenderApiResponse {
  success?: boolean;
  message: string;
  [key: string]: any;
}

class RenderApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = RENDER_API_URL;
  }

  // Health check do servidor
  async healthCheck(): Promise<RenderApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erro no health check:', error);
      throw error;
    }
  }

  // Status detalhado das conexões
  async getStatus(): Promise<RenderApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erro ao obter status:', error);
      throw error;
    }
  }

  // Forçar reconexão de uma empresa específica
  async reconnectCompany(companyId: string): Promise<RenderApiResponse> {
    try {
      console.log(`🔄 Forçando reconexão da empresa: ${companyId}`);
      
      const response = await fetch(`${this.baseUrl}/reconnect/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Reconnect failed: ${response.status} - ${errorData.message}`);
      }

      const result = await response.json();
      console.log(`✅ Reconexão bem-sucedida:`, result);
      
      return result;
    } catch (error) {
      console.error(`❌ Erro ao reconectar empresa ${companyId}:`, error);
      throw error;
    }
  }

  // Verificar se o servidor está rodando
  async isServerRunning(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch (error) {
      console.error('❌ Servidor não está rodando:', error);
      return false;
    }
  }

  // Obter informações de uma empresa específica
  async getCompanyStatus(companyId: string): Promise<any> {
    try {
      const status = await this.getStatus();
      const connections = status.connections || [];
      
      const companyConnection = connections.find((conn: any) => conn.company_id === companyId);
      
      return {
        isConnected: !!companyConnection,
        status: companyConnection?.status || 'disconnected',
        lastActivity: companyConnection?.last_activity,
        webhooksCount: companyConnection?.webhooks_count || 0,
        companyName: companyConnection?.company_name
      };
    } catch (error) {
      console.error(`❌ Erro ao obter status da empresa ${companyId}:`, error);
      return {
        isConnected: false,
        status: 'error',
        lastActivity: null,
        webhooksCount: 0,
        companyName: 'Unknown'
      };
    }
  }

  // Verificar conectividade geral
  async checkConnectivity(): Promise<{
    serverRunning: boolean;
    activeCompanies: number;
    totalConnections: number;
    serverUptime?: number;
  }> {
    try {
      const health = await this.healthCheck();
      
      return {
        serverRunning: true,
        activeCompanies: health.active_companies || 0,
        totalConnections: health.connections?.length || 0,
        serverUptime: health.uptime
      };
    } catch (error) {
      return {
        serverRunning: false,
        activeCompanies: 0,
        totalConnections: 0
      };
    }
  }

  // Log para debug
  logStatus(message: string, data?: any) {
    console.log(`🔍 Render API: ${message}`, data ? data : '');
  }
}

export const renderApiService = new RenderApiService();
export default renderApiService;
