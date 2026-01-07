import api from './api'

const permisosService = {
  // ==================== MÓDULOS DEL SISTEMA ====================
  
  getAllModulos: async (params = {}) => {
    const response = await api.get('/api/permisos/modulos/', { params })
    return response.data
  },

  getModulo: async (id) => {
    const response = await api.get(`/api/permisos/modulos/${id}/`)
    return response.data
  },

  createModulo: async (data) => {
    const response = await api.post('/api/permisos/modulos/', data)
    return response.data
  },

  updateModulo: async (id, data) => {
    const response = await api.put(`/api/permisos/modulos/${id}/`, data)
    return response.data
  },

  deleteModulo: async (id) => {
    const response = await api.delete(`/api/permisos/modulos/${id}/`)
    return response.data
  },

  toggleModuloActive: async (id) => {
    const response = await api.post(`/api/permisos/modulos/${id}/toggle_active/`)
    return response.data
  },

  getModulosTree: async () => {
    const response = await api.get('/api/permisos/modulos/tree/')
    return response.data
  },

  // ==================== TIPOS DE PERMISO ====================
  
  getAllTiposPermiso: async (params = {}) => {
    const response = await api.get('/api/permisos/tipos-permiso/', { params })
    return response.data
  },

  getTipoPermiso: async (id) => {
    const response = await api.get(`/api/permisos/tipos-permiso/${id}/`)
    return response.data
  },

  createTipoPermiso: async (data) => {
    const response = await api.post('/api/permisos/tipos-permiso/', data)
    return response.data
  },

  updateTipoPermiso: async (id, data) => {
    const response = await api.put(`/api/permisos/tipos-permiso/${id}/`, data)
    return response.data
  },

  deleteTipoPermiso: async (id) => {
    const response = await api.delete(`/api/permisos/tipos-permiso/${id}/`)
    return response.data
  },

  getTiposPorCategoria: async () => {
    const response = await api.get('/api/permisos/tipos-permiso/categorias/')
    return response.data
  },

  // ==================== CONDICIONES ====================
  
  getAllCondiciones: async (params = {}) => {
    const response = await api.get('/api/permisos/condiciones/', { params })
    return response.data
  },

  getCondicion: async (id) => {
    const response = await api.get(`/api/permisos/condiciones/${id}/`)
    return response.data
  },

  createCondicion: async (data) => {
    const response = await api.post('/api/permisos/condiciones/', data)
    return response.data
  },

  updateCondicion: async (id, data) => {
    const response = await api.put(`/api/permisos/condiciones/${id}/`, data)
    return response.data
  },

  deleteCondicion: async (id) => {
    const response = await api.delete(`/api/permisos/condiciones/${id}/`)
    return response.data
  },

  evaluarCondicion: async (id, data) => {
    const response = await api.post(`/api/permisos/condiciones/${id}/evaluar/`, data)
    return response.data
  },

  // ==================== PERMISOS ====================
  
  getAllPermisos: async (params = {}) => {
    const response = await api.get('/api/permisos/permisos/', { params })
    return response.data
  },

  getPermiso: async (id) => {
    const response = await api.get(`/api/permisos/permisos/${id}/`)
    return response.data
  },

  createPermiso: async (data) => {
    const response = await api.post('/api/permisos/permisos/', data)
    return response.data
  },

  updatePermiso: async (id, data) => {
    const response = await api.put(`/api/permisos/permisos/${id}/`, data)
    return response.data
  },

  deletePermiso: async (id) => {
    const response = await api.delete(`/api/permisos/permisos/${id}/`)
    return response.data
  },

  verificarPermiso: async (data) => {
    const response = await api.post('/api/permisos/verificar/', data)
    return response.data
  },

  getPermisosPorModulo: async () => {
    const response = await api.get('/api/permisos/permisos/por-modulo/')
    return response.data
  },

  // ==================== PERMISOS DIRECTOS ====================
  
  getAllPermisosDirectos: async (params = {}) => {
    const response = await api.get('/api/permisos/permisos-directos/', { params })
    return response.data
  },

  getPermisoDirecto: async (id) => {
    const response = await api.get(`/api/permisos/permisos-directos/${id}/`)
    return response.data
  },

  createPermisoDirecto: async (data) => {
    const response = await api.post('/api/permisos/permisos-directos/', data)
    return response.data
  },

  updatePermisoDirecto: async (id, data) => {
    const response = await api.put(`/api/permisos/permisos-directos/${id}/`, data)
    return response.data
  },

  deletePermisoDirecto: async (id) => {
    const response = await api.delete(`/api/permisos/permisos-directos/${id}/`)
    return response.data
  },

  getPermisosPorUsuario: async (userId) => {
    const response = await api.get(`/api/permisos/usuarios/${userId}/permisos/`)
    return response.data
  },

  // ==================== AUDITORÍA ====================
  
  getAuditoria: async (params = {}) => {
    const response = await api.get('/api/permisos/auditoria/', { params })
    return response.data
  },

  getEstadisticasAuditoria: async () => {
    const response = await api.get('/api/permisos/auditoria/estadisticas/')
    return response.data
  },

  // ==================== ESTADÍSTICAS ====================
  
  getEstadisticasGenerales: async () => {
    const response = await api.get('/api/permisos/estadisticas/generales/')
    return response.data
  },

  limpiarCache: async () => {
    const response = await api.post('/api/permisos/cache/limpiar/')
    return response.data
  },

  // ==================== ORGANIZACIONES ====================
  
  getAllOrganizaciones: async (params = {}) => {
    const response = await api.get('/api/permisos/organizaciones/', { params })
    return response.data
  }
}

export default permisosService
