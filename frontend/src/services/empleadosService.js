import api from './api'

const empleadosService = {
  // ============= EMPLEADOS =============
  getEmpleados: async (params = {}) => {
    const response = await api.get('/api/nomina/empleados/', { params })
    return response.data
  },

  getAllEmpleados: async (params = {}) => {
    const response = await api.get('/api/nomina/empleados/', { params: { page_size: 99999, ...params } })
    return response.data.results || response.data
  },

  getEmpleadosActivos: async (params = {}) => {
    const response = await api.get('/api/nomina/empleados/activos/', { params })
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
    // Si data ya es FormData (viene con foto nueva), enviar directo
    if (data instanceof FormData) {
      const response = await api.put(`/api/nomina/empleados/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    }
    
    // Si no es FormData, es JSON normal - eliminar campo foto si existe
    const cleanData = { ...data }
    if ('foto' in cleanData) {
      delete cleanData.foto
    }
    const response = await api.put(`/api/nomina/empleados/${id}/`, cleanData)
    return response.data
  },

  deleteEmpleado: async (id) => {
    const response = await api.delete(`/api/nomina/empleados/${id}/`)
    return response.data
  },
}

export default empleadosService
