// frontend/src/services/empleadosService.js
/**
 * Servicio API para gestión de empleados
 * Proporciona funciones para CRUD de empleados con React Frontend
 */

import api from './api';

export const empleadosService = {
  // ==================== EMPLEADOS ====================
  
  /**
   * Obtener todos los empleados
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise} - Lista de empleados
   */
  getEmpleados: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/api/payroll/empleados/?${queryString}` : '/api/payroll/empleados/';
    return await api.get(url);
  },

  /**
   * Obtener empleado por ID
   * @param {string} id - ID del empleado
   * @returns {Promise} - Datos del empleado
   */
  getEmpleado: async (id) => {
    return await api.get(`/api/payroll/empleados/${id}/`);
  },

  /**
   * Crear nuevo empleado
   * @param {Object} empleadoData - Datos del empleado
   * @returns {Promise} - Empleado creado
   */
  createEmpleado: async (empleadoData) => {
    return await api.post('/api/payroll/empleados/', empleadoData);
  },

  /**
   * Actualizar empleado
   * @param {string} id - ID del empleado
   * @param {Object} empleadoData - Datos actualizados
   * @returns {Promise} - Empleado actualizado
   */
  updateEmpleado: async (id, empleadoData) => {
    return await api.put(`/api/payroll/empleados/${id}/`, empleadoData);
  },

  /**
   * Activar/Desactivar empleado
   * @param {string} id - ID del empleado
   * @returns {Promise} - Resultado de la operación
   */
  toggleActivo: async (id) => {
    return await api.post(`/api/payroll/empleados/${id}/toggle_activo/`);
  },

  /**
   * Obtener estadísticas de empleados
   * @returns {Promise} - Estadísticas de empleados
   */
  getEstadisticas: async () => {
    return await api.get('/api/payroll/empleados/estadisticas/');
  },

  /**
   * Exportar empleados a Excel
   * @param {Object} filters - Filtros aplicados
   * @returns {Promise} - Archivo Excel
   */
  exportToExcel: async (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    const url = queryString ? `/api/payroll/empleados/export/excel/?${queryString}` : '/api/payroll/empleados/export/excel/';
    const response = await api.get(url, { responseType: 'blob' });
    
    // Crear link de descarga
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url2 = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url2;
    link.download = `empleados_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url2);
    
    return response;
  },

  /**
   * Exportar empleados a PDF
   * @param {Object} filters - Filtros aplicados
   * @returns {Promise} - Archivo PDF
   */
  exportToPDF: async (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    const url = queryString ? `/api/payroll/empleados/export/pdf/?${queryString}` : '/api/payroll/empleados/export/pdf/';
    const response = await api.get(url, { responseType: 'blob' });
    
    // Crear link de descarga
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url2 = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url2;
    link.download = `empleados_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url2);
    
    return response;
  },

  /**
   * Buscar empleados
   * @param {string} query - Término de búsqueda
   * @returns {Promise} - Empleados encontrados
   */
  searchEmpleados: async (query) => {
    return await api.get(`/api/payroll/empleados/?search=${encodeURIComponent(query)}`);
  },

  /**
   * Actualización parcial de empleado
   * @param {string} id - ID del empleado
   * @param {Object} empleadoData - Datos parciales
   * @returns {Promise} - Empleado actualizado
   */
  patchEmpleado: async (id, empleadoData) => {
    return await api.patch(`/api/payroll/empleados/${id}/`, empleadoData);
  },

  /**
   * Activar/Desactivar empleado (soft delete)
   * @param {string} id - ID del empleado
   * @returns {Promise} - Estado actualizado
   */
  toggleActivo: async (id) => {
    return await api.post(`/api/payroll/empleados/${id}/toggle_activo/`);
  },

  /**
   * Obtener estadísticas de empleados
   * @returns {Promise} - Estadísticas de empleados
   */
  getEstadisticas: async () => {
    return await api.get('/api/payroll/empleados/estadisticas/');
  },

  // ==================== FILTROS Y BÚSQUEDAS ====================

  /**
   * Buscar empleados por término
   * @param {string} search - Término de búsqueda
   * @returns {Promise} - Empleados filtrados
   */
  searchEmpleados: async (search) => {
    return await empleadosService.getEmpleados({ search });
  },

  /**
   * Filtrar empleados por estado activo
   * @param {boolean} activo - Estado activo
   * @returns {Promise} - Empleados filtrados
   */
  getEmpleadosByActivo: async (activo = true) => {
    return await empleadosService.getEmpleados({ activo });
  },

  /**
   * Filtrar empleados por cargo
   * @param {string} cargoId - ID del cargo
   * @returns {Promise} - Empleados filtrados
   */
  getEmpleadosByCargo: async (cargoId) => {
    return await empleadosService.getEmpleados({ cargo: cargoId });
  },

  /**
   * Filtrar empleados por departamento
   * @param {string} departamentoId - ID del departamento
   * @returns {Promise} - Empleados filtrados
   */
  getEmpleadosByDepartamento: async (departamentoId) => {
    return await empleadosService.getEmpleados({ departamento: departamentoId });
  },

  /**
   * Filtrar empleados por género
   * @param {string} genero - Género (M/F/O)
   * @returns {Promise} - Empleados filtrados
   */
  getEmpleadosByGenero: async (genero) => {
    return await empleadosService.getEmpleados({ genero });
  },

  // ==================== NÓMINAS ====================

  /**
   * Obtener nóminas
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise} - Lista de nóminas
   */
  getNominas: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/api/payroll/nominas/?${queryString}` : '/api/payroll/nominas/';
    return await api.get(url);
  },

  /**
   * Crear nueva nómina
   * @param {Object} nominaData - Datos de la nómina
   * @returns {Promise} - Nómina creada
   */
  createNomina: async (nominaData) => {
    return await api.post('/api/payroll/nominas/', nominaData);
  },

  /**
   * Actualizar nómina
   * @param {string} id - ID de la nómina
   * @param {Object} nominaData - Datos actualizados
   * @returns {Promise} - Nómina actualizada
   */
  updateNomina: async (id, nominaData) => {
    return await api.put(`/api/payroll/nominas/${id}/`, nominaData);
  },

  // ==================== UTILIDADES ====================

  /**
   * Formatear nombre completo de empleado
   * @param {Object} empleado - Objeto empleado
   * @returns {string} - Nombre completo formateado
   */
  formatNombreCompleto: (empleado) => {
    if (!empleado) return '';
    return `${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim();
  },

  /**
   * Obtener estado en español
   * @param {boolean} activo - Estado activo
   * @returns {string} - Estado en español
   */
  getEstadoTexto: (activo) => {
    return activo ? 'Activo' : 'Inactivo';
  },

  /**
   * Obtener género en español
   * @param {string} genero - Código de género
   * @returns {string} - Género en español
   */
  getGeneroTexto: (genero) => {
    const generos = { M: 'Masculino', F: 'Femenino', O: 'Otro' };
    return generos[genero] || 'No especificado';
  },

  /**
   * Validar documento único
   * @param {string} documento - Número de documento
   * @param {string} excludeId - ID a excluir de la validación
   * @returns {Promise} - Resultado de validación
   */
  validateDocumento: async (documento, excludeId = null) => {
    const params = { search: documento };
    const empleados = await empleadosService.getEmpleados(params);
    
    if (excludeId) {
      return !empleados.find(emp => emp.documento === documento && emp.id !== excludeId);
    }
    return !empleados.find(emp => emp.documento === documento);
  }
};

export default empleadosService;
