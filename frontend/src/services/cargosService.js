import api from './api'

const cargosService = {
  getCargos: async (page = 1) => {
    const response = await api.get(`/api/cargos/?page=${page}`)
    return response.data
  },

  getAllCargos: async () => {
    const response = await api.get('/api/cargos/?page_size=1000')
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

  // Alias para consistencia con otros servicios
  getAll: async () => {
    const response = await api.get('/api/cargos/?page_size=1000')
    return response.data.results || response.data
  },
}

export default cargosService
