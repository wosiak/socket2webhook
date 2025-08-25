import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Dashboard } from "./components/Dashboard";
import { CompanyList } from "./components/CompanyList";
import { CompanyDetail } from "./components/CompanyDetail";
import { CompanyFormModal } from "./components/CompanyFormModal";
import { LoginScreen } from "./components/LoginScreen";
import { UserManagement } from "./components/UserManagement";
import { useWebhookManager } from "./hooks/useWebhookManager";
import { useRouter } from "./hooks/useRouter";
import { useAuth, usePermissions } from "./contexts/AuthContext";
import { BarChart3, Building, Webhook, AlertCircle, Loader2, RefreshCw, Zap, WifiOff, ArrowLeft, Search, Filter, LogOut, User, Users } from "lucide-react";

export default function App() {
  // Authentication
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const permissions = usePermissions();

  // Webhook management
  const {
    companies,
    events,
    webhooks,
    executions,
    metrics,
    companyMetrics,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // Edge Functions são agora inicializadas automaticamente pelo useWebhookManager

  const currentCompany = companies.find(c => c.id === currentCompanyId);
  const companyWebhooks = webhooks.filter(w => w.company_id === currentCompanyId);
  const companyExecutions = executions.filter(e => e.company_id === currentCompanyId);

  // Filtrar empresas baseado no status e termo de pesquisa
  const filteredCompanies = companies.filter(company => {
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
    const matchesSearch = !searchTerm || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.company_3c_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

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

  // Show loading during authentication check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

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
              {currentView === 'company-detail' && (
                <button
                  onClick={() => navigateBack()}
                  className="inline-flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Voltar"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Webhook className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {currentView === 'company-detail' && currentCompany 
                    ? `${currentCompany.name}`
                    : 'Socket2Webhook | 3C + [DEV]'
                  }
                </h1>
                <p className="text-sm text-gray-600">
                  {currentView === 'company-detail' 
                    ? 'Detalhes da empresa'
                    : 'Gerenciamento de webhooks'
                  }
                </p>
              </div>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center gap-4">
              {/* User Info */}
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-600">
                    {permissions.isSuperAdmin ? 'Super Admin' : 'Administrador'}
                  </p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {/* User Management Button (Super Admin only) */}
              {permissions.canManageUsers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateTo('user-management')}
                  className="hidden md:inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border-gray-200"
                >
                  <Users className="w-4 h-4" />
                  Usuários
                </Button>
              )}
              
              {/* Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="bg-white/80 backdrop-blur-sm border-gray-200 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline ml-2">Sair</span>
              </Button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {currentView === 'user-management' ? (
          <UserManagement />
        ) : currentView === 'company-detail' && currentCompany ? (
          <>
            <CompanyDetail
              company={currentCompany}
              webhooks={companyWebhooks}
              executions={companyExecutions}
              events={events}
              onUpdateCompany={handleUpdateCompany}
              onDeleteCompany={handleDeleteCompany}
              onUpdateWebhook={handleUpdateWebhook}
              onDeleteWebhook={handleDeleteWebhook}
              onCreateWebhook={handleAddWebhook}
              onRefreshData={refresh}
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
                companyMetrics={companyMetrics}
                executions={executions}
                mostUsedEvents={mostUsedEvents}
              />
            </TabsContent>

            <TabsContent value="companies" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Empresas</h2>
                  <p className="text-gray-600">Gerencie as empresas conectadas ao sistema</p>
                </div>
                <Button onClick={() => setIsCompanyModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Building className="h-4 w-4 mr-2" />
                  Nova Empresa
                </Button>
              </div>

              {/* Filtros */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Barra de pesquisa */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Pesquisar por nome ou ID da empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/80 backdrop-blur-sm border-gray-200"
                      />
                    </div>
                  </div>
                  
                  {/* Filtro por status */}
                  <div className="w-full md:w-48">
                    <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
                      <SelectTrigger className="bg-white/80 backdrop-blur-sm border-gray-200">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filtrar por status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as empresas</SelectItem>
                        <SelectItem value="active">Apenas ativas</SelectItem>
                        <SelectItem value="inactive">Apenas inativas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Botão limpar filtros */}
                  <div className="w-full md:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      className="w-full md:w-auto bg-white/80 backdrop-blur-sm border-gray-200"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
                
                {/* Contador de resultados */}
                <div className="mt-3 text-sm text-gray-600">
                  {filteredCompanies.length} de {companies.length} empresa(s) encontrada(s)
                  {(searchTerm || statusFilter !== 'all') && (
                    <span className="ml-2 text-blue-600">
                      • Filtros ativos
                    </span>
                  )}
                </div>
              </div>
              
              <CompanyList
                companies={filteredCompanies}
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