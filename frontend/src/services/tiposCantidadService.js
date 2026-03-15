import api from './api'

const tiposCantidadService = {
  getTiposCantidad: async (params = {}) => {
    const response = await api.get('/api/tipos-cantidad/', { params })
    return response.data
  },

  getAllTiposCantidad: async () => {
    const response = await api.get('/api/tipos-cantidad/', { params: { page_size: 99999 } })
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
