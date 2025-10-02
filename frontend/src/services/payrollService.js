// payrollService.js
import api from './api';

export const payrollService = {
  // ==================== EMPLEADOS ====================
  
  // Obtener todos los empleados
  getEmpleados: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/api/payroll/empleados/${queryParams ? `?${queryParams}` : ''}`;
    return await api.get(url);
  },

  // Obtener empleado por ID
  getEmpleado: async (id) => {
    return await api.get(`/api/payroll/empleados/${id}/`);
  },

  // Crear empleado
  createEmpleado: async (empleadoData) => {
    return await api.post('/api/payroll/empleados/', empleadoData);
  },

  // Actualizar empleado
  updateEmpleado: async (id, empleadoData) => {
    return await api.put(`/api/payroll/empleados/${id}/`, empleadoData);
  },

  // Actualizar empleado parcialmente
  patchEmpleado: async (id, empleadoData) => {
    return await api.patch(`/api/payroll/empleados/${id}/`, empleadoData);
  },

  // Activar/Desactivar empleado (soft delete)
  toggleEmpleadoActivo: async (id) => {
    return await api.post(`/api/payroll/empleados/${id}/toggle_activo/`);
  },

  // Eliminar empleado (hard delete - usar con cuidado)
  deleteEmpleado: async (id) => {
    return await api.delete(`/api/payroll/empleados/${id}/`);
  },

  // Obtener estadísticas de empleados
  getEstadisticas: async () => {
    return await api.get('/api/payroll/empleados/estadisticas/');
  },

  // ==================== NÓMINAS ====================
  
  // Obtener todas las nóminas
  getNominas: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/api/payroll/nominas/${queryParams ? `?${queryParams}` : ''}`;
    return await api.get(url);
  },

  // Obtener nómina por ID
  getNomina: async (id) => {
    return await api.get(`/api/payroll/nominas/${id}/`);
  },

  // Crear nómina
  createNomina: async (nominaData) => {
    return await api.post('/api/payroll/nominas/', nominaData);
  },

  // Actualizar nómina
  updateNomina: async (id, nominaData) => {
    return await api.put(`/api/payroll/nominas/${id}/`, nominaData);
  },

  // Eliminar nómina
  deleteNomina: async (id) => {
    return await api.delete(`/api/payroll/nominas/${id}/`);
  },

  // ==================== BÚSQUEDAS Y FILTROS ====================
  
  // Buscar empleados por texto
  searchEmpleados: async (searchTerm, filters = {}) => {
    const params = { search: searchTerm, ...filters };
    return await payrollService.getEmpleados(params);
  },

  // Filtrar empleados por cargo
  getEmpleadosByCargo: async (cargoId) => {
    return await payrollService.getEmpleados({ cargo: cargoId });
  },

  // Filtrar empleados por departamento
  getEmpleadosByDepartamento: async (departamentoId) => {
    return await payrollService.getEmpleados({ departamento: departamentoId });
  },

  // Obtener solo empleados activos
  getEmpleadosActivos: async () => {
    return await payrollService.getEmpleados({ activo: true });
  },

  // Obtener empleados incluyendo inactivos
  getAllEmpleados: async () => {
    return await payrollService.getEmpleados({ incluir_inactivos: 'true' });
  },
};

export default payrollService;
