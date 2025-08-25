import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Building2, 
  Edit, 
  Trash2, 
  Plus, 
  History, 
  Wifi, 
  WifiOff,
  WebhookIcon,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Company, Webhook, ExecutionHistory, Event } from '../types';
import { MultiEventTypeSelector } from './MultiEventTypeSelector';
import type { EventFilter } from '../types';
import { webhookSocketService } from '../services/webhookSocketService';

interface CompanyDetailProps {
  company: Company | null;
  webhooks: Webhook[];
  executions: ExecutionHistory[];
  events: Event[];
  onUpdateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
  onUpdateWebhook: (id: string, updates: Partial<Webhook>) => Promise<void>;
  onDeleteWebhook: (id: string) => Promise<void>;
  onCreateWebhook: (webhook: Omit<Webhook, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onRefreshData?: () => Promise<void>; // Função para recarregar dados
}

interface EventWithFilters {
  eventId: string;
  filters: EventFilter[];
}

interface WebhookFormData {
  name: string;
  event_ids: string[];
  event_filters: EventWithFilters[];
  url: string;
  is_active: boolean;
}

export function CompanyDetail({ 
  company, 
  webhooks, 
  executions, 
  events,
  onUpdateCompany, 
  onDeleteCompany,
  onUpdateWebhook,
  onDeleteWebhook,
  onCreateWebhook,
  onRefreshData
}: CompanyDetailProps) {
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  // Reset manuallyDisconnected ao carregar a página
  useEffect(() => {
    setManuallyDisconnected(false);
  }, [company?.id]);

  const [companyFormData, setCompanyFormData] = useState<Partial<Company>>({
    name: '',
    api_token: '',
    status: 'active'
  });

  const [webhookFormData, setWebhookFormData] = useState<WebhookFormData>({
    name: '',
    event_ids: [],
    event_filters: [],
    url: '',
    is_active: true
  });

  // Safe data with fallbacks
  const safeWebhooks = webhooks || [];
  const safeExecutions = executions || [];
  const safeEvents = events || [];

  const companyWebhooks = safeWebhooks.filter(webhook => webhook?.company_id === company?.id);
  const companyExecutions = safeExecutions.filter(exec => exec?.company_id === company?.id);

  // Webhooks ativos para conexão - APENAS status do banco
  const activeWebhooks = companyWebhooks.filter(webhook => {
    return webhook?.status === 'active';
  });

  // FRONTEND SOCKET DESABILITADO - Backend Render 24/7 handles all connections
  // Não há mais conexão automática no frontend

  // FRONTEND STATUS DESABILITADO - Backend Render sempre conectado 24/7
  // Status visual será sempre baseado no backend, não no frontend

  // FRONTEND CONNECT/DISCONNECT DESABILITADO
  // Backend Render gerencia todas as conexões automaticamente
  const handleConnect = async () => {
    console.log('ℹ️ Conexão gerenciada pelo backend Render 24/7 - não é necessário conectar manualmente');
  };

  const handleDisconnect = async () => {
    console.log('ℹ️ Conexão gerenciada pelo backend Render 24/7 - não é necessário desconectar manualmente');
  };

  // Reativar webhooks
  const reactivateWebhooks = async () => {
    if (activeWebhooks.length === 0) return;

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const webhookIds = activeWebhooks.map(w => w.id);
        console.log('🔄 Reativando webhooks:', webhookIds);
        
        const { error } = await supabase
          .from('webhooks')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .in('id', webhookIds);

        if (error) {
          console.error('❌ Erro ao reativar webhooks:', error);
        } else {
          console.log('✅ Webhooks reativados com sucesso');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao reativar webhooks:', error);
    }
  };

  // Toggle webhook status - SIMPLES E DIRETO
  const handleToggleWebhook = async (webhook: Webhook) => {
    if (!webhook?.id) return;
    
    const currentStatus = webhook.status || 'inactive';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    console.log(`🔄 Alternando webhook ${webhook.name}: ${currentStatus} → ${newStatus}`);
    
    try {
      await onUpdateWebhook(webhook.id, {
        status: newStatus
      });
      
      console.log(`✅ Webhook ${newStatus === 'active' ? 'ativado' : 'desativado'} - Notificando backend Render`);
      
      // Notificar backend Render sobre mudança de webhook
      try {
        const response = await fetch(`https://socket2webhook-dev.onrender.com/check-webhooks/${company.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          console.log('✅ Backend Render notificado sobre mudança do webhook');
        } else {
          console.log('⚠️ Não foi possível notificar backend Render, mas ele detectará automaticamente');
        }
      } catch (error) {
        console.log('⚠️ Erro ao notificar backend Render, mas ele detectará automaticamente:', error.message);
      }
      
    } catch (error) {
      console.error('❌ Erro ao alternar webhook:', error);
    }
  };

  // Company form handlers
  const handleEditCompany = () => {
    setCompanyFormData({
      name: company?.name || '',
      api_token: company?.api_token || '',
      status: company?.status || 'active'
    });
    setIsCompanyDialogOpen(true);
  };

  const handleUpdateCompany = async () => {
    if (!company?.id) return;
    
    try {
      await onUpdateCompany(company.id, companyFormData);
      setIsCompanyDialogOpen(false);
      
      // Se a empresa foi desativada, notificar o backend para desconectar
      if (companyFormData.status === 'inactive') {
        console.log('🔌 Empresa desativada - notificando backend para desconectar socket');
        
        try {
          const response = await fetch('https://socket2webhook-dev.onrender.com/check-inactive-companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            console.log('✅ Backend notificado sobre empresa inativa');
          } else {
            console.log('⚠️ Não foi possível notificar backend, mas ele detectará automaticamente');
          }
        } catch (error) {
          console.log('⚠️ Erro ao notificar backend, mas ele detectará automaticamente:', error.message);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar empresa:', error);
    }
  };

  // Webhook form handlers
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
    console.log('🔍 Editando webhook:', {
      id: webhook.id,
      name: webhook.name,
      event_types: webhook.event_types,
      webhook_events: webhook.webhook_events
    });
    
    console.log('🔍 EDIÇÃO - webhook_events detalhado:', JSON.stringify(webhook.webhook_events, null, 2));

    // SEMPRE extrair event_ids dos webhook_events (IDs reais, não nomes)
    let eventIds: string[] = [];
    if (webhook.webhook_events && webhook.webhook_events.length > 0) {
      eventIds = webhook.webhook_events.map(we => we.event?.id).filter(Boolean) as string[];
      console.log('🔍 EDIÇÃO - Event IDs extraídos de webhook_events:', eventIds);
    } else {
      console.log('⚠️ EDIÇÃO - Nenhum webhook_events encontrado');
    }

    setWebhookFormData({
      name: webhook.name || '',
      event_ids: eventIds,
      url: webhook.url || '',
      is_active: webhook.status === 'active'
    });
    setEditingWebhook(webhook);
    setIsWebhookDialogOpen(true);
  };

  const handleSubmitWebhook = async () => {
    if (!company?.id || isSavingWebhook) return;

    setIsSavingWebhook(true);
    try {
      console.log('🔄 Salvando webhook:', {
        isEditing: !!editingWebhook,
        name: webhookFormData.name,
        event_ids: webhookFormData.event_ids,
        event_filters: webhookFormData.event_filters,
        url: webhookFormData.url
      });

      if (editingWebhook) {
        await onUpdateWebhook(editingWebhook.id, {
          name: webhookFormData.name,
          url: webhookFormData.url,
          status: webhookFormData.is_active ? 'active' : 'inactive',
          event_ids: webhookFormData.event_ids // Adicionar event_ids para edição
        });
      } else {
        await onCreateWebhook({
          company_id: company.id,
          name: webhookFormData.name,
          url: webhookFormData.url,
          is_active: webhookFormData.is_active,
          status: webhookFormData.is_active ? 'active' : 'inactive',
          event_ids: webhookFormData.event_ids,
          event_filters: webhookFormData.event_filters
        });
      }
      
      // Recarregar dados para mostrar o webhook criado/atualizado
      if (onRefreshData) {
        console.log('🔄 Recarregando dados após criar/editar webhook...');
        await onRefreshData();
      }
      
      setIsWebhookDialogOpen(false);
      resetWebhookForm();
    } catch (error) {
      console.error('❌ Erro ao salvar webhook:', error);
    } finally {
      setIsSavingWebhook(false);
    }
  };

  // Status helpers
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="text-xs bg-green-500 text-white border-green-500 hover:bg-green-600">Sucesso</Badge>;
      case 'failed':
        return <Badge className="text-xs bg-red-500 text-white border-red-500 hover:bg-red-600">Falha</Badge>;
      case 'pending':
        return <Badge className="text-xs bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
      default:
        return <Badge variant="outline" className="text-xs text-gray-800">Desconhecido</Badge>;
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Selecione uma empresa para ver os detalhes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {company.name}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Token: {company.api_token ? 'Configurado' : 'Não configurado'} • Status: {company.status === 'active' ? 'Ativo' : 'Inativo'}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    onClick={handleEditCompany}
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-white/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-sm border-white/20">
                  <DialogHeader>
                    <DialogTitle>Editar Empresa</DialogTitle>
                    <DialogDescription>
                      Atualize as informações da empresa
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company_name">Nome da Empresa</Label>
                      <Input
                        id="company_name"
                        value={companyFormData.name}
                        onChange={(e) => setCompanyFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="api_token">Token da API</Label>
                      <Input
                        id="api_token"
                        type="password"
                        value={companyFormData.api_token}
                        onChange={(e) => setCompanyFormData(prev => ({ ...prev, api_token: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Switch
                            id="status"
                            checked={companyFormData.status === 'active'}
                            onCheckedChange={(checked: boolean) => 
                              setCompanyFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))
                            }
                            style={{
                              backgroundColor: companyFormData.status === 'active' ? '#10b981' : '#ef4444'
                            }}
                          />
                          <div>
                            <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                              Status da Empresa
                            </Label>
                            <p className="text-xs text-gray-500 mt-1">
                              {companyFormData.status === 'active' 
                                ? 'Empresa ativa e funcionando normalmente' 
                                : 'Empresa inativa - não receberá eventos'
                              }
                            </p>
                          </div>
                        </div>
                        <Badge 
                          className={`${
                            companyFormData.status === 'active'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          }`}
                        >
                          {companyFormData.status === 'active' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <button
                      type="button"
                      onClick={() => setIsCompanyDialogOpen(false)}
                      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-white/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateCompany}
                      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white h-9 rounded-md px-3"
                    >
                      Salvar
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <button
                type="button"
                onClick={() => onDeleteCompany(company.id)}
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-600 hover:bg-red-700 text-white h-9 rounded-md px-3"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

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
                {companyWebhooks.length} webhook(s) configurado(s) • {activeWebhooks.length} ativo(s)
              </CardDescription>
            </div>
            
            {/* Status da Conexão - Backend 24/7 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">
                  Backend 24/7 Ativo
                </span>
                <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
                  Render
                </span>
              </div>
              
                             <Dialog open={isWebhookDialogOpen} onOpenChange={(open) => {
                               if (!open && !isSavingWebhook) {
                                 setIsWebhookDialogOpen(false);
                                 resetWebhookForm();
                               } else if (open) {
                                 setIsWebhookDialogOpen(true);
                               }
                             }}>
                 <DialogTrigger asChild>
                   <button
                     type="button"
                     onClick={() => {
                       resetWebhookForm();
                       setIsWebhookDialogOpen(true);
                     }}
                     disabled={isSavingWebhook}
                     className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white h-9 rounded-md px-3 disabled:bg-gray-400"
                   >
                     <Plus className="mr-2 h-4 w-4" />
                     {isSavingWebhook ? 'Salvando...' : 'Novo Webhook'}
                   </button>
                 </DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-sm border-white/20 max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure um webhook com um ou mais tipos de eventos.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="webhook_name">Nome do Webhook</Label>
                      <Input
                        id="webhook_name"
                        value={webhookFormData.name}
                        onChange={(e) => setWebhookFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: URA -> CSAT"
                        className="mt-1"
                      />
                    </div>
                    
                    <MultiEventTypeSelector
                      events={safeEvents}
                      selectedEventIds={webhookFormData.event_ids}
                      selectedEventsWithFilters={webhookFormData.event_filters}
                      onSelectionChange={(eventIds) => {
                        console.log('🔥 CompanyDetail - eventIds selecionados:', eventIds);
                        setWebhookFormData(prev => {
                          // Remover filtros de eventos não selecionados
                          const filteredEventFilters = prev.event_filters.filter(ef => 
                            eventIds.includes(ef.eventId)
                          );
                          const newData = { 
                            ...prev, 
                            event_ids: eventIds, 
                            event_filters: filteredEventFilters 
                          };
                          console.log('🔥 CompanyDetail - novo webhookFormData:', newData);
                          return newData;
                        });
                      }}
                      onFiltersChange={(eventsWithFilters) => {
                        console.log('🔍 CompanyDetail - filtros atualizados:', eventsWithFilters);
                        setWebhookFormData(prev => ({
                          ...prev,
                          event_filters: eventsWithFilters
                        }));
                      }}
                      placeholder="Selecione um ou mais tipos de eventos"
                    />
                    
                    <div>
                      <Label htmlFor="webhook_url">URL do Webhook</Label>
                      <Input
                        id="webhook_url"
                        value={webhookFormData.url}
                        onChange={(e) => setWebhookFormData(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://api.exemplo.com/webhook"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                                     <DialogFooter>
                     <button
                       type="button"
                       onClick={() => {
                         console.log('❌ Cancelando criação/edição de webhook');
                         setIsWebhookDialogOpen(false);
                         resetWebhookForm();
                       }}
                       disabled={isSavingWebhook}
                       className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-white/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 disabled:bg-gray-400"
                     >
                       Cancelar
                     </button>
                     <button
                       type="button"
                       onClick={handleSubmitWebhook}
                       disabled={webhookFormData.event_ids.length === 0 || !webhookFormData.url || !webhookFormData.name || isSavingWebhook}
                       className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white h-9 rounded-md px-3 disabled:bg-gray-400"
                     >
                       {isSavingWebhook ? 'Salvando...' : (editingWebhook ? 'Salvar' : 'Criar Webhook')}
                     </button>
                   </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
                            {(() => {
                              if (webhook?.event_types && webhook.event_types.length > 0) {
                                return webhook.event_types.map((eventName, index) => (
                                  <code key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                                    {eventName}
                                  </code>
                                ));
                              }
                              
                              if (webhook?.webhook_events && webhook.webhook_events.length > 0) {
                                return webhook.webhook_events.map((we, index) => (
                                  <code key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                                    {we.event?.name || 'Evento sem nome'}
                                  </code>
                                ));
                              }
                              
                              return <span className="text-gray-500 text-sm">Nenhum evento</span>;
                            })()}
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
                />
                <button
                  type="button"
                  onClick={() => handleToggleWebhook(webhook)}
                  className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  title={webhook?.status === 'active' ? 'Desativar webhook' : 'Ativar webhook'}
                >
                  {webhook?.status === 'active' ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                                                   <button
                           type="button"
                           onClick={() => handleEditWebhook(webhook)}
                           className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-white/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-2"
                         >
                           <Edit className="h-3 w-3" />
                         </button>
                         <button
                           type="button"
                           onClick={() => onDeleteWebhook(webhook.id)}
                           className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-white/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-2 text-red-600 hover:text-red-700"
                         >
                           <Trash2 className="h-3 w-3" />
                         </button>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyExecutions.slice(0, 10).map((execution) => (
                    <TableRow key={execution?.id || Math.random()} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(execution?.status)}
                          <code className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono">
                            {execution?.event_type || execution?.event?.name || execution?.event_id || 'Evento'}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(execution?.status || 'pending')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {execution?.attempts || 1} / {execution?.max_attempts || 3}
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
  );
}