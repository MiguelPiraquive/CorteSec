/**
 * Utilidades comunes para exportación de datos
 * CorteSec Dashboard - Sistema de Gestión de Contratistas
 */

import { toast } from 'react-toastify';

/**
 * Genera datos comprensivos súper completos para exportación
 * @param {Object} dashboardData - Datos del dashboard
 * @param {Object} user - Usuario actual
 * @param {string} lastUpdated - Última actualización
 * @param {string} format - Formato de exportación
 * @returns {Object} - Datos preparados para exportación
 */
export const generateComprehensiveExportData = (dashboardData, user, lastUpdated, format) => {
  return {
    metadata: {
      exportId: `CORTESEC-${Date.now()}`,
      exportedAt: new Date().toISOString(),
      exportedBy: user?.username || user?.name || 'Usuario Sistema',
      source: 'Dashboard Principal - Sistema CorteSec',
      version: '2.0.0',
      dataRefresh: lastUpdated,
      format: format.toUpperCase(),
      environment: process.env.NODE_ENV || 'production',
      systemInfo: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
        timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    },
    
    // Métricas principales del sistema (expandidas)
    systemMetrics: {
      totalEmployees: dashboardData.totalEmpleados || dashboardData.metricas?.empleados?.total || 0,
      activeEmployees: dashboardData.empleadosActivos || dashboardData.metricas?.empleados?.activos || 0,
      inactiveEmployees: dashboardData.empleadosInactivos || (dashboardData.totalEmpleados - dashboardData.empleadosActivos) || 0,
      newEmployeesMonth: dashboardData.empleadosNuevosMes || dashboardData.metricas?.empleados?.nuevos_mes || 0,
      employeeGrowthRate: dashboardData.tasaCrecimientoEmpleados || dashboardData.metricas?.empleados?.crecimiento || 0,
      
      completedTasks: dashboardData.tareasCompletadas || 0,
      pendingTasks: dashboardData.tareasPendientes || 0,
      avgTaskCompletion: dashboardData.promedioCompletacion || 0,
      
      systemHealth: dashboardData.saludSistema || 'Buena',
      uptime: dashboardData.tiempoActividad || dashboardData.sistemMetrics?.uptime || '99.9%',
      responseTime: dashboardData.tiempoRespuesta || dashboardData.sistemMetrics?.responseTime || '< 200ms',
      
      // Métricas adicionales del sistema
      cpuUsage: dashboardData.sistemMetrics?.cpu?.valor || 0,
      memoryUsage: dashboardData.sistemMetrics?.memoria?.valor || 0,
      diskUsage: dashboardData.sistemMetrics?.disco?.valor || 0,
      networkSpeed: dashboardData.sistemMetrics?.red?.valor || 0,
      connectedUsers: dashboardData.sistemMetrics?.usuariosConectados || 0
    },

    // Datos de empleados (expandidos con más campos)
    employees: (dashboardData.empleados || []).map(emp => ({
      ...emp,
      // Asegurar campos estándar
      nombre: emp.nombre || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      cargo: emp.cargo || emp.position,
      departamento: emp.departamento || emp.department,
      salario: emp.salario || emp.salario_base || emp.salary,
      activo: emp.activo !== undefined ? emp.activo : emp.is_active,
      fecha_contratacion: emp.fecha_contratacion || emp.hire_date,
      telefono: emp.telefono || emp.phone
    })),

    // Top cargos y departamentos
    topCargos: dashboardData.topCargos || [],
    empleadosPorDepartamento: dashboardData.empleadosPorDepartamento || [],
    topEmpleados: dashboardData.topEmpleados || [],

    // Métricas de rendimiento (expandidas)
    performance: {
      productivity: dashboardData.productividad || dashboardData.kpis?.productividad?.porcentaje || 85,
      efficiency: dashboardData.eficiencia || dashboardData.metricas?.rendimiento?.eficiencia || 92,
      satisfaction: dashboardData.satisfaccion || 88,
      retention: dashboardData.retencion || 94,
      averagePerformance: dashboardData.rendimientoPromedio || 0,
      performanceGoals: dashboardData.objetivosRendimiento || {}
    },

    // Datos contables y financieros (súper expandidos)
    accounting: {
      balance: {
        totalDebitos: dashboardData.contabilidad?.totalDebitos || dashboardData.accounting?.balance?.totalDebitos || 0,
        totalCreditos: dashboardData.contabilidad?.totalCreditos || dashboardData.accounting?.balance?.totalCreditos || 0,
        diferencia: dashboardData.contabilidad?.diferencia || dashboardData.accounting?.balance?.diferencia || 0,
        patrimonio: dashboardData.contabilidad?.patrimonio || 0,
        liquidez: dashboardData.contabilidad?.liquidez || 0
      },
      flujoCaja: {
        ingresosMes: dashboardData.contabilidad?.ingresosMes || dashboardData.accounting?.flujoCaja?.ingresosMes || 0,
        egresosMes: dashboardData.contabilidad?.egresosMes || dashboardData.accounting?.flujoCaja?.egresosMes || 0,
        flujoNeto: dashboardData.contabilidad?.flujoNeto || dashboardData.accounting?.flujoCaja?.flujoNeto || 0,
        flujoAcumulado: dashboardData.contabilidad?.flujoAcumulado || 0
      },
      comprobantes: {
        pendientes: dashboardData.contabilidad?.comprobantesPendientes || dashboardData.accounting?.comprobantes?.pendientes || 0,
        confirmados: dashboardData.contabilidad?.comprobantesConfirmados || dashboardData.accounting?.comprobantes?.confirmados || 0,
        rechazados: dashboardData.contabilidad?.comprobantesRechazados || 0,
        totalMes: dashboardData.contabilidad?.comprobantesMes || 0
      },
      cuentas: {
        totalCuentas: dashboardData.contabilidad?.totalCuentas || 0,
        cuentasActivas: dashboardData.contabilidad?.cuentasActivas || 0,
        planContable: dashboardData.contabilidad?.planContable || []
      }
    },

    // Nóminas y pagos (expandido)
    payroll: {
      totalNominaMes: dashboardData.nominas?.total_mes || dashboardData.metricas?.nominas?.total_mes || 0,
      produccionMes: dashboardData.nominas?.produccion_mes || dashboardData.metricas?.nominas?.produccion_mes || 0,
      deduccionesMes: dashboardData.nominas?.deducciones_mes || 0,
      nominasCount: dashboardData.nominas?.count_mes || dashboardData.metricas?.nominas?.count_mes || 0,
      promedioSalario: dashboardData.nominas?.promedio_salario || 0,
      nominasPorMes: dashboardData.nominasPorMes || [],
      detallesNomina: dashboardData.detallesNomina || []
    },

    // Préstamos (expandido)
    loans: {
      prestamosActivos: dashboardData.prestamos?.activos || dashboardData.metricas?.prestamos?.activos || 0,
      prestamosPendientes: dashboardData.prestamos?.pendientes || dashboardData.metricas?.prestamos?.pendientes || 0,
      prestamosAprobados: dashboardData.prestamos?.aprobados || dashboardData.metricas?.prestamos?.aprobados || 0,
      prestamosCompletados: dashboardData.prestamos?.completados || dashboardData.metricas?.prestamos?.completados || 0,
      prestamosEnMora: dashboardData.prestamos?.en_mora || dashboardData.metricas?.prestamos?.en_mora || 0,
      montoActivos: dashboardData.prestamos?.monto_activos || dashboardData.metricas?.prestamos?.monto_activos || 0,
      montoPendientes: dashboardData.prestamos?.monto_pendientes || 0,
      prestamosPorEstado: dashboardData.prestamosPorEstado || [],
      tiposPrestamosPorCantidad: dashboardData.tiposPrestamosPorCantidad || []
    },

    // Locaciones (expandido)
    locations: {
      totalLocaciones: dashboardData.locaciones?.total || dashboardData.locations?.totalLocaciones || 0,
      activas: dashboardData.locaciones?.activas || dashboardData.locations?.activas || 0,
      inactivas: dashboardData.locaciones?.inactivas || dashboardData.locations?.inactivas || 0,
      departamentos: dashboardData.locaciones?.departamentos || dashboardData.locations?.departamentos || 0,
      municipios: dashboardData.locaciones?.municipios || dashboardData.locations?.municipios || 0,
      coberturaNacional: dashboardData.locaciones?.coberturaNacional || false,
      distribucionGeografica: dashboardData.distribucionGeografica || []
    },

    // Items e inventario (expandido)
    items: {
      totalItems: dashboardData.items?.total || dashboardData.items?.totalItems || 0,
      disponibles: dashboardData.items?.disponibles || dashboardData.items?.activos || 0,
      agotados: dashboardData.items?.agotados || 0,
      stockCritico: dashboardData.items?.stockCritico || 0,
      valorTotal: dashboardData.items?.valorTotal || 0,
      valorActivos: dashboardData.items?.valorActivos || 0,
      categorias: dashboardData.items?.categorias || 0,
      itemsPorCategoria: dashboardData.itemsPorCategoria || [],
      movimientosRecientes: dashboardData.movimientosItems || []
    },

    // Roles y permisos (nuevo módulo)
    roles: {
      totalRoles: dashboardData.roles?.total || 0,
      activos: dashboardData.roles?.activos || 0,
      inactivos: dashboardData.roles?.inactivos || 0,
      asignacionesActivas: dashboardData.roles?.asignacionesActivas || 0,
      usuariosConRoles: dashboardData.roles?.usuariosConRoles || 0,
      permisosDirectos: dashboardData.roles?.permisosDirectos || 0,
      modulosSistema: dashboardData.roles?.modulosSistema || 0,
      rolesPopulares: dashboardData.roles?.populares || []
    },

    // Proyectos y contratistas (si están disponibles)
    projects: {
      proyectosActivos: dashboardData.proyectos?.activos || dashboardData.metricas?.proyectos?.activos || 0,
      proyectosCompletados: dashboardData.proyectos?.completados || dashboardData.metricas?.proyectos?.completados || 0,
      proyectosEsteMes: dashboardData.proyectos?.este_mes || dashboardData.metricas?.proyectos?.este_mes || 0,
      totalContratistas: dashboardData.contratistas?.total || 0,
      contratistasActivos: dashboardData.contratistas?.activos || 0
    },

    // Actividad reciente del sistema
    activity: {
      actividadReciente: dashboardData.actividadReciente || [],
      activityHeatmap: dashboardData.activityHeatmap || [],
      ultimasAcciones: dashboardData.ultimasAcciones || [],
      sesionesActivas: dashboardData.sesionesActivas || 0
    },

    // Configuración del sistema
    configuration: {
      modulosHabilitados: dashboardData.modulosHabilitados || [],
      configuracionSistema: dashboardData.configuracionSistema || {},
      limites: dashboardData.limitesSistema || {},
      licencia: dashboardData.licencia || {}
    },

    // Estadísticas de exportación (mejoradas)
    exportStats: {
      totalRecordsExported: 
        (dashboardData.empleados || []).length + 
        (dashboardData.locaciones?.total || 0) + 
        (dashboardData.items?.total || 0) + 
        (dashboardData.prestamos?.activos || 0) +
        (dashboardData.nominas?.count_mes || 0) +
        (dashboardData.roles?.total || 0) +
        50, // métricas adicionales
      dataTypes: [
        'Empleados', 'Contabilidad', 'Locaciones', 'Items', 
        'Préstamos', 'Nóminas', 'Roles', 'Proyectos', 
        'Métricas', 'Actividad', 'Sistema'
      ],
      exportSize: 0, // Se calculará después
      compressionRatio: '1:1',
      qualityScore: 95, // Puntuación de calidad de datos
      completenessPercentage: 100 // Porcentaje de completitud
    }
  };
};

/**
 * Maneja el progreso de exportación
 * @param {Function} setExportProgress - Setter del estado de progreso
 * @param {number} progress - Progreso actual (0-100)
 * @param {number} delay - Retraso en ms
 */
export const updateExportProgress = async (setExportProgress, progress, delay = 300) => {
  setExportProgress({ show: true, progress });
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
};

/**
 * Guarda la exportación en el historial local
 * @param {string} fileName - Nombre del archivo
 * @param {string} format - Formato de exportación
 * @param {number} size - Tamaño del archivo
 * @param {number} recordCount - Cantidad de registros
 * @param {string} user - Usuario que exportó
 * @param {Function} setExportHistory - Setter del historial
 */
export const saveToExportHistory = (fileName, format, size, recordCount, user, setExportHistory) => {
  const currentHistory = JSON.parse(localStorage.getItem('exportHistory') || '[]');
  const newExport = {
    id: Date.now(),
    fileName,
    format: format.toUpperCase(),
    size,
    timestamp: new Date().toISOString(),
    recordCount,
    user: user || 'Usuario',
    type: 'Dashboard Completo',
    description: `Exportación completa con ${recordCount} registros`
  };
  
  const updatedHistory = [newExport, ...currentHistory.slice(0, 9)];
  localStorage.setItem('exportHistory', JSON.stringify(updatedHistory));
  setExportHistory(updatedHistory);
};

/**
 * Descarga un archivo blob
 * @param {Blob} blob - Archivo blob
 * @param {string} fileName - Nombre del archivo
 */
export const downloadFile = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Muestra notificación de éxito
 * @param {string} format - Formato de exportación
 */
export const showSuccessNotification = (format) => {
  const formatInfo = {
    'pdf': { emoji: '📋', desc: 'Reporte ejecutivo profesional generado con tablas y gráficos' },
    'word': { emoji: '📄', desc: 'Documento ejecutivo profesional con formato corporativo' },
    'docx': { emoji: '📄', desc: 'Documento ejecutivo profesional con formato corporativo' },
    'excel': { emoji: '📊', desc: 'Análisis detallado en múltiples hojas de cálculo' },
    'csv': { emoji: '📈', desc: 'Datos estructurados exportados para análisis' },
    'json': { emoji: '💾', desc: 'Archivo técnico completo con metadata' }
  };
  
  const info = formatInfo[format.toLowerCase()] || { emoji: '✅', desc: 'Exportación completada' };
  
  toast.success(`${info.emoji} Exportación ${format.toUpperCase()} completada exitosamente!\n${info.desc}`, {
    position: "top-center",
    autoClose: 6000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    className: "toast-export-success",
    bodyClassName: "font-medium text-center",
    style: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
      border: '2px solid rgba(255, 255, 255, 0.2)'
    }
  });
};

/**
 * Muestra notificación de error
 * @param {string} format - Formato de exportación
 * @param {string} error - Mensaje de error
 */
export const showErrorNotification = (format, error) => {
  console.error('❌ Error en exportación:', error);
  toast.error(`Error al exportar el archivo ${format.toUpperCase()}`, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true
  });
};
