/**
 * routePermissions.js
 * ====================
 * Configuracion de permisos requeridos para cada ruta del sistema.
 *
 * Formato de permisos: "modulo.accion"
 * Acciones disponibles: view, add, change, delete
 *
 * Ejemplo: "empleados.view" = Ver empleados
 */

/**
 * Mapeo de rutas a permisos requeridos
 * - permission: Permiso unico requerido
 * - permissions: Array de permisos (con mode: 'any' o 'all')
 * - public: true = No requiere permisos (solo autenticacion)
 * - adminOnly: true = Solo superusuarios/staff
 */
export const ROUTE_PERMISSIONS = {
  // Dashboard principal
  '/dashboard': {
    permission: 'dashboard.view',
    label: 'Ver Dashboard',
  },

  // === RECURSOS HUMANOS ===
  '/dashboard/empleados': {
    permission: 'empleados.view',
    label: 'Ver Empleados',
  },
  '/dashboard/cargos': {
    permission: 'cargos.view',
    label: 'Ver Cargos',
  },
  '/dashboard/tipos-contrato': {
    permission: 'tipos_contrato.view',
    label: 'Ver Tipos de Contrato',
  },
  '/dashboard/contratos': {
    permission: 'contratos.view',
    label: 'Ver Contratos',
  },

  // === NOMINA ===
  '/dashboard/nomina': {
    permission: 'nomina.view',
    label: 'Ver Nomina',
  },
  '/dashboard/conceptos-laborales': {
    permission: 'conceptos_laborales.view',
    label: 'Ver Conceptos Laborales',
  },
  '/dashboard/parametros-legales': {
    permission: 'parametros_legales.view',
    label: 'Ver Parametros Legales',
  },

  // === FINANZAS ===
  '/dashboard/prestamos': {
    permission: 'prestamos.view',
    label: 'Ver Prestamos',
  },
  '/dashboard/tipos-prestamo': {
    permission: 'tipos_prestamo.view',
    label: 'Ver Tipos de Prestamo',
  },
  '/dashboard/items': {
    permission: 'items.view',
    label: 'Ver Items',
  },
  '/dashboard/contabilidad': {
    permission: 'contabilidad.view',
    label: 'Ver Contabilidad',
  },

  // === OPERACIONES (Proyectos - permisos granulares) ===
  '/dashboard/projects': {
    permission: 'proyectos.view',
    label: 'Ver Proyectos',
  },
  '/dashboard/projects/kanban': {
    permission: 'proyectos.kanban',
    label: 'Kanban de Proyectos',
  },
  '/dashboard/projects/timeline': {
    permission: 'proyectos.timeline',
    label: 'Timeline de Proyectos',
  },
  '/dashboard/projects/reports': {
    permission: 'proyectos.reports',
    label: 'Reportes de Proyectos',
  },
  '/dashboard/projects/achievements': {
    permission: 'proyectos.logros',
    label: 'Logros de Proyectos',
  },

  // === UBICACIONES ===
  '/dashboard/departamentos': {
    permission: 'departamentos.view',
    label: 'Ver Departamentos',
  },
  '/dashboard/municipios': {
    permission: 'municipios.view',
    label: 'Ver Municipios',
  },

  // === SEGURIDAD Y ACCESO ===
  '/dashboard/usuarios': {
    permission: 'usuarios.view',
    label: 'Ver Usuarios',
  },
  '/dashboard/roles': {
    permission: 'roles.view',
    label: 'Ver Roles',
  },
  '/dashboard/permisos': {
    permission: 'permisos.view',
    label: 'Ver Permisos',
  },
  '/dashboard/auditoria': {
    permission: 'auditoria.view',
    label: 'Ver Auditoria',
  },

  // === ADMINISTRACION ===
  '/dashboard/configuracion': {
    permission: 'configuracion.view',
    label: 'Ver Configuracion',
  },
  '/dashboard/parametros': {
    permission: 'configuracion.view',
    label: 'Parametros del Sistema',
  },
  '/dashboard/modulos': {
    permission: 'configuracion.view',
    label: 'Modulos del Sistema',
  },
  '/dashboard/seguridad': {
    permission: 'configuracion.view',
    label: 'Seguridad del Sistema',
  },
  '/dashboard/email': {
    permission: 'configuracion.view',
    label: 'Configuracion de Email',
  },
  '/dashboard/organizaciones': {
    permission: 'organizaciones.view',
    label: 'Ver Organizaciones',
  },
  '/dashboard/planes': {
    adminOnly: true,
    label: 'Ver Planes',
  },
  '/dashboard/system-status': {
    adminOnly: true,
    label: 'Ver Estado del Sistema',
  },

  // === PERFIL ===
  '/dashboard/perfil': {
    permission: 'perfil.view',
    label: 'Ver Perfil',
  },

  // === NOTIFICACIONES ===
  '/dashboard/notificaciones': {
    public: true,
    label: 'Ver Notificaciones',
  },

  // === CENTRO DE AYUDA ===
  '/dashboard/ayuda': {
    permission: 'ayuda.view',
    label: 'Centro de Ayuda',
  },
  '/dashboard/ayuda/articulos': {
    permission: 'ayuda.view',
    label: 'Ver Articulos',
  },
  '/dashboard/ayuda/faqs': {
    permission: 'ayuda.view',
    label: 'Ver FAQs',
  },
  '/dashboard/ayuda/tutoriales': {
    permission: 'ayuda.view',
    label: 'Ver Tutoriales',
  },
  '/dashboard/ayuda/soporte': {
    permission: 'ayuda.view',
    label: 'Soporte',
  },
  '/dashboard/ayuda/buscar': {
    permission: 'ayuda.view',
    label: 'Buscar Ayuda',
  },
  '/dashboard/ayuda/tours': {
    permission: 'ayuda.view',
    label: 'Tours Interactivos',
  },

  // === BUSQUEDA ===
  '/dashboard/busqueda': {
    public: true,
    label: 'Busqueda Global',
  },

  // === BILLING ===
  '/dashboard/billing': {
    public: true,
    label: 'Mi Suscripción',
  },
  '/dashboard/billing/planes': {
    public: true,
    label: 'Ver Planes',
  },
  '/dashboard/billing/checkout': {
    public: true,
    label: 'Checkout',
  },
  '/dashboard/billing/facturas': {
    public: true,
    label: 'Facturas',
  },
  '/dashboard/billing/metodos-pago': {
    public: true,
    label: 'Métodos de Pago',
  },
};

/**
 * Configuracion del sidebar con permisos
 *
 * Tipos de items:
 * - item simple: { name, icon, path, color, permission }
 * - submenu: { name, icon, color, submenu: [...], permissions, mode }
 * - separador: { type: 'separator', label: 'Seccion' }
 */
export const SIDEBAR_CONFIG = [
  // ─── INICIO ───
  {
    name: 'Dashboard',
    icon: 'HomeIcon',
    path: '/dashboard',
    color: 'text-blue-600',
    permission: 'dashboard.view',
  },

  // ─── GESTIÓN ───
  { type: 'separator', label: 'Gestión' },

  {
    name: 'Recursos Humanos',
    icon: 'UsersIcon',
    color: 'text-green-600',
    permissions: ['empleados.view', 'cargos.view', 'contratos.view'],
    mode: 'any',
    requiredFeature: 'empleados',
    submenu: [
      { name: 'Empleados', path: '/dashboard/empleados', icon: 'UsersIcon', permission: 'empleados.view' },
      { name: 'Cargos', path: '/dashboard/cargos', icon: 'BriefcaseIcon', permission: 'cargos.view', requiredFeature: 'cargos' },
      { name: 'Contratos', path: '/dashboard/contratos', icon: 'FileSignatureIcon', permission: 'contratos.view', requiredFeature: 'contratos' },
    ],
  },
  {
    name: 'Nómina',
    icon: 'ReceiptIcon',
    color: 'text-amber-600',
    permissions: ['nomina.view', 'conceptos_laborales.view', 'parametros_legales.view'],
    mode: 'any',
    requiredFeature: 'nomina_basica',
    submenu: [
      { name: 'Liquidación de Nómina', path: '/dashboard/nomina', icon: 'CreditCardIcon', permission: 'nomina.view' },
      { name: 'Conceptos Laborales', path: '/dashboard/conceptos-laborales', icon: 'DollarSignIcon', permission: 'conceptos_laborales.view', requiredFeature: 'conceptos_laborales' },
      { name: 'Parámetros Legales', path: '/dashboard/parametros-legales', icon: 'ScaleIcon', permission: 'parametros_legales.view' },
    ],
  },
  {
    name: 'Finanzas',
    icon: 'WalletIcon',
    color: 'text-emerald-600',
    permissions: ['prestamos.view', 'items.view', 'contabilidad.view'],
    mode: 'any',
    submenu: [
      { name: 'Préstamos', path: '/dashboard/prestamos', icon: 'DollarSignIcon', permission: 'prestamos.view', requiredFeature: 'prestamos' },
      { name: 'Contabilidad', path: '/dashboard/contabilidad', icon: 'BookOpenIcon', permission: 'contabilidad.view', requiredFeature: 'contabilidad' },
      { name: 'Items y Productos', path: '/dashboard/items', icon: 'PackageIcon', permission: 'items.view' },
    ],
  },
  {
    name: 'Proyectos',
    icon: 'BriefcaseIcon',
    color: 'text-indigo-600',
    permissions: ['proyectos.view', 'proyectos.kanban', 'proyectos.timeline', 'proyectos.reports', 'proyectos.logros'],
    mode: 'any',
    requiredFeature: 'proyectos',
    submenu: [
      { name: 'Mis Proyectos', path: '/dashboard/projects', icon: 'BriefcaseIcon', permission: 'proyectos.view', requiredFeature: 'proyectos' },
      { name: 'Kanban', path: '/dashboard/projects/kanban', icon: 'LayoutGridIcon', permission: 'proyectos.kanban', requiredFeature: 'proyectos' },
      { name: 'Timeline', path: '/dashboard/projects/timeline', icon: 'GanttChartIcon', permission: 'proyectos.timeline', requiredFeature: 'proyectos' },
      { name: 'Reportes', path: '/dashboard/projects/reports', icon: 'BarChart3Icon', permission: 'proyectos.reports', requiredFeature: 'proyectos' },
      { name: 'Logros', path: '/dashboard/projects/achievements', icon: 'TrophyIcon', permission: 'proyectos.logros', requiredFeature: 'proyectos' },
    ],
  },

  // ─── SISTEMA ───
  { type: 'separator', label: 'Sistema' },

  {
    name: 'Seguridad y Acceso',
    icon: 'ShieldIcon',
    color: 'text-red-600',
    permissions: ['usuarios.view', 'roles.view', 'permisos.view', 'auditoria.view'],
    mode: 'any',
    submenu: [
      { name: 'Usuarios', path: '/dashboard/usuarios', icon: 'UsersIcon', permission: 'usuarios.view', requiredFeature: 'usuarios' },
      { name: 'Roles', path: '/dashboard/roles', icon: 'ShieldIcon', permission: 'roles.view', requiredFeature: 'roles_permisos' },
      { name: 'Permisos', path: '/dashboard/permisos', icon: 'KeyIcon', permission: 'permisos.view', requiredFeature: 'roles_permisos' },
      { name: 'Auditoría', path: '/dashboard/auditoria', icon: 'ActivityIcon', permission: 'auditoria.view', requiredFeature: 'auditoria' },
    ],
  },
  {
    name: 'Configuración',
    icon: 'SettingsIcon',
    color: 'text-slate-600',
    permissions: ['configuracion.view', 'organizaciones.view'],
    mode: 'any',
    submenu: [
      { name: 'General', path: '/dashboard/configuracion', icon: 'SlidersHorizontalIcon', permission: 'configuracion.view' },
      { name: 'Políticas de Seguridad', path: '/dashboard/seguridad', icon: 'LockIcon', permission: 'configuracion.view' },
      { name: 'Email', path: '/dashboard/email', icon: 'MailIcon', permission: 'configuracion.view' },
      { name: 'Organizaciones', path: '/dashboard/organizaciones', icon: 'Building2Icon', permission: 'organizaciones.view' },
    ],
  },
  {
    name: 'Datos Maestros',
    icon: 'BookOpenIcon',
    color: 'text-teal-600',
    permissions: ['tipos_contrato.view', 'tipos_prestamo.view', 'departamentos.view', 'municipios.view'],
    mode: 'any',
    submenu: [
      { name: 'Tipos de Contrato', path: '/dashboard/tipos-contrato', icon: 'FileTextIcon', permission: 'tipos_contrato.view' },
      { name: 'Tipos de Préstamo', path: '/dashboard/tipos-prestamo', icon: 'WalletIcon', permission: 'tipos_prestamo.view', requiredFeature: 'prestamos' },
      { name: 'Departamentos', path: '/dashboard/departamentos', icon: 'Building2Icon', permission: 'departamentos.view' },
      { name: 'Municipios', path: '/dashboard/municipios', icon: 'MapPinIcon', permission: 'municipios.view' },
    ],
  },

  // ─── ADMINISTRACIÓN (solo staff) ───
  { type: 'separator', label: 'Administración' },

  {
    name: 'Gestión de Planes',
    icon: 'CreditCardIcon',
    path: '/dashboard/planes',
    color: 'text-purple-600',
    adminOnly: true,
  },
  {
    name: 'Estado del Sistema',
    icon: 'ActivityIcon',
    path: '/dashboard/system-status',
    color: 'text-orange-600',
    permission: 'core.view_system_status',
  },

  // ─── MI CUENTA ───
  { type: 'separator', label: 'Mi Cuenta' },

  {
    name: 'Suscripción y Facturación',
    icon: 'WalletIcon',
    color: 'text-emerald-600',
    public: true,
    submenu: [
      { name: 'Mi Suscripción', path: '/dashboard/billing', icon: 'CreditCardIcon', public: true },
      { name: 'Planes', path: '/dashboard/billing/planes', icon: 'PackageIcon', public: true },
      { name: 'Facturas', path: '/dashboard/billing/facturas', icon: 'ReceiptIcon', public: true },
      { name: 'Métodos de Pago', path: '/dashboard/billing/metodos-pago', icon: 'WalletIcon', public: true },
    ],
  },

  {
    name: 'Centro de Ayuda',
    icon: 'HelpCircle',
    color: 'text-cyan-600',
    permission: 'ayuda.view',
    submenu: [
      { name: 'Artículos', path: '/dashboard/ayuda/articulos', icon: 'BookOpenIcon', permission: 'ayuda.view' },
      { name: 'Preguntas Frecuentes', path: '/dashboard/ayuda/faqs', icon: 'MessageCircle', permission: 'ayuda.view' },
      { name: 'Tutoriales', path: '/dashboard/ayuda/tutoriales', icon: 'GraduationCap', permission: 'ayuda.view' },
      { name: 'Tours Interactivos', path: '/dashboard/ayuda/tours', icon: 'Monitor', permission: 'ayuda.view' },
      { name: 'Soporte', path: '/dashboard/ayuda/soporte', icon: 'Headphones', permission: 'ayuda.view' },
    ],
  },
];

/**
 * Obtiene la configuracion de permisos para una ruta
 * @param {string} path - Ruta a verificar
 * @returns {Object|null} Configuracion de permisos o null si no existe
 */
export const getRoutePermission = (path) => {
  if (ROUTE_PERMISSIONS[path]) {
    return ROUTE_PERMISSIONS[path];
  }

  for (const [route, config] of Object.entries(ROUTE_PERMISSIONS)) {
    const routePattern = route.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${routePattern}$`);
    if (regex.test(path)) {
      return config;
    }
  }

  return null;
};

/**
 * Verifica si una ruta requiere permisos
 * @param {string} path - Ruta a verificar
 * @returns {boolean}
 */
export const routeRequiresPermission = (path) => {
  const config = getRoutePermission(path);
  if (!config) return false;
  return !config.public;
};

export default ROUTE_PERMISSIONS;
