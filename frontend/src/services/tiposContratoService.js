/**
 * Servicio de Tipos de Contrato
 * Conecta con /api/nomina/tipos-contrato/
 * Sistema CorteSec - Enero 2026
 */

import api from './api';

const tiposContratoService = {
  // ==================== CRUD BÁSICO ====================
  
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
   * Obtener todos los tipos de contrato (sin paginación)
   */
  getAllTiposContrato: async () => {
    try {
      const response = await api.get('/api/nomina/tipos-contrato/?page_size=1000');
      const data = response.data;
      
      if (Array.isArray(data)) {
        return data;
      } else if (data.results) {
        return data.results;
      }
      return [];
    } catch (error) {
      console.error('Error al obtener todos los tipos de contrato:', error);
      throw error;
    }
  },

  /**
   * Obtener tipos de contrato activos
   */
  getActivos: async () => {
    try {
      const response = await api.get('/api/nomina/tipos-contrato/?activo=true&page_size=1000');
      const data = response.data;
      
      if (Array.isArray(data)) {
        return data;
      } else if (data.results) {
        return data.results;
      }
      return [];
    } catch (error) {
      console.error('Error al obtener tipos de contrato activos:', error);
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
   * Crear nuevo tipo de contrato
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
   * Actualizar parcialmente tipo de contrato
   */
  partialUpdate: async (id, data) => {
    try {
      const response = await api.patch(`/api/nomina/tipos-contrato/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar parcialmente tipo de contrato ${id}:`, error);
      throw error;
    }
  },

  /**
   * Eliminar tipo de contrato
   */
  delete: async (id) => {
    try {
      const response = await api.delete(`/api/nomina/tipos-contrato/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error al eliminar tipo de contrato ${id}:`, error);
      throw error;
    }
  },

  // ==================== MÉTODOS DE BÚSQUEDA Y FILTRADO ====================

  /**
   * Buscar tipos de contrato
   */
  search: async (query, params = {}) => {
    try {
      const response = await api.get('/api/nomina/tipos-contrato/', {
        params: {
          search: query,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al buscar tipos de contrato:', error);
      throw error;
    }
  },

  /**
   * Filtrar por criterios específicos
   */
  filter: async (filters) => {
    try {
      const response = await api.get('/api/nomina/tipos-contrato/', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error al filtrar tipos de contrato:', error);
      throw error;
    }
  },
};

export default tiposContratoService;
