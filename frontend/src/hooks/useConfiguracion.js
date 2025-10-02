import { useState, useCallback } from 'react';
import configuracionService from '../services/configuracionService';

export function useParametros() {
  const [parametros, setParametros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const response = await configuracionService.fetchParametros(params);
      setParametros(response.data.results || response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await configuracionService.createParametro(payload);
      setParametros((prev) => [...prev, response.data]);
      return response.data;
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
      const response = await configuracionService.updateParametro(id, payload);
      setParametros((prev) => prev.map((p) => (p.id === id ? response.data : p)));
      return response.data;
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
      await configuracionService.deleteParametro(id);
      setParametros((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { parametros, loading, error, fetchAll, create, update, remove };
}

export function useModulos() {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const response = await configuracionService.fetchModulos(params);
      setModulos(response.data.results || response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await configuracionService.createModulo(payload);
      setModulos((prev) => [...prev, response.data]);
      return response.data;
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
      const response = await configuracionService.updateModulo(id, payload);
      setModulos((prev) => prev.map((m) => (m.id === id ? response.data : m)));
      return response.data;
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
      await configuracionService.deleteModulo(id);
      setModulos((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await configuracionService.toggleModulo(id);
      setModulos((prev) => prev.map((m) => 
        m.id === id ? { ...m, activo: response.data.activo } : m
      ));
      return response.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { modulos, loading, error, fetchAll, create, update, remove, toggle };
}
