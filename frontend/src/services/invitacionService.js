import apiClient from './api'

/**
 * Invitation Service
 * Handles invitation-related API calls for the organization invitation system
 */

const invitacionService = {
  /**
   * Validate an invitation token (public endpoint)
   * @param {string} token - Invitation token
   * @returns {Promise} Invitation public info
   */
  async validateToken(token) {
    try {
      const response = await apiClient.get(`/api/invitacion/validar/${token}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al validar invitacion' }
    }
  },

  /**
   * Accept an invitation and register/join (public endpoint)
   * @param {Object} data - Registration data with token
   * @returns {Promise} Response with JWT tokens and user data
   */
  async acceptInvitation(data) {
    try {
      const response = await apiClient.post('/api/invitacion/aceptar/', data)

      // If auto-login data is returned, store user/org (tokens via httpOnly cookies)
      if (response.data.success && response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user))

        if (response.data.organization) {
          localStorage.setItem('tenantCode', response.data.organization.codigo)
          localStorage.setItem('tenantSlug', response.data.organization.slug || '')
          localStorage.setItem('tenantName', response.data.organization.nombre)
        }
      }

      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al aceptar invitacion' }
    }
  },

  /**
   * Get invitations for the current organization (authenticated)
   * @param {Object} params - Query parameters (page, search, estado)
   * @returns {Promise} Paginated list of invitations
   */
  async getInvitaciones(params = {}) {
    try {
      const response = await apiClient.get('/api/invitaciones/', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al cargar invitaciones' }
    }
  },

  /**
   * Create a new invitation (authenticated, OWNER/ADMIN)
   * @param {Object} data - { email, role, mensaje }
   * @returns {Promise} Created invitation data
   */
  async createInvitacion(data) {
    try {
      const response = await apiClient.post('/api/invitaciones/', data)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al crear invitacion' }
    }
  },

  /**
   * Resend an invitation email (authenticated)
   * @param {string} id - Invitation ID
   * @returns {Promise} Success confirmation
   */
  async resendInvitacion(id) {
    try {
      const response = await apiClient.post(`/api/invitaciones/${id}/resend/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al reenviar invitacion' }
    }
  },

  /**
   * Cancel a pending invitation (authenticated)
   * @param {string} id - Invitation ID
   * @returns {Promise} Success confirmation
   */
  async cancelInvitacion(id) {
    try {
      const response = await apiClient.post(`/api/invitaciones/${id}/cancel/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al cancelar invitacion' }
    }
  },
}

export default invitacionService
