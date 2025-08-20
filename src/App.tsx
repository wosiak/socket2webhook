import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Dashboard } from "./components/Dashboard";
import { CompanyList } from "./components/CompanyList";
import { CompanyDetail } from "./components/CompanyDetail";
import { CompanyFormModal } from "./components/CompanyFormModal";
import { useWebhookManager } from "./hooks/useWebhookManager";
import { useRouter } from "./hooks/useRouter";
import { BarChart3, Building, Webhook, AlertCircle, Loader2, RefreshCw, Zap, WifiOff } from "lucide-react";

export default function App() {
  const {
    companies,
    events,
    webhooks,
    executions,
    metrics,
    mostUsedEvents,
    socketEvents,
    isSocketConnected,
    loading,
    error,
    addCompany,
    updateCompany,
    deleteCompany,
    addWebhook,
    updateWebhook,
    deleteWebhook,
    addExecution,
    updateExecution,
    getMetrics,
    getMostUsedEvents,
    refresh
  } = useWebhookManager();

  const { currentView, currentCompanyId, navigateTo, navigateBack } = useRouter();

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const currentCompany = companies.find(c => c.id === currentCompanyId);
  const companyWebhooks = webhooks.filter(w => w.company_id === currentCompanyId);
  const companyExecutions = executions.filter(e => e.company_id === currentCompanyId);

  const handleAddCompany = async (companyData: any) => {
    try {
      const newCompany = await addCompany(companyData);
      setIsCompanyModalOpen(false);
      
      // Redirecionar para a empresa criada
      if (newCompany && newCompany.id) {
        navigateTo('company-detail', newCompany.id);
      }
    } catch (error) {
      console.error('Error adding company:', error);
    }
  };

  const handleUpdateCompany = async (id: string, updates: any) => {
    try {
      await updateCompany(id, updates);
    } catch (error) {
      console.error('Error updating company:', error);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      await deleteCompany(id);
      if (currentCompanyId === id) {
        navigateBack();
      }
    } catch (error) {
      console.error('Error deleting company:', error);
    }
  };

  const handleAddWebhook = async (webhookData: any) => {
    try {
      await addWebhook(webhookData);
    } catch (error) {
      console.error('Error adding webhook:', error);
    }
  };

  const handleUpdateWebhook = async (id: string, updates: any) => {
    try {
      await updateWebhook(id, updates);
    } catch (error) {
      console.error('Error updating webhook:', error);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await deleteWebhook(id);
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Erro ao carregar dados</p>
                <p className="text-sm">{error}</p>
                <Button onClick={refresh} size="sm" className="mt-2">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Webhook className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">3C+ | Socket2Webhook</h1>
                <p className="text-sm text-gray-600">Gerenciamento de webhooks</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {isSocketConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              
              <Button variant="outline" onClick={refresh} size="sm" className="bg-white/80 backdrop-blur-sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {currentView === 'company-detail' && currentCompany ? (
          <>
            {/* Debug: verificar eventos no App */}
            {console.log('App - Events antes de passar para CompanyDetail:', events)}
            {console.log('App - Events length:', events?.length)}
            <CompanyDetail
              company={currentCompany}
              webhooks={companyWebhooks}
              executions={companyExecutions}
              events={events}
              onBack={navigateBack}
              onUpdateCompany={handleUpdateCompany}
              onAddWebhook={handleAddWebhook}
              onUpdateWebhook={handleUpdateWebhook}
              onDeleteWebhook={handleDeleteWebhook}
            />
          </>
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm border border-white/20">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="companies" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Empresas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <Dashboard
                metrics={metrics}
                executions={executions}
                mostUsedEvents={mostUsedEvents}
                isSocketConnected={isSocketConnected}
                totalSocketEvents={socketEvents.length}
              />
            </TabsContent>

            <TabsContent value="companies" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Empresas</h2>
                  <p className="text-gray-600">Gerencie as empresas conectadas ao sistema</p>
                </div>
                <Button onClick={() => setIsCompanyModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Building className="h-4 w-4 mr-2" />
                  Nova Empresa
                </Button>
              </div>
              
              <CompanyList
                companies={companies}
                onViewCompany={(company) => navigateTo('company-detail', company.id)}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Company Modal */}
      <CompanyFormModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSubmit={handleAddCompany}
      />
    </div>
  );
}