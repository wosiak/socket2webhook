import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { MultiEventTypeSelector } from "./MultiEventTypeSelector";
import { Company, Webhook, ExecutionHistory, Event } from "../types";
import { ArrowLeft, Edit, Plus, Trash2, Webhook as WebhookIcon, History, CheckCircle, XCircle, RotateCcw, Eye, Settings } from "lucide-react";

interface CompanyDetailProps {
  company: Company;
  webhooks: Webhook[];
  executions: ExecutionHistory[];
  events: Event[];
  onBack: () => void;
  onUpdateCompany: (id: string, updates: Partial<Company>) => void;
        onAddWebhook: (webhook: { company_id: string; name: string; url: string; is_active?: boolean; event_ids: string[] }) => void;
  onUpdateWebhook: (id: string, updates: Partial<Webhook> & { event_ids?: string[] }) => void;
  onDeleteWebhook: (id: string) => void;
}

interface CompanyFormData {
  company_3c_id: string;
  name: string;
  api_token: string;
  status: 'active' | 'inactive';
}

interface WebhookFormData {
  name: string;
  event_ids: string[];
  url: string;
  is_active: boolean;
}

export function CompanyDetail({
  company,
  webhooks = [],
  executions = [],
  events = [],
  onBack,
  onUpdateCompany,
  onAddWebhook,
  onUpdateWebhook,
  onDeleteWebhook
}: CompanyDetailProps) {
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  
  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>({
    company_3c_id: company?.company_3c_id || '',
    name: company?.name || '',
    api_token: company?.api_token || '',
    status: company?.status || 'active'
  });

  // Atualizar dados da empresa quando a empresa muda
  useEffect(() => {
    if (company) {
      setCompanyFormData({
        company_3c_id: company.company_3c_id || '',
        name: company.name || '',
        api_token: company.api_token || '',
        status: company.status || 'active'
      });
    }
  }, [company]);

  const [webhookFormData, setWebhookFormData] = useState<WebhookFormData>({
    name: '',
    event_ids: [],
    url: '',
    is_active: true
  });

  // Garantir que temos arrays seguros
  const safeWebhooks = Array.isArray(webhooks) ? webhooks : [];
  const safeExecutions = Array.isArray(executions) ? executions : [];
  const safeEvents = Array.isArray(events) ? events : [];
  
  // Debug: verificar se eventos estão chegando
  console.log('CompanyDetail - Events recebidos:', events);
  console.log('CompanyDetail - SafeEvents:', safeEvents);
  console.log('CompanyDetail - SafeEvents length:', safeEvents.length);
  
  const companyWebhooks = safeWebhooks.filter(webhook => webhook?.company_id === company?.id);
  const companyExecutions = safeExecutions.filter(exec => exec?.company_id === company?.id);

  const handleUpdateCompany = () => {
    if (!company?.id) return;
    onUpdateCompany(company.id, companyFormData);
    setIsCompanyDialogOpen(false);
  };

  const handleSubmitWebhook = () => {
    if (!webhookFormData.event_ids.length || !webhookFormData.url || !company?.id) return;

    if (editingWebhook) {
      // Se está editando, apenas atualiza o webhook existente
      onUpdateWebhook(editingWebhook.id, {
        name: webhookFormData.name,
        url: webhookFormData.url,
        event_ids: webhookFormData.event_ids
      });
    } else {
      // Se é novo, cria o webhook
      onAddWebhook({
        company_id: company.id,
        name: webhookFormData.name,
        url: webhookFormData.url,
        is_active: true, // Sempre ativo por padrão
        event_ids: webhookFormData.event_ids
      });
    }

    setIsWebhookDialogOpen(false);
    resetWebhookForm();
  };

  const resetWebhookForm = () => {
    setWebhookFormData({
      name: '',
      event_ids: [],
      url: '',
      is_active: true
    });
    setEditingWebhook(null);
  };

  const handleEditWebhook = (webhook: Webhook) => {
    console.log('handleEditWebhook - webhook:', webhook);
    console.log('handleEditWebhook - webhook.webhook_events:', webhook.webhook_events);
    
    const eventIds = webhook.webhook_events?.map(we => we.event.id) || [];
    console.log('handleEditWebhook - eventIds extraídos:', eventIds);
    
    setEditingWebhook(webhook);
    setWebhookFormData({
      name: webhook.name || '',
      event_ids: eventIds,
      url: webhook.url || '',
      is_active: true // Não usado mais, mas mantido para compatibilidade
    });
    setIsWebhookDialogOpen(true);
  };

  const handleToggleWebhook = (webhook: Webhook) => {
    if (!webhook?.id) return;
    onUpdateWebhook(webhook.id, {
      status: webhook.status === 'active' ? 'inactive' : 'active'
    });
  };

  const getStatusIcon = (status: ExecutionHistory['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'retrying':
        return <RotateCcw className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: ExecutionHistory['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Sucesso</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falha</Badge>;
      case 'retrying':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Tentando</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  // Se não temos uma empresa válida, não renderizar
  if (!company || !company.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} className="bg-white/80 backdrop-blur-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Empresa não encontrada</h1>
              <p className="text-gray-600">
                A empresa selecionada não foi encontrada.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} className="bg-white/80 backdrop-blur-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                <Badge variant={company.status === 'active' ? 'default' : 'secondary'} className="text-sm">
                  {company.status === 'active' ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <p className="text-gray-600 mt-1">
                ID 3C Plus: {company.company_3c_id}
              </p>
            </div>
            
            <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white/80 backdrop-blur-sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Editar Empresa
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white/95 backdrop-blur-sm border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-gray-900">Editar Empresa</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Configure os dados da empresa para conexão ao socket 3C Plus
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company_3c_id" className="text-sm font-medium text-gray-700">ID da Empresa (3C Plus)</Label>
                    <Input
                      id="company_3c_id"
                      value={companyFormData.company_3c_id}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, company_3c_id: e.target.value }))}
                      className="mt-1 bg-white/80 backdrop-blur-sm border-gray-200"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nome da Empresa</Label>
                    <Input
                      id="name"
                      value={companyFormData.name}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 bg-white/80 backdrop-blur-sm border-gray-200"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="api_token" className="text-sm font-medium text-gray-700">Token de API</Label>
                    <Input
                      id="api_token"
                      type="password"
                      value={companyFormData.api_token}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, api_token: e.target.value }))}
                      className="mt-1 bg-white/80 backdrop-blur-sm border-gray-200"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="status"
                      checked={companyFormData.status === 'active'}
                      onCheckedChange={(checked: boolean) => 
                        setCompanyFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))
                      }
                    />
                    <Label htmlFor="status" className="text-sm font-medium text-gray-700">Empresa ativa</Label>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)} className="bg-white/80 backdrop-blur-sm">
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdateCompany} className="bg-blue-600 hover:bg-blue-700">
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Webhooks Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                  <WebhookIcon className="h-5 w-5 text-blue-600" />
                  Webhooks Configurados
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {companyWebhooks.length} webhook(s) configurado(s)
                </CardDescription>
              </div>
              
              <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetWebhookForm} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-sm border-white/20 max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">
                      {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Configure um webhook com um ou mais tipos de eventos.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Debug adicional */}
                    <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
                      Debug CompanyDetail: {safeEvents.length} eventos | Primeiro evento: {safeEvents[0]?.name}
                    </div>
                    
                    <div>
                      <Label htmlFor="webhook_name" className="text-sm font-medium text-gray-700">Nome do Webhook</Label>
                      <Input
                        id="webhook_name"
                        value={webhookFormData.name}
                        onChange={(e) => setWebhookFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: URA -> CSAT"
                        className="mt-1 bg-white/80 backdrop-blur-sm border-gray-200"
                      />
                    </div>
                    
                    {/* Debug adicional do MultiEventTypeSelector */}
                    <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
                      Debug MultiEventTypeSelector: selectedEventIds={JSON.stringify(webhookFormData.event_ids)}
                    </div>
                    
                    <MultiEventTypeSelector
                      events={safeEvents}
                      selectedEventIds={webhookFormData.event_ids}
                      onSelectionChange={(eventIds) => {
                        console.log('CompanyDetail - eventIds selecionados:', eventIds);
                        setWebhookFormData(prev => ({ ...prev, event_ids: eventIds }));
                      }}
                      placeholder="Selecione um ou mais tipos de eventos"
                    />
                    
                    <div>
                      <Label htmlFor="webhook_url" className="text-sm font-medium text-gray-700">URL do Webhook</Label>
                      <Input
                        id="webhook_url"
                        value={webhookFormData.url}
                        onChange={(e) => setWebhookFormData(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://api.exemplo.com/webhook"
                        className="mt-1 bg-white/80 backdrop-blur-sm border-gray-200"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsWebhookDialogOpen(false)} className="bg-white/80 backdrop-blur-sm">
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSubmitWebhook}
                      disabled={webhookFormData.event_ids.length === 0 || !webhookFormData.url || !webhookFormData.name}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {editingWebhook ? 'Salvar' : 'Criar Webhook'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {companyWebhooks.length === 0 ? (
              <div className="text-center py-12">
                <WebhookIcon className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum webhook configurado</h3>
                <p className="text-gray-600 mt-2">
                  Configure eventos para receber webhooks automaticamente
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Nome</TableHead>
                      <TableHead className="font-semibold text-gray-900">Eventos</TableHead>
                      <TableHead className="font-semibold text-gray-900">URL do Webhook</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyWebhooks.map((webhook) => (
                      <TableRow key={webhook?.id || Math.random()} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {webhook?.name || 'Sem nome'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook?.webhook_events && webhook.webhook_events.length > 0 ? (
                              webhook.webhook_events.map((we, index) => (
                                <code key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                                  {we.event.name}
                                </code>
                              ))
                            ) : (
                              <span className="text-gray-500 text-sm">Nenhum evento</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate text-sm text-gray-600" title={webhook?.url || ''}>
                            {webhook?.url || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={webhook?.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {webhook?.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Switch
                              checked={webhook?.status === 'active'}
                              onCheckedChange={() => handleToggleWebhook(webhook)}
                              size="sm"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditWebhook(webhook)}
                              className="bg-white/80 backdrop-blur-sm"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDeleteWebhook(webhook.id)}
                              className="bg-white/80 backdrop-blur-sm text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution History Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <History className="h-5 w-5 text-blue-600" />
              Histórico de Execuções
            </CardTitle>
            <CardDescription className="text-gray-600">
              Últimas execuções de webhooks para esta empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companyExecutions.length === 0 ? (
              <div className="text-center py-12">
                <History className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma execução registrada</h3>
                <p className="text-gray-600 mt-2">
                  As execuções de webhooks aparecerão aqui quando houver atividade
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Evento</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900">Tentativas</TableHead>
                      <TableHead className="font-semibold text-gray-900">Última Tentativa</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyExecutions.slice(0, 10).map((execution) => (
                      <TableRow key={execution?.id || Math.random()} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(execution?.status)}
                            <code className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono">
                              {execution?.event?.name || execution?.event_id || 'N/A'}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(execution?.status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {execution?.attempts || 0} / {execution?.max_attempts || 3}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {execution?.last_attempt ? new Date(execution.last_attempt).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/80 backdrop-blur-sm"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}