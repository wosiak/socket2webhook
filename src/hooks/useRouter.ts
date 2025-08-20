import { useState } from 'react';

export type Route = 
  | { type: 'dashboard' }
  | { type: 'companies' }
  | { type: 'company'; companyId: string };

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>({ type: 'dashboard' });

  const navigate = (route: Route) => {
    setCurrentRoute(route);
  };

  const goToDashboard = () => navigate({ type: 'dashboard' });
  const goToCompanies = () => navigate({ type: 'companies' });
  const goToCompany = (companyId: string) => navigate({ type: 'company', companyId });

  // New interface for App.tsx
  const currentView = currentRoute.type === 'company' ? 'company-detail' : currentRoute.type;
  const currentCompanyId = currentRoute.type === 'company' ? currentRoute.companyId : null;

  const navigateTo = (view: string, companyId?: string) => {
    if (view === 'company-detail' && companyId) {
      navigate({ type: 'company', companyId });
    } else if (view === 'dashboard') {
      navigate({ type: 'dashboard' });
    } else if (view === 'companies') {
      navigate({ type: 'companies' });
    }
  };

  const navigateBack = () => {
    if (currentRoute.type === 'company') {
      navigate({ type: 'companies' });
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