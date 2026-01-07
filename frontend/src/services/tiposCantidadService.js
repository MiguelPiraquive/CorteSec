import api from './api'

const tiposCantidadService = {
  getTiposCantidad: async (page = 1) => {
    const response = await api.get(`/api/tipos-cantidad/?page=${page}`)
    return response.data
  },

  getAllTiposCantidad: async () => {
    const response = await api.get('/api/tipos-cantidad/?page_size=1000')
    return response.data.results || response.data
  },

  getTipoCantidad: async (id) => {
    const response = await api.get(`/api/tipos-cantidad/${id}/`)
    return response.data
  },

  createTipoCantidad: async (data) => {
    const response = await api.post('/api/tipos-cantidad/', data)
    return response.data
  },

  updateTipoCantidad: async (id, data) => {
    const response = await api.put(`/api/tipos-cantidad/${id}/`, data)
    return response.data
  },

  deleteTipoCantidad: async (id) => {
    const response = await api.delete(`/api/tipos-cantidad/${id}/`)
    return response.data
  },

  toggleActivo: async (id) => {
    const response = await api.patch(`/api/tipos-cantidad/${id}/toggle_activo/`)
    return response.data
  },
}

export default tiposCantidadService
