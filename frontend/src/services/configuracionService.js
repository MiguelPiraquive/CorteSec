import api from './api'

// Helper: obtiene el ID de un recurso singleton de configuración
const getConfigId = async (endpoint) => {
  const response = await api.get(endpoint)
  const data = response.data
  if (data?.results?.length > 0) return data.results[0].id
  if (Array.isArray(data) && data.length > 0) return data[0].id
  if (data?.id) return data.id
  return null
}

const configuracionService = {
  // Configuración General
  getConfiguracionGeneral: async () => {
    const response = await api.get('/api/configuracion/general/')
    return response.data
  },

  updateConfiguracionGeneral: async (data) => {
    const configId = await getConfigId('/api/configuracion/general/')
    if (!configId) throw new Error('No se encontró configuración general')

    // Si hay logo como File, usar FormData
    if (data.logo instanceof File) {
      const formData = new FormData()
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key])
        }
      })
      const response = await api.patch(`/api/configuracion/general/${configId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } else {
      // JSON normal - EXCLUIR logo si no es un File
      const { logo, ...dataWithoutLogo } = data
      const response = await api.patch(`/api/configuracion/general/${configId}/`, dataWithoutLogo)
      return response.data
    }
  },

  // Parámetros del Sistema
  getParametros: async (params = {}) => {
    const response = await api.get('/api/configuracion/parametros/', { params })
    return response.data
  },

  getParametro: async (id) => {
    const response = await api.get(`/api/configuracion/parametros/${id}/`)
    return response.data
  },

  createParametro: async (data) => {
    const response = await api.post('/api/configuracion/parametros/', data)
    return response.data
  },

  updateParametro: async (id, data) => {
    const response = await api.patch(`/api/configuracion/parametros/${id}/`, data)
    return response.data
  },

  deleteParametro: async (id) => {
    const response = await api.delete(`/api/configuracion/parametros/${id}/`)
    return response.data
  },

  // Módulos
  getModulos: async () => {
    const response = await api.get('/api/configuracion/modulos/')
    return response.data
  },

  getModulo: async (id) => {
    const response = await api.get(`/api/configuracion/modulos/${id}/`)
    return response.data
  },

  createModulo: async (data) => {
    const response = await api.post('/api/configuracion/modulos/', data)
    return response.data
  },

  updateModulo: async (id, data) => {
    const response = await api.patch(`/api/configuracion/modulos/${id}/`, data)
    return response.data
  },

  deleteModulo: async (id) => {
    const response = await api.delete(`/api/configuracion/modulos/${id}/`)
    return response.data
  },

  toggleModulo: async (id) => {
    const response = await api.post(`/api/configuracion/modulos/${id}/toggle/`)
    return response.data
  },

  // Configuración de Seguridad
  getConfiguracionSeguridad: async () => {
    const response = await api.get('/api/configuracion/seguridad/')
    return response.data
  },

  updateConfiguracionSeguridad: async (data) => {
    const configId = await getConfigId('/api/configuracion/seguridad/')
    if (!configId) throw new Error('No se encontró configuración de seguridad')
    const response = await api.patch(`/api/configuracion/seguridad/${configId}/`, data)
    return response.data
  },

  // Configuración de Email
  getConfiguracionEmail: async () => {
    const response = await api.get('/api/configuracion/email/')
    return response.data
  },

  updateConfiguracionEmail: async (data) => {
    const configId = await getConfigId('/api/configuracion/email/')
    if (!configId) throw new Error('No se encontró configuración de email')
    const response = await api.patch(`/api/configuracion/email/${configId}/`, data)
    return response.data
  },

  testEmail: async (emailDestino) => {
    const response = await api.post('/api/configuracion/email/test_email/', {
      email_destino: emailDestino
    })
    return response.data
  },

  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/api/configuracion/dashboard/')
    return response.data
  },

  // Tasas de cambio (Fixer.io)
  getExchangeRates: async (base = '', symbols = '') => {
    const params = {}
    if (base) params.base = base
    if (symbols) params.symbols = symbols
    const response = await api.get('/api/configuracion/exchange-rates/', { params })
    return response.data
  }
}

export default configuracionService
