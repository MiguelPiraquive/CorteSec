import api from './api';

/**
 * Servicio para la API de Configuración
 * ====================================
 * 
 * Conecta el frontend React con las APIs REST de configuración.
 * 
 * Autor: Sistema CorteSec
 * Versión: 3.0.0 - API FIRST
 * Fecha: 2025-07-29
 */

// Servicio para parámetros del sistema
export const fetchParametros = (params) => api.get('/api/configuracion/parametros/', { params });
export const fetchParametro = (id) => api.get(`/api/configuracion/parametros/${id}/`);
export const createParametro = (data) => api.post('/api/configuracion/parametros/', data);
export const updateParametro = (id, data) => api.put(`/api/configuracion/parametros/${id}/`, data);
export const partialUpdateParametro = (id, data) => api.patch(`/api/configuracion/parametros/${id}/`, data);
export const deleteParametro = (id) => api.delete(`/api/configuracion/parametros/${id}/`);

// Servicio para módulos de configuración
export const fetchModulos = (params) => api.get('/api/configuracion/modulos/', { params });
export const fetchModulo = (id) => api.get(`/api/configuracion/modulos/${id}/`);
export const createModulo = (data) => api.post('/api/configuracion/modulos/', data);
export const updateModulo = (id, data) => api.put(`/api/configuracion/modulos/${id}/`, data);
export const partialUpdateModulo = (id, data) => api.patch(`/api/configuracion/modulos/${id}/`, data);
export const deleteModulo = (id) => api.delete(`/api/configuracion/modulos/${id}/`);
export const toggleModulo = (id) => api.post(`/api/configuracion/modulos/${id}/toggle/`);

// Servicio para configuración general
export const fetchConfiguracionGeneral = () => api.get('/api/configuracion/general/');
export const updateConfiguracionGeneral = (data) => api.post('/api/configuracion/general/', data);

// Servicio para dashboard
export const fetchDashboard = () => api.get('/api/configuracion/dashboard/');

// Servicio para test de email
export const testEmail = (data) => api.post('/api/configuracion/test-email/', data);

// Servicios de utilidad
export const buscarParametros = (search) => fetchParametros({ search });
export const filtrarParametros = (filtros) => fetchParametros(filtros);

export default {
  // Parámetros
  fetchParametros,
  fetchParametro,
  createParametro,
  updateParametro,
  partialUpdateParametro,
  deleteParametro,
  buscarParametros,
  filtrarParametros,
  
  // Módulos
  fetchModulos,
  fetchModulo,
  createModulo,
  updateModulo,
  partialUpdateModulo,
  deleteModulo,
  toggleModulo,
  
  // General
  fetchConfiguracionGeneral,
  updateConfiguracionGeneral,
  
  // Dashboard
  fetchDashboard,
  
  // Email
  testEmail
};