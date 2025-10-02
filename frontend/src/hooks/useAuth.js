import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

/**
 * Hook personalizado para manejo de autenticación
 * @returns {Object} - Estado y funciones de autenticación
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inicializar estado de autenticación
  useEffect(() => {
    const initAuth = () => {
      try {
        const token = authService.getToken();
        const userData = authService.getCurrentUser();
        
        if (token && userData) {
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Error inicializando auth:', error);
        setIsAuthenticated(false);
        setUser(null);
        authService.clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []); // Empty dependency array - only run once

  /**
   * Función de login
   * @param {Object} credentials - Email y contraseña
   * @returns {Promise} - Resultado del login
   */
  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.login(credentials);
      
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, message: response.message, user: response.user };
      } else {
        setError(response.message);
        return { success: false, message: response.message, errors: response.errors };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error de conexión';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Función de logout
   * @returns {Promise} - Resultado del logout
   */
  const logout = useCallback(async () => {
    setLoading(true);
    
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setLoading(false);
    }
  }, []);

  /**
   * Función de registro
   * @param {Object} userData - Datos del nuevo usuario
   * @returns {Promise} - Resultado del registro
   */
  const register = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.register(userData);
      
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, message: response.message };
      } else {
        setError(response.message);
        return { success: false, message: response.message, errors: response.errors };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error de conexión';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar perfil del usuario
   * @param {Object} profileData - Datos a actualizar
   * @returns {Promise} - Resultado de la actualización
   */
  const updateProfile = useCallback(async (profileData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.updateProfile(profileData);
      
      if (response.success) {
        setUser(response.user);
        return { success: true, message: response.message };
      } else {
        setError(response.message);
        return { success: false, message: response.message, errors: response.errors };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error actualizando perfil';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cambiar contraseña
   * @param {Object} passwordData - Datos de contraseña
   * @returns {Promise} - Resultado del cambio
   */
  const changePassword = useCallback(async (passwordData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.changePassword(passwordData);
      
      if (response.success) {
        return { success: true, message: response.message };
      } else {
        setError(response.message);
        return { success: false, message: response.message, errors: response.errors };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error cambiando contraseña';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verificar email
   * @returns {Promise} - Resultado de la verificación
   */
  const verifyEmail = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.verifyEmail();
      
      if (response.success) {
        // Actualizar estado del usuario
        setUser(prev => ({ ...prev, email_verified: true }));
        return { success: true, message: response.message };
      } else {
        setError(response.message);
        return { success: false, message: response.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error verificando email';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Solicitar recuperación de contraseña
   * @param {string} email - Email del usuario
   * @returns {Promise} - Resultado de la solicitud
   */
  const requestPasswordReset = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.requestPasswordReset(email);
      
      if (response.success) {
        return { success: true, message: response.message };
      } else {
        setError(response.message);
        return { success: false, message: response.message, errors: response.errors };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error enviando email de recuperación';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Confirmar recuperación de contraseña
   * @param {Object} resetData - Datos de confirmación
   * @returns {Promise} - Resultado de la confirmación
   */
  const confirmPasswordReset = useCallback(async (resetData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.confirmPasswordReset(resetData);
      
      if (response.success) {
        return { success: true, message: response.message };
      } else {
        setError(response.message);
        return { success: false, message: response.message, errors: response.errors };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error confirmando recuperación';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Limpiar errores
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refrescar datos del usuario
   */
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await authService.getProfile();
      if (response.success) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('Error refrescando usuario:', error);
    }
  }, [isAuthenticated]);

  return {
    // Estado
    user,
    isAuthenticated,
    loading,
    error,
    
    // Funciones
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    verifyEmail,
    requestPasswordReset,
    confirmPasswordReset,
    clearError,
    refreshUser,
    
    // Utilidades
    token: authService.getToken(),
    displayName: user?.display_name || user?.full_name || user?.email || 'Usuario',
    avatarUrl: user?.avatar_url || '/static/img/default-avatar.png',
    isEmailVerified: user?.email_verified || false,
    isStaff: user?.is_staff || false,
    isSuperuser: user?.is_superuser || false
  };
};

export default useAuth;
