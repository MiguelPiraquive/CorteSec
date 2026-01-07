/**
 * Servicio para gestión de auditoría del sistema
 * Integra con el backend de Django REST Framework
 */

import api from './api'

const auditoriaService = {
  // ==================== LOGS DE AUDITORÍA ====================
  
  /**
   * Obtener todos los logs de auditoría con filtros
   */
  getAllLogs: async (params = {}) => {
    const response = await api.get('/api/auditoria/', { params })
    return response.data
  },

  /**
   * Obtener un log específico por ID
   */
  getLogById: async (id) => {
    const response = await api.get(`/api/auditoria/${id}/`)
    return response.data
  },

  // ==================== ESTADÍSTICAS Y ANÁLISIS ====================

  /**
   * Obtener estadísticas generales de auditoría
   */
  getEstadisticas: async (fechaInicio = null, fechaFin = null) => {
    const params = {}
    if (fechaInicio) params.fecha_inicio = fechaInicio
    if (fechaFin) params.fecha_fin = fechaFin
    
    const response = await api.get('/api/auditoria/estadisticas/', { params })
    return response.data
  },

  /**
   * Obtener actividad por usuario
   */
  getActividadPorUsuario: async (fechaInicio = null, fechaFin = null) => {
    const params = {}
    if (fechaInicio) params.fecha_inicio = fechaInicio
    if (fechaFin) params.fecha_fin = fechaFin
    
    const response = await api.get('/api/auditoria/actividad_usuarios/', { params })
    return response.data
  },

  /**
   * Obtener actividad por módulo
   */
  getActividadPorModulo: async (fechaInicio = null, fechaFin = null) => {
    const params = {}
    if (fechaInicio) params.fecha_inicio = fechaInicio
    if (fechaFin) params.fecha_fin = fechaFin
    
    const response = await api.get('/api/auditoria/actividad_modulos/', { params })
    return response.data
  },

  /**
   * Obtener línea de tiempo de eventos
   */
  getLineaTiempo: async (fechaInicio = null, fechaFin = null, agrupacion = 'hora') => {
    const params = { agrupacion }
    if (fechaInicio) params.fecha_inicio = fechaInicio
    if (fechaFin) params.fecha_fin = fechaFin
    
    const response = await api.get('/api/auditoria/linea_tiempo/', { params })
    return response.data
  },

  // ==================== AUDITORÍA DE ROLES ====================

  /**
   * Obtener auditoría de roles
   */
  getAuditoriaRoles: async (params = {}) => {
    const response = await api.get('/api/roles/auditoria/', { params })
    return response.data
  },

  // ==================== EXPORTACIÓN ====================

  /**
   * Exportar logs de auditoría a CSV
   */
  exportarCSV: async (params = {}) => {
    const response = await api.get('/api/auditoria/exportar_csv/', {
      params,
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], { type: 'text/csv' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
  },

  /**
   * Exportar logs de auditoría a Excel
   */
  exportarExcel: async (params = {}) => {
    const response = await api.get('/api/auditoria/exportar_excel/', {
      params,
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `auditoria_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
  },

  // ==================== BÚSQUEDA AVANZADA ====================

  /**
   * Búsqueda avanzada de logs
   */
  busquedaAvanzada: async (criterios) => {
    const response = await api.post('/api/auditoria/busqueda_avanzada/', criterios)
    return response.data
  },

  // ==================== ALERTAS Y ANOMALÍAS ====================

  /**
   * Detectar anomalías en el sistema
   */
  detectarAnomalias: async (fechaInicio = null, fechaFin = null) => {
    const params = {}
    if (fechaInicio) params.fecha_inicio = fechaInicio
    if (fechaFin) params.fecha_fin = fechaFin
    
    const response = await api.get('/api/auditoria/anomalias/', { params })
    return response.data
  },

  /**
   * Obtener intentos de acceso fallidos
   */
  getAccesosFallidos: async (params = {}) => {
    const response = await api.get('/api/auditoria/accesos_fallidos/', { params })
    return response.data
  }
}

export default auditoriaService
