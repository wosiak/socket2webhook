import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import type { EventFilter } from '../types';

// Placeholder components for icons
const Filter = ({ className }: { className?: string }) => <span className={className}>🔍</span>;
const Plus = ({ className }: { className?: string }) => <span className={className}>➕</span>;
const Trash2 = ({ className }: { className?: string }) => <span className={className}>🗑️</span>;
const Settings = ({ className }: { className?: string }) => <span className={className}>⚙️</span>;
const MousePointer2 = ({ className }: { className?: string }) => <span className={className}>👆</span>;
const Code = ({ className }: { className?: string }) => <span className={className}>💻</span>;

interface InteractiveEventFilterProps {
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

// Estrutura de exemplo do evento call-history-was-created
const SAMPLE_EVENT_BODY = {
  "call-history-was-created": {
    "callHistory": {
      "_id": "1",
      "number": "55211111111111",
      "campaign": {
        "id": 176891,
        "name": "Nome da Campanha"
      },
      "company": {
        "id": 1,
        "name": "Nome da Empresa"
      },
      "mailing_data": {
        "_id": "68596aed6c1f3e573b48c3e3",
        "identifier": "000.000.000-00",
        "campaign_id": 176891,
        "company_id": 1,
        "list_id": 2653600,
        "uf": "RJ",
        "phone": "5521969890518",
        "cpf": "12632498000"
      },
      "phone_type": "mobile",
      "agent": {
        "id": 0,
        "name": null
      },
      "route": {
        "id": 11811,
        "name": "Nome da Rota aqui",
        "host": "45.175.210.00:0000",
        "route": "4222"
      },
      "telephony_id": "KTl49imv0h",
      "status": 5,
      "qualification": {
        "id": null,
        "name": null,
        "behavior": null,
        "conversion": null
      },
      "billed_time": 0,
      "recorded": true,
      "ended_by_agent": false,
      "call_mode": "dialer",
      "list": {
        "id": 1,
        "name": "Nome da Lista.csv"
      },
      "call_date": "2025-06-25T17:13:09.000000Z",
      "calling_time": 27,
      "waiting_time": 0,
      "speaking_time": 0
    }
  }
};

export function InteractiveEventFilter({ 
  eventName, 
  eventDisplayName, 
  filters, 
  onFiltersChange 
}: InteractiveEventFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<any>('');
  const [operator, setOperator] = useState<string>('equals');

  // Função recursiva para renderizar JSON de forma interativa
  const renderInteractiveJson = (obj: any, path: string = '', depth: number = 0): React.ReactNode => {
    if (obj === null) {
      return <span className="text-gray-500 italic">null</span>;
    }

    if (typeof obj === 'string') {
      return (
        <span 
          className="text-green-600 cursor-pointer hover:bg-green-200 px-1 py-0.5 rounded transition-colors border border-transparent hover:border-green-300"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔍 Clicou em string:', path, obj);
            handleFieldClick(path, obj);
          }}
          title={`Clique para filtrar por: ${path} = "${obj}"`}
        >
          "{obj}"
        </span>
      );
    }

    if (typeof obj === 'number') {
      return (
        <span 
          className="text-blue-600 cursor-pointer hover:bg-blue-200 px-1 py-0.5 rounded font-medium transition-colors border border-transparent hover:border-blue-300"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔍 Clicou em number:', path, obj);
            handleFieldClick(path, obj);
          }}
          title={`Clique para filtrar por: ${path} = ${obj}`}
        >
          {obj}
        </span>
      );
    }

    if (typeof obj === 'boolean') {
      return (
        <span 
          className="text-purple-600 cursor-pointer hover:bg-purple-200 px-1 py-0.5 rounded transition-colors border border-transparent hover:border-purple-300"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔍 Clicou em boolean:', path, obj);
            handleFieldClick(path, obj);
          }}
          title={`Clique para filtrar por: ${path} = ${obj}`}
        >
          {obj.toString()}
        </span>
      );
    }

    if (Array.isArray(obj)) {
      return (
        <div className={`${depth > 0 ? 'ml-4' : ''}`}>
          [
          {obj.map((item, index) => (
            <div key={index} className="ml-4">
              {renderInteractiveJson(item, `${path}[${index}]`, depth + 1)}
              {index < obj.length - 1 && ','}
            </div>
          ))}
          ]
        </div>
      );
    }

    if (typeof obj === 'object') {
      return (
        <div className={`${depth > 0 ? 'ml-4' : ''}`}>
          {'{'}
          {Object.entries(obj).map(([key, value], index, entries) => (
            <div key={key} className="ml-4">
              <span className="text-blue-800 font-medium">"{key}"</span>: {' '}
              {renderInteractiveJson(value, path ? `${path}.${key}` : key, depth + 1)}
              {index < entries.length - 1 && ','}
            </div>
          ))}
          {'}'}
        </div>
      );
    }

    return <span>{String(obj)}</span>;
  };

  const handleFieldClick = (path: string, value: any) => {
    console.log('🎯 handleFieldClick chamado:', { path, value, type: typeof value });
    
    // Converter path para formato correto para o servidor
    // Se o path já começa com call-history-was-created, usar como está
    // Senão, adicionar o prefixo correto
    let fullPath = path;
    if (!path.startsWith('call-history-was-created.')) {
      fullPath = `callHistory.${path}`;
    }
    
    console.log('🎯 Path gerado:', fullPath);
    
    setSelectedPath(fullPath);
    setSelectedValue(value);
    
    // Determinar operador padrão baseado no tipo
    const defaultOperator = typeof value === 'number' ? 'equals' : 
                           typeof value === 'boolean' ? 'equals' : 
                           'contains';
    setOperator(defaultOperator);
    
    console.log('🎯 Filtro configurado:', { path: fullPath, value, operator: defaultOperator });
  };

  const addFilter = () => {
    if (!selectedPath || selectedValue === '') return;

    const newFilter: EventFilter = {
      field_path: selectedPath,
      operator: operator as EventFilter['operator'],
      value: selectedValue,
      description: `Filtrar ${selectedPath} ${OPERATOR_LABELS[operator as keyof typeof OPERATOR_LABELS]} ${selectedValue}`
    };

    const updatedFilters = [...filters, newFilter];
    onFiltersChange(updatedFilters);
    
    // Limpar seleção
    setSelectedPath('');
    setSelectedValue('');
  };

  const removeFilter = (index: number) => {
    const updatedFilters = filters.filter((_, i) => i !== index);
    onFiltersChange(updatedFilters);
  };

  const renderValueInput = () => {
    const fieldType = typeof selectedValue;
    
    if (fieldType === 'boolean') {
      return (
        <Select
          value={selectedValue?.toString() || ''}
          onValueChange={(value) => setSelectedValue(value === 'true')}
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
        value={selectedValue?.toString() || ''}
        onChange={(e) => {
          const value = fieldType === 'number' ? 
            (e.target.value ? Number(e.target.value) : '') : 
            e.target.value;
          setSelectedValue(value);
        }}
        placeholder={`Valor atual: ${selectedValue}`}
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
          title="Configurar filtros interativos para este evento"
        >
          <Filter className="w-3 h-3 mr-1" />
          Filtros
          {filters.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
              {filters.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-[95vw] w-[95vw] bg-white max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Filtros Interativos - {eventDisplayName}
          </DialogTitle>
          <DialogDescription>
            Clique nos valores do evento abaixo para criar filtros automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 max-h-[75vh]">
          {/* Coluna 1 e 2: Estrutura do Evento */}
          <div className="col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Estrutura do Evento
                  <MousePointer2 className="w-4 h-4 text-blue-600" />
                </CardTitle>
                <p className="text-xs text-gray-600">
                  Clique nos valores destacados para criar filtros automaticamente
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh] w-full">
                  <pre className="text-sm leading-relaxed font-mono">
                    {renderInteractiveJson(SAMPLE_EVENT_BODY)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Coluna 3: Configuração de Filtros */}
          <div className="space-y-4">
            {/* Filtros existentes */}
            {filters.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Filtros Configurados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-32 overflow-y-auto">
                  {filters.map((filter, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex-1 text-xs">
                        <code className="bg-gray-200 px-1 rounded text-xs">
                          {filter.field_path}
                        </code>
                        {' '}
                        <Badge variant="outline" className="text-xs mx-1">
                          {OPERATOR_LABELS[filter.operator]}
                        </Badge>
                        {' '}
                        <code className="bg-blue-100 px-1 rounded text-xs">
                          {filter.value?.toString()}
                        </code>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFilter(index)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Adicionar novo filtro */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {selectedPath ? 'Configurar Filtro' : 'Clique em um valor ao lado'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedPath ? (
                  <>
                    <div>
                      <Label className="text-xs">Campo Selecionado</Label>
                      <Input
                        value={selectedPath}
                        readOnly
                        className="h-8 text-xs bg-gray-100"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Operador</Label>
                      <Select
                        value={operator}
                        onValueChange={setOperator}
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

                    <div>
                      <Label className="text-xs">Valor</Label>
                      {renderValueInput()}
                    </div>

                    <Button
                      onClick={addFilter}
                      disabled={!selectedPath || selectedValue === ''}
                      className="w-full h-8 text-xs"
                      size="sm"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar Filtro
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <MousePointer2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Clique em qualquer valor na estrutura do evento</p>
                    <p className="text-xs">para configurar um filtro automaticamente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
