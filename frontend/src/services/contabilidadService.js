import api from './api';

// Servicio para Plan de Cuentas
export const fetchCuentas = (params) => api.get('/contabilidad/cuentas/', { params });
export const fetchCuenta = (id) => api.get(`/contabilidad/cuentas/${id}/`);
export const createCuenta = (data) => api.post('/contabilidad/cuentas/', data);
export const updateCuenta = (id, data) => api.put(`/contabilidad/cuentas/${id}/`, data);
export const partialUpdateCuenta = (id, data) => api.patch(`/contabilidad/cuentas/${id}/`, data);
export const deleteCuenta = (id) => api.delete(`/contabilidad/cuentas/${id}/`);

// Acciones específicas para cuentas
export const fetchJerarquiaCuentas = () => api.get('/contabilidad/cuentas/jerarquia/');
export const fetchSaldoCuenta = (id) => api.get(`/contabilidad/cuentas/${id}/saldo/`);
export const fetchEstadisticasCuentas = () => api.get('/contabilidad/cuentas/estadisticas/');

// Servicio para Comprobantes Contables
export const fetchComprobantes = (params) => api.get('/contabilidad/comprobantes/', { params });
export const fetchComprobante = (id) => api.get(`/contabilidad/comprobantes/${id}/`);
export const createComprobante = (data) => api.post('/contabilidad/comprobantes/', data);
export const updateComprobante = (id, data) => api.put(`/contabilidad/comprobantes/${id}/`, data);
export const partialUpdateComprobante = (id, data) => api.patch(`/contabilidad/comprobantes/${id}/`, data);
export const deleteComprobante = (id) => api.delete(`/contabilidad/comprobantes/${id}/`);

// Acciones específicas para comprobantes
export const contabilizarComprobante = (id) => api.post(`/contabilidad/comprobantes/${id}/contabilizar/`);
export const anularComprobante = (id) => api.post(`/contabilidad/comprobantes/${id}/anular/`);
export const fetchEstadisticasComprobantes = () => api.get('/contabilidad/comprobantes/estadisticas/');

// Servicio para Movimientos Contables
export const fetchMovimientos = (params) => api.get('/contabilidad/movimientos/', { params });
export const fetchMovimiento = (id) => api.get(`/contabilidad/movimientos/${id}/`);
export const createMovimiento = (data) => api.post('/contabilidad/movimientos/', data);
export const updateMovimiento = (id, data) => api.put(`/contabilidad/movimientos/${id}/`, data);
export const partialUpdateMovimiento = (id, data) => api.patch(`/contabilidad/movimientos/${id}/`, data);
export const deleteMovimiento = (id) => api.delete(`/contabilidad/movimientos/${id}/`);

// Acciones específicas para movimientos
export const fetchMovimientosPorCuenta = (cuentaId, params) => 
  api.get('/contabilidad/movimientos/por_cuenta/', { params: { cuenta_id: cuentaId, ...params } });
export const fetchEstadisticasMovimientos = () => api.get('/contabilidad/movimientos/estadisticas/');

// Servicio para Flujo de Caja
export const fetchFlujoCaja = (params) => api.get('/contabilidad/flujo-caja/', { params });
export const fetchFlujoCajaItem = (id) => api.get(`/contabilidad/flujo-caja/${id}/`);
export const createFlujoCajaItem = (data) => api.post('/contabilidad/flujo-caja/', data);
export const updateFlujoCajaItem = (id, data) => api.put(`/contabilidad/flujo-caja/${id}/`, data);
export const partialUpdateFlujoCajaItem = (id, data) => api.patch(`/contabilidad/flujo-caja/${id}/`, data);
export const deleteFlujoCajaItem = (id) => api.delete(`/contabilidad/flujo-caja/${id}/`);

// Acciones específicas para flujo de caja
export const fetchResumenFlujoCaja = (params) => api.get('/contabilidad/flujo-caja/resumen/', { params });
export const fetchEstadisticasFlujoCaja = () => api.get('/contabilidad/flujo-caja/estadisticas/');

// Funciones de ayuda
export const formatearValor = (valor) => `$${parseFloat(valor).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
export const formatearFecha = (fecha) => new Date(fecha).toLocaleDateString('es-CO');
