/**
 * Servicio unificado de Payroll
 * Integra empleados, nóminas, periodos y nóminas electrónicas
 */

import api from './api';
import empleadosService from './empleadosService';
import nominaService from './nominaService';
import conceptosLaboralesService from './conceptosLaboralesService';

// ==================== CONCEPTOS LABORALES ====================
const conceptosLaboralesAPI = {
  list: async (params = {}) => {
    const response = await conceptosLaboralesService.getAll(params);
    return response;
  },

  get: async (id) => {
    const response = await conceptosLaboralesService.getById(id);
    return response;
  },

  create: async (data) => {
    const response = await conceptosLaboralesService.create(data);
    return response;
  },

  update: async (id, data) => {
    const response = await conceptosLaboralesService.update(id, data);
    return response;
  },

  patch: async (id, data) => {
    const response = await conceptosLaboralesService.patch(id, data);
    return response;
  },

  delete: async (id) => {
    await conceptosLaboralesService.delete(id);
  },

  devengados: async (params = {}) => {
    const response = await conceptosLaboralesService.getDevengados(params);
    return response;
  },

  deducciones: async (params = {}) => {
    const response = await conceptosLaboralesService.getDeducciones(params);
    return response;
  },

  salariales: async (params = {}) => {
    const response = await conceptosLaboralesService.getSalariales(params);
    return response;
  },

  activos: async () => {
    const response = await conceptosLaboralesService.getActivos();
    return response;
  },

  toggleActivo: async (id) => {
    const response = await conceptosLaboralesService.toggleActivo(id);
    return response;
  },

  search: async (searchTerm) => {
    const response = await conceptosLaboralesService.search(searchTerm);
    return response;
  }
};

// ==================== ITEMS (CONSTRUCCIÓN) ====================
const itemsAPI = {
  list: async (params = {}) => {
    const response = await api.get('/api/items/', { params });
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/api/items/${id}/`);
    return response.data;
  },

  activos: async () => {
    const response = await api.get('/api/items/', {
      params: { activo: true }
    });
    return response.data;
  }
};

// ==================== PERIODOS ====================
const periodosAPI = {
  list: async (params = {}) => {
    const response = await api.get('/api/payroll/periodos-nomina/', { params });
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/api/payroll/periodos-nomina/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/api/payroll/periodos-nomina/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/payroll/periodos-nomina/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/api/payroll/periodos-nomina/${id}/`);
  },

  cerrar: async (id) => {
    const response = await api.post(`/api/payroll/periodos-nomina/${id}/cerrar/`);
    return response.data;
  },

  reabrir: async (id) => {
    const response = await api.post(`/api/payroll/periodos-nomina/${id}/reabrir/`);
    return response.data;
  },

  abiertos: async () => {
    const response = await api.get('/api/payroll/periodos-nomina/abiertos/');
    return response.data;
  }
};

// ==================== NÓMINAS ELECTRÓNICAS ====================
const nominaElectronicaAPI = {
  list: async (params = {}) => {
    const response = await api.get('/api/payroll/nominas-electronicas/', { params });
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/api/payroll/nominas-electronicas/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/api/payroll/nominas-electronicas/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/payroll/nominas-electronicas/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/api/payroll/nominas-electronicas/${id}/`);
  },

  // Acciones específicas de nómina electrónica
  generarXML: async (id) => {
    const response = await api.post(`/api/payroll/nominas-electronicas/${id}/generar_xml/`);
    return response.data;
  },

  firmar: async (id) => {
    const response = await api.post(`/api/payroll/nominas-electronicas/${id}/firmar/`);
    return response.data;
  },

  enviarDIAN: async (id) => {
    const response = await api.post(`/api/payroll/nominas-electronicas/${id}/enviar_dian/`);
    return response.data;
  },

  procesarCompleto: async (id) => {
    const response = await api.post(`/api/payroll/nominas-electronicas/${id}/procesar_completo/`);
    return response.data;
  },

  descargarXML: async (id) => {
    const response = await api.get(`/api/payroll/nominas-electronicas/${id}/descargar_xml/`, {
      responseType: 'blob'
    });
    return response;
  },

  descargarPDF: async (id) => {
    const response = await api.get(`/api/payroll/nominas-electronicas/${id}/descargar_pdf/`, {
      responseType: 'blob'
    });
    return response;
  },

  consultarEstado: async (id) => {
    const response = await api.get(`/api/payroll/nominas-electronicas/${id}/consultar_estado/`);
    return response.data;
  },

  generarDesdeNomina: async (nominaSimpleId) => {
    const response = await api.post('/api/payroll/nominas-electronicas/generar_desde_nomina/', {
      nomina_simple_id: nominaSimpleId
    });
    return response.data;
  }
};

// ==================== EMPLEADOS (Re-exportar) ====================
const empleadosAPI = {
  list: async (params = {}) => {
    const response = await empleadosService.getEmpleados(params);
    return response;
  },
  get: async (id) => {
    const response = await empleadosService.getEmpleado(id);
    return response;
  },
  create: async (data) => {
    const response = await empleadosService.createEmpleado(data);
    return response;
  },
  update: async (id, data) => {
    const response = await empleadosService.updateEmpleado(id, data);
    return response;
  },
  delete: async (id) => {
    await empleadosService.deleteEmpleado(id);
  },
  activos: async () => {
    const response = await empleadosService.getAllEmpleados();
    return response;
  }
};

// ==================== NÓMINAS (Re-exportar) ====================
const nominasAPI = {
  list: async (params = {}) => {
    const response = await nominaService.getAllNominas(params);
    return response;
  },
  sinElectronica: async (params = {}) => {
    const response = await api.get('/api/payroll/nominas-simples/sin_electronica/', { params });
    return response.data;
  },
  get: async (id) => {
    const response = await nominaService.getNomina(id);
    return response;
  },
  create: async (data) => {
    const response = await nominaService.createNomina(data);
    return response;
  },
  update: async (id, data) => {
    const response = await nominaService.updateNomina(id, data);
    return response;
  },
  delete: async (id) => {
    await nominaService.deleteNomina(id);
  },
  calcular: async (id) => {
    const response = await nominaService.calcularNomina(id);
    return response;
  },
  aprobar: async (id) => {
    const response = await nominaService.aprobarNomina(id);
    return response;
  },
  rechazar: async (id) => {
    const response = await nominaService.rechazarNomina(id);
    return response;
  }
};

// ==================== CONTRATOS ====================
const contratosAPI = {
  list: async (params = {}) => {
    const response = await api.get('/api/payroll/contratos/', { params });
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/api/payroll/contratos/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/api/payroll/contratos/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/payroll/contratos/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/api/payroll/contratos/${id}/`);
  },

  activar: async (id) => {
    const response = await api.post(`/api/payroll/contratos/${id}/activar/`);
    return response.data;
  },

  suspender: async (id) => {
    const response = await api.post(`/api/payroll/contratos/${id}/suspender/`);
    return response.data;
  },

  terminar: async (id) => {
    const response = await api.post(`/api/payroll/contratos/${id}/terminar/`);
    return response.data;
  }
};

// ==================== CONFIGURACIÓN NÓMINA ELECTRÓNICA ====================
const configuracionAPI = {
  list: async (params = {}) => {
    const response = await api.get('/api/payroll/configuracion-electronica/', { params });
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/api/payroll/configuracion-electronica/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/api/payroll/configuracion-electronica/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/payroll/configuracion-electronica/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/api/payroll/configuracion-electronica/${id}/`);
  },

  verificarConfiguracion: async (id) => {
    const response = await api.post(`/api/payroll/configuracion-electronica/${id}/verificar_configuracion/`);
    return response.data;
  },

  cargarCertificado: async (id, formData) => {
    const response = await api.post(`/api/payroll/configuracion-electronica/${id}/cargar_certificado/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  activa: async () => {
    const response = await api.get('/api/payroll/configuracion-electronica/activa/');
    return response.data;
  }
};

// ==================== WEBHOOKS ====================
const webhooksAPI = {
  list: async (params = {}) => {
    const response = await api.get('/api/payroll/webhooks/', { params });
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/api/payroll/webhooks/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/api/payroll/webhooks/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/payroll/webhooks/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/api/payroll/webhooks/${id}/`);
  },

  activar: async (id) => {
    const response = await api.post(`/api/payroll/webhooks/${id}/activar/`);
    return response.data;
  },

  desactivar: async (id) => {
    const response = await api.post(`/api/payroll/webhooks/${id}/desactivar/`);
    return response.data;
  },

  probar: async (id) => {
    const response = await api.post(`/api/payroll/webhooks/${id}/probar/`);
    return response.data;
  },

  historial: async (id, params = {}) => {
    const response = await api.get(`/api/payroll/webhooks/${id}/historial/`, { params });
    return response.data;
  }
};

// ==================== UTILIDADES ====================
const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// ==================== PORTAL EMPLEADO ====================
const portalEmpleadoAPI = {
  misNominas: async (params = {}) => {
    const response = await api.get('/api/payroll/portal-empleado/mis_nominas/', { params });
    return response.data;
  },

  estadisticas: async () => {
    const response = await api.get('/api/payroll/portal-empleado/estadisticas/');
    return response.data;
  },

  historialPagos: async (params = {}) => {
    const response = await api.get('/api/payroll/portal-empleado/historial_pagos/', { params });
    return response.data;
  },

  resumenMensual: async (params = {}) => {
    const response = await api.get('/api/payroll/portal-empleado/resumen_mensual/', { params });
    return response.data;
  },

  certificadoIngresos: async (params = {}) => {
    const response = await api.get('/api/payroll/portal-empleado/certificado_ingresos/', { params });
    return response.data;
  },

  descargarPDF: async (id) => {
    const response = await api.get(`/api/payroll/portal-empleado/${id}/descargar_pdf/`, {
      responseType: 'blob'
    });
    return response;
  },

  descargarXML: async (id) => {
    const response = await api.get(`/api/payroll/portal-empleado/${id}/descargar_xml/`, {
      responseType: 'blob'
    });
    return response;
  },

  verificarAutenticidad: async (id) => {
    const response = await api.get(`/api/payroll/portal-empleado/${id}/verificar_autenticidad/`);
    return response.data;
  },

  reportarInconsistencia: async (id, descripcion) => {
    const response = await api.post(`/api/payroll/portal-empleado/${id}/reportar_inconsistencia/`, {
      descripcion
    });
    return response.data;
  }
};

// ==================== ANALYTICS ====================
const analyticsAPI = {
  dashboardGeneral: async (params = {}) => {
    // Si params es un número, convertir a objeto { dias: params }
    const queryParams = typeof params === 'number' ? { dias: params } : params;
    const response = await api.get('/api/payroll/analytics/dashboard_general/', { params: queryParams });
    return response.data;
  },

  metricasDIAN: async (params = {}) => {
    const response = await api.get('/api/payroll/analytics/metricas_dian/', { params });
    return response.data;
  },

  analisisCostos: async (params = {}) => {
    const response = await api.get('/api/payroll/analytics/analisis_costos/', { params });
    return response.data;
  },

  topEmpleados: async (params = {}) => {
    const response = await api.get('/api/payroll/analytics/top_empleados/', { params });
    return response.data;
  },

  comparativaPeriodos: async (periodo1, periodo2) => {
    // Aceptar dos parámetros y construir el objeto params
    const params = {};
    if (periodo1) params.periodo1 = periodo1;
    if (periodo2) params.periodo2 = periodo2;
    const response = await api.get('/api/payroll/analytics/comparativa_periodos/', { params });
    return response.data;
  },

  alertas: async (params = {}) => {
    const response = await api.get('/api/payroll/analytics/alertas/', { params });
    return response.data;
  }
};

// ==================== REPORTES ====================
const reportesAPI = {
  nominasExcel: async (params = {}) => {
    const response = await api.get('/api/payroll/reportes/nominas_excel/', {
      params,
      responseType: 'blob'
    });
    return response;
  },

  nominasCSV: async (params = {}) => {
    const response = await api.get('/api/payroll/reportes/nominas_csv/', {
      params,
      responseType: 'blob'
    });
    return response;
  },

  reporteMensualExcel: async (params = {}) => {
    const response = await api.get('/api/payroll/reportes/reporte_mensual_excel/', {
      params,
      responseType: 'blob'
    });
    return response;
  },

  reporteAnual: async (anioOrParams) => {
    // Si es un número o string, convertir a objeto { anio: ... }
    const params = typeof anioOrParams === 'object' ? anioOrParams : { anio: anioOrParams };
    const response = await api.get('/api/payroll/reportes/reporte_anual/', {
      params,
      responseType: 'blob'
    });
    return response;
  },

  certificadoIngresosPDF: async (params = {}) => {
    const response = await api.get('/api/payroll/reportes/certificado_ingresos_pdf/', {
      params,
      responseType: 'blob'
    });
    return response;
  }
};

// Exportar APIs
export {
  conceptosLaboralesAPI,
  itemsAPI,
  empleadosAPI,
  nominasAPI,
  contratosAPI,
  periodosAPI,
  nominaElectronicaAPI,
  configuracionAPI,
  webhooksAPI,
  portalEmpleadoAPI,
  analyticsAPI,
  reportesAPI,
  downloadFile
};

export default {
  conceptosLaborales: conceptosLaboralesAPI,
  items: itemsAPI,
  empleados: empleadosAPI,
  nominas: nominasAPI,
  contratos: contratosAPI,
  periodos: periodosAPI,
  nominaElectronica: nominaElectronicaAPI,
  configuracion: configuracionAPI,
  webhooks: webhooksAPI,
  portalEmpleado: portalEmpleadoAPI,
  analytics: analyticsAPI,
  reportes: reportesAPI,
  downloadFile
};
