/**
 * Servicio para gestión de Conceptos Laborales
 * Conecta con /api/nomina/conceptos-laborales/
 * Sistema CorteSec - Enero 2026
 */

import api from './api';

const conceptosLaboralesService = {
  // ==================== CRUD BÁSICO ====================
  
  /**
   * Obtener todos los conceptos laborales
   */
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/nomina/conceptos-laborales/', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener conceptos laborales:', error);
      throw error;
    }
  },

  /**
   * Obtener un concepto laboral por ID
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/api/nomina/conceptos-laborales/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener concepto laboral ${id}:`, error);
      throw error;
    }
  },

  /**
   * Crear nuevo concepto laboral
   */
  create: async (data) => {
    try {
      const response = await api.post('/api/nomina/conceptos-laborales/', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear concepto laboral:', error);
      throw error;
    }
  },

  /**
   * Actualizar concepto laboral completo
   */
  update: async (id, data) => {
    try {
      const response = await api.put(`/api/nomina/conceptos-laborales/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar concepto laboral ${id}:`, error);
      throw error;
    }
  },

  /**
   * Actualizar concepto laboral parcialmente
   */
  patch: async (id, data) => {
    try {
      const response = await api.patch(`/api/nomina/conceptos-laborales/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar parcialmente concepto laboral ${id}:`, error);
      throw error;
    }
  },

  /**
   * Eliminar concepto laboral
   */
  delete: async (id) => {
    try {
      await api.delete(`/api/nomina/conceptos-laborales/${id}/`);
    } catch (error) {
      console.error(`Error al eliminar concepto laboral ${id}:`, error);
      throw error;
    }
  },

  // ==================== FILTROS ESPECIALIZADOS ====================

  /**
   * Obtener solo conceptos de tipo DEVENGADO
   */
  getDevengados: async (params = {}) => {
    try {
      const response = await api.get('/api/nomina/conceptos-laborales/devengados/', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener devengados:', error);
      throw error;
    }
  },

  /**
   * Obtener solo conceptos de tipo DEDUCCIÓN
   */
  getDeducciones: async (params = {}) => {
    try {
      const response = await api.get('/api/nomina/conceptos-laborales/deducciones/', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener deducciones:', error);
      throw error;
    }
  },

  /**
   * Obtener conceptos activos
   */
  getActivos: async () => {
    try {
      const response = await api.get('/api/nomina/conceptos-laborales/', {
        params: { activo: true }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener conceptos activos:', error);
      throw error;
    }
  },

  // ==================== ACCIONES ====================

  /**
   * Activar o desactivar un concepto laboral
   */
  toggleActivo: async (id) => {
    try {
      const response = await api.post(`/api/nomina/conceptos-laborales/${id}/toggle_activo/`);
      return response.data;
    } catch (error) {
      console.error(`Error al cambiar estado de concepto ${id}:`, error);
      throw error;
    }
  },

  // ==================== BÚSQUEDAS ====================

  /**
   * Buscar conceptos por código o nombre
   */
  search: async (searchTerm) => {
    try {
      const response = await api.get('/api/nomina/conceptos-laborales/', {
        params: { search: searchTerm }
      });
      return response.data;
    } catch (error) {
      console.error('Error al buscar conceptos:', error);
      throw error;
    }
  },

  /**
   * Filtrar por tipo de concepto
   */
  getByTipo: async (tipo) => {
    try {
      const response = await api.get('/api/nomina/conceptos-laborales/', {
        params: { tipo: tipo }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener conceptos tipo ${tipo}:`, error);
      throw error;
    }
  },

  // ==================== UTILIDADES ====================

  /**
   * Obtener conceptos para selector (devengados activos)
   */
  getDevengadosParaSelector: async () => {
    try {
      const response = await api.get('/api/nomina/conceptos-laborales/devengados/');
      const data = response.data.results || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error al obtener devengados para selector:', error);
      return [];
    }
  },

  /**
   * Obtener conceptos para selector (deducciones activas)
   */
  getDeduccionesParaSelector: async () => {
    try {
      const response = await api.get('/api/nomina/conceptos-laborales/deducciones/');
      const data = response.data.results || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error al obtener deducciones para selector:', error);
      return [];
    }
  },

  /**
   * Obtener todos los conceptos activos agrupados por tipo
   */
  getActivosAgrupados: async () => {
    try {
      const response = await api.get('/api/nomina/conceptos-laborales/', {
        params: { activo: true }
      });
      const conceptos = response.data.results || response.data || [];
      
      return {
        devengados: conceptos.filter(c => c.tipo === 'DEVENGADO'),
        deducciones: conceptos.filter(c => c.tipo === 'DEDUCCION')
      };
    } catch (error) {
      console.error('Error al obtener conceptos agrupados:', error);
      return { devengados: [], deducciones: [] };
    }
  }
};

export default conceptosLaboralesService;
