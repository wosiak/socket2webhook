import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Company, ExecutionHistory as ExecutionHistoryType } from "../types";
import { CheckCircle, XCircle, RotateCcw, Clock, Eye, Search } from "lucide-react";
import { Label } from "./Label";

interface ExecutionHistoryProps {
  companies: Company[];
  executions: ExecutionHistoryType[];
}

export function ExecutionHistory({ companies = [], executions = [] }: ExecutionHistoryProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const getCompanyName = (companyId: string) => {
    if (!companies || companies.length === 0) return 'Carregando...';
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'Empresa não encontrada';
  };

  const filteredExecutions = executions.filter(execution => {
    const matchesCompany = !selectedCompany || execution.company_id === selectedCompany;
    const matchesStatus = !selectedStatus || execution.status === selectedStatus;
    const matchesSearch = !searchTerm || 
      execution.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      execution.webhook_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCompanyName(execution.company_id).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCompany && matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: ExecutionHistoryType['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'retrying':
        return <RotateCcw className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ExecutionHistoryType['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500 text-white border-green-500 hover:bg-green-600">Sucesso</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falha</Badge>;
      case 'retrying':
        return <Badge className="bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600">Tentando</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Histórico de Execuções</h1>
        <p className="text-muted-foreground">
          Acompanhe todas as tentativas de envio de webhook
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Input
                placeholder="Buscar por evento, URL ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as empresas</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os status</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="failed">Falha</SelectItem>
                  <SelectItem value="retrying">Tentando</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCompany('');
                  setSelectedStatus('');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Table */}
      <Card>
        <CardHeader>
          <CardTitle>Execuções</CardTitle>
          <CardDescription>
            {filteredExecutions.length} execução(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredExecutions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2">Nenhuma execução encontrada</h3>
              <p className="text-muted-foreground">
                {executions.length === 0 
                  ? 'Ainda não há execuções de webhook'
                  : 'Tente ajustar os filtros de busca'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Tentativa</TableHead>
                  <TableHead>Resposta</TableHead>
                  <TableHead>Executado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExecutions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(execution.status)}
                        {getStatusBadge(execution.status)}
                      </div>
                    </TableCell>
                    <TableCell>{getCompanyName(execution.company_id)}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {execution.event_type}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={execution.webhook_url}>
                        {execution.webhook_url}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {execution.attempt}/{execution.max_attempts}
                      </span>
                      {execution.next_retry_at && (
                        <div className="text-xs text-muted-foreground">
                          Próxima: {new Date(execution.next_retry_at).toLocaleTimeString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {execution.response_status && (
                        <Badge variant={execution.response_status < 400 ? 'default' : 'destructive'}>
                          {execution.response_status}
                        </Badge>
                      )}
                      {execution.error_message && (
                        <div className="text-xs text-red-600 mt-1">
                          {execution.error_message}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(execution.executed_at).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detalhes da Execução</DialogTitle>
                            <DialogDescription>
                              Informações completas do webhook enviado
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Empresa</Label>
                                <p>{getCompanyName(execution.company_id)}</p>
                              </div>
                              <div>
                                <Label>Status</Label>
                                <div className="flex items-center gap-2 mt-1">
                                  {getStatusIcon(execution.status)}
                                  {getStatusBadge(execution.status)}
                                </div>
                              </div>
                              <div>
                                <Label>Evento</Label>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {execution.event_type}
                                </code>
                              </div>
                              <div>
                                <Label>Tentativa</Label>
                                <p>{execution.attempt}/{execution.max_attempts}</p>
                              </div>
                            </div>
                            
                            <div>
                              <Label>URL do Webhook</Label>
                              <p className="break-all">{execution.webhook_url}</p>
                            </div>
                            
                            {execution.error_message && (
                              <div>
                                <Label>Erro</Label>
                                <p className="text-red-600">{execution.error_message}</p>
                              </div>
                            )}
                            
                            <div>
                              <Label>Payload Enviado</Label>
                              <ScrollArea className="h-40 w-full border rounded p-2">
                                <pre className="text-xs">
                                  {JSON.stringify(execution.payload, null, 2)}
                                </pre>
                              </ScrollArea>
                            </div>
                            
                            {execution.response_body && (
                              <div>
                                <Label>Resposta</Label>
                                <ScrollArea className="h-20 w-full border rounded p-2">
                                  <pre className="text-xs">
                                    {execution.response_body}
                                  </pre>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}