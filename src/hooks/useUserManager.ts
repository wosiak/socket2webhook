import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { User, CreateUserPayload, UpdateUserPayload } from '../types';

interface UseUserManagerReturn {
  // State
  users: User[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadUsers: () => Promise<void>;
  createUser: (userData: CreateUserPayload) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: string, updates: UpdateUserPayload) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (userId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Utils
  clearError: () => void;
  refresh: () => Promise<void>;
}

export function useUserManager(): UseUserManagerReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getUsers();
      
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        throw new Error(response.error || 'Erro ao carregar usuários');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('❌ Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (userData: CreateUserPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.createUser(userData);
      
      if (response.success && response.data) {
        // Add new user to the list
        setUsers(prev => [response.data!, ...prev]);
        return { success: true };
      } else {
        const errorMessage = response.error || 'Erro ao criar usuário';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (userId: string, updates: UpdateUserPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.updateUser(userId, updates);
      
      if (response.success && response.data) {
        // Update user in the list
        setUsers(prev => prev.map(user => 
          user.id === userId ? response.data! : user
        ));
        return { success: true };
      } else {
        const errorMessage = response.error || 'Erro ao atualizar usuário';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.deleteUser(userId);
      
      if (response.success) {
        // Remove user from the list
        setUsers(prev => prev.filter(user => user.id !== userId));
        return { success: true };
      } else {
        const errorMessage = response.error || 'Erro ao deletar usuário';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleUserStatus = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }
      
      const updates: UpdateUserPayload = {
        is_active: !user.is_active
      };
      
      const response = await apiService.updateUser(userId, updates);
      
      if (response.success && response.data) {
        // Update user in the list
        setUsers(prev => prev.map(u => 
          u.id === userId ? response.data! : u
        ));
        return { success: true };
      } else {
        const errorMessage = response.error || 'Erro ao alterar status do usuário';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [users]);

  const refresh = useCallback(async () => {
    await loadUsers();
  }, [loadUsers]);

  return {
    // State
    users,
    loading,
    error,
    
    // Actions
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    
    // Utils
    clearError,
    refresh
  };
}
