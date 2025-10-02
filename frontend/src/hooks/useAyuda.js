import { useState, useEffect, useCallback } from 'react';
import { ayudaService } from '../services/ayudaService.js';

/**
 * Hook personalizado para la API de Ayuda
 * =======================================
 * 
 * Maneja estado, carga y operaciones CRUD para el centro de ayuda.
 * 
 * Autor: Sistema CorteSec
 * Versión: 3.0.0 - API FIRST
 * Fecha: 2025-07-29
 */

// Hook genérico para manejar el estado de carga de datos
export const useApiData = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFunction();
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Error al cargar los datos');
        console.error('Error en useApiData:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFunction();
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al recargar los datos');
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  return { data, loading, error, refetch };
};

// ==================== HOOKS PARA TIPOS Y CATEGORÍAS ====================

// Hook para tipos de ayuda
export const useTiposAyuda = () => {
  return useApiData(() => ayudaService.getTiposActivos());
};

// Hook para categorías de ayuda
export const useCategoriasAyuda = () => {
  return useApiData(() => ayudaService.getCategoriasActivas());
};

// Alias para compatibilidad
export const useCategorias = useCategoriasAyuda;

// Hook para contenido destacado
export const useContenidoDestacado = () => {
  return useApiData(() => ayudaService.getContenidoDestacado());
};

// ==================== HOOKS PARA ARTÍCULOS ====================

// Hook para lista de artículos
export const useArticulos = (params = {}) => {
  return useApiData(() => ayudaService.getArticulos(params), [JSON.stringify(params)]);
};

// Hook para un artículo específico
export const useArticulo = (id) => {
  return useApiData(() => ayudaService.getArticulo(id), [id]);
};

// Hook para artículos populares
export const useArticulosPopulares = () => {
  return useApiData(() => ayudaService.getArticulosPopulares());
};

// Hook para artículos recientes
export const useArticulosRecientes = () => {
  return useApiData(() => ayudaService.getArticulosRecientes());
};

// ==================== HOOKS PARA FAQs ====================

// Hook para lista de FAQs
export const useFAQs = (params = {}) => {
  return useApiData(() => ayudaService.getFAQs(params), [JSON.stringify(params)]);
};

// Hook para una FAQ específica
export const useFAQ = (id) => {
  return useApiData(() => ayudaService.getFAQ(id), [id]);
};

// ==================== HOOKS PARA TUTORIALES ====================

// Hook para lista de tutoriales
export const useTutoriales = (params = {}) => {
  return useApiData(() => ayudaService.getTutoriales(params), [JSON.stringify(params)]);
};

// Hook para un tutorial específico
export const useTutorial = (id) => {
  return useApiData(() => ayudaService.getTutorial(id), [id]);
};

// Hook para progreso de tutorial
export const useProgresoTutorial = (tutorialId) => {
  return useApiData(() => ayudaService.getProgresoTutorial(tutorialId), [tutorialId]);
};

// ==================== HOOKS PARA SOPORTE ====================

// Hook para lista de solicitudes
export const useSolicitudes = (params = {}) => {
  return useApiData(() => ayudaService.getSolicitudes(params), [JSON.stringify(params)]);
};

// Hook para una solicitud específica
export const useSolicitud = (id) => {
  return useApiData(() => ayudaService.getSolicitud(id), [id]);
};

// ==================== HOOKS PARA RECURSOS ====================

// Hook para lista de recursos
export const useRecursos = (params = {}) => {
  return useApiData(() => ayudaService.getRecursos(params), [JSON.stringify(params)]);
};

// ==================== HOOKS PARA BÚSQUEDA Y ESTADÍSTICAS ====================

// Hook para estadísticas
export const useEstadisticasAyuda = () => {
  return useApiData(() => ayudaService.getEstadisticas());
};

// Hook para búsqueda
export const useBusqueda = (query) => {
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buscar = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResultados(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await ayudaService.busquedaGlobal(searchQuery);
      setResultados(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) {
      buscar(query);
    }
  }, [query, buscar]);

  return { resultados, loading, error, buscar };
};

// ==================== HOOKS ADICIONALES PARA COMPONENTES ====================

// Hook para detalle de artículo
export const useArticuloDetalle = (id) => {
  return useApiData(() => ayudaService.getArticulo(id), [id]);
};

// Hook para artículos relacionados
export const useArticulosRelacionados = (articuloId) => {
  return useApiData(() => ayudaService.getArticulosRelacionados(articuloId), [articuloId]);
};

// Hook para marcar contenido como útil
export const useMarcarUtil = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const marcarUtil = useCallback(async (tipo, id, esUtil) => {
    try {
      setLoading(true);
      setError(null);
      const response = await ayudaService.marcarUtil(tipo, id, esUtil);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al marcar como útil');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { marcarUtil, loading, error };
};

// Hook para búsqueda en ayuda
export const useBusquedaAyuda = (query) => {
  return useBusqueda(query); // Reutiliza el hook existente
};

// Hook para videos
export const useVideos = (params = {}) => {
  return useApiData(() => ayudaService.getVideos(params), [params]);
};

// Hook para solicitudes de soporte
export const useSolicitudesSoporte = (params = {}) => {
  return useApiData(() => ayudaService.getSolicitudesSoporte(params), [params]);
};

// Hook para crear solicitud de soporte
export const useCrearSolicitudSoporte = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const crearSolicitud = useCallback(async (solicitudData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      const response = await ayudaService.crearSolicitudSoporte(solicitudData);
      setSuccess(true);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al crear solicitud');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { crearSolicitud, loading, error, success };
};

// Hook para enviar feedback
export const useEnviarFeedback = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const enviarFeedback = useCallback(async (feedbackData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      const response = await ayudaService.enviarFeedback(feedbackData);
      setSuccess(true);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al enviar feedback');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { enviarFeedback, loading, error, success };
};

// Hook para obtener feedback
export const useFeedback = (params = {}) => {
  return useApiData(() => ayudaService.getFeedback(params), [params]);
};

// Hook para enviar mensaje de contacto
export const useEnviarContacto = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const enviarContacto = useCallback(async (contactoData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      const response = await ayudaService.enviarContacto(contactoData);
      setSuccess(true);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al enviar mensaje');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { enviarContacto, loading, error, success };
};

// ==================== HOOK PRINCIPAL PARA CENTRO DE AYUDA ====================

export const useAyuda = () => {
  const [activeSection, setActiveSection] = useState('articulos');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para operaciones CRUD
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Funciones CRUD genéricas
  const createItem = useCallback(async (type, data) => {
    try {
      setCreating(true);
      let response;
      
      switch (type) {
        case 'articulo':
          response = await ayudaService.crearArticulo(data);
          break;
        case 'faq':
          response = await ayudaService.crearFAQ(data);
          break;
        case 'tutorial':
          response = await ayudaService.crearTutorial(data);
          break;
        case 'solicitud':
          response = await ayudaService.crearSolicitud(data);
          break;
        default:
          throw new Error('Tipo no válido');
      }
      
      return response.data;
    } catch (error) {
      throw error;
    } finally {
      setCreating(false);
    }
  }, []);

  const updateItem = useCallback(async (type, id, data) => {
    try {
      setUpdating(true);
      let response;
      
      switch (type) {
        case 'articulo':
          response = await ayudaService.actualizarArticulo(id, data);
          break;
        case 'faq':
          response = await ayudaService.actualizarFAQ(id, data);
          break;
        case 'tutorial':
          response = await ayudaService.actualizarTutorial(id, data);
          break;
        case 'solicitud':
          response = await ayudaService.actualizarSolicitud(id, data);
          break;
        default:
          throw new Error('Tipo no válido');
      }
      
      return response.data;
    } catch (error) {
      throw error;
    } finally {
      setUpdating(false);
    }
  }, []);

  const deleteItem = useCallback(async (type, id) => {
    try {
      setDeleting(true);
      
      switch (type) {
        case 'articulo':
          await ayudaService.eliminarArticulo(id);
          break;
        case 'faq':
          await ayudaService.eliminarFAQ(id);
          break;
        case 'tutorial':
          await ayudaService.eliminarTutorial(id);
          break;
        default:
          throw new Error('Tipo no válido');
      }
      
      return true;
    } catch (error) {
      throw error;
    } finally {
      setDeleting(false);
    }
  }, []);

  // Funciones especiales
  const responderSolicitud = useCallback(async (id, contenido) => {
    try {
      const response = await ayudaService.responderSolicitud(id, contenido);
      return response.data;
    } catch (error) {
      throw error;
    }
  }, []);

  const marcarTutorialCompletado = useCallback(async (tutorialId) => {
    try {
      const response = await ayudaService.marcarTutorialCompletado(tutorialId);
      return response.data;
    } catch (error) {
      throw error;
    }
  }, []);

  const descargarRecurso = useCallback(async (recursoId) => {
    try {
      const response = await ayudaService.descargarRecurso(recursoId);
      return response.data;
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    // Estado de la UI
    activeSection,
    setActiveSection,
    searchQuery,
    setSearchQuery,
    
    // Estados de operaciones
    creating,
    updating,
    deleting,
    
    // Funciones CRUD
    createItem,
    updateItem,
    deleteItem,
    
    // Funciones especiales
    responderSolicitud,
    marcarTutorialCompletado,
    descargarRecurso,
  };
};
