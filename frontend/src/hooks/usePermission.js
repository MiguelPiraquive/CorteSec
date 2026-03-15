/**
 * usePermission.js
 * ================
 * Custom hook para simplificar verificación de permisos
 * 
 * Usage:
 * ```jsx
 * const { hasPermission, can, hasAny } = usePermission();
 *
 * if (hasPermission('empleados.change')) {
 *   // Render edit button
 * }
 *
 * if (can('empleados', 'delete')) {
 *   // Render delete button
 * }
 *
 * if (hasAny(['usuarios.view', 'roles.view'])) {
 *   // Render admin section
 * }
 * ```
 */

import { usePermissions } from '../context/PermissionsContext';

/**
 * Hook para verificar permisos individuales
 * @param {string} permission - Código del permiso a verificar
 * @returns {boolean} - True si el usuario tiene el permiso
 */
export const usePermission = (permission) => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
};

/**
 * Hook para verificar múltiples permisos (cualquiera)
 * @param {string[]} permissionsList - Array de códigos de permisos
 * @returns {boolean} - True si el usuario tiene al menos uno de los permisos
 */
export const useAnyPermission = (permissionsList) => {
  const { hasAnyPermission } = usePermissions();
  return hasAnyPermission(permissionsList);
};

/**
 * Hook para verificar múltiples permisos (todos)
 * @param {string[]} permissionsList - Array de códigos de permisos
 * @returns {boolean} - True si el usuario tiene todos los permisos
 */
export const useAllPermissions = (permissionsList) => {
  const { hasAllPermissions } = usePermissions();
  return hasAllPermissions(permissionsList);
};

/**
 * Hook para verificar permiso de recurso+acción
 * @param {string} resource - Código del recurso
 * @param {string} action - Código de la acción
 * @returns {boolean} - True si el usuario puede realizar la acción en el recurso
 */
export const useCan = (resource, action) => {
  const { can } = usePermissions();
  return can(resource, action);
};

/**
 * Hook para verificar elemento UI
 * @param {string} uiElementCode - Código del elemento UI
 * @returns {boolean} - True si el usuario puede ver el elemento UI
 */
export const useUIElement = (uiElementCode) => {
  const { hasUIElement } = usePermissions();
  return hasUIElement(uiElementCode);
};

/**
 * Hook principal que retorna todas las funciones de verificación
 * @returns {Object} - Objeto con todas las funciones de verificación
 */
export const usePermissionHelpers = () => {
  const permissions = usePermissions();
  
  return {
    // Direct permission check
    hasPermission: permissions.hasPermission,
    has: permissions.hasPermission, // Alias
    
    // Multiple permissions
    hasAny: permissions.hasAnyPermission,
    hasAll: permissions.hasAllPermissions,
    
    // Resource + Action
    can: permissions.can,
    
    // UI Elements
    hasUIElement: permissions.hasUIElement,
    hasUI: permissions.hasUIElement, // Alias
    getUIByType: permissions.getUIElementsByType,
    getSidebarItems: permissions.getSidebarItems,
    
    // Advanced
    check: permissions.checkPermission,
    reload: permissions.reload,
    clearCache: permissions.clearCache,
    
    // State
    loading: permissions.loading,
    error: permissions.error,
    initialized: permissions.initialized,
    permissions: permissions.permissions,
    uiElements: permissions.uiElements,
    resources: permissions.resources,
    actions: permissions.actions,
  };
};

export default usePermission;
