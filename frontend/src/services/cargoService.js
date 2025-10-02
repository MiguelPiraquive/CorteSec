import { apiRequest } from './api';

const CARGOS_ENDPOINTS = {
  list: '/api/cargos/',
  detail: (id) => `/api/cargos/${id}/`,
  create: '/api/cargos/',
  update: (id) => `/api/cargos/${id}/`,
  delete: (id) => `/api/cargos/${id}/`,
  jerarquia: '/api/cargos/jerarquia/',
  estadisticas: '/api/cargos/estadisticas/',
  buscar: '/api/cargos/buscar/',
  toggleActivo: (id) => `/api/cargos/${id}/toggle_activo/`,
  bulkAction: '/api/cargos/bulk_action/',
  subordinados: (id) => `/api/cargos/${id}/subordinados/`,
  historialCargo: (id) => `/api/cargos/${id}/historial/`,
  historial: '/api/historial/',
  historialDetail: (id) => `/api/historial/${id}/`,
  historialEstadisticas: '/api/historial/estadisticas/',
};

class CargoService {
  // ==================== CARGOS ====================

  async getCargos(params = {}) {
    try {
      console.log('🔄 CargoService: Iniciando getCargos...'); // Debug
      
      const queryParams = new URLSearchParams();
      
      // Filtros básicos
      if (params.search) queryParams.append('search', params.search);
      if (params.activo !== undefined && params.activo !== 'todos') {
        queryParams.append('activo', params.activo);
      }
      if (params.nivel_jerarquico) queryParams.append('nivel_jerarquico', params.nivel_jerarquico);
      if (params.cargo_superior) queryParams.append('cargo_superior', params.cargo_superior);
      if (params.requiere_aprobacion !== undefined) {
        queryParams.append('requiere_aprobacion', params.requiere_aprobacion);
      }
      
      // Filtros de fecha
      if (params.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
      if (params.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);
      
      // Paginación
      if (params.page) queryParams.append('page', params.page);
      if (params.page_size) queryParams.append('page_size', params.page_size);
      
      // Ordenamiento
      if (params.ordering) queryParams.append('ordering', params.ordering);

      const endpoint = queryParams.toString() 
        ? `${CARGOS_ENDPOINTS.list}?${queryParams.toString()}`
        : CARGOS_ENDPOINTS.list;

      console.log('📡 CargoService: Llamando a:', endpoint); // Debug
      
      const response = await apiRequest(endpoint);
      console.log('📊 CargoService: Respuesta recibida:', response); // Debug
      
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(response)) {
        return response;
      } else if (response?.results && Array.isArray(response.results)) {
        return response.results;
      } else if (response?.data && Array.isArray(response.data)) {
        return response.data;
      } else {
        console.warn('⚠️ CargoService: Formato de respuesta inesperado:', response);
        return [];
      }
      
    } catch (error) {
      console.error('❌ CargoService: Error fetching cargos:', error);
      throw error;
    }
  }

  async getCargo(id) {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.detail(id));
    } catch (error) {
      console.error('Error fetching cargo:', error);
      throw error;
    }
  }

  async createCargo(cargoData) {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.create, {
        method: 'POST',
        body: JSON.stringify(cargoData),
      });
    } catch (error) {
      console.error('Error creating cargo:', error);
      throw error;
    }
  }

  async updateCargo(id, cargoData) {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.update(id), {
        method: 'PATCH',
        body: JSON.stringify(cargoData),
      });
    } catch (error) {
      console.error('Error updating cargo:', error);
      throw error;
    }
  }

  async deleteCargo(id) {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.delete(id), {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting cargo:', error);
      throw error;
    }
  }

  async getJerarquia() {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.jerarquia);
    } catch (error) {
      console.error('Error fetching jerarquía:', error);
      throw error;
    }
  }

  async getEstadisticas() {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.estadisticas);
    } catch (error) {
      console.error('Error fetching estadísticas:', error);
      throw error;
    }
  }

  async buscarCargos(query, options = {}) {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (options.activos_only !== undefined) {
        params.append('activos_only', options.activos_only);
      }
      if (options.limit) params.append('limit', options.limit);

      const endpoint = `${CARGOS_ENDPOINTS.buscar}?${params.toString()}`;
      return await apiRequest(endpoint);
    } catch (error) {
      console.error('Error searching cargos:', error);
      throw error;
    }
  }

  async toggleActivo(id) {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.toggleActivo(id), {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error toggling cargo activo:', error);
      throw error;
    }
  }

  async bulkAction(cargoIds, action) {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.bulkAction, {
        method: 'POST',
        body: JSON.stringify({
          cargo_ids: cargoIds,
          action: action,
        }),
      });
    } catch (error) {
      console.error('Error executing bulk action:', error);
      throw error;
    }
  }

  async getSubordinados(cargoId) {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.subordinados(cargoId));
    } catch (error) {
      console.error('Error fetching subordinados:', error);
      throw error;
    }
  }

  // ==================== HISTORIAL ====================

  async getHistorialCargo(cargoId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.page_size) queryParams.append('page_size', params.page_size);

      const endpoint = queryParams.toString()
        ? `${CARGOS_ENDPOINTS.historialCargo(cargoId)}?${queryParams.toString()}`
        : CARGOS_ENDPOINTS.historialCargo(cargoId);

      return await apiRequest(endpoint);
    } catch (error) {
      console.error('Error fetching historial cargo:', error);
      throw error;
    }
  }

  async getHistorial(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Filtros
      if (params.cargo_nuevo) queryParams.append('cargo_nuevo', params.cargo_nuevo);
      if (params.cargo_anterior) queryParams.append('cargo_anterior', params.cargo_anterior);
      if (params.empleado) queryParams.append('empleado', params.empleado);
      if (params.activo !== undefined) queryParams.append('activo', params.activo);
      if (params.tipo_cambio) queryParams.append('tipo_cambio', params.tipo_cambio);
      
      // Filtros de fecha
      if (params.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
      if (params.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);
      
      // Búsqueda
      if (params.search) queryParams.append('search', params.search);
      
      // Paginación
      if (params.page) queryParams.append('page', params.page);
      if (params.page_size) queryParams.append('page_size', params.page_size);
      
      // Ordenamiento
      if (params.ordering) queryParams.append('ordering', params.ordering);

      const endpoint = queryParams.toString()
        ? `${CARGOS_ENDPOINTS.historial}?${queryParams.toString()}`
        : CARGOS_ENDPOINTS.historial;

      return await apiRequest(endpoint);
    } catch (error) {
      console.error('Error fetching historial:', error);
      throw error;
    }
  }

  async getHistorialDetail(id) {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.historialDetail(id));
    } catch (error) {
      console.error('Error fetching historial detail:', error);
      throw error;
    }
  }

  async getHistorialEstadisticas() {
    try {
      return await apiRequest(CARGOS_ENDPOINTS.historialEstadisticas);
    } catch (error) {
      console.error('Error fetching historial estadísticas:', error);
      throw error;
    }
  }
}

// Crear instancia singleton del servicio
const cargoService = new CargoService();

// Agregar métodos alias para compatibilidad con hooks
cargoService.crear = cargoService.createCargo;
cargoService.actualizar = cargoService.updateCargo;
cargoService.eliminar = cargoService.deleteCargo;
cargoService.buscar = cargoService.buscarCargos;
cargoService.getEstadisticas = cargoService.getEstadisticas; // Ya existe
cargoService.getJerarquia = cargoService.getJerarquia; // Ya existe
cargoService.bulkAction = cargoService.bulkAction; // Ya existe
cargoService.toggleActivo = cargoService.toggleActivo; // Ya existe

// Exportar tanto la clase como la instancia
export { CargoService };
export default cargoService;
