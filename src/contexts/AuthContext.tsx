import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import type { User, AuthSession, LoginCredentials, Permission } from '../types';
import { ROLE_PERMISSIONS } from '../types';

interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkPermission: (permission: Permission) => boolean;
  hasRole: (role: string) => boolean;
  
  // Session management
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const SESSION_STORAGE_KEY = 'webhook_proxy_session';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Computed properties
  const isAuthenticated = !!user;

  // Initialize authentication on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check for existing session in localStorage
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionData) {
        setIsLoading(false);
        return;
      }

      const session: AuthSession = JSON.parse(sessionData);
      
      // Check if session is still valid
      if (new Date(session.expires_at) <= new Date()) {
        console.log('🔐 Sessão expirada, removendo...');
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setIsLoading(false);
        return;
      }

      // Validate session with server
      const response = await apiService.validateSession(session.token);
      if (response.success && response.data) {
        console.log('✅ Sessão válida, usuário autenticado:', response.data.email);
        setUser(response.data);
      } else {
        console.log('❌ Sessão inválida no servidor, removendo...');
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar autenticação:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await apiService.login(credentials);
      
      if (response.success && response.data) {
        // Save session to localStorage
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(response.data));
        setUser(response.data.user);
        
        console.log('✅ Login realizado com sucesso:', response.data.user.email);
        return { success: true };
      } else {
        console.log('❌ Falha no login:', response.error);
        return { success: false, error: response.error || 'Erro desconhecido' };
      }
    } catch (error) {
      console.error('❌ Erro durante login:', error);
      return { success: false, error: 'Erro interno do servidor' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Get current session token
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        
        // Invalidate session on server
        await apiService.logout(session.token);
      }
      
      // Clear local session
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setUser(null);
      
      console.log('✅ Logout realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro durante logout:', error);
      // Always clear local session even if server request fails
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermission = (permission: Permission): boolean => {
    if (!user || !user.is_active) return false;
    
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const refreshSession = async (): Promise<void> => {
    try {
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionData) return;

      const session: AuthSession = JSON.parse(sessionData);
      const response = await apiService.validateSession(session.token);
      
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        await logout();
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar sessão:', error);
      await logout();
    }
  };

  // Auto-refresh session every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshSession();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Cleanup expired sessions on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        refreshSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

  const value: AuthContextType = {
    // State
    user,
    isAuthenticated,
    isLoading,
    
    // Actions
    login,
    logout,
    checkPermission,
    hasRole,
    
    // Session management
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protecting routes
interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: Permission;
  requiredRole?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredPermission, 
  requiredRole,
  fallback = <div>Acesso negado</div>
}: ProtectedRouteProps) {
  const { isAuthenticated, checkPermission, hasRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback;
  }

  if (requiredPermission && !checkPermission(requiredPermission)) {
    return fallback;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return fallback;
  }

  return <>{children}</>;
}

// Hook for checking permissions in components
export function usePermissions() {
  const { checkPermission, hasRole } = useAuth();
  
  return {
    canManageCompanies: checkPermission('manage_companies'),
    canManageWebhooks: checkPermission('manage_webhooks'),
    canViewDashboard: checkPermission('view_dashboard'),
    canManageUsers: checkPermission('manage_users'),
    canChangeUserRoles: checkPermission('change_user_roles'),
    isSuperAdmin: hasRole('super_admin'),
    isAdmin: hasRole('admin')
  };
}
