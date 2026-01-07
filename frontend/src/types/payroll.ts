// Types para Nómina Electrónica - CorteSec Frontend
// Tipos completos basados en el backend Django

// ============================================
// TIPOS BASE
// ============================================

export interface Organization {
  id: number;
  nombre: string;
  nit: string;
  tipo_documento: string;
}

export interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  organization?: Organization;
}

// ============================================
// EMPLEADOS Y CONTRATOS
// ============================================

export interface TipoDocumento {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface TipoContrato {
  id: number;
  codigo: string;
  nombre: string;
  requiere_fecha_fin: boolean;
  activo: boolean;
}

export interface Empleado {
  id: number;
  tipo_documento: number;
  tipo_documento_detalle?: TipoDocumento;
  documento: string;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  nombre_completo: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  fecha_nacimiento?: string;
  genero?: 'M' | 'F' | 'O';
  activo: boolean;
  fecha_creacion: string;
  fecha_modificacion: string;
}

export interface Contrato {
  id: number;
  empleado: number;
  empleado_detalle?: Empleado;
  tipo_contrato: number;
  tipo_contrato_detalle?: TipoContrato;
  cargo: string;
  salario_base: string;
  fecha_inicio: string;
  fecha_fin?: string;
  activo: boolean;
  observaciones?: string;
  fecha_creacion: string;
  fecha_modificacion: string;
}

// ============================================
// CONCEPTOS LABORALES
// ============================================

export interface ConceptoLaboral {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo_concepto: 'DEV' | 'DED' | 'APO';
  tipo_concepto_display: string;
  es_salarial: boolean;
  aplica_seguridad_social: boolean;
  codigo_dian?: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_modificacion: string;
}

export interface ConceptoLaboralList {
  id: number;
  codigo: string;
  nombre: string;
  tipo_concepto: 'DEV' | 'DED' | 'APO';
  tipo_concepto_display: string;
  activo: boolean;
}

export interface DetalleConceptoNominaSimple {
  id?: number;
  concepto: number;
  concepto_detalle?: ConceptoLaboral;
  cantidad: string;
  valor_unitario: string;
  valor_total: string;
}

export interface DetalleConceptoNominaElectronica {
  id?: number;
  concepto: number;
  concepto_detalle?: ConceptoLaboral;
  cantidad: string;
  valor_unitario: string;
  valor_total: string;
  codigo_dian?: string;
}

// ============================================
// ITEMS (CONSTRUCCIÓN)
// ============================================

export interface Item {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  precio_unitario?: string;
  activo: boolean;
}

export interface DetalleItemNominaSimple {
  id?: number;
  item: number;
  item_detalle?: Item;
  cantidad: string;
  valor_unitario: string;
  valor_total: string;
}

export interface DetalleItemNominaElectronica {
  id?: number;
  item: number;
  item_detalle?: Item;
  cantidad: string;
  valor_unitario: string;
  valor_total: string;
}

// ============================================
// NÓMINA SIMPLE
// ============================================

export interface PeriodoNomina {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_pago: string;
  estado: 'abierto' | 'cerrado';
  observaciones?: string;
  fecha_creacion: string;
  fecha_modificacion: string;
}

export interface DetalleNomina {
  id: number;
  concepto: string;
  valor: string;
  tipo: 'devengado' | 'deduccion';
}

export interface Nomina {
  id: number;
  numero_interno: string;
  periodo: number;
  periodo_detalle?: PeriodoNomina;
  periodo_nombre?: string;
  empleado: number;
  empleado_detalle?: Empleado;
  empleado_info?: any;
  periodo_inicio: string;
  periodo_fin: string;
  dias_trabajados: number;
  salario_base_contrato: string;
  
  // Totales de items (producción)
  total_items: string;
  
  // Totales de conceptos
  total_devengados_conceptos: string;
  total_deducciones_conceptos: string;
  
  // Seguridad social y aportes
  base_cotizacion: string;
  aporte_salud_empleado: string;
  aporte_pension_empleado: string;
  aporte_salud_empresa: string;
  aporte_pension_empresa: string;
  aporte_arl: string;
  aporte_caja_compensacion: string;
  
  // Provisiones
  provision_cesantias: string;
  provision_intereses_cesantias: string;
  provision_prima_servicios: string;
  provision_vacaciones: string;
  
  // Deducciones préstamos
  deduccion_prestamos: string;
  
  // Totales generales
  total_aportes: string;
  total_provisiones: string;
  total_deducciones: string;
  neto_pagar: string;
  
  estado: 'BOR' | 'APR' | 'PAG' | 'ANU';
  observaciones?: string;
  fecha_creacion: string;
  fecha_modificacion: string;
  fecha_aprobacion?: string;
  fecha_pago?: string;
  
  // Detalles
  detalles_items: DetalleItemNominaSimple[];
  detalles_conceptos: DetalleConceptoNominaSimple[];
  
  // Legacy (mantener por compatibilidad)
  detalles?: DetalleNomina[];
}

// ============================================
// NÓMINA ELECTRÓNICA
// ============================================

export interface ConfiguracionNominaElectronica {
  id: number;
  razon_social: string;
  nit: string;
  tipo_documento: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  pais: string;
  email: string;
  telefono: string;
  ambiente: 'produccion' | 'habilitacion';
  envio_automatico: boolean;
  certificado_digital?: string;
  certificado_password?: string;
  certificado_valido_hasta?: string;
  url_dian?: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_modificacion: string;
}

export interface DevengadoNominaElectronica {
  id: number;
  tipo: string;
  concepto: string;
  valor: string;
  detalle?: Record<string, any>;
}

export interface DeduccionNominaElectronica {
  id: number;
  tipo: string;
  concepto: string;
  valor: string;
  porcentaje?: string;
  detalle?: Record<string, any>;
}

export interface NominaElectronica {
  id: number;
  nomina: number;
  nomina_detalle?: Nomina;
  numero_documento: string;
  prefijo?: string;
  tipo_documento: string;
  fecha_emision: string;
  hora_emision: string;
  fecha_inicio_periodo: string;
  fecha_fin_periodo: string;
  tiempo_laborado: number;
  tipo_moneda: string;
  trm?: string;
  cune?: string;
  qr_code?: string;
  xml_generado?: string;
  xml_firmado?: string;
  pdf_generado?: string;
  estado: 'borrador' | 'generado' | 'firmado' | 'enviado' | 'aceptado' | 'rechazado';
  fecha_generacion?: string;
  fecha_firma?: string;
  fecha_envio_dian?: string;
  fecha_respuesta_dian?: string;
  codigo_respuesta_dian?: string;
  mensaje_respuesta_dian?: string;
  intentos_envio: number;
  ultimo_error?: string;
  observaciones?: string;
  fecha_creacion: string;
  fecha_modificacion: string;
  devengados: DevengadoNominaElectronica[];
  deducciones: DeduccionNominaElectronica[];
}

// ============================================
// PORTAL DEL EMPLEADO
// ============================================

export interface EstadisticasEmpleado {
  total_nominas: number;
  total_pagado: string;
  promedio_mensual: string;
  por_estado: {
    aprobada: number;
    pagada: number;
  };
  ultimos_12_meses: Array<{
    mes: string;
    total: string;
    cantidad: number;
  }>;
}

export interface HistorialPago {
  año: number;
  meses: Array<{
    mes: number;
    mes_nombre: string;
    nominas: number;
    total_pagado: string;
    nomina_electronica: boolean;
  }>;
}

export interface CertificadoIngresos {
  año: number;
  total_devengado: string;
  total_deducciones: string;
  neto_pagado: string;
  cantidad_nominas: number;
  desglose_devengados: Record<string, string>;
  desglose_deducciones: Record<string, string>;
}

export interface VerificacionAutenticidad {
  cune: string;
  estado: string;
  fecha_validacion: string;
  valido: boolean;
  mensaje: string;
}

// ============================================
// ANALYTICS
// ============================================

export interface DashboardGeneral {
  kpis: {
    total_nominas: number;
    nominas_aceptadas: number;
    tasa_aceptacion: string;
    total_pagado: string;
    tiempo_promedio_procesamiento: string;
  };
  tendencia: Array<{
    fecha: string;
    cantidad: number;
    total: string;
  }>;
}

export interface MetricasDIAN {
  codigos_respuesta: Array<{
    codigo: string;
    cantidad: number;
    porcentaje: string;
  }>;
  intentos_promedio: string;
  tiempos_respuesta: {
    promedio: string;
    minimo: string;
    maximo: string;
  };
  errores_frecuentes: Array<{
    error: string;
    cantidad: number;
  }>;
}

export interface AnalisisCostos {
  totales: {
    año: number;
    mes?: number;
    total_devengado: string;
    total_deducciones: string;
    neto_pagado: string;
  };
  por_mes: Array<{
    mes: number;
    mes_nombre: string;
    devengados: string;
    deducciones: string;
    neto: string;
  }>;
  desglose: {
    devengados: Record<string, string>;
    deducciones: Record<string, string>;
  };
}

export interface Alerta {
  tipo: 'info' | 'warning' | 'error';
  titulo: string;
  descripcion: string;
  cantidad: number;
  accion?: string;
}

// ============================================
// WEBHOOKS
// ============================================

export interface WebhookConfig {
  id: number;
  nombre: string;
  url: string;
  secret?: string;
  activo: boolean;
  eventos: string[];
  reintentos_maximos: number;
  timeout_segundos: number;
  total_disparos: number;
  total_exitosos: number;
  total_fallidos: number;
  ultimo_disparo?: string;
  ultimo_estado?: 'exitoso' | 'fallido';
  fecha_creacion: string;
  fecha_modificacion: string;
}

export interface WebhookLog {
  id: number;
  webhook: number;
  evento: string;
  payload: Record<string, any>;
  codigo_respuesta?: number;
  respuesta?: string;
  exitoso: boolean;
  error?: string;
  tiempo_respuesta?: number;
  fecha_disparo: string;
}

export interface WebhookTestResult {
  exitoso: boolean;
  mensaje: string;
  tiempo_respuesta?: number;
  error?: string;
}

// ============================================
// REPORTES
// ============================================

export interface ReporteMensual {
  año: number;
  mes: number;
  resumen: {
    total_nominas: number;
    total_devengado: string;
    total_deducciones: string;
    neto_pagado: string;
    por_estado: Record<string, number>;
    nomina_electronica: {
      total: number;
      enviadas: number;
      aceptadas: number;
      tasa_aceptacion: string;
    };
  };
  detalle: Nomina[];
}

export interface ReporteAnual {
  año: number;
  por_mes: Array<{
    mes: number;
    mes_nombre: string;
    total_nominas: number;
    total_devengado: string;
    total_deducciones: string;
    neto_pagado: string;
    nomina_electronica: {
      enviadas: number;
      aceptadas: number;
      tasa_aceptacion: string;
    };
  }>;
}

// ============================================
// RESPONSES Y PAGINACIÓN
// ============================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

// ============================================
// FILTROS
// ============================================

export interface NominaFilters {
  periodo?: number;
  empleado?: number;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface NominaElectronicaFilters {
  nomina?: number;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface AnalyticsFilters {
  periodo?: number;
  año?: number;
  mes?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}
