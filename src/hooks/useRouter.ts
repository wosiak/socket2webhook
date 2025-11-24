import { useState } from 'react';

export type Route = 
  | { type: 'dashboard' }
  | { type: 'companies' }
  | { type: 'company'; companyId: string }
  | { type: 'user-management' }
  | { type: 'execution-history'; companyId: string };

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>({ type: 'dashboard' });

  const navigate = (route: Route) => {
    setCurrentRoute(route);
  };

  const goToDashboard = () => navigate({ type: 'dashboard' });
  const goToCompanies = () => navigate({ type: 'companies' });
  const goToCompany = (companyId: string) => navigate({ type: 'company', companyId });

  // New interface for App.tsx
  const currentView = currentRoute.type === 'company' 
    ? 'company-detail' 
    : currentRoute.type === 'execution-history' 
    ? 'execution-history' 
    : currentRoute.type;
  const currentCompanyId = currentRoute.type === 'company' 
    ? currentRoute.companyId 
    : currentRoute.type === 'execution-history'
    ? currentRoute.companyId
    : null;

  const navigateTo = (view: string, companyId?: string) => {
    console.log('🔧 useRouter.navigateTo chamado:', { view, companyId, currentRoute: currentRoute.type });
    
    if (view === 'company-detail' && companyId) {
      navigate({ type: 'company', companyId });
    } else if (view === 'execution-history' && companyId) {
      navigate({ type: 'execution-history', companyId });
    } else if (view === 'dashboard') {
      navigate({ type: 'dashboard' });
    } else if (view === 'companies') {
      navigate({ type: 'companies' });
    } else if (view === 'user-management') {
      navigate({ type: 'user-management' });
    }
    
    console.log('🔧 useRouter.navigateTo - após navigate, currentRoute:', currentRoute.type);
  };

  const navigateBack = () => {
    if (currentRoute.type === 'company') {
      navigate({ type: 'companies' });
    } else if (currentRoute.type === 'execution-history') {
      // Voltar para a empresa
      const companyId = currentRoute.companyId;
      navigate({ type: 'company', companyId });
    } else {
      navigate({ type: 'dashboard' });
    }
  };

  return {
    currentRoute,
    navigate,
    goToDashboard,
    goToCompanies,
    goToCompany,
    // New interface
    currentView,
    currentCompanyId,
    navigateTo,
    navigateBack
  };
}