// API Service para Nómina Electrónica
import api from './api';
import type {
  Empleado,
  Contrato,
  PeriodoNomina,
  Nomina,
  NominaElectronica,
  ConfiguracionNominaElectronica,
  PaginatedResponse,
  NominaFilters,
  NominaElectronicaFilters,
  EstadisticasEmpleado,
  HistorialPago,
  CertificadoIngresos,
  VerificacionAutenticidad,
  DashboardGeneral,
  MetricasDIAN,
  AnalisisCostos,
  Alerta,
  WebhookConfig,
  WebhookLog,
  WebhookTestResult,
  ReporteMensual,
  ReporteAnual,
  AnalyticsFilters,
} from '../types/payroll';

// Usar la instancia de API centralizada que maneja tenant y autenticación
// Ya no necesitamos configurar interceptors aquí porque api.js los maneja

// ============================================
// EMPLEADOS Y CONTRATOS
// ============================================

export const empleadosAPI = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Empleado>>('/api/payroll/empleados/', { params }),
  
  get: (id: number) =>
    api.get<Empleado>(`/api/payroll/empleados/${id}/`),
  
  create: (data: Partial<Empleado>) =>
    api.post<Empleado>('/api/payroll/empleados/', data),
  
  update: (id: number, data: Partial<Empleado>) =>
    api.put<Empleado>(`/api/payroll/empleados/${id}/`, data),
  
  patch: (id: number, data: Partial<Empleado>) =>
    api.patch<Empleado>(`/api/payroll/empleados/${id}/`, data),
  
  delete: (id: number) =>
    api.delete(`/api/payroll/empleados/${id}/`),
  
  activos: () =>
    api.get<Empleado[]>('/api/payroll/empleados/activos/'),
};

export const contratosAPI = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Contrato>>('/api/payroll/contratos/', { params }),
  
  get: (id: number) =>
    api.get<Contrato>(`/api/payroll/contratos/${id}/`),
  
  create: (data: Partial<Contrato>) =>
    api.post<Contrato>('/api/payroll/contratos/', data),
  
  update: (id: number, data: Partial<Contrato>) =>
    api.put<Contrato>(`/api/payroll/contratos/${id}/`, data),
  
  patch: (id: number, data: Partial<Contrato>) =>
    api.patch<Contrato>(`/api/payroll/contratos/${id}/`, data),
  
  delete: (id: number) =>
    api.delete(`/api/payroll/contratos/${id}/`),
  
  activos: (empleadoId?: number) =>
    api.get<Contrato[]>('/api/payroll/contratos/activos/', {
      params: empleadoId ? { empleado: empleadoId } : undefined,
    }),
};

// ============================================
// PERIODOS Y NÓMINA
// ============================================

export const periodosAPI = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<PeriodoNomina>>('/api/payroll/periodos-nomina/', { params }),
  
  get: (id: number) =>
    api.get<PeriodoNomina>(`/api/payroll/periodos-nomina/${id}/`),
  
  create: (data: Partial<PeriodoNomina>) =>
    api.post<PeriodoNomina>('/api/payroll/periodos-nomina/', data),
  
  update: (id: number, data: Partial<PeriodoNomina>) =>
    api.put<PeriodoNomina>(`/api/payroll/periodos-nomina/${id}/`, data),
  
  delete: (id: number) =>
    api.delete(`/api/payroll/periodos-nomina/${id}/`),
  
  cerrar: (id: number) =>
    api.post<PeriodoNomina>(`/api/payroll/periodos-nomina/${id}/cerrar/`),
  
  abrir: (id: number) =>
    api.post<PeriodoNomina>(`/api/payroll/periodos-nomina/${id}/abrir/`),
  
  abiertos: () =>
    api.get<PeriodoNomina[]>('/api/payroll/periodos-nomina/abiertos/'),
};

export const nominasAPI = {
  list: (params?: NominaFilters) =>
    api.get<PaginatedResponse<Nomina>>('/api/payroll/nominas/', { params }),
  
  get: (id: number) =>
    api.get<Nomina>(`/api/payroll/nominas/${id}/`),
  
  create: (data: Partial<Nomina>) =>
    api.post<Nomina>('/api/payroll/nominas/', data),
  
  update: (id: number, data: Partial<Nomina>) =>
    api.put<Nomina>(`/api/payroll/nominas/${id}/`, data),
  
  patch: (id: number, data: Partial<Nomina>) =>
    api.patch<Nomina>(`/api/payroll/nominas/${id}/`, data),
  
  delete: (id: number) =>
    api.delete(`/api/payroll/nominas/${id}/`),
  
  calcular: (id: number) =>
    api.post<Nomina>(`/api/payroll/nominas/${id}/calcular/`),
  
  aprobar: (id: number) =>
    api.post<Nomina>(`/api/payroll/nominas/${id}/aprobar/`),
  
  anular: (id: number) =>
    api.post<Nomina>(`/api/payroll/nominas/${id}/anular/`),
  
  marcarPagada: (id: number, fechaPago?: string) =>
    api.post<Nomina>(`/api/payroll/nominas/${id}/marcar_pagada/`, {
      fecha_pago: fechaPago,
    }),
  
  generarMasivo: (periodoId: number, empleadosIds: number[]) =>
    api.post<{ creadas: number; errores: any[] }>('/api/payroll/nominas/generar_masivo/', {
      periodo: periodoId,
      empleados: empleadosIds,
    }),
};

// ============================================
// NÓMINA ELECTRÓNICA
// ============================================

export const configuracionAPI = {
  list: () =>
    api.get<ConfiguracionNominaElectronica[]>('/api/payroll/configuracion-electronica/'),
  
  get: (id: number) =>
    api.get<ConfiguracionNominaElectronica>(`/api/payroll/configuracion-electronica/${id}/`),
  
  create: (data: Partial<ConfiguracionNominaElectronica>) =>
    api.post<ConfiguracionNominaElectronica>('/api/payroll/configuracion-electronica/', data),
  
  update: (id: number, data: Partial<ConfiguracionNominaElectronica>) =>
    api.put<ConfiguracionNominaElectronica>(`/api/payroll/configuracion-electronica/${id}/`, data),
  
  uploadCertificado: (id: number, file: File, password: string) => {
    const formData = new FormData();
    formData.append('certificado_digital', file);
    formData.append('certificado_password', password);
    return api.post(`/api/payroll/configuracion-electronica/${id}/subir_certificado/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  probarConexion: (id: number) =>
    api.post<{ exitoso: boolean; mensaje: string }>(
      `/api/payroll/configuracion-electronica/${id}/probar_conexion/`
    ),
  
  activa: () =>
    api.get<ConfiguracionNominaElectronica>('/api/payroll/configuracion-electronica/activa/'),
};

export const nominaElectronicaAPI = {
  list: (params?: NominaElectronicaFilters) =>
    api.get<PaginatedResponse<NominaElectronica>>('/api/payroll/nominas-electronicas/', { params }),
  
  get: (id: number) =>
    api.get<NominaElectronica>(`/api/payroll/nominas-electronicas/${id}/`),
  
  create: (data: Partial<NominaElectronica>) =>
    api.post<NominaElectronica>('/api/payroll/nominas-electronicas/', data),
  
  generarXML: (id: number) =>
    api.post<NominaElectronica>(`/api/payroll/nominas-electronicas/${id}/generar_xml/`),
  
  firmar: (id: number) =>
    api.post<NominaElectronica>(`/api/payroll/nominas-electronicas/${id}/firmar/`),
  
  enviarDIAN: (id: number) =>
    api.post<NominaElectronica>(`/api/payroll/nominas-electronicas/${id}/enviar_dian/`),
  
  consultarEstado: (id: number) =>
    api.post<NominaElectronica>(`/api/payroll/nominas-electronicas/${id}/consultar_estado/`),
  
  generarPDF: (id: number) =>
    api.post<{ pdf_url: string }>(`/api/payroll/nominas-electronicas/${id}/generar_pdf/`),
  
  descargarXML: (id: number) =>
    api.get(`/api/payroll/nominas-electronicas/${id}/descargar_xml/`, {
      responseType: 'blob',
    }),
  
  descargarPDF: (id: number) =>
    api.get(`/api/payroll/nominas-electronicas/${id}/descargar_pdf/`, {
      responseType: 'blob',
    }),
  
  procesarCompleto: (id: number) =>
    api.post<{ task_id: string; mensaje: string }>(
      `/api/payroll/nominas-electronicas/${id}/procesar_completo/`
    ),
  
  reintentarEnvio: (id: number) =>
    api.post<NominaElectronica>(`/api/payroll/nominas-electronicas/${id}/reintentar_envio/`),
};

// ============================================
// PORTAL DEL EMPLEADO
// ============================================

export const portalEmpleadoAPI = {
  misNominas: (params?: { año?: number; mes?: number; estado?: string }) =>
    api.get<PaginatedResponse<NominaElectronica>>('/api/payroll/portal-empleado/mis_nominas/', { params }),
  
  get: (id: number) =>
    api.get<NominaElectronica>(`/api/payroll/portal-empleado/${id}/`),
  
  descargarPDF: (id: number) =>
    api.get(`/api/payroll/portal-empleado/${id}/descargar_pdf/`, {
      responseType: 'blob',
    }),
  
  descargarXML: (id: number) =>
    api.get(`/api/payroll/portal-empleado/${id}/descargar_xml/`, {
      responseType: 'blob',
    }),
  
  verificarAutenticidad: (id: number) =>
    api.post<VerificacionAutenticidad>(`/api/payroll/portal-empleado/${id}/verificar_autenticidad/`),
  
  estadisticas: () =>
    api.get<EstadisticasEmpleado>('/api/payroll/portal-empleado/estadisticas/'),
  
  historialPagos: (año?: number) =>
    api.get<HistorialPago[]>('/api/payroll/portal-empleado/historial_pagos/', {
      params: año ? { año } : undefined,
    }),
  
  certificadoIngresos: (año: number) =>
    api.get<CertificadoIngresos>('/api/payroll/portal-empleado/certificado_ingresos/', {
      params: { año },
    }),
  
  reportarInconsistencia: (id: number, descripcion: string) =>
    api.post(`/api/payroll/portal-empleado/${id}/reportar_inconsistencia/`, {
      descripcion,
    }),
  
  resumenMensual: () =>
    api.get<{ total: string; cantidad: number; estado: string }>(
      '/api/payroll/portal-empleado/resumen_mensual/'
    ),
};

// ============================================
// ANALYTICS
// ============================================

export const analyticsAPI = {
  dashboardGeneral: (periodo: number = 30) =>
    api.get<DashboardGeneral>('/api/payroll/analytics/dashboard_general/', {
      params: { periodo },
    }),
  
  metricasDIAN: (filters?: AnalyticsFilters) =>
    api.get<MetricasDIAN>('/api/payroll/analytics/metricas_dian/', {
      params: filters,
    }),
  
  analisisCostos: (filters?: AnalyticsFilters) =>
    api.get<AnalisisCostos>('/api/payroll/analytics/analisis_costos/', {
      params: filters,
    }),
  
  topEmpleados: (metrica: string = 'total_devengado', limite: number = 10, filters?: AnalyticsFilters) =>
    api.get<Array<{
      empleado: Empleado;
      valor: string;
      cantidad_nominas: number;
    }>>('/api/payroll/analytics/top_empleados/', {
      params: { metrica, limite, ...filters },
    }),
  
  comparativaPeriodos: (periodo1: string, periodo2: string) =>
    api.get<{
      periodo1: any;
      periodo2: any;
      variaciones: any;
    }>('/api/payroll/analytics/comparativa_periodos/', {
      params: { periodo1, periodo2 },
    }),
  
  alertas: () =>
    api.get<Alerta[]>('/api/payroll/analytics/alertas/'),
};

// ============================================
// REPORTES
// ============================================

export const reportesAPI = {
  nominasExcel: (filters?: NominaFilters) =>
    api.get('/api/payroll/reportes/nominas_excel/', {
      params: filters,
      responseType: 'blob',
    }),
  
  nominasCSV: (filters?: NominaFilters) =>
    api.get('/api/payroll/reportes/nominas_csv/', {
      params: filters,
      responseType: 'blob',
    }),
  
  reporteMensual: (año: number, mes: number) =>
    api.get<ReporteMensual>('/api/payroll/reportes/reporte_mensual_excel/', {
      params: { año, mes },
      responseType: 'blob',
    }),
  
  reporteAnual: (año: number) =>
    api.get<ReporteAnual>('/api/payroll/reportes/reporte_anual/', {
      params: { año },
    }),
  
  certificadoIngresosPDF: (empleadoId: number, año: number) =>
    api.post('/api/payroll/reportes/certificado_ingresos_pdf/', {
      empleado: empleadoId,
      año,
    }, {
      responseType: 'blob',
    }),
};

// ============================================
// WEBHOOKS
// ============================================

export const webhooksAPI = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<WebhookConfig>>('/api/payroll/webhooks/', { params }),
  
  get: (id: number) =>
    api.get<WebhookConfig>(`/api/payroll/webhooks/${id}/`),
  
  create: (data: Partial<WebhookConfig>) =>
    api.post<WebhookConfig>('/api/payroll/webhooks/', data),
  
  update: (id: number, data: Partial<WebhookConfig>) =>
    api.put<WebhookConfig>(`/api/payroll/webhooks/${id}/`, data),
  
  patch: (id: number, data: Partial<WebhookConfig>) =>
    api.patch<WebhookConfig>(`/api/payroll/webhooks/${id}/`, data),
  
  delete: (id: number) =>
    api.delete(`/api/payroll/webhooks/${id}/`),
  
  probar: (id: number) =>
    api.post<WebhookTestResult>(`/api/payroll/webhooks/${id}/probar/`),
  
  logs: (id: number, params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<WebhookLog>>(`/api/payroll/webhooks/${id}/logs/`, { params }),
};

// ============================================
// UTILIDADES
// ============================================

export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default {
  empleados: empleadosAPI,
  contratos: contratosAPI,
  periodos: periodosAPI,
  nominas: nominasAPI,
  configuracion: configuracionAPI,
  nominaElectronica: nominaElectronicaAPI,
  portalEmpleado: portalEmpleadoAPI,
  analytics: analyticsAPI,
  reportes: reportesAPI,
  webhooks: webhooksAPI,
  utils: { downloadFile },
};
