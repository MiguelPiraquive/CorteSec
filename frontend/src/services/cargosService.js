import api from './api'

const cargosService = {
  // Paginación del servidor - retorna { results, count, total_pages, current_page }
  getCargos: async (params = {}) => {
    const response = await api.get('/api/cargos/', { params })
    return response.data
  },

  // Obtener TODOS (sin paginación) - para dropdowns, exportación, etc.
  getAllCargos: async () => {
    const response = await api.get('/api/cargos/', { params: { page_size: 99999 } })
    return response.data.results || response.data
  },

  getCargo: async (id) => {
    const response = await api.get(`/api/cargos/${id}/`)
    return response.data
  },

  createCargo: async (data) => {
    const response = await api.post('/api/cargos/', data)
    return response.data
  },

  updateCargo: async (id, data) => {
    const response = await api.put(`/api/cargos/${id}/`, data)
    return response.data
  },

  deleteCargo: async (id) => {
    const response = await api.delete(`/api/cargos/${id}/`)
    return response.data
  },

  getJerarquia: async () => {
    const response = await api.get('/api/cargos/jerarquia/')
    return response.data
  },

  toggleActivo: async (id) => {
    const response = await api.post(`/api/cargos/${id}/toggle_activo/`)
    return response.data
  },

  // Alias
  getAll: async () => {
    const response = await api.get('/api/cargos/', { params: { page_size: 99999 } })
    return response.data.results || response.data
  },
}

export default cargosService
