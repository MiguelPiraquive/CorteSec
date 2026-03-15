/**
 * tourConfigs.js
 * ==============
 * Definiciones centralizadas de todos los Product Tours del sistema.
 *
 * Cada tour tiene:
 * - key:         Clave unica para localStorage
 * - title:       Titulo para mostrar en la pagina de Tours
 * - description: Descripcion corta del tour
 * - icon:        Nombre del icono (lucide-react)
 * - color:       Clases Tailwind para gradiente
 * - route:       Ruta de la pagina donde se ejecuta el tour
 * - difficulty:  basico | intermedio | avanzado
 * - module:      Modulo al que pertenece
 * - steps:       Pasos del tour (formato Driver.js)
 */

export const TOUR_CONFIGS = {
  // ═══════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════
  dashboard: {
    key: 'dashboard',
    title: 'Dashboard Principal',
    description: 'Conoce tu panel principal: estadisticas, actividad reciente y acciones rapidas para gestionar tu organizacion.',
    icon: 'Home',
    color: 'from-blue-500 to-indigo-600',
    route: '/dashboard',
    difficulty: 'basico',
    module: 'General',
    estimatedTime: '2 min',
    steps: [
      {
        element: '#tour-dashboard-header',
        popover: {
          title: 'Bienvenido a tu Dashboard',
          description: 'Este es tu panel principal. Aqui veras un resumen de toda tu organizacion: informacion del usuario, fecha y hora, y el estado general.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-dashboard-stats',
        popover: {
          title: 'Estadisticas Clave',
          description: 'Estas tarjetas muestran los indicadores mas importantes: total de empleados, nominas, prestamos y mas. Se actualizan en tiempo real.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-dashboard-recent-activity',
        popover: {
          title: 'Actividad Reciente',
          description: 'Aqui veras las ultimas acciones realizadas en el sistema: creacion de empleados, generacion de nominas, cambios de roles, etc.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '#tour-dashboard-quick-actions',
        popover: {
          title: 'Acciones Rapidas',
          description: 'Accede directamente a las funciones mas usadas sin navegar por los menus. Crea empleados, genera nominas o administra prestamos con un solo clic.',
          side: 'left',
          align: 'start',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // USUARIOS
  // ═══════════════════════════════════════════
  usuarios: {
    key: 'usuarios',
    title: 'Gestion de Usuarios',
    description: 'Aprende a administrar usuarios: crear, editar, asignar roles, cambiar contrasenas y controlar el acceso al sistema.',
    icon: 'Users',
    color: 'from-indigo-500 to-purple-600',
    route: '/dashboard/usuarios',
    difficulty: 'intermedio',
    module: 'Seguridad',
    estimatedTime: '3 min',
    steps: [
      {
        element: '#usuarios-header',
        popover: {
          title: 'Bienvenido a Gestion de Usuarios',
          description: 'Desde aqui puedes administrar todos los usuarios de tu organizacion: crearlos, editarlos, asignarles roles y controlar su acceso al sistema.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#btn-agregar-usuario',
        popover: {
          title: 'Agregar Usuarios',
          description: 'Haz clic aqui para invitar o crear un nuevo usuario. Podras asignarle un rol y enviarle un correo de verificacion automaticamente.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#usuarios-estadisticas',
        popover: {
          title: 'Panel de Estadisticas',
          description: 'Visualiza de un vistazo cuantos usuarios tienes en total, cuantos estan activos, inactivos y cuantos son administradores.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#usuarios-busqueda',
        popover: {
          title: 'Busqueda y Filtros',
          description: 'Busca usuarios por nombre, email o username. Usa los filtros avanzados para segmentar por estado, tipo o fecha. Tambien puedes exportar a Excel.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#usuarios-tabla',
        popover: {
          title: 'Tabla de Usuarios',
          description: 'Aqui veras la lista completa de usuarios. Cada fila muestra sus datos, rol y estado. Usa los botones de acciones para editar, cambiar contrasena, asignar roles o eliminar.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // EMPLEADOS
  // ═══════════════════════════════════════════
  empleados: {
    key: 'empleados',
    title: 'Gestion de Empleados',
    description: 'Descubre como gestionar la informacion de empleados: registrar nuevos, filtrar por cargo, ver detalles y administrar contratos.',
    icon: 'UserCheck',
    color: 'from-green-500 to-emerald-600',
    route: '/dashboard/empleados',
    difficulty: 'basico',
    module: 'Recursos Humanos',
    estimatedTime: '3 min',
    steps: [
      {
        element: '#tour-empleados-header',
        popover: {
          title: 'Gestion de Empleados',
          description: 'Este es el modulo central de Recursos Humanos. Aqui administras toda la informacion de tus empleados: datos personales, cargos, contratos y documentos.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-empleados-btn-nuevo',
        popover: {
          title: 'Registrar Nuevo Empleado',
          description: 'Haz clic aqui para agregar un nuevo empleado. Podras ingresar sus datos personales, asignarle un cargo y vincular un contrato.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#tour-empleados-filters',
        popover: {
          title: 'Busqueda y Filtros',
          description: 'Busca empleados por nombre o documento. Filtra por cargo o genero para encontrar rapidamente a quien necesitas.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-empleados-grid',
        popover: {
          title: 'Tarjetas de Empleados',
          description: 'Cada tarjeta muestra la foto, nombre, cargo y estado del empleado. Haz clic en una tarjeta para ver todos los detalles o editarla.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // NOMINA
  // ═══════════════════════════════════════════
  nomina: {
    key: 'nomina',
    title: 'Liquidacion de Nomina',
    description: 'Aprende a generar nominas, calcular devengados y deducciones, exportar a Excel y gestionar el pago de tus empleados.',
    icon: 'Receipt',
    color: 'from-teal-500 to-cyan-600',
    route: '/dashboard/nomina',
    difficulty: 'avanzado',
    module: 'Nomina',
    estimatedTime: '4 min',
    steps: [
      {
        element: '#tour-nomina-header',
        popover: {
          title: 'Gestion de Nomina',
          description: 'Desde aqui administras la liquidacion de nomina de todos tus empleados. Puedes ver estadisticas de pagos, totales y promedios.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-nomina-btn-nueva',
        popover: {
          title: 'Crear Nueva Nomina',
          description: 'Inicia el proceso de liquidacion. Selecciona empleados, periodo, conceptos laborales y el sistema calculara automaticamente devengados and deducciones.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#tour-nomina-stats',
        popover: {
          title: 'Resumen de Nomina',
          description: 'Estas tarjetas resumen el total de nominas generadas, el monto total pagado, el promedio por empleado y la cantidad de empleados en nomina.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-nomina-filters',
        popover: {
          title: 'Filtros y Exportacion',
          description: 'Filtra nominas por empleado o tipo de contrato. Usa el boton de Excel para exportar los datos filtrados a una hoja de calculo.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-nomina-table',
        popover: {
          title: 'Tabla de Nominas',
          description: 'Revisa cada nomina con detalle: empleado, periodo, devengado, deducciones y neto a pagar. Desde las acciones puedes ver, editar, imprimir o anular nominas.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // PRESTAMOS
  // ═══════════════════════════════════════════
  prestamos: {
    key: 'prestamos',
    title: 'Gestion de Prestamos',
    description: 'Conoce como registrar prestamos a empleados, hacer seguimiento de cuotas, controlar estados y gestionar la cartera.',
    icon: 'DollarSign',
    color: 'from-emerald-500 to-teal-600',
    route: '/dashboard/prestamos',
    difficulty: 'intermedio',
    module: 'Finanzas',
    estimatedTime: '3 min',
    steps: [
      {
        element: '#tour-prestamos-header',
        popover: {
          title: 'Gestion de Prestamos',
          description: 'Administra los prestamos otorgados a tus empleados. Lleva control de montos, cuotas, estados y fechas de vencimiento.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-prestamos-btn-nuevo',
        popover: {
          title: 'Nuevo Prestamo',
          description: 'Registra un nuevo prestamo. Selecciona el empleado, tipo de prestamo, monto, numero de cuotas y el sistema generara automaticamente el plan de pagos.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#tour-prestamos-stats',
        popover: {
          title: 'Indicadores de Cartera',
          description: 'Visualiza rapidamente el estado de la cartera: total de prestamos, cuantos estan activos, pendientes de aprobacion y en mora.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-prestamos-filters',
        popover: {
          title: 'Filtros Avanzados',
          description: 'Filtra prestamos por empleado, tipo o estado. Busca por numero de prestamo para localizar registros especificos rapidamente.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-prestamos-grid',
        popover: {
          title: 'Tarjetas de Prestamos',
          description: 'Cada tarjeta resume un prestamo: monto, cuotas pagadas, saldo pendiente y estado. La barra de color indica el estado actual del prestamo.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // ROLES
  // ═══════════════════════════════════════════
  roles: {
    key: 'roles',
    title: 'Gestion de Roles',
    description: 'Aprende a crear y configurar roles, asignar permisos y gestionar el control de acceso de tu organizacion.',
    icon: 'Shield',
    color: 'from-purple-500 to-pink-600',
    route: '/dashboard/roles',
    difficulty: 'avanzado',
    module: 'Seguridad',
    estimatedTime: '3 min',
    steps: [
      {
        element: '#tour-roles-header',
        popover: {
          title: 'Gestion de Roles',
          description: 'Los roles determinan que puede hacer cada usuario en el sistema. Aqui defines los niveles de acceso y los permisos asociados.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-roles-tabs',
        popover: {
          title: 'Secciones del Modulo',
          description: 'Navega entre las secciones: Roles (crear y editar), Tipos de Rol (categorias), Auditoria (historial de cambios) e Historial de Asignaciones.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-roles-content',
        popover: {
          title: 'Contenido Dinamico',
          description: 'Aqui se muestra el contenido de la seccion seleccionada. En "Roles" veras la lista de roles con sus permisos. Puedes crear nuevos roles o editar los existentes.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CARGOS
  // ═══════════════════════════════════════════
  cargos: {
    key: 'cargos',
    title: 'Gestion de Cargos',
    description: 'Configura los cargos de tu organizacion: departamentos, niveles jerarquicos y descripciones de puesto.',
    icon: 'Briefcase',
    color: 'from-amber-500 to-orange-600',
    route: '/dashboard/cargos',
    difficulty: 'basico',
    module: 'Recursos Humanos',
    estimatedTime: '2 min',
    steps: [
      {
        element: '#tour-cargos-header',
        popover: {
          title: 'Gestion de Cargos',
          description: 'Define los cargos que existen en tu organizacion. Los cargos se asignan a empleados y ayudan a estructurar tu equipo.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-cargos-btn-nuevo',
        popover: {
          title: 'Crear Nuevo Cargo',
          description: 'Agrega un cargo con su nombre, departamento y descripcion. Los cargos estaran disponibles al registrar empleados.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#tour-cargos-table',
        popover: {
          title: 'Lista de Cargos',
          description: 'Ve todos los cargos registrados con sus detalles. Puedes editarlos o eliminarlos desde los botones de acciones.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CONTRATOS
  // ═══════════════════════════════════════════
  contratos: {
    key: 'contratos',
    title: 'Gestion de Contratos',
    description: 'Administra los contratos laborales: tipos, fechas, salarios y documentacion asociada.',
    icon: 'FileSignature',
    color: 'from-sky-500 to-blue-600',
    route: '/dashboard/contratos',
    difficulty: 'intermedio',
    module: 'Recursos Humanos',
    estimatedTime: '3 min',
    steps: [
      {
        element: '#tour-contratos-header',
        popover: {
          title: 'Gestion de Contratos',
          description: 'Administra todos los contratos laborales de tu organizacion. Cada contrato vincula un empleado con un cargo, salario y tipo de contratacion.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-contratos-btn-nuevo',
        popover: {
          title: 'Nuevo Contrato',
          description: 'Crea un contrato seleccionando empleado, tipo de contrato, fecha de inicio, salario y otros detalles laborales obligatorios.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#tour-contratos-table',
        popover: {
          title: 'Tabla de Contratos',
          description: 'Revisa todos los contratos activos y vencidos. Filtra por empleado, tipo o estado para encontrar contratos especificos.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CONFIGURACION
  // ═══════════════════════════════════════════
  configuracion: {
    key: 'configuracion',
    title: 'Configuracion General',
    description: 'Personaliza la configuracion de tu organizacion: datos generales, parametros del sistema y preferencias.',
    icon: 'Settings',
    color: 'from-slate-500 to-gray-600',
    route: '/dashboard/configuracion',
    difficulty: 'intermedio',
    module: 'Sistema',
    estimatedTime: '2 min',
    steps: [
      {
        element: '#tour-config-header',
        popover: {
          title: 'Configuracion del Sistema',
          description: 'Aqui personalizas los parametros generales de tu organizacion. Estos ajustes afectan el comportamiento de todo el sistema.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-config-content',
        popover: {
          title: 'Formulario de Configuracion',
          description: 'Modifica nombre de la organizacion, NIT, direccion, moneda, zona horaria y otros parametros que aplican a toda la plataforma.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // ITEMS
  // ═══════════════════════════════════════════
  items: {
    key: 'items',
    title: 'Items y Productos',
    description: 'Gestiona el catalogo de items y productos del sistema: codigos, precios, categorias y stock.',
    icon: 'Package',
    color: 'from-orange-500 to-red-500',
    route: '/dashboard/items',
    difficulty: 'basico',
    module: 'Finanzas',
    estimatedTime: '2 min',
    steps: [
      {
        element: '#tour-items-header',
        popover: {
          title: 'Items y Productos',
          description: 'Administra el catalogo de items utilizados en la operacion: materiales, productos, servicios y otros insumos.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-items-btn-nuevo',
        popover: {
          title: 'Crear Nuevo Item',
          description: 'Registra un nuevo item con su codigo, nombre, descripcion, unidad de medida y precio. Los items se usan en otros modulos del sistema.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#tour-items-table',
        popover: {
          title: 'Catalogo de Items',
          description: 'Consulta, filtra y gestiona todos los items registrados. Usa los botones de acciones para editar detalles o eliminar items obsoletos.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // PERFIL
  // ═══════════════════════════════════════════
  perfil: {
    key: 'perfil',
    title: 'Mi Perfil',
    description: 'Configura tu perfil personal: foto, datos de contacto, preferencias de notificacion y cambio de contrasena.',
    icon: 'UserCircle',
    color: 'from-violet-500 to-purple-600',
    route: '/dashboard/perfil',
    difficulty: 'basico',
    module: 'General',
    estimatedTime: '2 min',
    steps: [
      {
        element: '#tour-perfil-header',
        popover: {
          title: 'Tu Perfil',
          description: 'Aqui puedes ver y editar tu informacion personal. Manten tus datos actualizados para una mejor experiencia en el sistema.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-perfil-form',
        popover: {
          title: 'Datos Personales',
          description: 'Actualiza tu nombre, telefono, direccion, cedula y otros datos personales. Tu foto de perfil se mostrara en todo el sistema.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // AUDITORIA
  // ═══════════════════════════════════════════
  auditoria: {
    key: 'auditoria',
    title: 'Auditoria del Sistema',
    description: 'Revisa los logs de actividad, monitorea acciones de usuarios y detecta anomalias de seguridad.',
    icon: 'Activity',
    color: 'from-red-500 to-rose-600',
    route: '/dashboard/auditoria',
    difficulty: 'avanzado',
    module: 'Seguridad',
    estimatedTime: '3 min',
    steps: [
      {
        element: '#tour-auditoria-header',
        popover: {
          title: 'Auditoria del Sistema',
          description: 'El modulo de auditoria registra todas las acciones realizadas en el sistema. Es fundamental para la seguridad y el cumplimiento normativo.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-auditoria-tabs',
        popover: {
          title: 'Secciones de Auditoria',
          description: 'Navega entre Logs (registros detallados), Usuarios (actividad por usuario), Actividad (resumen general), Anomalias (alertas) y Estadisticas.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-auditoria-content',
        popover: {
          title: 'Detalle de Registros',
          description: 'Cada registro muestra quien realizo la accion, que hizo, cuando y desde que IP. Filtra por fecha, usuario o tipo de accion para analizar eventos especificos.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // PROYECTOS
  // ═══════════════════════════════════════════
  proyectos: {
    key: 'proyectos',
    title: 'Gestion de Proyectos',
    description: 'Aprende a crear y gestionar proyectos: asignar equipos, controlar presupuestos, seguir el progreso y usar vistas Kanban y Timeline.',
    icon: 'FolderKanban',
    color: 'from-violet-500 to-indigo-600',
    route: '/dashboard/projects',
    difficulty: 'intermedio',
    module: 'Proyectos',
    estimatedTime: '4 min',
    steps: [
      {
        element: '#tour-proyectos-header',
        popover: {
          title: 'Bienvenido a Proyectos',
          description: 'Este es el centro de gestion de proyectos. Aqui creas, organizas y haces seguimiento a todos los proyectos de tu organizacion.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-proyectos-stats',
        popover: {
          title: 'Estadisticas de Proyectos',
          description: 'Visualiza de un vistazo cuantos proyectos tienes en total, cuantos estan activos, completados y el progreso promedio de todos.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-proyectos-btn-nuevo',
        popover: {
          title: 'Crear Nuevo Proyecto',
          description: 'Inicia un proyecto desde cero o usa una plantilla predefinida. Define nombre, fechas, presupuesto, prioridad y asigna un equipo de trabajo.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#tour-proyectos-filters',
        popover: {
          title: 'Filtros y Vistas',
          description: 'Busca proyectos por nombre, filtra por estado o prioridad. Cambia entre vista de tarjetas y vista de lista segun tu preferencia.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-proyectos-grid',
        popover: {
          title: 'Tarjetas de Proyectos',
          description: 'Cada tarjeta muestra el progreso, presupuesto, equipo asignado y estado del proyecto. Haz clic para ver el detalle completo, editar o activar un proyecto.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════
  // MODAL DE BIENVENIDA / SELECCION DE PROYECTO
  // ═══════════════════════════════════════════
  bienvenida_proyecto: {
    key: 'bienvenida_proyecto',
    title: 'Modal de Bienvenida',
    description: 'Conoce el modal de seleccion de proyecto que aparece al iniciar sesion. Aprende a seleccionar, fijar y crear proyectos.',
    icon: 'Rocket',
    color: 'from-indigo-500 to-purple-600',
    route: '/dashboard',
    difficulty: 'basico',
    module: 'Proyectos',
    estimatedTime: '2 min',
    steps: [
      {
        element: '#tour-modal-proyecto-header',
        popover: {
          title: 'Modal de Bienvenida',
          description: 'Este modal aparece al iniciar sesion si no tienes un proyecto fijo configurado. Aqui seleccionas en que proyecto vas a trabajar.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-modal-proyecto-lista',
        popover: {
          title: 'Tus Proyectos',
          description: 'Aqui ves todos tus proyectos disponibles. Haz clic en uno para seleccionarlo como proyecto activo. El sistema filtrara todos los datos por ese proyecto.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-modal-proyecto-pin',
        popover: {
          title: 'Fijar Proyecto',
          description: 'Usa el icono de pin para fijar un proyecto como predeterminado. Si tienes un proyecto fijo, el modal no aparecera y entraras directamente.',
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '#tour-modal-proyecto-acciones',
        popover: {
          title: 'Acciones Adicionales',
          description: 'Puedes crear un nuevo proyecto desde aqui o hacer clic en "Omitir" para entrar sin seleccionar ningun proyecto. Esto te mostrara datos de todos los proyectos.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
}

/**
 * Obtener todas las configuraciones de tours como array
 */
export function getAllTours() {
  return Object.values(TOUR_CONFIGS)
}

/**
 * Obtener tours agrupados por modulo
 */
export function getToursByModule() {
  const tours = getAllTours()
  const grouped = {}
  tours.forEach((tour) => {
    if (!grouped[tour.module]) {
      grouped[tour.module] = []
    }
    grouped[tour.module].push(tour)
  })
  return grouped
}

/**
 * Obtener un tour por su key
 */
export function getTourByKey(key) {
  return TOUR_CONFIGS[key] || null
}
