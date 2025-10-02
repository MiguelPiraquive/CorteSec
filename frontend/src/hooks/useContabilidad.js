import { useState, useCallback } from 'react';
import * as contabilidadService from '../services/contabilidadService';

// Hook para Plan de Cuentas
export function useCuentas() {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchCuentas(params);
      setCuentas(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJerarquia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchJerarquiaCuentas();
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEstadisticas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchEstadisticasCuentas();
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.createCuenta(payload);
      setCuentas((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.updateCuenta(id, payload);
      setCuentas((prev) => prev.map((c) => (c.id === id ? data : c)));
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await contabilidadService.deleteCuenta(id);
      setCuentas((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    cuentas,
    loading,
    error,
    fetchAll,
    fetchJerarquia,
    fetchEstadisticas,
    create,
    update,
    remove
  };
}

// Hook para Comprobantes Contables
export function useComprobantes() {
  const [comprobantes, setComprobantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchComprobantes(params);
      setComprobantes(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEstadisticas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchEstadisticasComprobantes();
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.createComprobante(payload);
      setComprobantes((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.updateComprobante(id, payload);
      setComprobantes((prev) => prev.map((c) => (c.id === id ? data : c)));
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const contabilizar = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await contabilidadService.contabilizarComprobante(id);
      setComprobantes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado: 'contabilizado' } : c))
      );
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const anular = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await contabilidadService.anularComprobante(id);
      setComprobantes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado: 'anulado' } : c))
      );
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await contabilidadService.deleteComprobante(id);
      setComprobantes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    comprobantes,
    loading,
    error,
    fetchAll,
    fetchEstadisticas,
    create,
    update,
    contabilizar,
    anular,
    remove
  };
}

// Hook para Movimientos Contables
export function useMovimientos() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchMovimientos(params);
      setMovimientos(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPorCuenta = useCallback(async (cuentaId, params) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchMovimientosPorCuenta(cuentaId, params);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEstadisticas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchEstadisticasMovimientos();
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.createMovimiento(payload);
      setMovimientos((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.updateMovimiento(id, payload);
      setMovimientos((prev) => prev.map((m) => (m.id === id ? data : m)));
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await contabilidadService.deleteMovimiento(id);
      setMovimientos((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    movimientos,
    loading,
    error,
    fetchAll,
    fetchPorCuenta,
    fetchEstadisticas,
    create,
    update,
    remove
  };
}

// Hook para Flujo de Caja
export function useFlujoCaja() {
  const [flujoCaja, setFlujoCaja] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchFlujoCaja(params);
      setFlujoCaja(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResumen = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchResumenFlujoCaja(params);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEstadisticas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.fetchEstadisticasFlujoCaja();
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.createFlujoCajaItem(payload);
      setFlujoCaja((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contabilidadService.updateFlujoCajaItem(id, payload);
      setFlujoCaja((prev) => prev.map((f) => (f.id === id ? data : f)));
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await contabilidadService.deleteFlujoCajaItem(id);
      setFlujoCaja((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    flujoCaja,
    loading,
    error,
    fetchAll,
    fetchResumen,
    fetchEstadisticas,
    create,
    update,
    remove
  };
}
