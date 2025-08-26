import { useState, useRef, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Check, ChevronDown, X, Search } from "lucide-react";
import { EventFilterConfig } from "./EventFilterConfig";
import { InteractiveEventFilter } from "./InteractiveEventFilter";
import { Event, EventFilter } from "../types";

interface EventWithFilters {
  eventId: string;
  filters: EventFilter[];
}

interface MultiEventTypeSelectorProps {
  events: Event[];
  selectedEventIds: string[];
  selectedEventsWithFilters?: EventWithFilters[]; // Para manter filtros configurados
  onSelectionChange: (eventIds: string[]) => void;
  onFiltersChange?: (eventsWithFilters: EventWithFilters[]) => void;
  placeholder?: string;
}

export function MultiEventTypeSelector({
  events = [],
  selectedEventIds = [],
  selectedEventsWithFilters = [],
  onSelectionChange,
  onFiltersChange,
  placeholder = "Selecione tipos de eventos"
}: MultiEventTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventsWithFilters, setEventsWithFilters] = useState<EventWithFilters[]>(selectedEventsWithFilters || []);

  // Garantir que temos arrays seguros
  const safeEvents = Array.isArray(events) ? events : [];
  const safeSelectedEventIds = Array.isArray(selectedEventIds) ? selectedEventIds : [];
  
  // Debug: verificar se eventos estão chegando no seletor
  console.log('MultiEventTypeSelector - Events recebidos:', events);
  console.log('MultiEventTypeSelector - SafeEvents:', safeEvents);
  console.log('MultiEventTypeSelector - SafeEvents length:', safeEvents.length);

  const handleToggleEvent = (eventId: string) => {
    let newSelection;
    if (safeSelectedEventIds.includes(eventId)) {
      newSelection = safeSelectedEventIds.filter(id => id !== eventId);
    } else {
      newSelection = [...safeSelectedEventIds, eventId];
    }
    
    onSelectionChange(newSelection);
  };

  const handleRemoveEvent = (eventId: string) => {
    onSelectionChange(safeSelectedEventIds.filter(id => id !== eventId));
    // Remover filtros também
    const safeEventsWithFilters = Array.isArray(eventsWithFilters) ? eventsWithFilters : [];
    const updatedFilters = safeEventsWithFilters.filter(ewf => ewf.eventId !== eventId);
    setEventsWithFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
  };

  const handleFiltersChange = (eventId: string, filters: EventFilter[]) => {
    const safeEventsWithFilters = Array.isArray(eventsWithFilters) ? eventsWithFilters : [];
    const updatedFilters = safeEventsWithFilters.filter(ewf => ewf.eventId !== eventId);
    if (filters.length > 0) {
      updatedFilters.push({ eventId, filters });
    }
    setEventsWithFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
  };

  const getFiltersForEvent = (eventId: string): EventFilter[] => {
    const safeEventsWithFilters = Array.isArray(eventsWithFilters) ? eventsWithFilters : [];
    const eventWithFilters = safeEventsWithFilters.find(ewf => ewf.eventId === eventId);
    return eventWithFilters?.filters || [];
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const getSelectedEventNames = () => {
    return safeSelectedEventIds.map(id => {
      const event = safeEvents.find(e => e.id === id);
      return event?.display_name || event?.name || id;
    });
  };

  const selectedEventNames = getSelectedEventNames();

  // Filtrar eventos baseado no termo de pesquisa
  const filteredEvents = safeEvents.filter(event => {
    const searchLower = searchTerm.toLowerCase();
    const eventName = event.name?.toLowerCase() || '';
    const displayName = event.display_name?.toLowerCase() || '';
    
    return eventName.includes(searchLower) || displayName.includes(searchLower);
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchTerm(''); // Limpar pesquisa quando fechar
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">Tipos de Eventos</Label>
      
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          onClick={() => setOpen(!open)}
          className="w-full justify-between bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white/90"
          type="button"
        >
          <span className="truncate text-gray-700">
            {safeSelectedEventIds.length === 0
              ? placeholder
              : safeSelectedEventIds.length === 1
              ? selectedEventNames[0]
              : `${safeSelectedEventIds.length} tipos selecionados`}
          </span>
          <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
        
        {open && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2">
              {/* Campo de pesquisa */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Pesquisar eventos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/80 backdrop-blur-sm border-gray-200 text-sm"
                  />
                </div>
                {searchTerm && (
                  <div className="mt-2 text-xs text-gray-500">
                    {filteredEvents.length} de {safeEvents.length} evento(s) encontrado(s)
                  </div>
                )}
              </div>
              
              {safeEvents.length === 0 ? (
                <div className="text-gray-500 p-4 text-center">Nenhum evento encontrado</div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-gray-500 p-4 text-center">
                  Nenhum evento encontrado para "{searchTerm}"
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredEvents.map((event, index) => (
                    <div
                      key={`${event.id}-${index}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleEvent(event.id);
                      }}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer rounded"
                    >
                      <Checkbox
                        checked={safeSelectedEventIds.includes(event.id)}
                        onChange={() => {}} // Evita propagação dupla
                        className="text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="text-gray-700 font-medium">{event.display_name || event.name}</div>
                        {event.display_name && event.display_name !== event.name && (
                          <div className="text-gray-500 text-sm font-mono">{event.name}</div>
                        )}
                      </div>
                      {safeSelectedEventIds.includes(event.id) && (
                        <Check className="ml-auto h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tags dos tipos selecionados com filtros */}
      {safeSelectedEventIds.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Eventos Selecionados:</Label>
          <div className="space-y-2">
            {safeSelectedEventIds.map((eventId) => {
              const event = safeEvents.find(e => e.id === eventId);
              const filters = getFiltersForEvent(eventId);
              
              return (
                <div key={eventId} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                        {event?.display_name || event?.name || eventId}
                      </Badge>
                      {filters.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          {filters.length} filtro{filters.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    {filters.length > 0 && (
                      <div className="mt-1 text-xs text-gray-600">
                        {filters.map((filter, index) => (
                          <span key={index} className="mr-2">
                            {filter.field_path} = {filter.value?.toString()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {event && (
                      (['call-history-was-created', 'new-message-whatsapp', 'call-was-created', 'call-is-trying', 'call-was-abandoned', 'call-was-connected', 'new-agent-message-whatsapp', 'new-whatsapp-internal-message', 'mailing-list-was-finished', 'agent-was-logged-out', 'agent-is-idle', 'agent-entered-manual', 'start-snooze-chat-whatsapp', 'finish-chat', 'transfer-chat-whatsapp', 'new-agent-chat-whatsapp', 'call-was-not-answered', 'call-was-amd', 'call-was-answered'].includes(event.name)) ? (
                        <InteractiveEventFilter
                          eventName={event.name}
                          eventDisplayName={event.display_name || event.name}
                          filters={filters}
                          onFiltersChange={(newFilters) => handleFiltersChange(eventId, newFilters)}
                        />
                      ) : (
                        <EventFilterConfig
                          eventName={event.name}
                          eventDisplayName={event.display_name || event.name}
                          filters={filters}
                          onFiltersChange={(newFilters) => handleFiltersChange(eventId, newFilters)}
                        />
                      )
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={() => handleRemoveEvent(eventId)}
                      title="Remover evento"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={clearSelection}
          >
            Limpar todos os eventos
          </Button>
        </div>
      )}
    </div>
  );
}