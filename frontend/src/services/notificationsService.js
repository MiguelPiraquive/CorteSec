import api from './api'

const notificationsService = {
  list: async (params = {}) => {
    const response = await api.get('/api/notificaciones/', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/api/notificaciones/${id}/`)
    return response.data
  },

  markRead: async (id) => {
    const response = await api.post(`/api/notificaciones/${id}/mark_read/`)
    return response.data
  },

  markUnread: async (id) => {
    const response = await api.post(`/api/notificaciones/${id}/mark_unread/`)
    return response.data
  },

  markAllRead: async () => {
    const response = await api.post('/api/notificaciones/mark_all_read/')
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/api/notificaciones/${id}/`)
    return response.data
  },

  deleteRead: async () => {
    const response = await api.delete('/api/notificaciones/delete-read/')
    return response.data
  },

  stats: async () => {
    const response = await api.get('/api/notificaciones/stats/')
    return response.data
  },
}

export default notificationsService
