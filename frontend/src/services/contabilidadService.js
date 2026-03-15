import api from './api'

const contabilidadService = {
  // Plan de cuentas
  getCuentas: async (params = {}) => {
    const response = await api.get('/api/contabilidad/cuentas/', { params })
    return response.data
  },

  getAllCuentas: async () => {
    const response = await api.get('/api/contabilidad/cuentas/', { params: { page_size: 99999 } })
    return response.data.results || response.data
  },

  createCuenta: async (data) => {
    const response = await api.post('/api/contabilidad/cuentas/', data)
    return response.data
  },

  updateCuenta: async (id, data) => {
    const response = await api.put(`/api/contabilidad/cuentas/${id}/`, data)
    return response.data
  },

  deleteCuenta: async (id) => {
    const response = await api.delete(`/api/contabilidad/cuentas/${id}/`)
    return response.data
  },

  getCuentasJerarquia: async () => {
    const response = await api.get('/api/contabilidad/cuentas/jerarquia/')
    return response.data
  },

  getCuentaSaldo: async (id) => {
    const response = await api.get(`/api/contabilidad/cuentas/${id}/saldo/`)
    return response.data
  },

  getCuentasStats: async () => {
    const response = await api.get('/api/contabilidad/cuentas/estadisticas/')
    return response.data
  },

  // Comprobantes
  getComprobantes: async (params = {}) => {
    const response = await api.get('/api/contabilidad/comprobantes/', { params })
    return response.data
  },

  getAllComprobantes: async () => {
    const response = await api.get('/api/contabilidad/comprobantes/', { params: { page_size: 99999 } })
    return response.data.results || response.data
  },

  createComprobante: async (data) => {
    const response = await api.post('/api/contabilidad/comprobantes/', data)
    return response.data
  },

  updateComprobante: async (id, data) => {
    const response = await api.put(`/api/contabilidad/comprobantes/${id}/`, data)
    return response.data
  },

  deleteComprobante: async (id) => {
    const response = await api.delete(`/api/contabilidad/comprobantes/${id}/`)
    return response.data
  },

  contabilizarComprobante: async (id) => {
    const response = await api.post(`/api/contabilidad/comprobantes/${id}/contabilizar/`)
    return response.data
  },

  anularComprobante: async (id) => {
    const response = await api.post(`/api/contabilidad/comprobantes/${id}/anular/`)
    return response.data
  },

  getComprobantesStats: async () => {
    const response = await api.get('/api/contabilidad/comprobantes/estadisticas/')
    return response.data
  },

  // Movimientos
  getMovimientos: async (params = {}) => {
    const response = await api.get('/api/contabilidad/movimientos/', { params })
    return response.data
  },

  createMovimiento: async (data) => {
    const response = await api.post('/api/contabilidad/movimientos/', data)
    return response.data
  },

  updateMovimiento: async (id, data) => {
    const response = await api.put(`/api/contabilidad/movimientos/${id}/`, data)
    return response.data
  },

  deleteMovimiento: async (id) => {
    const response = await api.delete(`/api/contabilidad/movimientos/${id}/`)
    return response.data
  },

  getMovimientosStats: async () => {
    const response = await api.get('/api/contabilidad/movimientos/estadisticas/')
    return response.data
  },

  getBalancePrueba: async (params = {}) => {
    const response = await api.get('/api/contabilidad/movimientos/balance_prueba/', { params })
    return response.data
  },

  getLibroMayor: async (params = {}) => {
    const response = await api.get('/api/contabilidad/movimientos/libro_mayor/', { params })
    return response.data
  },

  getAuxiliares: async (params = {}) => {
    const response = await api.get('/api/contabilidad/movimientos/auxiliares/', { params })
    return response.data
  },

  getPucAudit: async () => {
    const response = await api.get('/api/contabilidad/movimientos/auditoria_puc/')
    return response.data
  },

  exportBalancePrueba: async (params = {}, formato = 'excel') => {
    const response = await api.get('/api/contabilidad/movimientos/exportar_balance_prueba/', {
      params: { ...params, formato },
      responseType: 'blob'
    })
    return response
  },

  exportLibroMayor: async (params = {}, formato = 'excel') => {
    const response = await api.get('/api/contabilidad/movimientos/exportar_libro_mayor/', {
      params: { ...params, formato },
      responseType: 'blob'
    })
    return response
  },

  exportAuxiliares: async (params = {}, formato = 'excel') => {
    const response = await api.get('/api/contabilidad/movimientos/exportar_auxiliares/', {
      params: { ...params, formato },
      responseType: 'blob'
    })
    return response
  },

  // Flujo de caja
  getFlujoCaja: async (params = {}) => {
    const response = await api.get('/api/contabilidad/flujo-caja/', { params })
    return response.data
  },

  createFlujoCaja: async (data) => {
    const response = await api.post('/api/contabilidad/flujo-caja/', data)
    return response.data
  },

  updateFlujoCaja: async (id, data) => {
    const response = await api.put(`/api/contabilidad/flujo-caja/${id}/`, data)
    return response.data
  },

  deleteFlujoCaja: async (id) => {
    const response = await api.delete(`/api/contabilidad/flujo-caja/${id}/`)
    return response.data
  },

  getFlujoCajaResumen: async (params = {}) => {
    const response = await api.get('/api/contabilidad/flujo-caja/resumen/', { params })
    return response.data
  },

  getFlujoCajaStats: async () => {
    const response = await api.get('/api/contabilidad/flujo-caja/estadisticas/')
    return response.data
  },

  // Centros de costo
  getCentrosCosto: async (params = {}) => {
    const response = await api.get('/api/contabilidad/centros-costo/', { params })
    return response.data
  },

  getAllCentrosCosto: async () => {
    const response = await api.get('/api/contabilidad/centros-costo/', { params: { page_size: 99999 } })
    return response.data.results || response.data
  },
}

export default contabilidadService
