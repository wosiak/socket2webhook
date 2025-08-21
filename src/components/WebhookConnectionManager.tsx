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
      console.log('🔄 Carregando webhooks para empresa:', companyId)
      const response = await apiService.getWebhooks(companyId)
      const webhookData = response.data || []
      console.log('📋 Webhooks carregados:', webhookData)
      console.log('📊 Detalhes dos webhooks:')
      webhookData.forEach((webhook: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${webhook.id}`)
        console.log(`     Nome: ${webhook.name}`)
        console.log(`     URL: ${webhook.url}`)
        console.log(`     Ativo: ${webhook.is_active}`)
        console.log(`     Eventos: ${webhook.event_types?.join(', ') || 'Nenhum'}`)
        console.log(`     Company ID: ${webhook.company_id}`)
      })
      setWebhooks(webhookData)
    } catch (err) {
      console.error('❌ Error loading webhooks:', err)
    }
  }

  // Verifica o status da conexão
  const checkConnectionStatus = async () => {
    try {
      // Usa o serviço local de socket
      const connectionInfo = webhookSocketService.getConnectionInfo()
      const isSocketConnected = connectionInfo.isConnected && connectionInfo.companyId === companyId
      
      console.log('🔍 Verificando status da conexão:')
      console.log('  - ConnectionInfo:', connectionInfo)
      console.log('  - CompanyId atual:', companyId)
      console.log('  - CompanyId da conexão:', connectionInfo.companyId)
      console.log('  - IsConnected:', connectionInfo.isConnected)
      console.log('  - Resultado final:', isSocketConnected)
      
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
      console.log('🚀 Iniciando conexão ao webhook para empresa:', companyId)
      
      // Busca a empresa para obter o token
      console.log('🔍 Buscando dados da empresa...')
      const companiesResponse = await apiService.getCompanies()
      const company = companiesResponse.data.find((c: any) => c.id === companyId)
      
      console.log('🏢 Dados da empresa encontrados:', company)
      
      if (!company) {
        throw new Error('Empresa não encontrada')
      }

      if (!company.api_token) {
        throw new Error('Token de API não configurado para esta empresa')
      }

      console.log('🔑 Token da empresa encontrado:', company.api_token ? 'Sim' : 'Não')
      console.log('📋 Webhooks disponíveis:', webhooks.length)
      console.log('📊 Webhooks carregados no estado:', webhooks)

      // Filtra webhooks ativos
      const activeWebhooks = webhooks.filter(w => w.is_active)
      console.log('✅ Webhooks ativos encontrados:', activeWebhooks.length)
      console.log('📋 Detalhes dos webhooks ativos:')
      activeWebhooks.forEach((webhook, index) => {
        console.log(`  ${index + 1}. ID: ${webhook.id}`)
        console.log(`     Nome: ${webhook.name}`)
        console.log(`     URL: ${webhook.url}`)
        console.log(`     Eventos: ${webhook.event_types?.join(', ') || 'Nenhum'}`)
      })
      
      if (activeWebhooks.length === 0) {
        console.log('❌ Nenhum webhook ativo encontrado. Webhooks disponíveis:')
        webhooks.forEach((webhook, index) => {
          console.log(`  ${index + 1}. ID: ${webhook.id} - Ativo: ${webhook.is_active}`)
        })
        throw new Error('Nenhum webhook ativo encontrado para esta empresa')
      }

      console.log('🔌 Conectando ao socket da 3C Plus...')
      // Conecta ao socket da 3C Plus
      await webhookSocketService.connectToSocket(companyId, company.api_token, activeWebhooks)
      
      console.log('✅ Conexão ao socket estabelecida com sucesso!')
      setIsConnected(true)
      onStatusChange?.(true)
      await checkConnectionStatus()
    } catch (err: any) {
      console.error('❌ Error connecting webhook:', err)
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
    console.log('🔄 WebhookConnectionManager: useEffect executado')
    console.log('🏢 Company ID:', companyId)
    
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
