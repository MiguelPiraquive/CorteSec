import api from './api'

const organizationService = {
  list: async (params = {}) => {
    const response = await api.get('/api/organizations/', { params })
    return response.data
  },

  getCurrentOrganization: async () => {
    const response = await api.get('/api/organizations/current/')
    return response.data
  },

  switchOrganization: async (organizationId) => {
    const response = await api.post('/api/organizations/switch/', { organization_id: organizationId })
    return response.data
  },

  create: async (payload) => {
    const response = await api.post('/api/organizations/', payload)
    return response.data
  },

  update: async (id, payload) => {
    const response = await api.patch(`/api/organizations/${id}/`, payload)
    return response.data
  },

  remove: async (id) => {
    const response = await api.delete(`/api/organizations/${id}/`)
    return response.data
  },

  setPlan: async (organizationId, payload) => {
    const response = await api.post(`/api/organizations/${organizationId}/set_plan/`, payload)
    return response.data
  },
}

export default organizationService
