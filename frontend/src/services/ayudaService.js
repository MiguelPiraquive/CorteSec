import { api } from './api.js';

/**
 * Servicio para la API de Ayuda
 * ============================
 * 
 * Conecta el frontend React con las APIs REST de ayuda.
 * 
 * Autor: Sistema CorteSec
 * Versión: 3.0.0 - API FIRST
 * Fecha: 2025-07-29
 */

export const ayudaService = {
  // ==================== TIPOS DE AYUDA ====================
  
  // Obtener todos los tipos de ayuda
  getTipos: (params = {}) => {
    return api.get('/api/ayuda/tipos/', { params });
  },
  
  // Obtener tipos activos únicamente
  getTiposActivos: () => {
    return api.get('/api/ayuda/tipos/activos/');
  },
  
  // ==================== CATEGORÍAS ====================
  
  // Obtener todas las categorías
  getCategorias: (params = {}) => {
    return api.get('/api/ayuda/categorias/', { params });
  },
  
  // Obtener categorías activas únicamente
  getCategoriasActivas: () => {
    return api.get('/api/ayuda/categorias/activas/');
  },
  
  // Obtener artículos de una categoría
  getArticulosCategoria: (categoriaId, params = {}) => {
    return api.get(`/api/ayuda/categorias/${categoriaId}/articulos/`, { params });
  },
  
  // ==================== ARTÍCULOS ====================
  
  // Obtener todos los artículos
  getArticulos: (params = {}) => {
    return api.get('/api/ayuda/articulos/', { params });
  },
  
  // Obtener artículo específico
  getArticulo: (id) => {
    return api.get(`/api/ayuda/articulos/${id}/`);
  },
  
  // Crear nuevo artículo
  crearArticulo: (data) => {
    return api.post('/api/ayuda/articulos/', data);
  },
  
  // Actualizar artículo
  actualizarArticulo: (id, data) => {
    return api.patch(`/api/ayuda/articulos/${id}/`, data);
  },
  
  // Eliminar artículo
  eliminarArticulo: (id) => {
    return api.delete(`/api/ayuda/articulos/${id}/`);
  },
  
  // Obtener artículos populares
  getArticulosPopulares: () => {
    return api.get('/api/ayuda/articulos/populares/');
  },
  
  // Obtener artículos recientes
  getArticulosRecientes: () => {
    return api.get('/api/ayuda/articulos/recientes/');
  },
  
  // Buscar artículos
  buscarArticulos: (params = {}) => {
    return api.get('/api/ayuda/articulos/buscar/', { params });
  },
  
  // ==================== FAQs ====================
  
  // Obtener todas las FAQs
  getFAQs: (params = {}) => {
    return api.get('/api/ayuda/faqs/', { params });
  },
  
  // Obtener FAQ específica
  getFAQ: (id) => {
    return api.get(`/api/ayuda/faqs/${id}/`);
  },
  
  // Crear nueva FAQ
  crearFAQ: (data) => {
    return api.post('/api/ayuda/faqs/', data);
  },
  
  // Actualizar FAQ
  actualizarFAQ: (id, data) => {
    return api.patch(`/api/ayuda/faqs/${id}/`, data);
  },
  
  // Eliminar FAQ
  eliminarFAQ: (id) => {
    return api.delete(`/api/ayuda/faqs/${id}/`);
  },
  
  // ==================== TUTORIALES ====================
  
  // Obtener todos los tutoriales
  getTutoriales: (params = {}) => {
    return api.get('/api/ayuda/tutoriales/', { params });
  },
  
  // Obtener tutorial específico
  getTutorial: (id) => {
    return api.get(`/api/ayuda/tutoriales/${id}/`);
  },
  
  // Crear nuevo tutorial
  crearTutorial: (data) => {
    return api.post('/api/ayuda/tutoriales/', data);
  },
  
  // Actualizar tutorial
  actualizarTutorial: (id, data) => {
    return api.patch(`/api/ayuda/tutoriales/${id}/`, data);
  },
  
  // Eliminar tutorial
  eliminarTutorial: (id) => {
    return api.delete(`/api/ayuda/tutoriales/${id}/`);
  },
  
  // Obtener progreso del usuario en tutorial
  getProgresoTutorial: (tutorialId) => {
    return api.get(`/api/ayuda/tutoriales/${tutorialId}/progreso/`);
  },
  
  // Marcar tutorial como completado
  marcarTutorialCompletado: (tutorialId) => {
    return api.post(`/api/ayuda/tutoriales/${tutorialId}/marcar_completado/`);
  },
  
  // ==================== SOPORTE / TICKETS ====================
  
  // Obtener todas las solicitudes
  getSolicitudes: (params = {}) => {
    return api.get('/api/ayuda/solicitudes/', { params });
  },
  
  // Crear nueva solicitud
  crearSolicitud: (data) => {
    return api.post('/api/ayuda/solicitudes/', data);
  },
  
  // Obtener solicitud específica
  getSolicitud: (id) => {
    return api.get(`/api/ayuda/solicitudes/${id}/`);
  },
  
  // Actualizar solicitud
  actualizarSolicitud: (id, data) => {
    return api.patch(`/api/ayuda/solicitudes/${id}/`, data);
  },
  
  // Responder a solicitud
  responderSolicitud: (id, contenido) => {
    return api.post(`/api/ayuda/solicitudes/${id}/responder/`, { contenido });
  },
  
  // Cambiar estado de solicitud
  cambiarEstadoSolicitud: (id, estado) => {
    return api.patch(`/api/ayuda/solicitudes/${id}/cambiar_estado/`, { estado });
  },
  
  // ==================== RECURSOS ====================
  
  // Obtener todos los recursos
  getRecursos: (params = {}) => {
    return api.get('/api/ayuda/recursos/', { params });
  },
  
  // Obtener recurso específico
  getRecurso: (id) => {
    return api.get(`/api/ayuda/recursos/${id}/`);
  },
  
  // Descargar recurso
  descargarRecurso: (id) => {
    return api.post(`/api/ayuda/recursos/${id}/descargar/`);
  },

  // ==================== CONTENIDO DESTACADO ====================
  
  // Obtener contenido destacado del centro de ayuda
  getContenidoDestacado: () => {
    return api.get('/api/ayuda/contenido-destacado/');
  },
  
  // ==================== BÚSQUEDA Y ESTADÍSTICAS ====================
  
  // Búsqueda global en centro de ayuda
  busquedaGlobal: (query) => {
    return api.get('/api/ayuda/buscar/', { params: { q: query } });
  },
  
  // Obtener estadísticas del centro de ayuda
  getEstadisticas: () => {
    return api.get('/api/ayuda/estadisticas/');
  },

  // ==================== MÉTODOS ADICIONALES ====================

  // Obtener artículos relacionados
  getArticulosRelacionados: (articuloId) => {
    return api.get(`/api/ayuda/articulos/${articuloId}/relacionados/`);
  },

  // Marcar contenido como útil
  marcarUtil: (tipo, id, esUtil) => {
    return api.post(`/api/ayuda/${tipo}/${id}/marcar-util/`, { es_util: esUtil });
  },

  // Obtener videos
  getVideos: (params = {}) => {
    return api.get('/api/ayuda/videos/', { params });
  },

  // Obtener solicitudes de soporte
  getSolicitudesSoporte: (params = {}) => {
    return api.get('/api/ayuda/solicitudes-soporte/', { params });
  },

  // Crear solicitud de soporte
  crearSolicitudSoporte: (solicitudData) => {
    return api.post('/api/ayuda/solicitudes-soporte/', solicitudData);
  },

  // Enviar feedback
  enviarFeedback: (feedbackData) => {
    return api.post('/api/ayuda/feedback/', feedbackData);
  },

  // Obtener feedback
  getFeedback: (params = {}) => {
    return api.get('/api/ayuda/feedback/', { params });
  },

  // Enviar mensaje de contacto
  enviarContacto: (contactoData) => {
    return api.post('/api/ayuda/contacto/', contactoData);
  },
};
