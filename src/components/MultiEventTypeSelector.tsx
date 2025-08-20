import { useState, useRef, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Check, ChevronDown, X } from "lucide-react";
import { Event } from "../types";

interface MultiEventTypeSelectorProps {
  events: Event[];
  selectedEventIds: string[];
  onSelectionChange: (eventIds: string[]) => void;
  placeholder?: string;
}

export function MultiEventTypeSelector({
  events = [],
  selectedEventIds = [],
  onSelectionChange,
  placeholder = "Selecione tipos de eventos"
}: MultiEventTypeSelectorProps) {
  const [open, setOpen] = useState(false);

  // Garantir que temos arrays seguros
  const safeEvents = Array.isArray(events) ? events : [];
  const safeSelectedEventIds = Array.isArray(selectedEventIds) ? selectedEventIds : [];
  
  // Debug: verificar se eventos estão chegando no seletor
  console.log('MultiEventTypeSelector - Events recebidos:', events);
  console.log('MultiEventTypeSelector - SafeEvents:', safeEvents);
  console.log('MultiEventTypeSelector - SafeEvents length:', safeEvents.length);

  const handleToggleEvent = (eventId: string) => {
    if (safeSelectedEventIds.includes(eventId)) {
      onSelectionChange(safeSelectedEventIds.filter(id => id !== eventId));
    } else {
      onSelectionChange([...safeSelectedEventIds, eventId]);
    }
  };

  const handleRemoveEvent = (eventId: string) => {
    onSelectionChange(safeSelectedEventIds.filter(id => id !== eventId));
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

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
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
              <div className="text-sm text-gray-500 mb-2">
                Debug: {safeEvents.length} eventos encontrados
              </div>
              {safeEvents.length === 0 ? (
                <div className="text-gray-500 p-4 text-center">Nenhum evento encontrado</div>
              ) : (
                <div className="space-y-1">
                  {safeEvents.map((event, index) => {
                    console.log('Renderizando evento:', event);
                    return (
                      <div
                        key={`${event.id}-${index}`}
                        onClick={() => handleToggleEvent(event.id)}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer rounded"
                      >
                        <Checkbox
                          checked={safeSelectedEventIds.includes(event.id)}
                          readOnly
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tags dos tipos selecionados */}
      {safeSelectedEventIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {safeSelectedEventIds.map((eventId) => {
            const event = safeEvents.find(e => e.id === eventId);
            return (
              <Badge key={eventId} variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                {event?.display_name || event?.name || eventId}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-200"
                  onClick={() => handleRemoveEvent(eventId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={clearSelection}
          >
            Limpar todos
          </Button>
        </div>
      )}
    </div>
  );
}