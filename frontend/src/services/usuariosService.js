import apiClient from './api'

const USUARIOS_URL = '/api/usuarios'

/**
 * Servicio para gestión de usuarios
 */
const usuariosService = {
  /**
   * Obtener lista de usuarios con filtros y paginación
   */
  async getUsuarios(params = {}) {
    const response = await apiClient.get(USUARIOS_URL, { params })
    return response.data
  },

  /**
   * Obtener un usuario por ID
   */
  async getUsuario(id) {
    const response = await apiClient.get(`${USUARIOS_URL}/${id}`)
    return response.data
  },

  /**
   * Crear nuevo usuario
   */
  async crearUsuario(data) {
    const response = await apiClient.post(USUARIOS_URL, data)
    return response.data
  },

  /**
   * Actualizar usuario
   */
  async actualizarUsuario(id, data) {
    const response = await apiClient.put(`${USUARIOS_URL}/${id}`, data)
    return response.data
  },

  /**
   * Actualización parcial de usuario
   */
  async actualizarUsuarioParcial(id, data) {
    const response = await apiClient.patch(`${USUARIOS_URL}/${id}`, data)
    return response.data
  },

  /**
   * Eliminar usuario
   */
  async eliminarUsuario(id) {
    const response = await apiClient.delete(`${USUARIOS_URL}/${id}`)
    return response.data
  },

  /**
   * Activar/Desactivar usuario
   */
  async toggleActivoUsuario(id, activo) {
    const response = await apiClient.patch(`${USUARIOS_URL}/${id}`, { 
      is_active: activo 
    })
    return response.data
  },

  /**
   * Cambiar contraseña de usuario (por admin)
   */
  async cambiarContrasenaUsuario(id, data) {
    const response = await apiClient.post(`${USUARIOS_URL}/${id}/cambiar-contrasena`, data)
    return response.data
  },

  /**
   * Asignar roles a usuario
   */
  async asignarRoles(id, roles) {
    const response = await apiClient.post(`${USUARIOS_URL}/${id}/asignar_roles/`, { 
      roles_ids: roles 
    })
    return response.data
  },

  /**
   * Obtener permisos de usuario
   */
  async getPermisosUsuario(id) {
    const response = await apiClient.get(`${USUARIOS_URL}/${id}/permisos`)
    return response.data
  },

  /**
   * Obtener estadísticas de usuarios
   */
  async getEstadisticas() {
    const response = await apiClient.get(`${USUARIOS_URL}/estadisticas`)
    return response.data
  },

  /**
   * Resetear contraseña (enviar email)
   */
  async resetearContrasena(email) {
    const response = await apiClient.post(`${USUARIOS_URL}/resetear-contrasena`, { 
      email 
    })
    return response.data
  },

  /**
   * Obtener historial de actividad de usuario
   */
  async getHistorialActividad(id, params = {}) {
    const response = await apiClient.get(`${USUARIOS_URL}/${id}/historial`, { 
      params 
    })
    return response.data
  },

  /**
   * Exportar usuarios
   */
  async exportarUsuarios(params = {}) {
    const response = await apiClient.get(`${USUARIOS_URL}/exportar`, {
      params,
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * Verificar si username está disponible
   */
  async verificarUsername(username) {
    const response = await apiClient.get(`${USUARIOS_URL}/verificar-username`, {
      params: { username }
    })
    return response.data
  },

  /**
   * Verificar si email está disponible
   */
  async verificarEmail(email) {
    const response = await apiClient.get(`${USUARIOS_URL}/verificar-email`, {
      params: { email }
    })
    return response.data
  }
}

export default usuariosService
