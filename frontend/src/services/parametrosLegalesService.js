/**
 * Servicio de Parámetros Legales
 * Conecta con /api/nomina/parametros-legales/
 * Sistema CorteSec - Enero 2026
 */

import api from './api';

const parametrosLegalesService = {
  // ==================== CRUD BÁSICO ====================
  
  /**
   * Obtener todos los parámetros legales
   */
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/nomina/parametros-legales/', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener parámetros legales:', error);
      throw error;
    }
  },

  /**
   * Obtener todos los parámetros legales (sin paginación)
   */
  getAllParametros: async () => {
    try {
      const response = await api.get('/api/nomina/parametros-legales/', { params: { page_size: 99999 } });
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error al obtener todos los parámetros legales:', error);
      throw error;
    }
  },

  /**
   * Obtener parámetros vigentes
   */
  getVigentes: async () => {
    try {
      const response = await api.get('/api/nomina/parametros-legales/vigentes/');
      return response.data;
    } catch (error) {
      console.error('Error al obtener parámetros vigentes:', error);
      throw error;
    }
  },

  /**
   * Obtener un parámetro legal por ID
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/api/nomina/parametros-legales/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener parámetro legal ${id}:`, error);
      throw error;
    }
  },

  /**
   * Crear nuevo parámetro legal
   */
  create: async (data) => {
    try {
      const response = await api.post('/api/nomina/parametros-legales/', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear parámetro legal:', error);
      throw error;
    }
  },

  /**
   * Actualizar parámetro legal
   */
  update: async (id, data) => {
    try {
      const response = await api.put(`/api/nomina/parametros-legales/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar parámetro legal ${id}:`, error);
      throw error;
    }
  },

  /**
   * Actualizar parcialmente parámetro legal
   */
  partialUpdate: async (id, data) => {
    try {
      const response = await api.patch(`/api/nomina/parametros-legales/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar parcialmente parámetro legal ${id}:`, error);
      throw error;
    }
  },

  /**
   * Eliminar parámetro legal
   */
  delete: async (id) => {
    try {
      const response = await api.delete(`/api/nomina/parametros-legales/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error al eliminar parámetro legal ${id}:`, error);
      throw error;
    }
  },

  // ==================== MÉTODOS DE BÚSQUEDA Y FILTRADO ====================

  /**
   * Buscar parámetros legales
   */
  search: async (query, params = {}) => {
    try {
      const response = await api.get('/api/nomina/parametros-legales/', {
        params: {
          search: query,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al buscar parámetros legales:', error);
      throw error;
    }
  },

  /**
   * Filtrar por criterios específicos
   */
  filter: async (filters) => {
    try {
      const response = await api.get('/api/nomina/parametros-legales/', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error al filtrar parámetros legales:', error);
      throw error;
    }
  },

  // ==================== CONCEPTOS PREDEFINIDOS ====================
  
  /**
   * Lista de conceptos disponibles
   */
  conceptos: [
    // Seguridad Social
    { value: 'SALUD', label: 'Salud' },
    { value: 'PENSION', label: 'Pensión' },
    // ARL por niveles
    { value: 'ARL_NIVEL_I', label: 'ARL Nivel I' },
    { value: 'ARL_NIVEL_II', label: 'ARL Nivel II' },
    { value: 'ARL_NIVEL_III', label: 'ARL Nivel III' },
    { value: 'ARL_NIVEL_IV', label: 'ARL Nivel IV' },
    { value: 'ARL_NIVEL_V', label: 'ARL Nivel V' },
    // Parafiscales
    { value: 'CAJA_COMPENSACION', label: 'Caja de Compensación' },
    { value: 'SENA', label: 'SENA' },
    { value: 'ICBF', label: 'ICBF' },
    // Prestaciones sociales
    { value: 'CESANTIAS', label: 'Cesantías' },
    { value: 'INTERESES_CESANTIAS', label: 'Intereses Cesantías' },
    { value: 'PRIMA_SERVICIOS', label: 'Prima de Servicios' },
    { value: 'VACACIONES', label: 'Vacaciones' },
    // Valores de referencia
    { value: 'SMMLV', label: 'Salario Mínimo Mensual Legal Vigente' },
    { value: 'AUXILIO_TRANSPORTE', label: 'Auxilio de Transporte' },
    { value: 'TOPE_AUXILIO_TRANSPORTE', label: 'Tope Auxilio Transporte' },
    { value: 'IBC_SERVICIOS', label: 'IBC Servicios' },
    // Retención en la fuente
    { value: 'UVT', label: 'Unidad de Valor Tributario (UVT)' },
    // Fondo de Solidaridad Pensional
    { value: 'TOPE_FSP', label: 'Tope Fondo Solidaridad Pensional' },
    { value: 'TOPE_SUBSISTENCIA', label: 'Tope Aporte Subsistencia' },
    { value: 'FSP', label: 'Fondo de Solidaridad Pensional' },
    { value: 'SUBSISTENCIA', label: 'Aporte Subsistencia' },
  ],
};

export default parametrosLegalesService;
