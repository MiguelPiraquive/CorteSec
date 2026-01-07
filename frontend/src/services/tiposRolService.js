/**
 * Servicio API para gestión de Tipos de Rol
 */

import api from './api';

const tiposRolService = {
  /**
   * Obtener todos los tipos de rol
   */
  getAllTiposRol: async (params = {}) => {
    const response = await api.get('/api/roles/tipos-rol/', { params });
    return response.data;
  },

  /**
   * Obtener tipos de rol activos
   */
  getActiveTiposRol: async () => {
    const response = await api.get('/api/roles/tipos-rol/activos/');
    return response.data;
  },

  /**
   * Crear tipo de rol
   */
  createTipoRol: async (data) => {
    try {
      console.log('=== CREANDO TIPO DE ROL ===');
      console.log('URL:', '/api/roles/tipos-rol/');
      console.log('Datos a enviar:', JSON.stringify(data, null, 2));
      console.log('Token:', localStorage.getItem('authToken') ? 'Presente' : 'NO PRESENTE');
      console.log('Tenant Code:', localStorage.getItem('tenantCode'));
      
      const response = await api.post('/api/roles/tipos-rol/', data);
      
      console.log('✅ Respuesta exitosa:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ ERROR al crear tipo de rol:');
      console.error('Error completo:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      throw error;
    }
  },

  /**
   * Actualizar tipo de rol
   */
  updateTipoRol: async (id, data) => {
    console.log('Actualizando tipo de rol:', id, data);
    const response = await api.put(`/api/roles/tipos-rol/${id}/`, data);
    console.log('Respuesta del backend:', response.data);
    return response.data;
  },

  /**
   * Eliminar tipo de rol
   */
  deleteTipoRol: async (id) => {
    const response = await api.delete(`/api/roles/tipos-rol/${id}/`);
    return response.data;
  },
};

export default tiposRolService;
