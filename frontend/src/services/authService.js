import apiClient from './api'

/**
 * Authentication Service
 * Handles all authentication-related API calls with multitenant support
 */

const authService = {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} tenantCode - Organization code (REQUIRED for multitenant)
   * @returns {Promise} Response with token and user data
   */
  async login(email, password, tenantCode) {
    try {
      // Store tenant code before making the request
      if (tenantCode) {
        localStorage.setItem('tenantCode', tenantCode)
      }

      const response = await apiClient.post('/api/auth/login/', {
        email,
        password,
      })

      if (response.data.success && response.data.token) {
        // Store auth data
        localStorage.setItem('authToken', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        // Store tenant information from response if available
        if (response.data.user.organization) {
          localStorage.setItem('tenantCode', response.data.user.organization.slug || tenantCode)
          localStorage.setItem('tenantSlug', response.data.user.organization.slug || tenantCode)
        }
      }

      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error de conexión' }
    }
  },

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @param {string} tenantCode - Organization code (REQUIRED for multitenant)
   * @returns {Promise} Response with user data
   */
  async register(userData, tenantCode) {
    try {
      // Store tenant code before making the request
      if (tenantCode) {
        localStorage.setItem('tenantCode', tenantCode)
      }

      const response = await apiClient.post('/api/auth/register/', userData)
      
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Error de conexión' }
    }
  },

  /**
   * Logout user
   * @returns {Promise} Logout confirmation
   */
  async logout() {
    try {
      const response = await apiClient.post('/api/auth/logout/')
      
      // Clear all auth and tenant data
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('tenantCode')
      localStorage.removeItem('tenantSlug')
      
      return response.data
    } catch (error) {
      // Clear data even if request fails
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('tenantCode')
      localStorage.removeItem('tenantSlug')
      
      throw error.response?.data || { message: 'Error al cerrar sesión' }
    }
  },

  /**
   * Get current user profile
   * @returns {Promise} User profile data
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
   * @param {Object} profileData - Updated profile data
   * @returns {Promise} Updated user data
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
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} newPasswordConfirm - New password confirmation
   * @returns {Promise} Success confirmation
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
   * @param {string} email - User email
   * @param {string} tenantCode - Organization code
   * @returns {Promise} Success confirmation
   */
  async requestPasswordReset(email, tenantCode) {
    try {
      // Temporarily store tenant code for the request
      if (tenantCode) {
        localStorage.setItem('tenantCode', tenantCode)
      }

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
   * @param {string} uid - User ID encoded
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @param {string} newPasswordConfirm - New password confirmation
   * @returns {Promise} Success confirmation
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
   * @param {string} uid - User ID encoded
   * @param {string} token - Verification token
   * @returns {Promise} Success confirmation
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
   * @returns {Promise} Success confirmation
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
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!localStorage.getItem('authToken')
  },

  /**
   * Get stored user data
   * @returns {Object|null} User data or null
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  /**
   * Get stored tenant code
   * @returns {string|null} Tenant code or null
   */
  getTenantCode() {
    return localStorage.getItem('tenantCode')
  },
}

export default authService
