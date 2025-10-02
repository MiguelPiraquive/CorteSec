import { useState, useEffect, useCallback } from 'react';
import cargoService from '../services/cargoService';

// ==================== HOOK PARA FORMULARIO DE CARGO ====================

export const useCargoForm = (initialData = {}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    salario_base: '',
    departamento: '',
    requiere_experiencia: false,
    activo: true,
    ...initialData
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpiar errores al cambiar datos
    if (error) setError(null);
    if (success) setSuccess(false);
  }, [error, success]);

  const handleSubmit = useCallback(async (id = null) => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (id) {
        response = await cargoService.updateCargo(id, formData);
      } else {
        response = await cargoService.createCargo(formData);
      }
      
      setSuccess(true);
      return { success: true, data: response };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al guardar cargo';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData({
      nombre: '',
      descripcion: '',
      salario_base: '',
      departamento: '',
      requiere_experiencia: false,
      activo: true,
      ...initialData
    });
    setError(null);
    setSuccess(false);
  }, [initialData]);

  return {
    formData,
    loading,
    error,
    success,
    handleChange,
    handleSubmit,
    resetForm,
    setFormData
  };
};

// ==================== HOOK PARA LISTA DE CARGOS ====================

export const useCargos = (initialParams = {}) => {
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    current_page: 1,
    total_pages: 1,
  });

  const fetchCargos = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await cargoService.getCargos({ ...initialParams, ...params });
      
      setCargos(response.results || response);
      setPagination({
        count: response.count || 0,
        next: response.next,
        previous: response.previous,
        current_page: params.page || 1,
        total_pages: Math.ceil((response.count || 0) / (params.page_size || 15)),
      });
    } catch (err) {
      setError(err.message || 'Error al cargar cargos');
      setCargos([]);
    } finally {
      setLoading(false);
    }
  }, [initialParams]);

  useEffect(() => {
    fetchCargos();
  }, [fetchCargos]);

  const refresh = useCallback(() => {
    fetchCargos();
  }, [fetchCargos]);

  return {
    cargos,
    loading,
    error,
    pagination,
    fetchCargos,
    refresh,
  };
};

// ==================== HOOK PARA CARGO INDIVIDUAL ====================

export const useCargo = (id) => {
  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCargo = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await cargoService.getCargo(id);
      setCargo(response);
    } catch (err) {
      setError(err.message || 'Error al cargar cargo');
      setCargo(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCargo();
  }, [fetchCargo]);

  return { cargo, loading, error, refresh: fetchCargo };
};

// ==================== HOOK PARA ESTADÍSTICAS ====================

export const useEstadisticasCargos = () => {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEstadisticas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cargoService.getEstadisticas();
      setEstadisticas(response);
    } catch (err) {
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstadisticas();
  }, [fetchEstadisticas]);

  return { estadisticas, loading, error, refresh: fetchEstadisticas };
};

// ==================== HOOK PARA JERARQUÍA ====================

export const useJerarquiaCargos = () => {
  const [jerarquia, setJerarquia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJerarquia = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cargoService.getJerarquia();
      setJerarquia(response.hierarchy || []);
    } catch (err) {
      setError(err.message || 'Error al cargar jerarquía');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJerarquia();
  }, [fetchJerarquia]);

  return { jerarquia, loading, error, refresh: fetchJerarquia };
};

// ==================== HOOK PARA BÚSQUEDA ====================

export const useBuscarCargos = () => {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buscar = useCallback(async (termino, options = {}) => {
    if (!termino.trim()) {
      setResultados([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await cargoService.buscar(termino, options);
      setResultados(response.results || []);
    } catch (err) {
      setError(err.message || 'Error en la búsqueda');
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { resultados, loading, error, buscar };
};

// ==================== HOOK PARA ACCIONES MASIVAS ====================

export const useBulkActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeBulkAction = useCallback(async (cargoIds, action) => {
    try {
      setLoading(true);
      setError(null);
      const response = await cargoService.bulkAction(cargoIds, action);
      return response;
    } catch (err) {
      setError(err.message || 'Error en la acción masiva');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { executeBulkAction, loading, error };
};

// ==================== HOOK PARA CRUD OPERATIONS ====================

export const useCargoCrud = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const crear = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await cargoService.crear(data);
      return response;
    } catch (err) {
      setError(err.message || 'Error al crear cargo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizar = useCallback(async (id, data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await cargoService.actualizar(id, data);
      return response;
    } catch (err) {
      setError(err.message || 'Error al actualizar cargo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const eliminar = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      await cargoService.eliminar(id);
    } catch (err) {
      setError(err.message || 'Error al eliminar cargo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleActivo = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await cargoService.toggleActivo(id);
      return response;
    } catch (err) {
      setError(err.message || 'Error al cambiar estado');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { crear, actualizar, eliminar, toggleActivo, loading, error };
};

/**
 * Hook para gestionar el historial de un cargo
 */
export const useHistorialCargo = (cargoId) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const obtenerHistorial = useCallback(async () => {
    if (!cargoId) return;
    
    try {
      setLoading(true);
      setError(null);
      // Por ahora datos mock, luego conectar con API
      const historialMock = [
        {
          id: 1,
          fecha: '2024-01-15',
          accion: 'Creación',
          usuario: 'Admin',
          detalles: 'Cargo creado inicialmente'
        },
        {
          id: 2,
          fecha: '2024-02-10', 
          accion: 'Modificación',
          usuario: 'RRHH',
          detalles: 'Actualización de salario'
        }
      ];
      setHistorial(historialMock);
    } catch (err) {
      setError(err.message || 'Error al obtener historial');
    } finally {
      setLoading(false);
    }
  }, [cargoId]);

  useEffect(() => {
    obtenerHistorial();
  }, [obtenerHistorial]);

  return { historial, loading, error, obtenerHistorial };
};

/**
 * Hook para gestionar subordinados de un cargo
 */
export const useSubordinados = (cargoId) => {
  const [subordinados, setSubordinados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const obtenerSubordinados = useCallback(async () => {
    if (!cargoId) return;
    
    try {
      setLoading(true);
      setError(null);
      // Por ahora datos mock, luego conectar con API
      const subordinadosMock = [
        {
          id: 1,
          nombre: 'Analista Junior',
          nivel: 2,
          empleados: 3,
          activo: true
        },
        {
          id: 2,
          nombre: 'Asistente',
          nivel: 3,
          empleados: 2,
          activo: true
        }
      ];
      setSubordinados(subordinadosMock);
    } catch (err) {
      setError(err.message || 'Error al obtener subordinados');
    } finally {
      setLoading(false);
    }
  }, [cargoId]);

  useEffect(() => {
    obtenerSubordinados();
  }, [obtenerSubordinados]);

  return { subordinados, loading, error, obtenerSubordinados };
};

/**
 * Hook para gestionar jerarquía (alias para useJerarquiaCargos)
 */
export const useJerarquia = useJerarquiaCargos;

export default {
  useCargos,
  useCargo,
  useEstadisticasCargos,
  useJerarquiaCargos,
  useJerarquia,
  useBuscarCargos,
  useBulkActions,
  useCargoCrud,
  useHistorialCargo,
  useSubordinados
};