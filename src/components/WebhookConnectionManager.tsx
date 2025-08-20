import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { 
  Wifi, 
  WifiOff, 
  Play, 
  Square, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { apiService } from '../services/api'

interface WebhookConnectionManagerProps {
  companyId: string
  companyName: string
  onStatusChange?: (connected: boolean) => void
}

interface ConnectionStatus {
  connections: Record<string, boolean>
  activeConnections: string[]
  totalConnections: number
}

export function WebhookConnectionManager({ 
  companyId, 
  companyName, 
  onStatusChange 
}: WebhookConnectionManagerProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Verifica o status da conexão
  const checkConnectionStatus = async () => {
    try {
      const response = await apiService.getWebhookStatus()
      const status: ConnectionStatus = response.data
      setConnectionStatus(status)
      
      const companyConnected = status.connections[companyId] || false
      setIsConnected(companyConnected)
      onStatusChange?.(companyConnected)
      
      setError(null)
    } catch (err) {
      console.error('Error checking connection status:', err)
      setError('Erro ao verificar status da conexão')
    }
  }

  // Conecta ao webhook
  const connectWebhook = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await apiService.connectWebhook(companyId)
      setIsConnected(true)
      onStatusChange?.(true)
      await checkConnectionStatus()
    } catch (err: any) {
      console.error('Error connecting webhook:', err)
      setError(err.message || 'Erro ao conectar webhook')
    } finally {
      setIsLoading(false)
    }
  }

  // Desconecta do webhook
  const disconnectWebhook = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await apiService.disconnectWebhook(companyId)
      setIsConnected(false)
      onStatusChange?.(false)
      await checkConnectionStatus()
    } catch (err: any) {
      console.error('Error disconnecting webhook:', err)
      setError(err.message || 'Erro ao desconectar webhook')
    } finally {
      setIsLoading(false)
    }
  }

  // Carrega o status inicial
  useEffect(() => {
    checkConnectionStatus()
    
    // Atualiza o status a cada 30 segundos
    const interval = setInterval(checkConnectionStatus, 30000)
    return () => clearInterval(interval)
  }, [companyId])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Conexão Webhook
            </CardTitle>
            <CardDescription>
              Gerencie a conexão com o socket da 3C Plus para {companyName}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isConnected ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {isConnected ? (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Conectado
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Desconectado
                </>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Status da Conexão</p>
            <p className="text-xs text-muted-foreground">
              {isConnected 
                ? 'Conectado ao socket da 3C Plus e pronto para receber eventos'
                : 'Desconectado do socket da 3C Plus'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={isConnected}
              onCheckedChange={isConnected ? disconnectWebhook : connectWebhook}
              disabled={isLoading}
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Ações</span>
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnectionStatus}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Status
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={connectWebhook}
              disabled={isConnected || isLoading}
              className="flex items-center gap-2"
            >
              <Play className="h-3 w-3" />
              Conectar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={disconnectWebhook}
              disabled={!isConnected || isLoading}
              className="flex items-center gap-2"
            >
              <Square className="h-3 w-3" />
              Desconectar
            </Button>
          </div>
        </div>

        {connectionStatus && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Informações do Sistema</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Conexões Ativas:</span>
                  <span className="ml-1 font-medium">{connectionStatus.totalConnections}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Esta Empresa:</span>
                  <span className="ml-1 font-medium">
                    {connectionStatus.connections[companyId] ? 'Conectada' : 'Desconectada'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
