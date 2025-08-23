import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Zap, 
  AlertCircle,
  Users,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from "lucide-react";

interface Metrics {
  company_id: string;
  company_name: string;
  total_events: number;
  successful_events: number;
  failed_events: number;
  retrying_events: number;
  success_rate: number;
  last_event_at?: string;
}

interface MostUsedEvent {
  event_name: string;
  event_description: string;
  usage_count: number;
}

interface Execution {
  id: string;
  company_id: string;
  company_name: string;
  event_type: string;
  status: 'pending' | 'success' | 'failed';
  webhook_url: string;
  webhook_name?: string;
  timestamp: string;
  error_message?: string;
  response_status?: number;
}

interface DashboardProps {
  metrics: Metrics[];
  companyMetrics: any[];
  executions: Execution[];
  mostUsedEvents: MostUsedEvent[];
}

export function Dashboard({ metrics, companyMetrics, executions, mostUsedEvents }: DashboardProps) {
  // Calculate totals
  const totalExecutions = metrics.reduce((sum, metric) => sum + metric.total_events, 0);
  const totalSuccessful = metrics.reduce((sum, metric) => sum + metric.successful_events, 0);
  const totalFailed = metrics.reduce((sum, metric) => sum + metric.failed_events, 0);
  const totalPending = metrics.reduce((sum, metric) => sum + metric.retrying_events, 0);
  
  const successRate = totalExecutions > 0 ? (totalSuccessful / totalExecutions) * 100 : 0;
  
  // Recent executions (last 10)
  const recentExecutions = [...executions]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 style={{ width: '16px', height: '16px', color: '#059669' }} />;
      case 'failed':
        return <XCircle style={{ width: '16px', height: '16px', color: '#dc2626' }} />;
      case 'pending':
        return <Clock style={{ width: '16px', height: '16px', color: '#d97706' }} />;
      default:
        return <AlertCircle style={{ width: '16px', height: '16px', color: '#717182' }} />;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'success':
        return {
          backgroundColor: '#dcfce7',
          color: '#15803d',
          border: '1px solid #bbf7d0'
        };
      case 'failed':
        return {
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca'
        };
      case 'pending':
        return {
          backgroundColor: '#fef3c7',
          color: '#d97706',
          border: '1px solid #fde68a'
        };
      default:
        return {
          backgroundColor: '#ececf0',
          color: '#717182'
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Visão geral do sistema de webhooks e métricas de execução
              </p>
            </div>

          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Execuções</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalExecutions}</div>
              <p className="text-xs text-gray-500">
                +{totalExecutions > 0 ? Math.round((totalExecutions / (totalExecutions + 1)) * 100) : 0}% desde o último mês
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taxa de Sucesso</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{successRate.toFixed(1)}%</div>
              <Progress value={successRate} className="mt-2" />
              <p className="text-xs text-gray-500 mt-1">
                {totalSuccessful} de {totalExecutions} execuções bem-sucedidas
              </p>
            </CardContent>
          </Card>



          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Execuções Falharam</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalFailed}</div>
              <p className="text-xs text-gray-500">
                Requerem atenção
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Most Used Events Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Eventos Mais Utilizados
            </CardTitle>
            <CardDescription className="text-gray-600">
              Métricas dos tipos de eventos mais configurados pelas empresas
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            {mostUsedEvents.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum evento configurado</h3>
                <p className="text-gray-600 mt-2">
                  Os eventos mais utilizados aparecerão aqui quando houver configurações
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {mostUsedEvents.map((event, index) => (
                  <div key={event.name || event.event_name || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{event.name || event.event_name || 'Evento sem nome'}</h4>
                        <p className="text-sm text-gray-600">{event.display_name || event.event_description || 'Sem descrição'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{event.count || event.usage_count || 0}</div>
                      <div className="text-sm text-gray-500">configurações</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Metrics */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Users className="h-5 w-5 text-blue-600" />
              Métricas por Empresa
            </CardTitle>
            <CardDescription className="text-gray-600">
              Performance de webhooks por empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companyMetrics.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma empresa encontrada</h3>
                <p className="text-gray-600 mt-2">
                  As métricas por empresa aparecerão aqui quando houver dados
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {companyMetrics.map((metric) => {
                  return (
                    <div key={metric.company} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{metric.company}</h4>
                          <p className="text-sm text-gray-600">
                            {metric.total} execuções totais
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">{metric.successful}</div>
                          <div className="text-xs text-gray-500">Sucessos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">{metric.failed}</div>
                          <div className="text-xs text-gray-500">Falhas</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-yellow-600">{metric.pending}</div>
                          <div className="text-xs text-gray-500">Pendentes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">{metric.successRate}%</div>
                          <div className="text-xs text-gray-500">Taxa de Sucesso</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Activity className="h-5 w-5 text-blue-600" />
              Execuções Recentes
            </CardTitle>
            <CardDescription className="text-gray-600">
              Últimas execuções de webhooks no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentExecutions.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma execução registrada</h3>
                <p className="text-gray-600 mt-2">
                  As execuções recentes aparecerão aqui quando houver atividade
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExecutions.map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(execution.status)}
                      <div className="flex items-center gap-3">
                        <div className="min-w-[120px]">
                          <h4 className="font-medium text-gray-900">{execution.company_name}</h4>
                          <p className="text-xs text-gray-500">Empresa</p>
                        </div>
                        <div className="border-l border-gray-300 h-8"></div>
                        <div>
                          <h4 className="font-medium text-gray-900">{execution.event_type}</h4>
                          <p className="text-sm text-gray-600">
                            {execution.webhook_name || 'Webhook'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge style={getStatusBadgeStyle(execution.status)}>
                        {execution.status === 'success' ? 'Sucesso' : 
                         execution.status === 'failed' ? 'Falha' : 'Pendente'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {execution.status === 'success' ? `HTTP ${execution.response_status || 200}` : 
                         execution.status === 'failed' ? `Falha: ${execution.response_status || 0}` : 
                         'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}