import api from './api'

const plansService = {
  getPlans: async () => {
    const response = await api.get('/api/plans/')
    return response.data?.results || response.data
  },

  getPlan: async (id) => {
    const response = await api.get(`/api/plans/${id}/`)
    return response.data
  },

  createPlan: async (data) => {
    const response = await api.post('/api/plans/', data)
    return response.data
  },

  updatePlan: async (id, data) => {
    const response = await api.put(`/api/plans/${id}/`, data)
    return response.data
  },

  deletePlan: async (id) => {
    const response = await api.delete(`/api/plans/${id}/`)
    return response.data
  },

  getPlanChanges: async (organizationId) => {
    const params = organizationId ? { organization: organizationId } : {}
    const response = await api.get('/api/plan-changes/', { params })
    return response.data?.results || response.data
  },
}

export default plansService
