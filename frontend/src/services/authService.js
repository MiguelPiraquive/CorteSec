import apiClient from './api'

/**
 * Authentication Service
 * Handles all authentication-related API calls with multitenant support.
 * JWT tokens are managed via httpOnly cookies (set by the backend).
 */

const authService = {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Response with user data (tokens set as httpOnly cookies)
   */
  async login(email, password) {
    try {
      const response = await apiClient.post('/api/auth/login/', {
        email,
        password,
      })

      if (response.data.success && response.data.user) {
        // Store user and org data (NOT tokens - they are in httpOnly cookies)
        localStorage.setItem('user', JSON.stringify(response.data.user))

        if (response.data.organization) {
          localStorage.setItem('tenantCode', response.data.organization.codigo)
          localStorage.setItem('tenantSlug', response.data.organization.slug || '')
          localStorage.setItem('tenantName', response.data.organization.nombre)
        }
      }

      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error de conexión' }
    }
  },

  /**
   * Register new user (creates new organization)
   */
  async register(userData) {
    try {
      const response = await apiClient.post('/api/auth/register/', userData)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error de conexión' }
    }
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      const response = await apiClient.post('/api/auth/logout/')

      // Clear local data (cookies cleared by backend)
      localStorage.removeItem('user')
      localStorage.removeItem('tenantCode')
      localStorage.removeItem('tenantSlug')
      localStorage.removeItem('tenantName')

      return response.data
    } catch (error) {
      // Clear data even if request fails
      localStorage.removeItem('user')
      localStorage.removeItem('tenantCode')
      localStorage.removeItem('tenantSlug')
      localStorage.removeItem('tenantName')

      throw error.response?.data || { message: 'Error al cerrar sesión' }
    }
  },

  /**
   * Check if user is authenticated (verifies cookie with backend)
   */
  async checkAuth() {
    try {
      const response = await apiClient.get('/api/auth/auth/check/')
      if (response.data.success && response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user))
        if (response.data.organization) {
          localStorage.setItem('tenantCode', response.data.organization.codigo)
          localStorage.setItem('tenantSlug', response.data.organization.slug || '')
          localStorage.setItem('tenantName', response.data.organization.nombre)
        }
      }
      return response.data
    } catch {
      return { success: false }
    }
  },

  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      const response = await apiClient.get('/api/auth/profile/')
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al obtener perfil' }
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      const response = await apiClient.put('/api/auth/profile/update/', profileData)

      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user))
      }

      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al actualizar perfil' }
    }
  },

  /**
   * Change password
   */
  async changePassword(oldPassword, newPassword, newPasswordConfirm) {
    try {
      const response = await apiClient.post('/api/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      })

      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al cambiar contraseña' }
    }
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const response = await apiClient.post('/api/auth/password-reset/', {
        email,
      })

      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al solicitar recuperación' }
    }
  },

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(uid, token, newPassword, newPasswordConfirm) {
    try {
      const response = await apiClient.post('/api/auth/password-reset/confirm/', {
        uid,
        token,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      })

      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al restablecer contraseña' }
    }
  },

  /**
   * Verify email with token
   */
  async verifyEmail(uid, token) {
    try {
      const response = await apiClient.post(`/api/auth/verify-email/${uid}/${token}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al verificar email' }
    }
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail() {
    try {
      const response = await apiClient.post('/api/auth/resend-verification/')
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error al reenviar verificación' }
    }
  },

  /**
   * Check if user is authenticated (local check, may be stale)
   */
  isAuthenticated() {
    return !!localStorage.getItem('user')
  },

  /**
   * Get stored user data
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  /**
   * Get stored tenant code
   */
  getTenantCode() {
    return localStorage.getItem('tenantCode')
  },
}

export default authService
