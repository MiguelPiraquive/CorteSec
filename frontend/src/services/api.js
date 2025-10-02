// Configuración base de la API (usa el origen; endpoints pueden incluir "/api/..." sin duplicarlo)
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

// Configuración por defecto para todas las peticiones
const defaultConfig = {
  credentials: 'include',
};

// Función para obtener el token de autenticación
const getAuthToken = () => {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('authToken');
};

// Función para obtener el token CSRF
const getCSRFToken = () => {
  const fromGlobals = window.CorteSec?.csrfToken || window.csrfToken;
  const fromInput = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
  // fallback: cookie 'csrftoken'
  const fromCookie = (() => {
    try {
      return document.cookie
        ?.split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];
    } catch (_) { return undefined; }
  })();
  return fromGlobals || fromInput || fromCookie;
};

// Construye URL final evitando duplicar /api de forma robusta
const buildUrl = (endpoint) => {
  if (/^https?:\/\//i.test(endpoint)) return endpoint; // absoluto
  let path = endpoint || '';
  if (!path.startsWith('/')) path = '/' + path;
  const base = API_BASE_URL.replace(/\/+$/, '');
  // Evitar /api/api cuando el base ya termina en /api y el path comienza con /api
  if (/\/api$/i.test(base) && path.startsWith('/api/')) {
    path = path.replace(/^\/api(\/|$)/i, '/');
  }
  return base + path;
};

// Obtener tenant/organización actual
const getCurrentOrganization = () => {
  try {
    const orgStr = localStorage.getItem('currentOrganization');
    return orgStr ? JSON.parse(orgStr) : null;
  } catch (err) {
    console.error('Error parsing current organization:', err);
    return null;
  }
};

// Función para configurar headers con autenticación, CSRF y tenant (sin forzar Content-Type)
const getAuthHeaders = (excludeAuth = false) => {
  const token = getAuthToken();
  const csrfToken = getCSRFToken();
  const currentOrg = getCurrentOrganization();
  
  const headers = {
    'Accept': 'application/json',
    ...(!excludeAuth && token && { Authorization: `Token ${token}` }),
    ...(csrfToken && { 'X-CSRFToken': csrfToken }),
    ...(currentOrg?.codigo && { 'X-Tenant-Codigo': currentOrg.codigo }),
  };
  
  // Debug para ver headers que se envían
  if (!excludeAuth) {
    console.log('🔍 Headers enviados:', {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 10) + '...' : 'none',
      hasTenant: !!currentOrg?.codigo,
      tenant: currentOrg?.codigo || 'none'
    });
  }
  
  return headers;
};

// Permite configurar un handler global cuando haya 401/403
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => { unauthorizedHandler = typeof fn === 'function' ? fn : null; };

// Handler for tenant-related errors
let tenantErrorHandler = null;
export const setTenantErrorHandler = (fn) => { tenantErrorHandler = typeof fn === 'function' ? fn : null; };

// DEBUG: Función para verificar estado de autenticación
export const debugAuthState = () => {
  const token = getAuthToken();
  const csrf = getCSRFToken();
  const user = localStorage.getItem('user');
  
  console.group('🔐 Auth Debug State');
  console.log('Auth Token:', token ? `✅ ${token.substring(0, 10)}...` : '❌ No token');
  console.log('CSRF Token:', csrf ? `✅ ${csrf.substring(0, 10)}...` : '❌ No CSRF');
  console.log('User Data:', user ? '✅ Present' : '❌ Missing');
  console.log('localStorage keys:', Object.keys(localStorage));
  console.groupEnd();
  
  return { token, csrf, user };
};

// Función base para hacer peticiones HTTP
const apiRequest = async (endpoint, options = {}) => {
  const url = buildUrl(endpoint);
  
  const excludeAuth = options.excludeAuth || false;
  delete options.excludeAuth; // Remove this custom option before sending
  
  const config = {
    ...defaultConfig,
    ...options,
    headers: {
      ...getAuthHeaders(excludeAuth),
      ...options.headers,
    },
  };

  // If uploading FormData, let the browser set the Content-Type with boundary
  if (config.body instanceof FormData) {
    if (config.headers && 'Content-Type' in config.headers) {
      try { delete config.headers['Content-Type']; } catch {}
    }
  } else if (config.body && !('Content-Type' in (config.headers || {}))) {
    // Si no es FormData y hay body, asegurar JSON por defecto
    config.headers = { ...config.headers, 'Content-Type': 'application/json' };
  }

  // DEBUG: Log request details for debugging (solo en desarrollo y para errores)
  const shouldLog = import.meta.env.DEV && (options.method !== 'GET' || endpoint.includes('import'));
  if (shouldLog) {
    console.group(`🔍 API Request: ${options.method || 'GET'} ${url}`);
    console.log('Auth Token:', getAuthToken() ? '✅ Present' : '❌ Missing');
    console.log('Body type:', config.body instanceof FormData ? 'FormData' : typeof config.body);
    console.groupEnd();
  }

  try {
    const response = await fetch(url, config);
    
    // Si la respuesta no es exitosa, lanzar error enriquecido
    if (!response.ok) {
      let errorPayload = null;
      try { errorPayload = await response.json(); } catch (_) { errorPayload = null; }

      // DEBUG: Log detailed error info (solo para errores importantes)
      if (response.status >= 400) {
        console.group(`❌ API Error: ${response.status} ${response.statusText}`);
        console.log('URL:', url);
        console.log('Auth Token:', getAuthToken() ? '✅ Present' : '❌ Missing');
        console.log('Response payload:', errorPayload);
        console.groupEnd();
      }

      // DRF suele usar 'detail' y 'non_field_errors'; también puede haber 'errors'
      const detail = errorPayload?.detail
        || errorPayload?.message
        || (Array.isArray(errorPayload?.non_field_errors) ? errorPayload.non_field_errors.join(', ') : null)
        || (errorPayload && typeof errorPayload === 'object' && errorPayload.errors
            ? (typeof errorPayload.errors === 'string' ? errorPayload.errors : JSON.stringify(errorPayload.errors))
            : null);

      const err = new Error(detail || `HTTP ${response.status}: ${response.statusText || 'Error'}`);
      err.status = response.status;
      err.payload = errorPayload;

      // Notificar globalmente en 401/403 o errores de tenant
      const errorCode = errorPayload?.code;
      if (response.status === 403 && errorCode === 'tenant_not_found' && typeof tenantErrorHandler === 'function') {
        try { tenantErrorHandler(err); } catch {}
      }
      else if ((response.status === 401 || response.status === 403) && typeof unauthorizedHandler === 'function') {
        try { unauthorizedHandler(err); } catch {}
      }
      throw err;
    }
    
    // Si la respuesta está vacía, retornar null
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Métodos HTTP específicos
export const api = {
  get: (endpoint, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return apiRequest(url, { method: 'GET' });
  },
  
  post: (endpoint, data) => 
    apiRequest(endpoint, {
      method: 'POST',
      body: (data instanceof FormData) ? data : JSON.stringify(data),
    }),
  
  put: (endpoint, data) => 
    apiRequest(endpoint, {
      method: 'PUT',
      body: (data instanceof FormData) ? data : JSON.stringify(data),
    }),
  
  patch: (endpoint, data) => 
    apiRequest(endpoint, {
      method: 'PATCH',
      body: (data instanceof FormData) ? data : JSON.stringify(data),
    }),
  
  delete: (endpoint) => 
    apiRequest(endpoint, { method: 'DELETE' }),
};

// Clase DashboardAPI para manejar todas las llamadas del dashboard
export class DashboardAPI {
  static async getMetrics() {
    return api.get('/api/dashboard/metrics/');
  }
  
  static async getActivityHeatmap() {
    return api.get('/api/dashboard/activity-heatmap/');
  }
  
  static async getHistoricalData() {
    return api.get('/api/dashboard/historical-data/');
  }
  
  static async getKpiTrends() {
    return api.get('/api/dashboard/kpi-trends/');
  }
  
  static async getDepartmentActivity() {
    return api.get('/api/dashboard/department-activity/');
  }
  
  static async getHourlyPatterns() {
    return api.get('/api/dashboard/hourly-patterns/');
  }
  
  static async getProductivityHeatmap() {
    return api.get('/api/dashboard/productivity-heatmap/');
  }
  
  static async getSearchSuggestions(query = '') {
    return api.get('/api/dashboard/search-suggestions/', { q: query });
  }
}

export default api;
export { apiRequest };
