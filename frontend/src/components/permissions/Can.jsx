/**
 * Can.jsx
 * ========
 * Componente declarativo para renderizado condicional basado en permisos
 * 
 * Usage:
 * ```jsx
 * <Can permission="empleados.change">
 *   <button>Editar Empleado</button>
 * </Can>
 *
 * <Can resource="empleados" action="delete">
 *   <button>Eliminar</button>
 * </Can>
 *
 * <Can permissions={['usuarios.view', 'roles.view']} mode="any">
 *   <AdminPanel />
 * </Can>
 *
 * <Can uiElement="button:crear_empleado">
 *   <button>Crear Empleado</button>
 * </Can>
 *
 * <Can permission="configuracion.change" fallback={<div>Sin permisos</div>}>
 *   <ConfigForm />
 * </Can>
 * ```
 */

import { usePermissions } from '../../context/PermissionsContext';

/**
 * Componente Can - Renderizado condicional basado en permisos
 * 
 * @param {Object} props
 * @param {string} props.permission - Código de permiso único
 * @param {string[]} props.permissions - Array de códigos de permisos
 * @param {string} props.mode - 'any' | 'all' - Modo de verificación para múltiples permisos
 * @param {string} props.resource - Código de recurso (usar con action)
 * @param {string} props.action - Código de acción (usar con resource)
 * @param {string} props.uiElement - Código de elemento UI
 * @param {React.ReactNode} props.children - Contenido a renderizar si tiene permiso
 * @param {React.ReactNode} props.fallback - Contenido a renderizar si NO tiene permiso
 * @param {boolean} props.not - Invertir la lógica (renderizar si NO tiene permiso)
 */
const Can = ({ 
  permission, 
  permissions, 
  mode = 'any',
  resource,
  action,
  uiElement,
  children, 
  fallback = null,
  not = false
}) => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
    hasUIElement,
    initialized
  } = usePermissions();

  // No renderizar hasta que los permisos estén inicializados
  if (!initialized) {
    return null;
  }

  let hasAccess = false;

  // Verificar según el tipo de prop
  if (permission) {
    // Single permission
    hasAccess = hasPermission(permission);
  } else if (permissions && Array.isArray(permissions)) {
    // Multiple permissions
    if (mode === 'all') {
      hasAccess = hasAllPermissions(permissions);
    } else {
      hasAccess = hasAnyPermission(permissions);
    }
  } else if (resource && action) {
    // Resource + Action
    hasAccess = can(resource, action);
  } else if (uiElement) {
    // UI Element
    hasAccess = hasUIElement(uiElement);
  } else {
    console.warn('Can component: No permission prop provided');
    return fallback;
  }

  // Invertir lógica si not=true
  if (not) {
    hasAccess = !hasAccess;
  }

  return hasAccess ? children : fallback;
};

export default Can;
