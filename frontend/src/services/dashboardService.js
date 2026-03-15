/**
 * Dashboard Service
 * =================
 * 
 * Servicio para gestionar las operaciones del dashboard.
 * Consume las APIs del backend para obtener métricas, actividad y gráficas.
 */

import api from './api';

const dashboardService = {
  /**
   * Obtener métricas básicas del dashboard
   * 
   * @returns {Promise} - Promesa con datos de métricas:
   *   - empleados: {total, activos, inactivos, cambio_porcentual}
   *   - cargos: {total, activos, inactivos}
   *   - nominas: {procesadas_mes, total_pagado_mes, cambio_porcentual}
   *   - prestamos: {total, activos, pendientes}
   *   - contratos: {activos, por_vencer}
   *   - actividad: {registros_hoy, registros_mes}
   */
  getMetrics: async (params = {}) => {
    try {
      const response = await api.get('/api/dashboard/metrics/', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener métricas:', error);
      throw error;
    }
  },

  /**
   * Obtener actividad reciente del sistema
   * 
   * @param {number} limit - Límite de registros (por defecto 20)
   * @returns {Promise} - Promesa con array de actividades:
   *   - id: ID del registro
   *   - tipo: 'success' | 'warning' | 'info'
   *   - mensaje: Descripción de la acción
   *   - detalle: Información adicional
   *   - usuario: Nombre del usuario que realizó la acción
   *   - tiempo: Tiempo relativo ("Hace X horas")
   *   - fecha: Fecha ISO de la acción
   */
  getRecentActivity: async (limit = 20, params = {}) => {
    try {
      const response = await api.get('/api/dashboard/activity/', { params: { limit, ...params } });
      return response.data;
    } catch (error) {
      console.error('Error al obtener actividad reciente:', error);
      throw error;
    }
  },

  /**
   * Obtener datos para gráficas avanzadas
   * 
   * @returns {Promise} - Promesa con datos de gráficas:
   *   - tendencias: {
   *       meses: ['Ene', 'Feb', ...],
   *       empleados: [10, 12, ...],
   *       nominas: [50000, 52000, ...],
   *       prestamos: [5, 7, ...]
   *     }
   *   - departamentos: [
   *       {nombre: 'Desarrollo', empleados: 15},
   *       ...
   *     ]
   */
  getCharts: async (params = {}) => {
    try {
      const response = await api.get('/api/dashboard/charts/', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener datos de gráficas:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas generales del sistema
   * 
   * @returns {Promise} - Promesa con estadísticas generales
   */
  getStats: async (params = {}) => {
    try {
      const response = await api.get('/api/dashboard/stats/', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  },

  getAdvancedMetrics: async (params = {}) => {
    const response = await api.get('/api/dashboard/advanced/metrics/', { params });
    return response.data;
  },

  getProjectAnalytics: async (params = {}) => {
    const response = await api.get('/api/dashboard/advanced/projects/', { params });
    return response.data;
  },

  getFinancialAnalytics: async (params = {}) => {
    const response = await api.get('/api/dashboard/advanced/financial/', { params });
    return response.data;
  },

  getAiPerformance: async (params = {}) => {
    const response = await api.get('/api/dashboard/ai/performance/', { params });
    return response.data;
  },

  getAiSalaryIntelligence: async (params = {}) => {
    const response = await api.get('/api/dashboard/ai/salary-intelligence/', { params });
    return response.data;
  },

  getAiPredictive: async (params = {}) => {
    const response = await api.get('/api/dashboard/ai/predictive/', { params });
    return response.data;
  },

  getRealtimeSnapshot: async (params = {}) => {
    const response = await api.get('/api/dashboard/realtime/snapshot/', { params });
    return response.data;
  }
};

export default dashboardService;
