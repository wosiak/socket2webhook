import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
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
  RefreshCw
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
  const itemsPerPage = 50;

  const loadExecutions = async (page: number = 1) => {
    try {
      setLoading(true);
      const offset = (page - 1) * itemsPerPage;
      const result = await apiService.getExecutions(company.id, itemsPerPage, offset);
      
      if (result.success) {
        setExecutions(result.data || []);
        
        // Calcular total de páginas (estimativa)
        const totalItems = result.data?.length || 0;
        if (totalItems === itemsPerPage) {
          // Há mais páginas
          setTotalPages(page + 1);
        } else {
          // Última página
          setTotalPages(page);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar execuções:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions(currentPage);
  }, [company.id, currentPage]);

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
          onClick={() => loadExecutions(currentPage)}
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
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <History className="h-5 w-5 text-blue-600" />
            Execuções de Webhooks
          </CardTitle>
          <CardDescription className="text-gray-600">
            Histórico completo de todas as execuções de call-history-was-created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
              <p className="mt-4 text-gray-600">Carregando execuções...</p>
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma execução registrada</h3>
              <p className="text-gray-600 mt-2">
                As execuções de call-history-was-created aparecerão aqui
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Evento</TableHead>
                      <TableHead className="font-semibold text-gray-900">Telefone</TableHead>
                      <TableHead className="font-semibold text-gray-900">URL do Webhook</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900">HTTP</TableHead>
                      <TableHead className="font-semibold text-gray-900">Data/Hora</TableHead>
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
                        <TableCell>
                          {execution.phone_number ? (
                            <code className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded font-mono">
                              {execution.phone_number}
                            </code>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
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
                  
                  <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded font-medium text-sm">
                    {currentPage}
                  </div>
                  
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
                    disabled={currentPage === totalPages || loading}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

