import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { 
  History, 
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Search,
  X,
  Eye
} from 'lucide-react';
import { ExecutionHistory, Company } from '../types';
import { apiService } from '../services/api';

interface FullExecutionHistoryProps {
  company: Company;
  onBack: () => void;
}

export function FullExecutionHistory({ company, onBack }: FullExecutionHistoryProps) {
  const [executions, setExecutions] = useState<ExecutionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionHistory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const itemsPerPage = 50;

  // Função para extrair telefone do request_payload JSONB
  const extractPhoneFromPayload = (execution: ExecutionHistory): string | null => {
    // Primeiro tenta o campo phone_number legado
    if (execution.phone_number) {
      return execution.phone_number;
    }

    // Depois tenta extrair do request_payload
    const payload = execution.request_payload;
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    // Lista de campos possíveis onde o telefone pode estar
    const phoneFields = [
      'phone_phoneNumber',
      'phone_from',
      'phone_to',
      'phone_number',
      'phoneNumber',
      'from',
      'to',
      'phone',
      'telefone'
    ];

    for (const field of phoneFields) {
      const value = payload[field];
      if (value && typeof value === 'string') {
        return value;
      }
    }

    // Tenta buscar em objetos aninhados
    if (payload.callHistory?.number) return payload.callHistory.number;
    if (payload.phone?.phoneNumber) return payload.phone.phoneNumber;
    if (payload.phone?.from) return payload.phone.from;
    if (payload.phone?.to) return payload.phone.to;

    return null;
  };

  const loadExecutions = async (page: number = 1, searchQuery?: string) => {
    try {
      setLoading(true);
      const offset = (page - 1) * itemsPerPage;
      
      console.log('🔍 [FullExecutionHistory] Buscando execuções:', { page, searchQuery, companyId: company.id });
      
      // Se está buscando, passa o termo de busca
      const result = await apiService.getExecutions(
        company.id, 
        itemsPerPage, 
        offset,
        searchQuery || undefined
      );
      
      console.log('✅ [FullExecutionHistory] Resultado:', result);
      
      if (result.success) {
        setExecutions(result.data || []);
        
        // Calcular total de páginas
        const totalItems = result.data?.length || 0;
        
        // Se está buscando, desabilita paginação
        if (searchQuery && searchQuery.trim()) {
          setTotalPages(1);
          setIsSearching(true);
        } else {
          setIsSearching(false);
          if (totalItems === itemsPerPage) {
            // Há mais páginas
            setTotalPages(page + 1);
          } else {
            // Última página
            setTotalPages(page);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar execuções:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar execuções quando a empresa ou página mudar (SEM busca)
  useEffect(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      loadExecutions(currentPage, undefined);
    }
  }, [company.id, currentPage]);

  // Busca com debounce quando o usuário digita
  useEffect(() => {
    if (searchTerm && searchTerm.trim() !== '') {
      // Reset para página 1 ao buscar
      setCurrentPage(1);
      
      const timer = setTimeout(() => {
        loadExecutions(1, searchTerm);
      }, 500); // Debounce de 500ms

      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    // Recarregar sem busca
    loadExecutions(1, undefined);
  };

  const handleViewData = (execution: ExecutionHistory) => {
    setSelectedExecution(execution);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      retrying: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    const labels = {
      success: 'Sucesso',
      failed: 'Falhou',
      pending: 'Pendente',
      retrying: 'Tentando'
    };

    return (
      <Badge className={`${variants[status as keyof typeof variants] || variants.pending} border`}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'retrying':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Histórico Completo de Execuções
            </h1>
            <p className="text-gray-600">
              {company.name}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => loadExecutions(currentPage, searchTerm)}
          className="flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Main Card */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <History className="h-5 w-5 text-blue-600" />
                Execuções de Webhooks
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Busque por telefone, list ID, ou qualquer campo presente no evento
              </CardDescription>
            </div>
            
            {/* Search Bar */}
            <div className="w-full max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar em qualquer campo: telefone, ID, mensagem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {isSearching && (
                <p className="text-xs text-blue-600 mt-1">
                  🔍 Mostrando resultados para: "{searchTerm}"
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Carregando execuções...</span>
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {isSearching ? 'Nenhum resultado encontrado' : 'Nenhuma execução encontrada'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isSearching ? 'Tente outro termo de busca' : 'As execuções aparecerão aqui quando os webhooks forem disparados'}
              </p>
              {isSearching && (
                <Button
                  variant="outline"
                  onClick={handleClearSearch}
                  className="mt-4"
                >
                  Limpar busca
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Evento</TableHead>
                      <TableHead className="font-semibold text-gray-900">URL do Webhook</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900">HTTP</TableHead>
                      <TableHead className="font-semibold text-gray-900">Data/Hora</TableHead>
                      <TableHead className="font-semibold text-gray-900 text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((execution) => (
                      <TableRow key={execution.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(execution.status)}
                            <code className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono">
                              {execution.event_type || execution.event?.name || 'call-history'}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {execution.webhook?.url ? (
                            <a
                              href={execution.webhook.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block"
                              title={execution.webhook.url}
                            >
                              {execution.webhook.url}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">URL não disponível</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(execution.status || 'pending')}
                        </TableCell>
                        <TableCell>
                          {execution.response_status ? (
                            <Badge 
                              variant="outline" 
                              className={
                                execution.response_status >= 200 && execution.response_status < 300
                                  ? 'border-green-300 text-green-700'
                                  : 'border-red-300 text-red-700'
                              }
                            >
                              {execution.response_status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-600">
                          {execution.created_at ? new Date(execution.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewData(execution)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Dados
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {!isSearching && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} {totalPages > currentPage && `de ${totalPages}+`}
                    {' '}• Mostrando {executions.length} registros
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded border">
                      {currentPage}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={executions.length < itemsPerPage || loading}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage >= totalPages || loading}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal para visualizar dados completos */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Dados Completos do Evento
            </DialogTitle>
            <DialogDescription>
              Todos os campos recebidos no evento {selectedExecution?.event_type}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Informações básicas */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Evento</p>
                <p className="text-sm text-gray-900 mt-1">{selectedExecution?.event_type || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Status</p>
                <div className="mt-1">
                  {selectedExecution && getStatusBadge(selectedExecution.status)}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Data/Hora</p>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedExecution?.created_at ? new Date(selectedExecution.created_at).toLocaleString('pt-BR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Telefone</p>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedExecution ? extractPhoneFromPayload(selectedExecution) || '-' : '-'}
                </p>
              </div>
            </div>

            {/* JSON Completo */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">📦 Payload Completo (JSON)</p>
              <ScrollArea className="h-96 w-full border rounded-lg p-4 bg-gray-900">
                <pre className="text-xs text-green-400 font-mono">
                  {selectedExecution?.request_payload 
                    ? JSON.stringify(selectedExecution.request_payload, null, 2)
                    : selectedExecution?.payload
                    ? JSON.stringify(selectedExecution.payload, null, 2)
                    : 'Nenhum dado disponível'}
                </pre>
              </ScrollArea>
            </div>

            {/* Erro (se houver) */}
            {selectedExecution?.error_message && (
              <div>
                <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Mensagem de Erro</p>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <code className="text-xs text-red-800">{selectedExecution.error_message}</code>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
