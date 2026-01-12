import api from './api'

const empleadosService = {
  // ============= EMPLEADOS =============
  getEmpleados: async (params = {}) => {
    const response = await api.get('/api/nomina/empleados/', { params })
    return response.data
  },

  getAllEmpleados: async () => {
    const response = await api.get('/api/nomina/empleados/?page_size=1000')
    console.log('🔍 Response completa de getAllEmpleados:', response.data)
    const data = response.data
    
    if (Array.isArray(data)) {
      console.log('✅ Es un array directo, length:', data.length)
      return data
    } else if (data.results) {
      console.log('✅ Tiene results, length:', data.results.length)
      return data.results
    } else {
      console.log('⚠️ Formato desconocido:', data)
      return []
    }
  },

  getEmpleadosActivos: async () => {
    const response = await api.get('/api/nomina/empleados/activos/')
    return response.data
  },

  getEmpleado: async (id) => {
    const response = await api.get(`/api/nomina/empleados/${id}/`)
    return response.data
  },

  createEmpleado: async (data) => {
    // Si hay foto, usar FormData
    if (data.foto && data.foto instanceof File) {
      const formData = new FormData()
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
          formData.append(key, data[key])
        }
      })
      const response = await api.post('/api/nomina/empleados/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } else {
      const response = await api.post('/api/nomina/empleados/', data)
      return response.data
    }
  },

  updateEmpleado: async (id, data) => {
    // Si hay foto nueva, usar FormData
    if (data.foto && data.foto instanceof File) {
      const formData = new FormData()
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
          formData.append(key, data[key])
        }
      })
      const response = await api.put(`/api/nomina/empleados/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } else {
      const response = await api.put(`/api/nomina/empleados/${id}/`, data)
      return response.data
    }
  },

  deleteEmpleado: async (id) => {
    const response = await api.delete(`/api/nomina/empleados/${id}/`)
    return response.data
  },

  toggleActivo: async (id) => {
    const response = await api.patch(`/api/nomina/empleados/${id}/`, { activo: 'toggle' })
    return response.data
  },
}

export default empleadosService
