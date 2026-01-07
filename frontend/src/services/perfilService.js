import api from './api'

// Obtener perfil del usuario autenticado
export const getMiPerfil = async () => {
  const response = await api.get('/api/perfil/perfiles/mi-perfil/')
  return response.data
}

// Actualizar perfil del usuario autenticado
export const actualizarMiPerfil = async (data) => {
  const response = await api.put('/api/perfil/perfiles/actualizar-mi-perfil/', data)
  return response.data
}

// Actualización parcial del perfil
export const actualizarMiPerfilParcial = async (data) => {
  const response = await api.patch('/api/perfil/perfiles/actualizar-mi-perfil/', data)
  return response.data
}

// Subir foto de perfil
export const subirFotoPerfil = async (file) => {
  const formData = new FormData()
  formData.append('foto', file)
  
  const response = await api.patch('/api/perfil/perfiles/actualizar-mi-perfil/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// Obtener configuración de notificaciones
export const getConfigNotificaciones = async () => {
  const response = await api.get('/api/perfil/notificaciones/')
  return response.data
}

// Actualizar configuración de notificaciones
export const actualizarConfigNotificaciones = async (id, data) => {
  const response = await api.put(`/api/perfil/notificaciones/${id}/`, data)
  return response.data
}

// Actualización parcial de configuración de notificaciones
export const actualizarConfigNotificacionesParcial = async (id, data) => {
  const response = await api.patch(`/api/perfil/notificaciones/${id}/`, data)
  return response.data
}

// Cambiar contraseña
export const cambiarContrasena = async (data) => {
  const response = await api.post('/api/auth/change-password/', data)
  return response.data
}

// Estadísticas del perfil (admin)
export const getEstadisticasPerfil = async () => {
  const response = await api.get('/api/perfil/perfiles/estadisticas/')
  return response.data
}

// Exportar perfiles a Excel (admin)
export const exportarPerfilesExcel = async (params = {}) => {
  const response = await api.get('/api/perfil/perfiles/export_excel/', {
    params,
    responseType: 'blob',
  })
  
  // Crear enlace de descarga
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'perfiles_export.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
  
  return response.data
}

// Obtener perfil público de otro usuario (admin)
export const getPerfilPublico = async (id) => {
  const response = await api.get(`/api/perfil/perfiles/${id}/publico/`)
  return response.data
}

// Listar todos los perfiles (admin)
export const getAllPerfiles = async (params = {}) => {
  const response = await api.get('/api/perfil/perfiles/', { params })
  return response.data
}

// Obtener perfil por ID (admin)
export const getPerfilById = async (id) => {
  const response = await api.get(`/api/perfil/perfiles/${id}/`)
  return response.data
}

// Crear perfil (admin)
export const createPerfil = async (data) => {
  const response = await api.post('/api/perfil/perfiles/', data)
  return response.data
}

// Actualizar perfil (admin)
export const updatePerfil = async (id, data) => {
  const response = await api.put(`/api/perfil/perfiles/${id}/`, data)
  return response.data
}

// Eliminar perfil (admin)
export const deletePerfil = async (id) => {
  const response = await api.delete(`/api/perfil/perfiles/${id}/`)
  return response.data
}

// Buscar perfiles
export const buscarPerfiles = async (query) => {
  const response = await api.get('/api/perfil/perfiles/', {
    params: { search: query },
  })
  return response.data
}

// Filtrar perfiles por género
export const filtrarPorGenero = async (genero) => {
  const response = await api.get('/api/perfil/perfiles/', {
    params: { genero },
  })
  return response.data
}

// Filtrar perfiles por ciudad
export const filtrarPorCiudad = async (ciudad) => {
  const response = await api.get('/api/perfil/perfiles/', {
    params: { ciudad_residencia: ciudad },
  })
  return response.data
}

// Filtrar perfiles completados
export const filtrarPerfilesCompletados = async (completado = true) => {
  const response = await api.get('/api/perfil/perfiles/', {
    params: { perfil_completado: completado },
  })
  return response.data
}

export default {
  getMiPerfil,
  actualizarMiPerfil,
  actualizarMiPerfilParcial,
  subirFotoPerfil,
  getConfigNotificaciones,
  actualizarConfigNotificaciones,
  actualizarConfigNotificacionesParcial,
  cambiarContrasena,
  getEstadisticasPerfil,
  exportarPerfilesExcel,
  getPerfilPublico,
  getAllPerfiles,
  getPerfilById,
  createPerfil,
  updatePerfil,
  deletePerfil,
  buscarPerfiles,
  filtrarPorGenero,
  filtrarPorCiudad,
  filtrarPerfilesCompletados,
}
