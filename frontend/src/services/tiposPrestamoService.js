import api from './api';

const tiposPrestamoService = {
  // Get all tipos de prestamo
  getAllTiposPrestamo: async () => {
    const response = await api.get('/api/prestamos/tipos-prestamo/?page_size=1000');
    return response.data.results || response.data;
  },

  // Get active tipos de prestamo only
  getActiveTiposPrestamo: async () => {
    const response = await api.get('/api/prestamos/tipos-prestamo/activos/');
    return response.data;
  },

  // Get a single tipo de prestamo
  getTipoPrestamo: async (id) => {
    const response = await api.get(`/api/prestamos/tipos-prestamo/${id}/`);
    return response.data;
  },

  // Create a new tipo de prestamo
  createTipoPrestamo: async (tipoData) => {
    const response = await api.post('/api/prestamos/tipos-prestamo/', tipoData);
    return response.data;
  },

  // Update a tipo de prestamo
  updateTipoPrestamo: async (id, tipoData) => {
    const response = await api.put(`/api/prestamos/tipos-prestamo/${id}/`, tipoData);
    return response.data;
  },

  // Partial update a tipo de prestamo
  patchTipoPrestamo: async (id, tipoData) => {
    const response = await api.patch(`/api/prestamos/tipos-prestamo/${id}/`, tipoData);
    return response.data;
  },

  // Delete a tipo de prestamo
  deleteTipoPrestamo: async (id) => {
    await api.delete(`/api/prestamos/tipos-prestamo/${id}/`);
  },

  // Toggle activo status
  toggleActivo: async (id, activo) => {
    const endpoint = activo ? 'activar' : 'desactivar';
    const response = await api.post(`/api/prestamos/tipos-prestamo/${id}/${endpoint}/`);
    return response.data;
  },

  // Get estadisticas for a tipo de prestamo
  getEstadisticas: async (id) => {
    const response = await api.get(`/api/prestamos/tipos-prestamo/${id}/estadisticas/`);
    return response.data;
  },
};

export default tiposPrestamoService;
