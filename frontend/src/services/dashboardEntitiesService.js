import api from './api'

const dashboardEntitiesService = {
  // ==================== PROJECTS ====================
  getProjects: async (params = {}) => {
    const response = await api.get('/api/dashboard/projects/', { params })
    return response.data
  },

  getAllProjects: async () => {
    const response = await api.get('/api/dashboard/projects/', { params: { page_size: 99999 } })
    return response.data.results || response.data
  },

  getProject: async (id) => {
    const response = await api.get(`/api/dashboard/projects/${id}/`)
    return response.data
  },

  createProject: async (data) => {
    const response = await api.post('/api/dashboard/projects/', data)
    return response.data
  },

  updateProject: async (id, data) => {
    const response = await api.patch(`/api/dashboard/projects/${id}/`, data)
    return response.data
  },

  deleteProject: async (id) => {
    const response = await api.delete(`/api/dashboard/projects/${id}/`)
    return response.data
  },

  // ==================== PROJECT ACTIONS ====================
  getProjectStats: async () => {
    const response = await api.get('/api/dashboard/projects/stats/')
    return response.data
  },

  getProjectKanban: async () => {
    const response = await api.get('/api/dashboard/projects/kanban/')
    return response.data
  },

  getProjectSummary: async () => {
    const response = await api.get('/api/dashboard/projects/summary/')
    return response.data
  },

  getProjectTimeline: async () => {
    const response = await api.get('/api/dashboard/projects/timeline/')
    return response.data
  },

  getProjectComparativa: async () => {
    const response = await api.get('/api/dashboard/projects/comparativa/')
    return response.data
  },

  getProjectKPIs: async (id) => {
    const response = await api.get(`/api/dashboard/projects/${id}/kpis/`)
    return response.data
  },

  changeProjectEstado: async (id, estado) => {
    const response = await api.patch(`/api/dashboard/projects/${id}/cambiar-estado/`, { estado })
    return response.data
  },

  // ==================== ASIGNACIONES ====================
  getAsignaciones: async (projectId) => {
    const response = await api.get(`/api/dashboard/projects/${projectId}/asignaciones/`)
    return response.data
  },

  addAsignacion: async (projectId, data) => {
    const response = await api.post(`/api/dashboard/projects/${projectId}/asignaciones/`, data)
    return response.data
  },

  removeAsignacion: async (projectId, asignacionId) => {
    const response = await api.delete(`/api/dashboard/projects/${projectId}/asignaciones/${asignacionId}/`)
    return response.data
  },

  // ==================== PLANTILLAS (FASE 3) ====================
  getPlantillas: async () => {
    const response = await api.get('/api/dashboard/projects/plantillas/')
    return response.data
  },

  crearDesdePlantilla: async (data) => {
    const response = await api.post('/api/dashboard/projects/crear-desde-plantilla/', data)
    return response.data
  },

  // ==================== EXPORT (FASE 3) ====================
  exportExcel: async () => {
    const response = await api.get('/api/dashboard/projects/export-excel/', {
      responseType: 'blob',
    })
    return response
  },

  exportPDF: async (projectId) => {
    const response = await api.get(`/api/dashboard/projects/${projectId}/export-pdf/`, {
      responseType: 'blob',
    })
    return response
  },

  // ==================== PREDICCIONES IA (FASE 3) ====================
  getPredicciones: async (projectId) => {
    const response = await api.get(`/api/dashboard/projects/${projectId}/predicciones/`)
    return response.data
  },

  // ==================== GAMIFICACIÓN (FASE 3) ====================
  getLogros: async () => {
    const response = await api.get('/api/dashboard/projects/logros/')
    return response.data
  },

  // ==================== ACTIVE PROJECT ====================
  getActiveProject: async () => {
    const response = await api.get('/api/dashboard/active-project/')
    return response.data
  },

  setActiveProject: async (projectId) => {
    const response = await api.post('/api/dashboard/active-project/', { project_id: projectId })
    return response.data
  },

  clearActiveProject: async () => {
    const response = await api.delete('/api/dashboard/active-project/clear/')
    return response.data
  },
}

export default dashboardEntitiesService
