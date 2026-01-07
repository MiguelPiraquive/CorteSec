/**
 * Servicio API para gestión de Roles
 * Maneja todas las operaciones CRUD y endpoints especiales de roles
 */

import api from './api';

const rolesService = {
  // ============================================================================
  // CRUD BÁSICO DE ROLES
  // ============================================================================

  /**
   * Obtener todos los roles
   */
  getAllRoles: async (params = {}) => {
    const response = await api.get('/api/roles/roles/', { params });
    return response.data;
  },

  /**
   * Obtener un rol por ID
   */
  getRolById: async (id) => {
    const response = await api.get(`/api/roles/roles/${id}/`);
    return response.data;
  },

  /**
   * Crear un nuevo rol
   */
  createRol: async (data) => {
    const response = await api.post('/api/roles/roles/', data);
    return response.data;
  },

  /**
   * Actualizar un rol
   */
  updateRol: async (id, data) => {
    const response = await api.put(`/api/roles/roles/${id}/`, data);
    return response.data;
  },

  /**
   * Eliminar un rol
   */
  deleteRol: async (id) => {
    const response = await api.delete(`/api/roles/roles/${id}/`);
    return response.data;
  },

  // ============================================================================
  // ESTADÍSTICAS
  // ============================================================================

  /**
   * Obtener estadísticas de roles
   */
  getEstadisticas: async () => {
    const response = await api.get('/api/roles/roles/estadisticas/');
    return response.data;
  },

  // ============================================================================
  // JERARQUÍA
  // ============================================================================

  /**
   * Obtener árbol jerárquico completo
   */
  getJerarquia: async () => {
    const response = await api.get('/api/roles/roles/jerarquia/');
    return response.data;
  },

  /**
   * Obtener jerarquía completa de un rol (path desde raíz)
   */
  getJerarquiaCompleta: async (id) => {
    const response = await api.get(`/api/roles/roles/${id}/jerarquia_completa/`);
    return response.data;
  },

  /**
   * Obtener roles descendientes (hijos)
   */
  getDescendientes: async (id) => {
    const response = await api.get(`/api/roles/roles/${id}/descendientes/`);
    return response.data;
  },

  // ============================================================================
  // ACTIVACIÓN/DESACTIVACIÓN
  // ============================================================================

  /**
   * Activar un rol
   */
  activarRol: async (id) => {
    const response = await api.post(`/api/roles/roles/${id}/activar/`);
    return response.data;
  },

  /**
   * Desactivar un rol
   */
  desactivarRol: async (id) => {
    const response = await api.post(`/api/roles/roles/${id}/desactivar/`);
    return response.data;
  },

  // ============================================================================
  // DUPLICACIÓN
  // ============================================================================

  /**
   * Duplicar un rol
   */
  duplicarRol: async (id, data) => {
    const response = await api.post(`/api/roles/roles/${id}/duplicar/`, data);
    return response.data;
  },

  // ============================================================================
  // ASIGNACIONES
  // ============================================================================

  /**
   * Obtener asignaciones de un rol
   */
  getAsignacionesRol: async (id, params = {}) => {
    const response = await api.get(`/api/roles/roles/${id}/asignaciones/`, { params });
    return response.data;
  },

  /**
   * Asignar rol a usuario
   */
  asignarRolUsuario: async (id, data) => {
    const response = await api.post(`/api/roles/roles/${id}/asignar_usuario/`, data);
    return response.data;
  },
};

export default rolesService;
