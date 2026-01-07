/**
 * Servicio de Nómina
 * Gestión de nóminas, detalles y desprendibles
 */

import api from './api';

const nominaService = {
  // ==================== NÓMINAS ====================
  
  getAllNominas: async (params = {}) => {
    try {
      const response = await api.get('/api/payroll/nominas/', { params });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo nóminas:', error);
      throw error;
    }
  },

  getNominaById: async (id) => {
    try {
      const response = await api.get(`/api/payroll/nominas/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error obteniendo nómina ${id}:`, error);
      throw error;
    }
  },

  createNomina: async (data) => {
    try {
      const response = await api.post('/api/payroll/nominas/', data);
      return response.data;
    } catch (error) {
      console.error('Error creando nómina:', error);
      throw error;
    }
  },

  updateNomina: async (id, data) => {
    try {
      const response = await api.put(`/api/payroll/nominas/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error actualizando nómina ${id}:`, error);
      throw error;
    }
  },

  deleteNomina: async (id) => {
    try {
      await api.delete(`/api/payroll/nominas/${id}/`);
    } catch (error) {
      console.error(`Error eliminando nómina ${id}:`, error);
      throw error;
    }
  },

  // ==================== DESPRENDIBLE ====================
  
  descargarDesprendible: async (nominaId) => {
    try {
      const response = await api.get(`/api/payroll/nominas/${nominaId}/desprendible/`, {
        responseType: 'blob'
      });
      
      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `desprendible_${nominaId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error descargando desprendible:', error);
      throw error;
    }
  },

  // ==================== EXPORTACIÓN ====================
  
  exportarExcel: async (params = {}) => {
    try {
      const response = await api.get('/api/payroll/nominas/export_excel/', {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'nominas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      throw error;
    }
  },

  // ==================== ESTADÍSTICAS ====================
  
  getEstadisticas: async () => {
    try {
      const response = await api.get('/api/payroll/nominas/estadisticas/');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  // ==================== BÚSQUEDA Y FILTROS ====================
  
  buscarNominas: async (query) => {
    try {
      const response = await api.get('/api/payroll/nominas/', {
        params: { search: query }
      });
      return response.data;
    } catch (error) {
      console.error('Error buscando nóminas:', error);
      throw error;
    }
  },

  filtrarPorEmpleado: async (empleadoId) => {
    try {
      const response = await api.get('/api/payroll/nominas/', {
        params: { empleado: empleadoId }
      });
      return response.data;
    } catch (error) {
      console.error('Error filtrando por empleado:', error);
      throw error;
    }
  },

  filtrarPorPeriodo: async (inicio, fin) => {
    try {
      const response = await api.get('/api/payroll/nominas/', {
        params: {
          periodo_inicio: inicio,
          periodo_fin: fin
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error filtrando por período:', error);
      throw error;
    }
  }
};

export default nominaService;
