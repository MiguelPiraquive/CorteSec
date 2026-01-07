import api from './api'

const itemsService = {
  getItems: async (page = 1) => {
    const response = await api.get(`/api/items/items/?page=${page}`)
    return response.data
  },

  getAllItems: async () => {
    const response = await api.get('/api/items/items/?page_size=1000')
    return response.data.results || response.data
  },

  getItem: async (id) => {
    const response = await api.get(`/api/items/items/${id}/`)
    return response.data
  },

  createItem: async (data) => {
    const response = await api.post('/api/items/items/', data)
    return response.data
  },

  updateItem: async (id, data) => {
    const response = await api.put(`/api/items/items/${id}/`, data)
    return response.data
  },

  deleteItem: async (id) => {
    const response = await api.delete(`/api/items/items/${id}/`)
    return response.data
  },

  toggleActivo: async (id) => {
    const response = await api.post(`/api/items/items/${id}/toggle_activo/`)
    return response.data
  },
}

export default itemsService
