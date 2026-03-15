/**
 * RouteGuard.jsx
 * ==============
 * Componente que protege rutas automaticamente usando la configuracion de routePermissions.
 * Envuelve el children y verifica permisos basado en la ruta actual.
 */

import { useLocation, Navigate } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsContext';
import { useAuth } from '../../context/AuthContext';
import { getRoutePermission } from '../../config/routePermissions';

/**
 * RouteGuard - Protege rutas automaticamente basado en la configuracion
 */
const RouteGuard = ({ children }) => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loading: permissionsLoading,
    initialized
  } = usePermissions();

  // Esperar a que auth y permisos se inicialicen
  if (authLoading || permissionsLoading || !initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Si no esta autenticado, redirigir a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Obtener configuracion de permisos para la ruta actual
  const routeConfig = getRoutePermission(location.pathname);

  // Si no hay configuracion, permitir acceso (ruta no protegida)
  if (!routeConfig) {
    return children;
  }

  // Ruta publica - solo requiere autenticacion
  if (routeConfig.public) {
    return children;
  }

  // Solo admins
  if (routeConfig.adminOnly) {
    if (user.is_superuser || user.is_staff) {
      return children;
    }
    return <AccessDenied reason="Esta pagina es solo para administradores" />;
  }

  let hasAccess = false;

  // Verificar permiso unico
  if (routeConfig.permission) {
    hasAccess = hasPermission(routeConfig.permission);
  }
  // Verificar multiples permisos
  else if (routeConfig.permissions && Array.isArray(routeConfig.permissions)) {
    if (routeConfig.mode === 'all') {
      hasAccess = hasAllPermissions(routeConfig.permissions);
    } else {
      hasAccess = hasAnyPermission(routeConfig.permissions);
    }
  }
  // Sin configuracion de permisos - permitir
  else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        reason="No tienes permisos para acceder a esta pagina"
        permission={routeConfig.permission || routeConfig.permissions?.join(', ')}
      />
    );
  }

  return children;
};

/**
 * Componente para mostrar acceso denegado
 */
const AccessDenied = ({ reason, permission }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8 max-w-md w-full text-center shadow-xl border border-red-100">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
        <p className="text-gray-600 mb-4">{reason}</p>
        {permission && (
          <p className="text-sm text-gray-500 bg-gray-100 rounded-lg p-2 font-mono">
            Permiso requerido: {permission}
          </p>
        )}
        <button
          onClick={() => window.history.back()}
          className="mt-6 px-6 py-2 bg-gradient-to-r from-primary-500 to-blue-600 text-white rounded-lg hover:from-primary-600 hover:to-blue-700 transition-all shadow-md"
        >
          Volver
        </button>
      </div>
    </div>
  );
};

export default RouteGuard;
