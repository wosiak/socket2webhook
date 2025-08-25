import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
// Temporary solution - using text instead of icons to avoid import issues
// import { Filter, Plus, Trash2, Settings, AlertCircle, Info } from "lucide-react";

// Placeholder components for icons
const Filter = ({ className }: { className?: string }) => <span className={className}>🔍</span>;
const Plus = ({ className }: { className?: string }) => <span className={className}>➕</span>;
const Trash2 = ({ className }: { className?: string }) => <span className={className}>🗑️</span>;
const Settings = ({ className }: { className?: string }) => <span className={className}>⚙️</span>;
const AlertCircle = ({ className }: { className?: string }) => <span className={className}>⚠️</span>;
const Info = ({ className }: { className?: string }) => <span className={className}>ℹ️</span>;
import type { EventFilter } from '../types';

interface EventFilterConfigProps {
  eventName: string;
  eventDisplayName: string;
  filters: EventFilter[];
  onFiltersChange: (filters: EventFilter[]) => void;
}

const OPERATOR_LABELS = {
  equals: 'Igual a',
  not_equals: 'Diferente de',
  greater_than: 'Maior que',
  less_than: 'Menor que',
  contains: 'Contém',
  not_contains: 'Não contém'
};

const COMMON_FIELD_PATHS = {
  'call-history-was-created': [
    { path: 'callHistory.status', label: 'Status da Ligação', type: 'number' },
    { path: 'callHistory.campaign.id', label: 'ID da Campanha', type: 'number' },
    { path: 'callHistory.company.id', label: 'ID da Empresa', type: 'number' },
    { path: 'callHistory.phone_type', label: 'Tipo de Telefone', type: 'string' },
    { path: 'callHistory.recorded', label: 'Gravada', type: 'boolean' },
    { path: 'callHistory.ended_by_agent', label: 'Finalizada pelo Agente', type: 'boolean' },
    { path: 'callHistory.qualification.behavior', label: 'Comportamento da Qualificação', type: 'string' }
  ],
  'campaign-started': [
    { path: 'campaign.id', label: 'ID da Campanha', type: 'number' },
    { path: 'campaign.name', label: 'Nome da Campanha', type: 'string' },
    { path: 'campaign.status', label: 'Status da Campanha', type: 'string' }
  ],
  'agent-status-changed': [
    { path: 'agent.id', label: 'ID do Agente', type: 'number' },
    { path: 'agent.status', label: 'Status do Agente', type: 'string' },
    { path: 'agent.previous_status', label: 'Status Anterior', type: 'string' }
  ]
};

export function EventFilterConfig({ 
  eventName, 
  eventDisplayName, 
  filters, 
  onFiltersChange 
}: EventFilterConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<EventFilter>>({
    field_path: '',
    operator: 'equals',
    value: '',
    description: ''
  });

  const commonFields = COMMON_FIELD_PATHS[eventName as keyof typeof COMMON_FIELD_PATHS] || [];

  const addFilter = () => {
    if (!newFilter.field_path || newFilter.value === '') return;

    const filter: EventFilter = {
      field_path: newFilter.field_path,
      operator: newFilter.operator as EventFilter['operator'],
      value: newFilter.value,
      description: newFilter.description || ''
    };

    onFiltersChange([...filters, filter]);
    setNewFilter({
      field_path: '',
      operator: 'equals',
      value: '',
      description: ''
    });
  };

  const removeFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const getFieldType = (fieldPath: string) => {
    const field = commonFields.find(f => f.path === fieldPath);
    return field?.type || 'string';
  };

  const renderValueInput = () => {
    const fieldType = getFieldType(newFilter.field_path || '');
    
    if (fieldType === 'boolean') {
      return (
        <Select
          value={newFilter.value?.toString() || ''}
          onValueChange={(value) => setNewFilter(prev => ({ ...prev, value: value === 'true' }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Verdadeiro</SelectItem>
            <SelectItem value="false">Falso</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={fieldType === 'number' ? 'number' : 'text'}
        value={newFilter.value?.toString() || ''}
        onChange={(e) => {
          const value = fieldType === 'number' ? 
            (e.target.value ? Number(e.target.value) : '') : 
            e.target.value;
          setNewFilter(prev => ({ ...prev, value }));
        }}
        placeholder={fieldType === 'number' ? 'Ex: 7' : 'Ex: mobile'}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-2 h-8 px-2"
          title="Configurar filtros para este evento"
        >
          <Filter className="w-3 h-3 mr-1" />
          {filters.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
              {filters.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Filtros para {eventDisplayName}
          </DialogTitle>
          <DialogDescription>
            Configure filtros opcionais para este evento. Apenas eventos que atendam a TODOS os filtros serão enviados para o webhook.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info sobre estrutura do evento */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                <Info className="w-4 h-4" />
                Exemplo de estrutura do evento
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-blue-700 font-mono bg-blue-100 rounded p-2">
              {eventName === 'call-history-was-created' && (
                <div>
                  {"{"}<br />
                  &nbsp;&nbsp;"callHistory": {"{"}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;"status": 7,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;"campaign": {"{"} "id": 195452 {"}"},<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;"phone_type": "mobile",<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;"recorded": true<br />
                  &nbsp;&nbsp;{"}"}<br />
                  {"}"}
                </div>
              )}
              {eventName !== 'call-history-was-created' && (
                <div>Estrutura varia por tipo de evento</div>
              )}
            </CardContent>
          </Card>

          {/* Filtros existentes */}
          {filters.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filtros Configurados:</Label>
              {filters.map((filter, index) => (
                <Card key={index} className="bg-gray-50 border-gray-200">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                            {filter.field_path}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {OPERATOR_LABELS[filter.operator]}
                          </Badge>
                          <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                            {filter.value?.toString()}
                          </code>
                        </div>
                        {filter.description && (
                          <p className="text-xs text-gray-600 mt-1">{filter.description}</p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFilter(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Adicionar novo filtro */}
          <Card className="border-dashed border-gray-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Novo Filtro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Campo</Label>
                  <Select
                    value={newFilter.field_path}
                    onValueChange={(value) => setNewFilter(prev => ({ ...prev, field_path: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Selecionar campo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {commonFields.map((field) => (
                        <SelectItem key={field.path} value={field.path}>
                          {field.label} ({field.path})
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Campo personalizado...</SelectItem>
                    </SelectContent>
                  </Select>
                  {newFilter.field_path === 'custom' && (
                    <Input
                      className="mt-2 h-8 text-xs"
                      placeholder="Ex: callHistory.custom_field"
                      onChange={(e) => setNewFilter(prev => ({ ...prev, field_path: e.target.value }))}
                    />
                  )}
                </div>

                <div>
                  <Label className="text-xs">Operador</Label>
                  <Select
                    value={newFilter.operator}
                    onValueChange={(value) => setNewFilter(prev => ({ ...prev, operator: value as EventFilter['operator'] }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Valor</Label>
                {renderValueInput()}
              </div>

              <div>
                <Label className="text-xs">Descrição (opcional)</Label>
                <Input
                  className="h-8 text-xs"
                  value={newFilter.description || ''}
                  onChange={(e) => setNewFilter(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Apenas ligações finalizadas com sucesso"
                />
              </div>

              <Button
                onClick={addFilter}
                disabled={!newFilter.field_path || newFilter.value === ''}
                className="w-full h-8 text-xs"
                size="sm"
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar Filtro
              </Button>
            </CardContent>
          </Card>

          {filters.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Nenhum filtro configurado</p>
              <p className="text-xs">Todos os eventos deste tipo serão enviados</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
