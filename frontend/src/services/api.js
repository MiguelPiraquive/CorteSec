import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
})

// ── Session state ──
let isRefreshing = false
let failedQueue = []
let sessionDead = false
let onSessionDied = null

function clearAuthData() {
  localStorage.removeItem('user')
  localStorage.removeItem('tenantCode')
  localStorage.removeItem('tenantSlug')
  localStorage.removeItem('tenantName')
}

function isAuthUrl(url) {
  if (!url) return false
  return url.includes('/api/auth/')
}

/** Called by AuthContext after successful login to re-enable requests */
export function resetSessionState() {
  sessionDead = false
}

/** Register a callback that fires instantly when session dies */
export function onSessionExpired(cb) {
  onSessionDied = cb
  return () => { onSessionDied = null }
}

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve()
  })
  failedQueue = []
}

// ── Request interceptor ──
apiClient.interceptors.request.use(
  (config) => {
    // Block ALL non-auth requests once session is dead
    if (sessionDead && !isAuthUrl(config.url)) {
      return Promise.reject(new axios.Cancel('Session expired'))
    }

    const tenantCode = localStorage.getItem('tenantCode')
    const tenantSlug = localStorage.getItem('tenantSlug')
    if (tenantCode) config.headers['X-Tenant-Codigo'] = tenantCode
    if (tenantSlug) config.headers['X-Tenant-Slug'] = tenantSlug

    const method = (config.method || '').toUpperCase()
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCookie('csrftoken')
      if (csrfToken) config.headers['X-CSRFToken'] = csrfToken
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ──
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)

    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Mark IMMEDIATELY so this request never triggers another refresh cycle
      originalRequest._retry = true

      if (isAuthUrl(originalRequest.url)) {
        return Promise.reject(error)
      }

      // Already dead — reject without touching server
      if (sessionDead) {
        return Promise.reject(error)
      }

      // Queue behind in-progress refresh
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      isRefreshing = true

      try {
        await axios.post(
          `${API_BASE_URL}/api/auth/token/refresh/`,
          {},
          { withCredentials: true }
        )
        processQueue(null)
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Kill ALL further requests immediately
        sessionDead = true
        processQueue(refreshError)
        clearAuthData()
        // Notify AuthContext instantly (no polling needed)
        onSessionDied?.()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response?.status === 403) {
      console.error('Access denied or tenant mismatch')
    }

    return Promise.reject(error)
  }
)

export default apiClient
