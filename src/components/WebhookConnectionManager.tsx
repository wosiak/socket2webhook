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
import { webhookSocketService } from '../services/webhookSocketService'

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

interface WebhookConfig {
  id: string
  company_id: string
  url: string
  event_types: string[]
  is_active: boolean
  auth_header?: string
  signing_secret?: string
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
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])

  // Carrega webhooks da empresa
  const loadWebhooks = async () => {
    try {
      const response = await apiService.getWebhooks(companyId)
      const webhookData = response.data || []
      setWebhooks(webhookData)
    } catch (err) {
      console.error('Error loading webhooks:', err)
    }
  }

  // Verifica o status da conexão
  const checkConnectionStatus = async () => {
    try {
      // Usa o serviço local de socket
      const connectionInfo = webhookSocketService.getConnectionInfo()
      const isSocketConnected = connectionInfo.isConnected && connectionInfo.companyId === companyId
      
      setIsConnected(isSocketConnected)
      onStatusChange?.(isSocketConnected)
      
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
      // Busca a empresa para obter o token
      const companiesResponse = await apiService.getCompanies()
      const company = companiesResponse.data.find((c: any) => c.id === companyId)
      
      if (!company) {
        throw new Error('Empresa não encontrada')
      }

      if (!company.api_token) {
        throw new Error('Token de API não configurado para esta empresa')
      }

      // Filtra webhooks ativos
      const activeWebhooks = webhooks.filter(w => w.is_active)
      
      if (activeWebhooks.length === 0) {
        throw new Error('Nenhum webhook ativo encontrado para esta empresa')
      }

      // Conecta ao socket da 3C Plus
      await webhookSocketService.connectToSocket(companyId, company.api_token, activeWebhooks)
      
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
      webhookSocketService.disconnectFromSocket()
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
    loadWebhooks()
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

        {webhooks.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Webhooks Configurados</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-1 font-medium">{webhooks.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ativos:</span>
                  <span className="ml-1 font-medium">{webhooks.filter(w => w.is_active).length}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
