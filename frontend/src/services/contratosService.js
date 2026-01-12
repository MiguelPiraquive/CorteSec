/**
 * Servicio de Contratos
 * Conecta con /api/nomina/contratos/
 * Sistema CorteSec - Enero 2026
 */

import api from './api';

const contratosService = {
  // ==================== CRUD BÁSICO ====================
  
  /**
   * Obtener todos los contratos
   */
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/nomina/contratos/', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener contratos:', error);
      throw error;
    }
  },

  /**
   * Obtener todos los contratos (sin paginación)
   */
  getAllContratos: async () => {
    try {
      const response = await api.get('/api/nomina/contratos/?page_size=1000');
      const data = response.data;
      
      if (Array.isArray(data)) {
        return data;
      } else if (data.results) {
        return data.results;
      }
      return [];
    } catch (error) {
      console.error('Error al obtener todos los contratos:', error);
      throw error;
    }
  },

  /**
   * Obtener contratos activos
   */
  getActivos: async () => {
    try {
      const response = await api.get('/api/nomina/contratos/activos/');
      return response.data;
    } catch (error) {
      console.error('Error al obtener contratos activos:', error);
      throw error;
    }
  },

  /**
   * Obtener un contrato por ID
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/api/nomina/contratos/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener contrato ${id}:`, error);
      throw error;
    }
  },

  /**
   * Obtener contratos de un empleado
   */
  getPorEmpleado: async (empleadoId) => {
    try {
      const response = await api.get('/api/nomina/contratos/por_empleado/', {
        params: { empleado_id: empleadoId }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener contratos del empleado ${empleadoId}:`, error);
      throw error;
    }
  },

  /**
   * Crear nuevo contrato
   */
  create: async (data) => {
    try {
      const response = await api.post('/api/nomina/contratos/', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear contrato:', error);
      throw error;
    }
  },

  /**
   * Actualizar contrato
   */
  update: async (id, data) => {
    try {
      const response = await api.put(`/api/nomina/contratos/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar contrato ${id}:`, error);
      throw error;
    }
  },

  /**
   * Eliminar contrato
   */
  delete: async (id) => {
    try {
      await api.delete(`/api/nomina/contratos/${id}/`);
    } catch (error) {
      console.error(`Error al eliminar contrato ${id}:`, error);
      throw error;
    }
  },
};

// ==================== TIPOS DE CONTRATO ====================

export const tiposContratoService = {
  /**
   * Obtener todos los tipos de contrato
   */
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/nomina/tipos-contrato/', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener tipos de contrato:', error);
      throw error;
    }
  },

  /**
   * Obtener un tipo de contrato por ID
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/api/nomina/tipos-contrato/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener tipo de contrato ${id}:`, error);
      throw error;
    }
  },

  /**
   * Crear tipo de contrato
   */
  create: async (data) => {
    try {
      const response = await api.post('/api/nomina/tipos-contrato/', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear tipo de contrato:', error);
      throw error;
    }
  },

  /**
   * Actualizar tipo de contrato
   */
  update: async (id, data) => {
    try {
      const response = await api.put(`/api/nomina/tipos-contrato/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar tipo de contrato ${id}:`, error);
      throw error;
    }
  },

  /**
   * Eliminar tipo de contrato
   */
  delete: async (id) => {
    try {
      await api.delete(`/api/nomina/tipos-contrato/${id}/`);
    } catch (error) {
      console.error(`Error al eliminar tipo de contrato ${id}:`, error);
      throw error;
    }
  },
};

// ==================== PARÁMETROS LEGALES ====================

export const parametrosLegalesService = {
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
   * Obtener un parámetro por ID
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/api/nomina/parametros-legales/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener parámetro ${id}:`, error);
      throw error;
    }
  },

  /**
   * Crear parámetro legal
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
      console.error(`Error al actualizar parámetro ${id}:`, error);
      throw error;
    }
  },
};

export default contratosService;
