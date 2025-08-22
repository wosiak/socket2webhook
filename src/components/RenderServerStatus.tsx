import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useRenderStatus } from '../hooks/useRenderStatus';
import { 
  Server, 
  Activity, 
  Users, 
  Wifi, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

interface RenderServerStatusProps {
  companyId?: string;
  showDetails?: boolean;
}

export function RenderServerStatus({ companyId, showDetails = true }: RenderServerStatusProps) {
  const { 
    status, 
    checkServerStatus, 
    checkCompanyStatus, 
    reconnectCompany,
    isHealthy,
    serverUptime 
  } = useRenderStatus();

  const [companyStatus, setCompanyStatus] = React.useState<any>(null);
  const [isReconnecting, setIsReconnecting] = React.useState(false);

  // Verificar status da empresa específica
  React.useEffect(() => {
    if (companyId) {
      checkCompanyStatus(companyId).then(setCompanyStatus);
    }
  }, [companyId, checkCompanyStatus]);

  // Forçar reconexão da empresa
  const handleReconnect = async () => {
    if (!companyId) return;
    
    setIsReconnecting(true);
    try {
      await reconnectCompany(companyId);
      // Atualizar status da empresa após reconexão
      setTimeout(async () => {
        const newStatus = await checkCompanyStatus(companyId);
        setCompanyStatus(newStatus);
      }, 3000);
    } catch (error) {
      console.error('Erro ao reconectar:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Formatartime de uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        {isHealthy() ? (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Servidor Online
          </Badge>
        ) : (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Servidor Offline
          </Badge>
        )}
        {status.activeCompanies > 0 && (
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {status.activeCompanies} empresas conectadas
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Servidor Render</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkServerStatus}
              disabled={status.isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${status.isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {companyId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                disabled={isReconnecting}
              >
                <Wifi className={`h-4 w-4 mr-1 ${isReconnecting ? 'animate-pulse' : ''}`} />
                {isReconnecting ? 'Reconectando...' : 'Reconectar'}
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Status do sistema 24/7 - Última verificação: {new Date(status.lastCheck).toLocaleTimeString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Geral do Servidor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className={`p-2 rounded-full ${isHealthy() ? 'bg-green-100' : 'bg-red-100'}`}>
              {isHealthy() ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">Status do Servidor</p>
              <p className={`text-xs ${isHealthy() ? 'text-green-600' : 'text-red-600'}`}>
                {status.isServerRunning ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className="p-2 rounded-full bg-blue-100">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Empresas Ativas</p>
              <p className="text-xs text-blue-600">
                {status.activeCompanies} conectadas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className="p-2 rounded-full bg-purple-100">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Uptime</p>
              <p className="text-xs text-purple-600">
                {serverUptime > 0 ? formatUptime(serverUptime) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Status da Empresa Específica */}
        {companyId && companyStatus && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3 text-gray-900">
              Status da Empresa: {companyStatus.companyName}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className={`p-2 rounded-full ${
                  companyStatus.isConnected ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {companyStatus.isConnected ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">Conexão Socket</p>
                  <p className={`text-xs ${
                    companyStatus.isConnected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {companyStatus.status}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="p-2 rounded-full bg-orange-100">
                  <Activity className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Webhooks Ativos</p>
                  <p className="text-xs text-orange-600">
                    {companyStatus.webhooksCount} configurados
                  </p>
                </div>
              </div>
            </div>

            {companyStatus.lastActivity && (
              <div className="mt-3 text-xs text-gray-500">
                Última atividade: {new Date(companyStatus.lastActivity).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Erro */}
        {status.error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm font-medium text-red-800">Erro de Conexão</p>
            </div>
            <p className="text-xs text-red-600 mt-1">{status.error}</p>
          </div>
        )}

        {/* Informações Adicionais */}
        {isHealthy() && (
          <div className="text-xs text-gray-500 border-t pt-3">
            <p>✅ Sistema funcionando 24/7 no Render</p>
            <p>🔄 Monitoramento automático a cada 30 segundos</p>
            <p>🚀 Auto-restart em caso de falha</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RenderServerStatus;
