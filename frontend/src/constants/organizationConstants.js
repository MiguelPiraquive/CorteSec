/**
 * Constantes para el sistema de organizaciones
 */

// Roles disponibles en las organizaciones
export const ORGANIZATION_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member'
};

// Labels para los roles
export const ROLE_LABELS = {
  [ORGANIZATION_ROLES.OWNER]: 'Propietario',
  [ORGANIZATION_ROLES.ADMIN]: 'Administrador',
  [ORGANIZATION_ROLES.MANAGER]: 'Gerente',
  [ORGANIZATION_ROLES.MEMBER]: 'Miembro'
};

// Colores para los roles
export const ROLE_COLORS = {
  [ORGANIZATION_ROLES.OWNER]: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-700'
  },
  [ORGANIZATION_ROLES.ADMIN]: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-700'
  },
  [ORGANIZATION_ROLES.MANAGER]: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-700'
  },
  [ORGANIZATION_ROLES.MEMBER]: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700'
  }
};

// Estados de las organizaciones
export const ORGANIZATION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

// Labels para los estados
export const STATUS_LABELS = {
  [ORGANIZATION_STATUS.ACTIVE]: 'Activa',
  [ORGANIZATION_STATUS.INACTIVE]: 'Inactiva',
  [ORGANIZATION_STATUS.SUSPENDED]: 'Suspendida',
  [ORGANIZATION_STATUS.PENDING]: 'Pendiente'
};

// Tipos de organización
export const ORGANIZATION_TYPES = {
  COMPANY: 'company',
  NONPROFIT: 'nonprofit',
  GOVERNMENT: 'government',
  EDUCATIONAL: 'educational',
  STARTUP: 'startup',
  ENTERPRISE: 'enterprise',
  OTHER: 'other'
};

// Labels para los tipos
export const TYPE_LABELS = {
  [ORGANIZATION_TYPES.COMPANY]: 'Empresa',
  [ORGANIZATION_TYPES.NONPROFIT]: 'Sin fines de lucro',
  [ORGANIZATION_TYPES.GOVERNMENT]: 'Gubernamental',
  [ORGANIZATION_TYPES.EDUCATIONAL]: 'Educativa',
  [ORGANIZATION_TYPES.STARTUP]: 'Startup',
  [ORGANIZATION_TYPES.ENTERPRISE]: 'Corporación',
  [ORGANIZATION_TYPES.OTHER]: 'Otro'
};

// Permisos del sistema
export const PERMISSIONS = {
  // Organización
  VIEW_ORGANIZATION: 'view_organization',
  EDIT_ORGANIZATION: 'edit_organization',
  DELETE_ORGANIZATION: 'delete_organization',
  TRANSFER_OWNERSHIP: 'transfer_ownership',
  
  // Configuración
  EDIT_BASIC_INFO: 'edit_basic_info',
  EDIT_CONTACT_INFO: 'edit_contact_info',
  EDIT_BRANDING: 'edit_branding',
  EDIT_SECURITY_SETTINGS: 'edit_security_settings',
  EDIT_ADVANCED_SETTINGS: 'edit_advanced_settings',
  
  // Miembros
  VIEW_MEMBERS: 'view_members',
  INVITE_MEMBERS: 'invite_members',
  REMOVE_MEMBERS: 'remove_members',
  EDIT_MEMBER_ROLES: 'edit_member_roles',
  
  // Proyectos y contenido
  MANAGE_PROJECTS: 'manage_projects',
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',
  
  // Facturación
  VIEW_BILLING: 'view_billing',
  MANAGE_BILLING: 'manage_billing'
};

// Configuración de navegación para organizaciones
export const ORGANIZATION_NAVIGATION = [
  {
    name: 'Dashboard',
    href: '/organizations',
    icon: 'home',
    permission: PERMISSIONS.VIEW_ORGANIZATION
  },
  {
    name: 'Miembros',
    href: '/organizations/members',
    icon: 'users',
    permission: PERMISSIONS.VIEW_MEMBERS
  },
  {
    name: 'Configuración',
    href: '/organizations/settings',
    icon: 'settings',
    permission: PERMISSIONS.EDIT_BASIC_INFO
  },
  {
    name: 'Lista de Organizaciones',
    href: '/organizations/list',
    icon: 'building',
    permission: PERMISSIONS.VIEW_ORGANIZATION
  }
];

// Límites por defecto
export const DEFAULT_LIMITS = {
  MEMBERS_PER_PAGE: 20,
  ORGANIZATIONS_PER_PAGE: 12,
  ACTIVITIES_PER_PAGE: 10,
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_LOGO_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500
};

// Configuración de archivos
export const FILE_CONFIG = {
  LOGO: {
    maxSize: DEFAULT_LIMITS.MAX_LOGO_SIZE,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  },
  DOCUMENTS: {
    maxSize: DEFAULT_LIMITS.MAX_UPLOAD_SIZE,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
  }
};

// Temas de color predefinidos
export const THEME_COLORS = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Índigo', value: '#6366f1' },
  { name: 'Púrpura', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Naranja', value: '#f97316' },
  { name: 'Amarillo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cian', value: '#06b6d4' },
  { name: 'Gris', value: '#6b7280' }
];

// Configuración de validación
export const VALIDATION_RULES = {
  NAME: {
    required: true,
    minLength: 2,
    maxLength: DEFAULT_LIMITS.MAX_NAME_LENGTH,
    pattern: /^[a-zA-Z0-9\s\-\.\,\&]+$/
  },
  EMAIL: {
    required: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  PHONE: {
    required: false,
    pattern: /^[\d\s\-\+\(\)]{10,}$/
  },
  WEBSITE: {
    required: false,
    pattern: /^https?:\/\/.+/
  },
  DESCRIPTION: {
    required: false,
    maxLength: DEFAULT_LIMITS.MAX_DESCRIPTION_LENGTH
  }
};

// Mensajes de error
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Este campo es obligatorio',
  INVALID_EMAIL: 'Introduce un email válido',
  INVALID_PHONE: 'Introduce un teléfono válido',
  INVALID_WEBSITE: 'La URL debe comenzar con http:// o https://',
  NAME_TOO_SHORT: `El nombre debe tener al menos ${VALIDATION_RULES.NAME.minLength} caracteres`,
  NAME_TOO_LONG: `El nombre no puede tener más de ${VALIDATION_RULES.NAME.maxLength} caracteres`,
  DESCRIPTION_TOO_LONG: `La descripción no puede tener más de ${VALIDATION_RULES.DESCRIPTION.maxLength} caracteres`,
  INVALID_NAME_CHARACTERS: 'El nombre contiene caracteres no válidos',
  FILE_TOO_LARGE: 'El archivo es demasiado grande',
  INVALID_FILE_TYPE: 'Tipo de archivo no válido',
  NETWORK_ERROR: 'Error de conexión. Inténtalo de nuevo.',
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción',
  ORGANIZATION_NOT_FOUND: 'Organización no encontrada'
};

// Configuración de notificaciones
export const NOTIFICATION_TYPES = {
  MEMBER_INVITED: 'member_invited',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  ROLE_CHANGED: 'role_changed',
  ORGANIZATION_UPDATED: 'organization_updated',
  SETTINGS_CHANGED: 'settings_changed'
};

// Plantillas de invitación
export const INVITATION_TEMPLATES = {
  BASIC: {
    subject: 'Invitación a {organizationName}',
    message: 'Has sido invitado a unirte a {organizationName} como {role}.'
  },
  CUSTOM: {
    subject: 'Invitación personalizada',
    message: 'Mensaje personalizable...'
  }
};

export default {
  ORGANIZATION_ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
  ORGANIZATION_STATUS,
  STATUS_LABELS,
  ORGANIZATION_TYPES,
  TYPE_LABELS,
  PERMISSIONS,
  ORGANIZATION_NAVIGATION,
  DEFAULT_LIMITS,
  FILE_CONFIG,
  THEME_COLORS,
  VALIDATION_RULES,
  ERROR_MESSAGES,
  NOTIFICATION_TYPES,
  INVITATION_TEMPLATES
};
