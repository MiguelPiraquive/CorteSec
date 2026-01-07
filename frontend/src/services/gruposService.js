import apiClient from './api'

const GROUPS_URL = '/api/auth/groups'

const gruposService = {
  /**
   * Obtener todos los grupos (roles)
   */
  async getGrupos(params = {}) {
    const response = await apiClient.get(GROUPS_URL, { params })
    return response.data
  },

  /**
   * Obtener un grupo por ID
   */
  async getGrupo(id) {
    const response = await apiClient.get(`${GROUPS_URL}/${id}`)
    return response.data
  },

  /**
   * Crear un nuevo grupo
   */
  async crearGrupo(data) {
    const response = await apiClient.post(GROUPS_URL, data)
    return response.data
  },

  /**
   * Actualizar un grupo
   */
  async actualizarGrupo(id, data) {
    const response = await apiClient.put(`${GROUPS_URL}/${id}`, data)
    return response.data
  },

  /**
   * Eliminar un grupo
   */
  async eliminarGrupo(id) {
    const response = await apiClient.delete(`${GROUPS_URL}/${id}`)
    return response.data
  },
}

export default gruposService
