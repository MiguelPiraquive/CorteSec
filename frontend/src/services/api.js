import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add auth token and tenant
apiClient.interceptors.request.use(
  (config) => {
    // Add authentication token
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Token ${token}`
    }

    // Add tenant information (CRITICAL for multitenant)
    const tenantCode = localStorage.getItem('tenantCode')
    const tenantSlug = localStorage.getItem('tenantSlug')
    
    if (tenantCode) {
      config.headers['X-Tenant-Codigo'] = tenantCode
    }
    
    if (tenantSlug) {
      config.headers['X-Tenant-Slug'] = tenantSlug
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response) {
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        // Clear auth data
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        localStorage.removeItem('tenantCode')
        localStorage.removeItem('tenantSlug')
        
        // Redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }

      // Handle 403 Forbidden (tenant mismatch or no access)
      if (error.response.status === 403) {
        console.error('Access denied or tenant mismatch')
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
