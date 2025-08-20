import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Company, EventSubscription, AVAILABLE_EVENT_TYPES } from "../types";
import { Plus, Edit, Trash2, Webhook, AlertCircle } from "lucide-react";

interface EventSubscriptionManagerProps {
  companies: Company[];
  subscriptions: EventSubscription[];
  onAddSubscription: (subscription: Omit<EventSubscription, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateSubscription: (id: string, updates: Partial<EventSubscription>) => void;
  onDeleteSubscription: (id: string) => void;
}

interface SubscriptionFormData {
  company_id: string;
  event_type: string;
  webhook_url: string;
  is_active: boolean;
}

export function EventSubscriptionManager({ 
  companies = [], 
  subscriptions = [], 
  onAddSubscription, 
  onUpdateSubscription, 
  onDeleteSubscription 
}: EventSubscriptionManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<EventSubscription | null>(null);
  const [formData, setFormData] = useState<SubscriptionFormData>({
    company_id: '',
    event_type: '',
    webhook_url: '',
    is_active: true
  });

  const resetForm = () => {
    setFormData({
      company_id: '',
      event_type: '',
      webhook_url: '',
      is_active: true
    });
    setEditingSubscription(null);
  };

  const handleSubmit = () => {
    if (!formData.company_id || !formData.event_type || !formData.webhook_url) return;

    if (editingSubscription) {
      onUpdateSubscription(editingSubscription.id, formData);
    } else {
      onAddSubscription(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (subscription: EventSubscription) => {
    setEditingSubscription(subscription);
    setFormData({
      company_id: subscription.company_id,
      event_type: subscription.event_type,
      webhook_url: subscription.webhook_url,
      is_active: subscription.is_active
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = (subscription: EventSubscription) => {
    onUpdateSubscription(subscription.id, {
      is_active: !subscription.is_active
    });
  };

  const getCompanyName = (companyId: string) => {
    if (!companies || companies.length === 0) return 'Carregando...';
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'Empresa não encontrada';
  };

  const activeCompanies = companies?.filter(c => c.status === 'active') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Assinaturas de Eventos</h1>
          <p className="text-muted-foreground">
            Configure quais eventos serão transformados em webhooks
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} disabled={activeCompanies.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Assinatura
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSubscription ? 'Editar Assinatura' : 'Nova Assinatura'}
              </DialogTitle>
              <DialogDescription>
                Configure um evento para ser enviado como webhook
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="company_id">Empresa</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, company_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name} (ID: {company.company_3c_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="event_type">Tipo de Evento</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_EVENT_TYPES.map((eventType) => (
                      <SelectItem key={eventType} value={eventType}>
                        {eventType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="webhook_url">URL do Webhook</Label>
                <Input
                  id="webhook_url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://api.exemplo.com/webhook"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Assinatura ativa</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingSubscription ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {activeCompanies.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
              <h3 className="mt-2">Nenhuma empresa ativa</h3>
              <p className="text-muted-foreground">
                Ative pelo menos uma empresa para criar assinaturas de eventos
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Assinaturas Configuradas
          </CardTitle>
          <CardDescription>
            {subscriptions.length} assinatura(s) de evento(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2">Nenhuma assinatura configurada</h3>
              <p className="text-muted-foreground">
                Configure eventos para receber webhooks automaticamente
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>URL do Webhook</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>{getCompanyName(subscription.company_id)}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {subscription.event_type}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={subscription.webhook_url}>
                        {subscription.webhook_url}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={subscription.is_active ? 'default' : 'secondary'}>
                          {subscription.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Switch
                          checked={subscription.is_active}
                          onCheckedChange={() => handleToggleActive(subscription)}
                          size="sm"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(subscription.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(subscription)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteSubscription(subscription.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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