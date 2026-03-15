import api from './api'

const systemStatusService = {
  getSystemStatus: async () => {
    const response = await api.get('/api/system-status/')
    return response.data
  },

  getHealthCheck: async () => {
    const response = await api.get('/api/health-check/')
    return response.data
  },
}

export default systemStatusService
