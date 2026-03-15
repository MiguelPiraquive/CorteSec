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

  patchTipoPermiso: async (id, data) => {
    const response = await api.patch(`/api/permisos/tipos-permiso/${id}/`, data)
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

  getEstadisticasTiposPermiso: async () => {
    const response = await api.get('/api/permisos/tipos-permiso/estadisticas/')
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

  patchPermiso: async (id, data) => {
    const response = await api.patch(`/api/permisos/permisos/${id}/`, data)
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

  // ==================== PERMISOS POR ROL ====================

  getPermisosPorRol: async (rolId) => {
    const response = await api.get('/api/permisos/permisos-rol/por-rol/', {
      params: { rol_id: rolId }
    })
    return response.data
  },

  setPermisosPorRol: async (rolId, permisos = [], tipo = 'grant') => {
    const response = await api.post('/api/permisos/permisos-rol/por-rol/', {
      rol_id: rolId,
      permisos,
      tipo
    })
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

  // ==================== RESTRICCIONES DE CAMPO ====================

  getAllRestriccionesCampo: async (params = {}) => {
    const response = await api.get('/api/permisos/restricciones-campo/', { params })
    return response.data
  },

  createRestriccionCampo: async (data) => {
    const response = await api.post('/api/permisos/restricciones-campo/', data)
    return response.data
  },

  updateRestriccionCampo: async (id, data) => {
    const response = await api.put(`/api/permisos/restricciones-campo/${id}/`, data)
    return response.data
  },

  patchRestriccionCampo: async (id, data) => {
    const response = await api.patch(`/api/permisos/restricciones-campo/${id}/`, data)
    return response.data
  },

  deleteRestriccionCampo: async (id) => {
    const response = await api.delete(`/api/permisos/restricciones-campo/${id}/`)
    return response.data
  },

  // ==================== RESTRICCIONES DE REGISTRO (RLS) ====================

  getAllRestriccionesRegistro: async (params = {}) => {
    const response = await api.get('/api/permisos/restricciones-registro/', { params })
    return response.data
  },

  createRestriccionRegistro: async (data) => {
    const response = await api.post('/api/permisos/restricciones-registro/', data)
    return response.data
  },

  updateRestriccionRegistro: async (id, data) => {
    const response = await api.put(`/api/permisos/restricciones-registro/${id}/`, data)
    return response.data
  },

  patchRestriccionRegistro: async (id, data) => {
    const response = await api.patch(`/api/permisos/restricciones-registro/${id}/`, data)
    return response.data
  },

  deleteRestriccionRegistro: async (id) => {
    const response = await api.delete(`/api/permisos/restricciones-registro/${id}/`)
    return response.data
  },

  // ==================== DELEGACIONES ====================

  getAllDelegaciones: async (params = {}) => {
    const response = await api.get('/api/permisos/delegaciones/', { params })
    return response.data
  },

  createDelegacion: async (data) => {
    const response = await api.post('/api/permisos/delegaciones/', data)
    return response.data
  },

  updateDelegacion: async (id, data) => {
    const response = await api.put(`/api/permisos/delegaciones/${id}/`, data)
    return response.data
  },

  patchDelegacion: async (id, data) => {
    const response = await api.patch(`/api/permisos/delegaciones/${id}/`, data)
    return response.data
  },

  deleteDelegacion: async (id) => {
    const response = await api.delete(`/api/permisos/delegaciones/${id}/`)
    return response.data
  },

  revocarDelegacion: async (id) => {
    const response = await api.post(`/api/permisos/delegaciones/${id}/revocar/`)
    return response.data
  },

  // ==================== SOLICITUDES DE APROBACIÓN ====================

  getAllSolicitudesAprobacion: async (params = {}) => {
    const response = await api.get('/api/permisos/solicitudes-aprobacion/', { params })
    return response.data
  },

  createSolicitudAprobacion: async (data) => {
    const response = await api.post('/api/permisos/solicitudes-aprobacion/', data)
    return response.data
  },

  updateSolicitudAprobacion: async (id, data) => {
    const response = await api.put(`/api/permisos/solicitudes-aprobacion/${id}/`, data)
    return response.data
  },

  deleteSolicitudAprobacion: async (id) => {
    const response = await api.delete(`/api/permisos/solicitudes-aprobacion/${id}/`)
    return response.data
  },

  aprobarSolicitud: async (id, respuesta = '') => {
    const response = await api.post(`/api/permisos/solicitudes-aprobacion/${id}/aprobar/`, { respuesta })
    return response.data
  },

  rechazarSolicitud: async (id, respuesta = '') => {
    const response = await api.post(`/api/permisos/solicitudes-aprobacion/${id}/rechazar/`, { respuesta })
    return response.data
  },

  // ==================== ELEMENTOS UI ====================

  getAllUIElements: async (params = {}) => {
    const response = await api.get('/api/permisos/ui-elements/', { params })
    return response.data
  },

  createUIElement: async (data) => {
    const response = await api.post('/api/permisos/ui-elements/', data)
    return response.data
  },

  updateUIElement: async (id, data) => {
    const response = await api.put(`/api/permisos/ui-elements/${id}/`, data)
    return response.data
  },

  patchUIElement: async (id, data) => {
    const response = await api.patch(`/api/permisos/ui-elements/${id}/`, data)
    return response.data
  },

  deleteUIElement: async (id) => {
    const response = await api.delete(`/api/permisos/ui-elements/${id}/`)
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

  getDashboardStats: async () => {
    const response = await api.get('/api/permisos/dashboard/stats/')
    return response.data
  },

  revocarPermisoDirecto: async (id, data = {}) => {
    const response = await api.post(`/api/permisos/permisos-directos/${id}/revoke/`, data)
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
