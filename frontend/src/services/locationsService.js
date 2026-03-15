import api from './api'

const locationsService = {
  // DEPARTAMENTOS
  getDepartamentos: async (params = {}) => {
    const response = await api.get('/api/locations/departamentos/', { params })
    return response.data
  },

  getAllDepartamentos: async () => {
    const response = await api.get('/api/locations/departamentos/', { params: { page_size: 99999 } })
    return response.data.results || response.data
  },

  getSimpleDepartamentos: async () => {
    const response = await api.get('/api/locations/departamentos/simple/')
    return response.data
  },

  getDepartamento: async (id) => {
    const response = await api.get(`/api/locations/departamentos/${id}/`)
    return response.data
  },

  createDepartamento: async (data) => {
    const response = await api.post('/api/locations/departamentos/', data)
    return response.data
  },

  updateDepartamento: async (id, data) => {
    const response = await api.put(`/api/locations/departamentos/${id}/`, data)
    return response.data
  },

  deleteDepartamento: async (id) => {
    const response = await api.delete(`/api/locations/departamentos/${id}/`)
    return response.data
  },

  // MUNICIPIOS
  getMunicipios: async (params = {}) => {
    const response = await api.get('/api/locations/municipios/', { params })
    return response.data
  },

  getAllMunicipios: async () => {
    const response = await api.get('/api/locations/municipios/', { params: { page_size: 99999 } })
    return response.data.results || response.data
  },

  getMunicipiosByDepartamento: async (departamentoId) => {
    const response = await api.get(`/api/locations/municipios/por_departamento/?departamento_id=${departamentoId}`)
    return response.data
  },

  getSimpleMunicipios: async () => {
    const response = await api.get('/api/locations/municipios/simple/')
    return response.data
  },

  getMunicipio: async (id) => {
    const response = await api.get(`/api/locations/municipios/${id}/`)
    return response.data
  },

  createMunicipio: async (data) => {
    const response = await api.post('/api/locations/municipios/', data)
    return response.data
  },

  updateMunicipio: async (id, data) => {
    const response = await api.put(`/api/locations/municipios/${id}/`, data)
    return response.data
  },

  deleteMunicipio: async (id) => {
    const response = await api.delete(`/api/locations/municipios/${id}/`)
    return response.data
  },

  // CARGA MASIVA
  uploadExcel: async (file) => {
    const formData = new FormData()
    formData.append('excel', file)
    const response = await api.post('/api/locations/import-excel/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

export default locationsService
