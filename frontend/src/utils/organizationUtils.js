/**
 * Utilidades para manejo de organizaciones
 */

/**
 * Valida si el usuario tiene permisos para una acción específica
 * @param {Object} user - Usuario actual
 * @param {string} permission - Permiso requerido
 * @param {Object} organization - Organización actual
 * @returns {boolean} - True si tiene permiso
 */
export const hasPermission = (user, permission, organization) => {
  if (!user || !organization) return false;
  
  // Super admin siempre tiene permisos
  if (user.is_superuser) return true;
  
  // Buscar el usuario en los miembros de la organización
  const member = organization.members?.find(m => m.user.id === user.id);
  if (!member) return false;
  
  // Owner siempre tiene permisos
  if (member.role === 'owner') return true;
  
  // Admin tiene casi todos los permisos excepto algunos críticos
  if (member.role === 'admin') {
    const restrictedForAdmin = ['delete_organization', 'transfer_ownership'];
    return !restrictedForAdmin.includes(permission);
  }
  
  // Manager tiene permisos limitados
  if (member.role === 'manager') {
    const managerPermissions = [
      'view_organization',
      'edit_basic_info',
      'invite_members',
      'view_members',
      'manage_projects'
    ];
    return managerPermissions.includes(permission);
  }
  
  // Member solo puede ver
  if (member.role === 'member') {
    const memberPermissions = ['view_organization', 'view_members'];
    return memberPermissions.includes(permission);
  }
  
  return false;
};

/**
 * Obtiene el rol del usuario en la organización
 * @param {Object} user - Usuario actual
 * @param {Object} organization - Organización
 * @returns {string|null} - Rol del usuario o null
 */
export const getUserRole = (user, organization) => {
  if (!user || !organization) return null;
  
  const member = organization.members?.find(m => m.user.id === user.id);
  return member?.role || null;
};

/**
 * Verifica si el usuario es propietario de la organización
 * @param {Object} user - Usuario actual
 * @param {Object} organization - Organización
 * @returns {boolean}
 */
export const isOwner = (user, organization) => {
  return getUserRole(user, organization) === 'owner';
};

/**
 * Verifica si el usuario es admin de la organización
 * @param {Object} user - Usuario actual
 * @param {Object} organization - Organización
 * @returns {boolean}
 */
export const isAdmin = (user, organization) => {
  const role = getUserRole(user, organization);
  return role === 'owner' || role === 'admin';
};

/**
 * Formatea el nombre de la organización para mostrar
 * @param {Object} organization - Organización
 * @returns {string}
 */
export const formatOrganizationName = (organization) => {
  if (!organization) return 'Sin organización';
  return organization.name || 'Organización sin nombre';
};

/**
 * Genera iniciales para avatar de organización
 * @param {string} name - Nombre de la organización
 * @returns {string}
 */
export const getOrganizationInitials = (name) => {
  if (!name) return 'OR';
  
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Obtiene el color del tema para la organización
 * @param {Object} organization - Organización
 * @returns {string}
 */
export const getOrganizationThemeColor = (organization) => {
  if (!organization) return '#6366f1'; // indigo-500 por defecto
  
  return organization.theme_color || '#6366f1';
};

/**
 * Valida los datos de una organización
 * @param {Object} data - Datos de la organización
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validateOrganizationData = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }
  
  if (data.name && data.name.length > 100) {
    errors.push('El nombre no puede tener más de 100 caracteres');
  }
  
  if (data.description && data.description.length > 500) {
    errors.push('La descripción no puede tener más de 500 caracteres');
  }
  
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('El email no tiene un formato válido');
  }
  
  if (data.phone && !/^[\d\s\-\+\(\)]{10,}$/.test(data.phone)) {
    errors.push('El teléfono no tiene un formato válido');
  }
  
  if (data.website && !/^https?:\/\/.+/.test(data.website)) {
    errors.push('El sitio web debe comenzar con http:// o https://');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Formatea el estado de la organización
 * @param {string} status - Estado de la organización
 * @returns {Object} - { label: string, color: string, bgColor: string }
 */
export const formatOrganizationStatus = (status) => {
  const statusMap = {
    active: {
      label: 'Activa',
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    inactive: {
      label: 'Inactiva',
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-900/30'
    },
    suspended: {
      label: 'Suspendida',
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-100 dark:bg-red-900/30'
    },
    pending: {
      label: 'Pendiente',
      color: 'text-yellow-700 dark:text-yellow-300',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
    }
  };
  
  return statusMap[status] || statusMap.inactive;
};

/**
 * Filtra organizaciones según criterios
 * @param {Array} organizations - Lista de organizaciones
 * @param {Object} filters - Filtros a aplicar
 * @returns {Array} - Organizaciones filtradas
 */
export const filterOrganizations = (organizations, filters) => {
  if (!organizations || !Array.isArray(organizations)) return [];
  
  return organizations.filter(org => {
    // Filtro por búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = org.name?.toLowerCase().includes(searchLower);
      const matchesDescription = org.description?.toLowerCase().includes(searchLower);
      const matchesEmail = org.email?.toLowerCase().includes(searchLower);
      
      if (!matchesName && !matchesDescription && !matchesEmail) {
        return false;
      }
    }
    
    // Filtro por estado
    if (filters.status && filters.status !== 'all') {
      if (org.status !== filters.status) return false;
    }
    
    // Filtro por tipo
    if (filters.type && filters.type !== 'all') {
      if (org.organization_type !== filters.type) return false;
    }
    
    // Filtro por rol del usuario
    if (filters.role && filters.role !== 'all') {
      const userRole = getUserRole(filters.currentUser, org);
      if (userRole !== filters.role) return false;
    }
    
    return true;
  });
};

/**
 * Ordena organizaciones según criterio
 * @param {Array} organizations - Lista de organizaciones
 * @param {string} sortBy - Criterio de ordenación
 * @param {string} sortOrder - Orden (asc/desc)
 * @returns {Array} - Organizaciones ordenadas
 */
export const sortOrganizations = (organizations, sortBy = 'name', sortOrder = 'asc') => {
  if (!organizations || !Array.isArray(organizations)) return [];
  
  return [...organizations].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
        break;
      case 'created_at':
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case 'updated_at':
        aValue = new Date(a.updated_at);
        bValue = new Date(b.updated_at);
        break;
      case 'members_count':
        aValue = a.members?.length || 0;
        bValue = b.members?.length || 0;
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
      default:
        aValue = a[sortBy] || '';
        bValue = b[sortBy] || '';
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};
