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
  getAllContratos: async (params = {}) => {
    try {
      const response = await api.get('/api/nomina/contratos/', { params: { page_size: 99999, ...params } });
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error al obtener todos los contratos:', error);
      throw error;
    }
  },

  /**
   * Obtener contratos activos
   */
  getActivos: async (params = {}) => {
    try {
      const response = await api.get('/api/nomina/contratos/activos/', { params });
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

export default contratosService;
