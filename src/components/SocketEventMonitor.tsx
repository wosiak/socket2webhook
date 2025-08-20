import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { SocketEvent, Company } from "../types";
import { Activity, Wifi, WifiOff } from "lucide-react";

interface SocketEventMonitorProps {
  socketEvents: SocketEvent[];
  companies: Company[];
  isSocketConnected: boolean;
}

export function SocketEventMonitor({ 
  socketEvents = [], 
  companies = [], 
  isSocketConnected 
}: SocketEventMonitorProps) {
  const getCompanyName = (companyId: string) => {
    if (!companies || companies.length === 0) return `Empresa ${companyId}`;
    const company = companies.find(c => c.company_3c_id === companyId);
    return company?.name || `Empresa ${companyId}`;
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'finish-chat-whatsapp':
        return 'bg-green-100 text-green-800';
      case 'call-was-connected':
        return 'bg-blue-100 text-blue-800';
      case 'manual-call-was-qualified':
        return 'bg-purple-100 text-purple-800';
      case 'start-chat-whatsapp':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Monitor de Eventos Socket</h1>
          <p className="text-muted-foreground">
            Eventos recebidos em tempo real do socket 3C Plus
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isSocketConnected ? (
            <div className="flex items-center gap-2 text-green-600">
              <Wifi className="h-4 w-4" />
              <span>Conectado</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <WifiOff className="h-4 w-4" />
              <span>Desconectado</span>
            </div>
          )}
          <Badge variant="outline">
            {socketEvents.length} eventos
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Eventos Recebidos
          </CardTitle>
          <CardDescription>
            Últimos eventos recebidos via socket.io
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSocketConnected ? (
            <div className="text-center py-8">
              <WifiOff className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2">Socket Desconectado</h3>
              <p className="text-muted-foreground">
                Aguardando conexão com o socket 3C Plus...
              </p>
            </div>
          ) : socketEvents.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2">Aguardando Eventos</h3>
              <p className="text-muted-foreground">
                Nenhum evento recebido ainda. Eventos aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {socketEvents.map((event, index) => (
                  <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getEventTypeColor(event.event_type)}>
                          {event.event_type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {getCompanyName(event.company_id)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        Empresa ID: {event.company_id}
                      </div>
                      
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Ver payload ({Object.keys(event.payload || {}).length} propriedades)
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                    
                    <div className="flex-shrink-0 text-xs text-muted-foreground">
                      #{socketEvents.length - index}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}