import api from './api';

const prestamosService = {
  // Get prestamos with params (paginated)
  getPrestamos: async (params = {}) => {
    const response = await api.get('/api/prestamos/prestamos/', { params });
    return response.data;
  },

  // Get all prestamos
  getAllPrestamos: async (params = {}) => {
    const response = await api.get('/api/prestamos/prestamos/', { params: { page_size: 99999, ...params } });
    return response.data.results || response.data;
  },

  // Get a single prestamo
  getPrestamo: async (id) => {
    const response = await api.get(`/api/prestamos/prestamos/${id}/`);
    return response.data;
  },

  // Create a new prestamo
  createPrestamo: async (prestamoData) => {
    const response = await api.post('/api/prestamos/prestamos/', prestamoData);
    return response.data;
  },

  // Update a prestamo
  updatePrestamo: async (id, prestamoData) => {
    const response = await api.put(`/api/prestamos/prestamos/${id}/`, prestamoData);
    return response.data;
  },

  // Partial update a prestamo
  patchPrestamo: async (id, prestamoData) => {
    const response = await api.patch(`/api/prestamos/prestamos/${id}/`, prestamoData);
    return response.data;
  },

  // Delete a prestamo
  deletePrestamo: async (id) => {
    await api.delete(`/api/prestamos/prestamos/${id}/`);
  },

  // Aprobar prestamo
  aprobarPrestamo: async (id, data) => {
    const response = await api.post(`/api/prestamos/prestamos/${id}/aprobar/`, data);
    return response.data;
  },

  // Rechazar prestamo
  rechazarPrestamo: async (id, data) => {
    const response = await api.post(`/api/prestamos/prestamos/${id}/rechazar/`, data);
    return response.data;
  },

  // Desembolsar prestamo
  desembolsarPrestamo: async (id, data) => {
    const response = await api.post(`/api/prestamos/prestamos/${id}/desembolsar/`, data);
    return response.data;
  },

  // Get dashboard stats
  getDashboard: async (params = {}) => {
    const response = await api.get('/api/prestamos/prestamos/dashboard/', { params });
    return response.data;
  },

  // Calculadora
  calculadora: async (data) => {
    const response = await api.post('/api/prestamos/prestamos/calculadora/', data);
    return response.data;
  },
};

export default prestamosService;
