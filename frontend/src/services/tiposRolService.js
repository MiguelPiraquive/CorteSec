/**
 * Servicio API para gestión de Tipos de Rol
 */

import api from './api';

const tiposRolService = {
  /**
   * Obtener todos los tipos de rol
   */
  getAllTiposRol: async (params = {}) => {
    const response = await api.get('/api/roles/tipos/', { params });
    return response.data;
  },

  /**
   * Obtener tipos de rol activos
   */
  getActiveTiposRol: async (params = {}) => {
    const response = await api.get('/api/roles/tipos/', {
      params: { activo: true, ...params },
    });
    return response.data;
  },

  /**
   * Crear tipo de rol
   */
  createTipoRol: async (data) => {
    const response = await api.post('/api/roles/tipos/', data);
    return response.data;
  },

  /**
   * Actualizar tipo de rol
   */
  updateTipoRol: async (id, data) => {
    const response = await api.put(`/api/roles/tipos/${id}/`, data);
    return response.data;
  },

  patchTipoRol: async (id, data) => {
    const response = await api.patch(`/api/roles/tipos/${id}/`, data);
    return response.data;
  },

  /**
   * Eliminar tipo de rol
   */
  deleteTipoRol: async (id) => {
    const response = await api.delete(`/api/roles/tipos/${id}/`);
    return response.data;
  },
};

export default tiposRolService;
