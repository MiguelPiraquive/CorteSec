/**
 * Servicio de Nómina - ACTUALIZADO
 * Conecta con el backend /api/nomina/
 * 
 * Sistema CorteSec - Enero 2026
 */

import api from './api';

const nominaService = {
  // ==================== NÓMINAS ====================
  
  /**
   * Obtener todas las nóminas
   */
  getAllNominas: async (params = {}) => {
    try {
      const response = await api.get('/api/nomina/nominas/', { params });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo nóminas:', error);
      throw error;
    }
  },

  /**
   * Obtener una nómina por ID (con todos los detalles)
   */
  getNominaById: async (id) => {
    try {
      const response = await api.get(`/api/nomina/nominas/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error obteniendo nómina ${id}:`, error);
      throw error;
    }
  },

  /**
   * Crear nueva nómina
   * @param {Object} data - { contrato, periodo_inicio, periodo_fin, fecha_pago, observaciones, items }
   */
  createNomina: async (data) => {
    try {
      const response = await api.post('/api/nomina/nominas/', data);
      return response.data;
    } catch (error) {
      console.error('Error creando nómina:', error);
      throw error;
    }
  },

  /**
   * Actualizar nómina existente
   */
  updateNomina: async (id, data) => {
    try {
      const response = await api.put(`/api/nomina/nominas/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error actualizando nómina ${id}:`, error);
      throw error;
    }
  },

  /**
   * Eliminar nómina
   */
  deleteNomina: async (id) => {
    try {
      await api.delete(`/api/nomina/nominas/${id}/`);
    } catch (error) {
      console.error(`Error eliminando nómina ${id}:`, error);
      throw error;
    }
  },

  // ==================== ACCIONES DE NÓMINA ====================

  /**
   * Calcular nómina (IBC, aportes, deducciones, totales)
   */
  calcularNomina: async (id) => {
    try {
      const response = await api.post(`/api/nomina/nominas/${id}/calcular/`);
      return response.data;
    } catch (error) {
      console.error(`Error calculando nómina ${id}:`, error);
      throw error;
    }
  },

  /**
   * Aprobar nómina
   */
  aprobarNomina: async (id) => {
    try {
      const response = await api.post(`/api/nomina/nominas/${id}/aprobar/`);
      return response.data;
    } catch (error) {
      console.error(`Error aprobando nómina ${id}:`, error);
      throw error;
    }
  },

  /**
   * Marcar nómina como pagada
   */
  pagarNomina: async (id) => {
    try {
      const response = await api.post(`/api/nomina/nominas/${id}/pagar/`);
      return response.data;
    } catch (error) {
      console.error(`Error marcando nómina como pagada ${id}:`, error);
      throw error;
    }
  },

  /**
   * Anular nómina
   */
  anularNomina: async (id) => {
    try {
      const response = await api.post(`/api/nomina/nominas/${id}/anular/`);
      return response.data;
    } catch (error) {
      console.error(`Error anulando nómina ${id}:`, error);
      throw error;
    }
  },

  // ==================== DESPRENDIBLE ====================
  
  /**
   * Descargar desprendible de pago en PDF
   */
  descargarDesprendible: async (nominaId) => {
    try {
      const response = await api.get(`/api/nomina/nominas/${nominaId}/desprendible/`, {
        responseType: 'blob'
      });
      
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
  
  /**
   * Exportar nóminas a Excel
   */
  exportarExcel: async (params = {}) => {
    try {
      const response = await api.get('/api/nomina/nominas/export_excel/', {
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
  
  /**
   * Obtener estadísticas de nóminas
   */
  getEstadisticas: async () => {
    try {
      const response = await api.get('/api/nomina/nominas/estadisticas/');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  },

  // ==================== BÚSQUEDA Y FILTROS ====================
  
  /**
   * Buscar nóminas por término
   */
  buscarNominas: async (query) => {
    try {
      const response = await api.get('/api/nomina/nominas/', {
        params: { search: query }
      });
      return response.data;
    } catch (error) {
      console.error('Error buscando nóminas:', error);
      throw error;
    }
  },

  /**
   * Filtrar nóminas por contrato
   */
  filtrarPorContrato: async (contratoId) => {
    try {
      const response = await api.get('/api/nomina/nominas/', {
        params: { contrato: contratoId }
      });
      return response.data;
    } catch (error) {
      console.error('Error filtrando por contrato:', error);
      throw error;
    }
  },

  /**
   * Filtrar nóminas por período
   */
  filtrarPorPeriodo: async (inicio, fin) => {
    try {
      const response = await api.get('/api/nomina/nominas/', {
        params: { periodo_inicio: inicio, periodo_fin: fin }
      });
      return response.data;
    } catch (error) {
      console.error('Error filtrando por período:', error);
      throw error;
    }
  },

  // ==================== ITEMS DE NÓMINA ====================

  /**
   * Agregar item a una nómina
   */
  agregarItem: async (nominaId, itemData) => {
    try {
      const response = await api.post('/api/nomina/nomina-items/', {
        nomina: nominaId,
        ...itemData
      });
      return response.data;
    } catch (error) {
      console.error('Error agregando item:', error);
      throw error;
    }
  },

  /**
   * Eliminar item de nómina
   */
  eliminarItem: async (itemId) => {
    try {
      await api.delete(`/api/nomina/nomina-items/${itemId}/`);
    } catch (error) {
      console.error('Error eliminando item:', error);
      throw error;
    }
  },
};

export default nominaService;
