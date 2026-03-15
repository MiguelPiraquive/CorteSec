/**
 * PermissionsContext.jsx
 * =======================
 * Context global para gestión de permisos RBAC granular
 *
 * Features:
 * - Carga automática de permisos del usuario logueado
 * - Cache en memoria de permisos
 * - Verificación de permisos (has, hasAny, hasAll)
 * - Gestión de elementos UI permitidos
 * - Recarga dinámica de permisos
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import apiClient from '../services/api';

const PermissionsContext = createContext(null);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions debe usarse dentro de PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [uiElements, setUiElements] = useState([]);
  const [resources, setResources] = useState([]);
  const [actions, setActions] = useState([]);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  /**
   * Cargar permisos del usuario desde el backend
   */
  const loadPermissions = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPermissions([]);
      setUiElements([]);
      setResources([]);
      setActions([]);
      setIsSuperuser(false);
      setInitialized(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const permissionsResponse = await apiClient.get('/api/permisos/check/me/');

      const data = permissionsResponse.data;

      setPermissions(data.permissions || []);
      setUiElements(data.ui_elements || []);
      setResources(data.resources || []);
      setActions(data.actions || []);
      // is_superuser viene del backend (verificado server-side), no de localStorage
      setIsSuperuser(data.is_superuser === true);

    } catch (err) {
      console.error('❌ Error cargando permisos:', err);
      setError(err.response?.data?.detail || 'Error cargando permisos');

      setPermissions([]);
      setUiElements([]);
      setResources([]);
      setActions([]);
      setIsSuperuser(false);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [isAuthenticated, user]);

  /**
   * Cargar permisos al montar o cuando cambie el usuario
   */
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  /**
   * Auto-refresh: verificar cambios de permisos cada 5 minutos
   */
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutos
    const interval = setInterval(() => {
      loadPermissions();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, loadPermissions]);

  /**
   * Verificar si el usuario tiene un permiso específico
   */
  const hasPermission = useCallback((permission) => {
    if (!permission) return false;
    if (!initialized) return false;

    if (isSuperuser) return true;

    return permissions.includes(permission);
  }, [permissions, isSuperuser, initialized]);

  /**
   * Verificar si el usuario tiene AL MENOS UNO de los permisos
   */
  const hasAnyPermission = useCallback((permissionsList) => {
    if (!Array.isArray(permissionsList) || permissionsList.length === 0) return false;
    if (!initialized) return false;

    if (isSuperuser) return true;

    return permissionsList.some(permission => permissions.includes(permission));
  }, [permissions, isSuperuser, initialized]);

  /**
   * Verificar si el usuario tiene TODOS los permisos
   */
  const hasAllPermissions = useCallback((permissionsList) => {
    if (!Array.isArray(permissionsList) || permissionsList.length === 0) return false;
    if (!initialized) return false;

    if (isSuperuser) return true;

    return permissionsList.every(permission => permissions.includes(permission));
  }, [permissions, isSuperuser, initialized]);

  /**
   * Verificar si un recurso específico con acción está permitido
   */
  const can = useCallback((resourceCode, actionCode) => {
    if (!resourceCode || !actionCode) return false;
    if (!initialized) return false;

    if (isSuperuser) return true;

    const permissionCode = `${resourceCode}.${actionCode}`;
    return permissions.includes(permissionCode);
  }, [permissions, isSuperuser, initialized]);

  /**
   * Verificar si un elemento UI está permitido
   */
  const hasUIElement = useCallback((uiElementCode) => {
    if (!uiElementCode) return false;
    if (!initialized) return false;

    if (isSuperuser) return true;

    return uiElements.some(el => el.codigo === uiElementCode);
  }, [uiElements, isSuperuser, initialized]);

  /**
   * Obtener elementos UI filtrados por tipo
   */
  const getUIElementsByType = useCallback((type) => {
    if (!type) return [];
    return uiElements.filter(el => el.tipo === type);
  }, [uiElements]);

  /**
   * Obtener items del sidebar permitidos
   */
  const getSidebarItems = useCallback(() => {
    return getUIElementsByType('sidebar_item').sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [getUIElementsByType]);

  /**
   * Verificar permiso con llamada al backend
   */
  const checkPermission = useCallback(async (permission, context = {}) => {
    if (!isAuthenticated) return false;
    if (isSuperuser) return true;

    try {
      const response = await apiClient.post(
        '/api/permisos/check/',
        { permission, context }
      );
      return response.data.has_permission || false;
    } catch (err) {
      console.error('Error checking permission:', err);
      return false;
    }
  }, [isAuthenticated, user]);

  /**
   * Limpiar cache de permisos en el backend
   */
  const clearCache = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await apiClient.post('/api/permisos/check/clear-cache/', {});
      await loadPermissions();
    } catch (err) {
      console.error('Error limpiando cache:', err);
    }
  }, [isAuthenticated, loadPermissions]);

  /**
   * Valor del contexto memorizado
   */
  const value = useMemo(() => ({
    permissions,
    uiElements,
    resources,
    actions,
    loading,
    error,
    initialized,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
    hasUIElement,
    getUIElementsByType,
    getSidebarItems,
    checkPermission,
    clearCache,
    reload: loadPermissions,
  }), [
    permissions,
    uiElements,
    resources,
    actions,
    loading,
    error,
    initialized,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
    hasUIElement,
    getUIElementsByType,
    getSidebarItems,
    checkPermission,
    clearCache,
    loadPermissions
  ]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export default PermissionsContext;
