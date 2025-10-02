import { api } from './api';

// Servicio de Autenticación
export const authService = {
  // ==================== AUTENTICACIÓN BÁSICA ====================
  
  /**
   * Iniciar sesión
   * @param {Object} credentials - Email y contraseña
   * @returns {Promise} - Respuesta con token y datos del usuario
   */
  login: async (credentials) => {
    console.log('🔐 Iniciando login con:', { email: credentials.email });
    
    // Clear any existing invalid token before login attempt
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Import apiRequest directly to avoid automatic auth headers for login
    const { apiRequest } = await import('./api');
    
    // Manual request for login WITHOUT auth token
    const response = await apiRequest('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
      excludeAuth: true, // Explicitly exclude Authorization header for login
    });
    
    console.log('🔐 Respuesta del login:', response);
    
    if (response.success && response.token) {
      // Guardar token en localStorage
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      console.log('✅ Token guardado:', response.token.substring(0, 10) + '...');
    } else {
      console.error('❌ Login falló:', response);
    }
    return response;
  },

  /**
   * Cerrar sesión
   * @returns {Promise} - Confirmación de logout
   */
  logout: async () => {
    try {
      const response = await api.post('/api/auth/logout/');
      // Limpiar datos locales
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      return response;
    } catch (error) {
      // Limpiar datos locales aunque la API falle
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      throw error;
    }
  },

  /**
   * Registrar nuevo usuario
   * @param {Object} userData - Datos del nuevo usuario
   * @returns {Promise} - Respuesta con token y datos del usuario
   */
  register: async (userData) => {
    // Import apiRequest directly to avoid automatic auth headers for register
    const { apiRequest } = await import('./api');
    
    const response = await apiRequest('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
      excludeAuth: true, // Explicitly exclude Authorization header for register
    });
    
    if (response.success && response.token) {
      // Guardar token en localStorage
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  // ==================== PERFIL DE USUARIO ====================

  /**
   * Obtener perfil del usuario actual
   * @returns {Promise} - Datos del perfil
   */
  getProfile: async () => {
    const response = await api.get('/api/auth/profile/');
    return response; // api.get ya devuelve JSON parseado
  },

  /**
   * Actualizar perfil del usuario
   * @param {Object} profileData - Datos a actualizar
   * @returns {Promise} - Usuario actualizado
   */
  updateProfile: async (profileData) => {
    const response = await api.put('/api/auth/profile/update/', profileData);
    if (response.success && response.user) {
      // Actualizar datos del usuario en localStorage
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  /**
   * Actualizar perfil parcialmente
   * @param {Object} profileData - Datos a actualizar
   * @returns {Promise} - Usuario actualizado
   */
  updateProfilePartial: async (profileData) => {
    const response = await api.patch('/api/auth/profile/update/', profileData);
    if (response.success && response.user) {
      // Actualizar datos del usuario en localStorage
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  /**
   * Cambiar contraseña
   * @param {Object} passwordData - Contraseña actual y nueva
   * @returns {Promise} - Confirmación del cambio
   */
  changePassword: async (passwordData) => {
    const response = await api.post('/api/auth/change-password/', passwordData);
    if (response.success && response.token) {
      // Actualizar token después del cambio de contraseña
      localStorage.setItem('authToken', response.token);
    }
    return response;
  },

  // ==================== VERIFICACIÓN DE EMAIL ====================

  /**
   * Verificar email del usuario
   * @returns {Promise} - Confirmación de verificación
   */
  verifyEmail: async () => {
    const response = await api.post('/api/auth/verify-email/');
    return response;
  },

  // ==================== RECUPERACIÓN DE CONTRASEÑA ====================

  /**
   * Solicitar recuperación de contraseña
   * @param {string} email - Email del usuario
   * @returns {Promise} - Confirmación de envío
   */
  requestPasswordReset: async (email) => {
    const response = await api.post('/api/auth/password-reset/', { email });
    return response;
  },

  /**
   * Confirmar recuperación de contraseña
   * @param {Object} resetData - Token, UID y nueva contraseña
   * @returns {Promise} - Confirmación del reset
   */
  confirmPasswordReset: async (resetData) => {
    const response = await api.post('/api/auth/password-reset/confirm/', resetData);
    return response;
  },

  // ==================== UTILIDADES ====================

  /**
   * Verificar si el usuario está autenticado
   * @returns {boolean} - Estado de autenticación
   */
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  /**
   * Obtener token de autenticación
   * @returns {string|null} - Token o null
   */
  getToken: () => {
    return localStorage.getItem('authToken');
  },

  /**
   * Obtener datos del usuario actual
   * @returns {Object|null} - Datos del usuario o null
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Limpiar datos de autenticación
   */
  clearAuth: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  /**
   * Refrescar token de autenticación
   * @returns {Promise} - Nuevo token
   */
  refreshToken: async () => {
    // En caso de que implementes refresh tokens en el futuro
    const response = await api.post('/api/auth/refresh/');
    if (response.token) {
      localStorage.setItem('authToken', response.token);
    }
    return response;
  },

  /**
   * Asegurar que el token sea válido antes de hacer requests
   * @returns {Promise} - Token válido o error
   */
  ensureValidToken: async () => {
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }
    
    // En desarrollo, aceptar el token sin verificación adicional por ahora
    if (import.meta.env.DEV) {
      console.log('🚀 Modo desarrollo: aceptando token sin verificación completa');
      return token;
    }
    
    // Verificar que el token sea válido haciendo una request simple
    try {
      await api.get('/api/auth/profile/');
      return token;
    } catch (error) {
      // Si el token no es válido, limpiar auth y lanzar error
      console.warn('Token inválido, limpiando autenticación:', error.message);
      authService.clearAuth();
      throw new Error('Token de autenticación inválido');
    }
  }
};

export default authService;
