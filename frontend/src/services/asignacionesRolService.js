/**
 * Servicio API para gestión de Asignaciones de Roles
 */

import api from './api';

const asignacionesRolService = {
  /**
   * Obtener todas las asignaciones
   */
  getAllAsignaciones: async (params = {}) => {
    const response = await api.get('/api/roles/asignaciones/', { params });
    return response.data;
  },

  /**
   * Obtener usuarios disponibles para asignar roles
   */
  getUsuariosDisponibles: async () => {
    const response = await api.get('/api/roles/asignaciones/usuarios_disponibles/');
    return response.data;
  },

  /**
   * Obtener asignación por ID
   */
  getAsignacionById: async (id) => {
    const response = await api.get(`/api/roles/asignaciones/${id}/`);
    return response.data;
  },

  /**
   * Crear asignación
   */
  createAsignacion: async (data) => {
    const response = await api.post('/api/roles/asignaciones/', data);
    return response.data;
  },

  /**
   * Actualizar asignación
   */
  updateAsignacion: async (id, data) => {
    const response = await api.put(`/api/roles/asignaciones/${id}/`, data);
    return response.data;
  },

  /**
   * Eliminar asignación
   */
  deleteAsignacion: async (id) => {
    const response = await api.delete(`/api/roles/asignaciones/${id}/`);
    return response.data;
  },

  /**
   * Aprobar asignación
   */
  aprobarAsignacion: async (id) => {
    const response = await api.post(`/api/roles/asignaciones/${id}/aprobar/`);
    return response.data;
  },

  /**
   * Rechazar asignación
   */
  rechazarAsignacion: async (id, data = {}) => {
    const response = await api.post(`/api/roles/asignaciones/${id}/rechazar/`, data);
    return response.data;
  },

  /**
   * Revocar asignación
   */
  revocarAsignacion: async (id, data = {}) => {
    const response = await api.post(`/api/roles/asignaciones/${id}/revocar/`, data);
    return response.data;
  },

  /**
   * Renovar asignación
   */
  renovarAsignacion: async (id, data) => {
    const response = await api.post(`/api/roles/asignaciones/${id}/renovar/`, data);
    return response.data;
  },
};

export default asignacionesRolService;
