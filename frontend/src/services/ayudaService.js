import api from './api'

/**
 * ════════════════════════════════════════════════════════════
 * SERVICIO DE CENTRO DE AYUDA - CorteSec
 * ════════════════════════════════════════════════════════════
 * 
 * Servicio completo para gestión del centro de ayuda:
 * - Artículos de ayuda
 * - FAQs (Preguntas frecuentes)
 * - Tutoriales paso a paso
 * - Tickets de soporte
 * - Recursos descargables
 * - Búsqueda global
 * 
 * @author Sistema CorteSec
 * @version 1.0.0
 */

const ayudaService = {
  // ═══════════════════════════════════════════════════════════
  // TIPOS DE AYUDA
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Obtener todos los tipos de ayuda
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise}
   */
  getTipos: async (params = {}) => {
    const response = await api.get('/api/ayuda/tipos/', { params })
    return response.data
  },

  /**
   * Obtener solo tipos activos
   * @returns {Promise}
   */
  getTiposActivos: async () => {
    const response = await api.get('/api/ayuda/tipos/activos/')
    return response.data
  },

  /**
   * Crear nuevo tipo de ayuda
   * @param {Object} data - Datos del tipo
   * @returns {Promise}
   */
  createTipo: async (data) => {
    const response = await api.post('/api/ayuda/tipos/', data)
    return response.data
  },

  /**
   * Actualizar tipo de ayuda
   * @param {number} id - ID del tipo
   * @param {Object} data - Datos actualizados
   * @returns {Promise}
   */
  updateTipo: async (id, data) => {
    const response = await api.patch(`/api/ayuda/tipos/${id}/`, data)
    return response.data
  },

  /**
   * Eliminar tipo de ayuda
   * @param {number} id - ID del tipo
   * @returns {Promise}
   */
  deleteTipo: async (id) => {
    const response = await api.delete(`/api/ayuda/tipos/${id}/`)
    return response.data
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORÍAS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Obtener todas las categorías
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise}
   */
  getCategorias: async (params = {}) => {
    const response = await api.get('/api/ayuda/categorias/', { params })
    return response.data
  },

  /**
   * Obtener solo categorías activas
   * @returns {Promise}
   */
  getCategoriasActivas: async () => {
    const response = await api.get('/api/ayuda/categorias/activas/')
    return response.data
  },

  /**
   * Obtener artículos de una categoría
   * @param {number} id - ID de la categoría
   * @param {Object} params - Parámetros de búsqueda
   * @returns {Promise}
   */
  getArticulosCategoria: async (id, params = {}) => {
    const response = await api.get(`/api/ayuda/categorias/${id}/articulos/`, { params })
    return response.data
  },

  /**
   * Crear nueva categoría
   * @param {Object} data - Datos de la categoría
   * @returns {Promise}
   */
  createCategoria: async (data) => {
    const response = await api.post('/api/ayuda/categorias/', data)
    return response.data
  },

  /**
   * Actualizar categoría
   * @param {number} id - ID de la categoría
   * @param {Object} data - Datos actualizados
   * @returns {Promise}
   */
  updateCategoria: async (id, data) => {
    const response = await api.patch(`/api/ayuda/categorias/${id}/`, data)
    return response.data
  },

  /**
   * Eliminar categoría
   * @param {number} id - ID de la categoría
   * @returns {Promise}
   */
  deleteCategoria: async (id) => {
    const response = await api.delete(`/api/ayuda/categorias/${id}/`)
    return response.data
  },

  // ═══════════════════════════════════════════════════════════
  // ARTÍCULOS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Obtener todos los artículos
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise}
   */
  getArticulos: async (params = {}) => {
    const response = await api.get('/api/ayuda/articulos/', { params })
    return response.data
  },

  /**
   * Obtener un artículo por ID
   * @param {number} id - ID del artículo
   * @returns {Promise}
   */
  getArticulo: async (id) => {
    const response = await api.get(`/api/ayuda/articulos/${id}/`)
    return response.data
  },

  /**
   * Obtener artículos populares
   * @returns {Promise}
   */
  getArticulosPopulares: async () => {
    const response = await api.get('/api/ayuda/articulos/populares/')
    return response.data
  },

  /**
   * Obtener artículos recientes
   * @returns {Promise}
   */
  getArticulosRecientes: async () => {
    const response = await api.get('/api/ayuda/articulos/recientes/')
    return response.data
  },

  /**
   * Buscar artículos
   * @param {string} query - Texto de búsqueda
   * @param {number} categoriaId - ID de categoría (opcional)
   * @returns {Promise}
   */
  buscarArticulos: async (query, categoriaId = null) => {
    const params = { q: query }
    if (categoriaId) {
      params.categoria = categoriaId
    }
    const response = await api.get('/api/ayuda/articulos/buscar/', { params })
    return response.data
  },

  /**
   * Crear nuevo artículo
   * @param {Object} data - Datos del artículo
   * @returns {Promise}
   */
  createArticulo: async (data) => {
    const response = await api.post('/api/ayuda/articulos/', data)
    return response.data
  },

  /**
   * Actualizar artículo
   * @param {number} id - ID del artículo
   * @param {Object} data - Datos actualizados
   * @returns {Promise}
   */
  updateArticulo: async (id, data) => {
    const response = await api.patch(`/api/ayuda/articulos/${id}/`, data)
    return response.data
  },

  /**
   * Eliminar artículo
   * @param {number} id - ID del artículo
   * @returns {Promise}
   */
  deleteArticulo: async (id) => {
    const response = await api.delete(`/api/ayuda/articulos/${id}/`)
    return response.data
  },

  /**
   * Votar artículo como útil o no útil
   * @param {number} id - ID del artículo
   * @param {boolean} util - true para útil, false para no útil
   * @returns {Promise}
   */
  votarArticulo: async (id, util) => {
    const response = await api.post(`/api/ayuda/articulos/${id}/votar/`, { util })
    return response.data
  },

  /**
   * Registrar vista de artículo
   * @param {number} id - ID del artículo
   * @returns {Promise}
   */
  registrarVista: async (id) => {
    const response = await api.post(`/api/ayuda/articulos/${id}/vista/`)
    return response.data
  },

  // ═══════════════════════════════════════════════════════════
  // FAQs (PREGUNTAS FRECUENTES)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Obtener todas las FAQs
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise}
   */
  getFAQs: async (params = {}) => {
    const response = await api.get('/api/ayuda/faqs/', { params })
    return response.data
  },

  /**
   * Obtener una FAQ por ID
   * @param {number} id - ID de la FAQ
   * @returns {Promise}
   */
  getFAQ: async (id) => {
    const response = await api.get(`/api/ayuda/faqs/${id}/`)
    return response.data
  },

  /**
   * Obtener FAQs populares
   * @returns {Promise}
   */
  getFAQsPopulares: async () => {
    const response = await api.get('/api/ayuda/faqs/populares/')
    return response.data
  },

  /**
   * Crear nueva FAQ
   * @param {Object} data - Datos de la FAQ
   * @returns {Promise}
   */
  createFAQ: async (data) => {
    const response = await api.post('/api/ayuda/faqs/', data)
    return response.data
  },

  /**
   * Actualizar FAQ
   * @param {number} id - ID de la FAQ
   * @param {Object} data - Datos actualizados
   * @returns {Promise}
   */
  updateFAQ: async (id, data) => {
    const response = await api.patch(`/api/ayuda/faqs/${id}/`, data)
    return response.data
  },

  /**
   * Eliminar FAQ
   * @param {number} id - ID de la FAQ
   * @returns {Promise}
   */
  deleteFAQ: async (id) => {
    const response = await api.delete(`/api/ayuda/faqs/${id}/`)
    return response.data
  },

  /**
   * Votar FAQ como útil o no útil
   * @param {number} id - ID de la FAQ
   * @param {boolean} util - true para útil, false para no útil
   * @returns {Promise}
   */
  votarFAQ: async (id, util) => {
    const response = await api.post(`/api/ayuda/faqs/${id}/votar/`, { util })
    return response.data
  },

  // ═══════════════════════════════════════════════════════════
  // SOLICITUDES DE SOPORTE (TICKETS)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Obtener todas las solicitudes de soporte
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise}
   */
  getSolicitudes: async (params = {}) => {
    const response = await api.get('/api/ayuda/solicitudes/', { params })
    return response.data
  },

  /**
   * Obtener una solicitud por ID
   * @param {number} id - ID de la solicitud
   * @returns {Promise}
   */
  getSolicitud: async (id) => {
    const response = await api.get(`/api/ayuda/solicitudes/${id}/`)
    return response.data
  },

  /**
   * Crear nueva solicitud de soporte
   * @param {Object} data - Datos de la solicitud
   * @returns {Promise}
   */
  createSolicitud: async (data) => {
    const response = await api.post('/api/ayuda/solicitudes/', data)
    return response.data
  },

  /**
   * Actualizar solicitud
   * @param {number} id - ID de la solicitud
   * @param {Object} data - Datos actualizados
   * @returns {Promise}
   */
  updateSolicitud: async (id, data) => {
    const response = await api.patch(`/api/ayuda/solicitudes/${id}/`, data)
    return response.data
  },

  /**
   * Cerrar solicitud de soporte
   * @param {number} id - ID de la solicitud
   * @returns {Promise}
   */
  cerrarSolicitud: async (id) => {
    const response = await api.post(`/api/ayuda/solicitudes/${id}/cerrar/`)
    return response.data
  },

  /**
   * Reabrir solicitud de soporte
   * @param {number} id - ID de la solicitud
   * @returns {Promise}
   */
  reabrirSolicitud: async (id) => {
    const response = await api.post(`/api/ayuda/solicitudes/${id}/reabrir/`)
    return response.data
  },

  /**
   * Cambiar estado de solicitud
   * @param {number} id - ID de la solicitud
   * @param {string} estado - Nuevo estado
   * @returns {Promise}
   */
  cambiarEstadoSolicitud: async (id, estado) => {
    const response = await api.patch(`/api/ayuda/solicitudes/${id}/cambiar_estado/`, { estado })
    return response.data
  },

  /**
   * Responder a solicitud
   * @param {number} id - ID de la solicitud
   * @param {string} contenido - Contenido de la respuesta
   * @param {boolean} esInterna - Si es nota interna
   * @returns {Promise}
   */
  responderSolicitud: async (id, contenido, esInterna = false) => {
    const response = await api.post(`/api/ayuda/solicitudes/${id}/responder/`, {
      contenido,
      es_interna: esInterna
    })
    return response.data
  },

  /**
   * Eliminar solicitud
   * @param {number} id - ID de la solicitud
   * @returns {Promise}
   */
  deleteSolicitud: async (id) => {
    const response = await api.delete(`/api/ayuda/solicitudes/${id}/`)
    return response.data
  },

  // ═══════════════════════════════════════════════════════════
  // TUTORIALES
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Obtener todos los tutoriales
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise}
   */
  getTutoriales: async (params = {}) => {
    const response = await api.get('/api/ayuda/tutoriales/', { params })
    return response.data
  },

  /**
   * Obtener un tutorial por ID
   * @param {number} id - ID del tutorial
   * @returns {Promise}
   */
  getTutorial: async (id) => {
    const response = await api.get(`/api/ayuda/tutoriales/${id}/`)
    return response.data
  },

  /**
   * Obtener pasos de un tutorial
   * @param {number} id - ID del tutorial
   * @returns {Promise}
   */
  getPasosTutorial: async (id) => {
    const response = await api.get(`/api/ayuda/tutoriales/${id}/pasos/`)
    return response.data
  },

  /**
   * Obtener progreso del usuario en tutorial
   * @param {number} id - ID del tutorial
   * @returns {Promise}
   */
  getProgresoTutorial: async (id) => {
    const response = await api.get(`/api/ayuda/tutoriales/${id}/progreso/`)
    return response.data
  },

  /**
   * Comenzar tutorial
   * @param {number} id - ID del tutorial
   * @returns {Promise}
   */
  comenzarTutorial: async (id) => {
    const response = await api.post(`/api/ayuda/tutoriales/${id}/comenzar/`)
    return response.data
  },

  /**
   * Marcar tutorial como completado
   * @param {number} id - ID del tutorial
   * @returns {Promise}
   */
  completarTutorial: async (id) => {
    const response = await api.post(`/api/ayuda/tutoriales/${id}/marcar_completado/`)
    return response.data
  },

  /**
   * Actualizar progreso en tutorial
   * @param {number} id - ID del tutorial
   * @param {number} pasoActual - ID del paso actual
   * @returns {Promise}
   */
  actualizarProgresoTutorial: async (id, pasoActual) => {
    const response = await api.post(`/api/ayuda/tutoriales/${id}/actualizar_progreso/`, {
      paso_actual: pasoActual
    })
    return response.data
  },

  /**
   * Crear nuevo tutorial
   * @param {Object} data - Datos del tutorial
   * @returns {Promise}
   */
  createTutorial: async (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key])
      }
    })
    const response = await api.post('/api/ayuda/tutoriales/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Actualizar tutorial
   * @param {number} id - ID del tutorial
   * @param {Object} data - Datos actualizados
   * @returns {Promise}
   */
  updateTutorial: async (id, data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key])
      }
    })
    const response = await api.patch(`/api/ayuda/tutoriales/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Eliminar tutorial
   * @param {number} id - ID del tutorial
   * @returns {Promise}
   */
  deleteTutorial: async (id) => {
    const response = await api.delete(`/api/ayuda/tutoriales/${id}/`)
    return response.data
  },

  // ═══════════════════════════════════════════════════════════
  // RECURSOS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Obtener todos los recursos
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise}
   */
  getRecursos: async (params = {}) => {
    const response = await api.get('/api/ayuda/recursos/', { params })
    return response.data
  },

  /**
   * Obtener un recurso por ID
   * @param {number} id - ID del recurso
   * @returns {Promise}
   */
  getRecurso: async (id) => {
    const response = await api.get(`/api/ayuda/recursos/${id}/`)
    return response.data
  },

  /**
   * Acceder/descargar recurso
   * @param {number} id - ID del recurso
   * @returns {Promise}
   */
  accederRecurso: async (id) => {
    const response = await api.post(`/api/ayuda/recursos/${id}/acceder/`)
    return response.data
  },

  /**
   * Crear nuevo recurso
   * @param {Object} data - Datos del recurso
   * @returns {Promise}
   */
  createRecurso: async (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key])
      }
    })
    const response = await api.post('/api/ayuda/recursos/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Actualizar recurso
   * @param {number} id - ID del recurso
   * @param {Object} data - Datos actualizados
   * @returns {Promise}
   */
  updateRecurso: async (id, data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key])
      }
    })
    const response = await api.patch(`/api/ayuda/recursos/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Eliminar recurso
   * @param {number} id - ID del recurso
   * @returns {Promise}
   */
  deleteRecurso: async (id) => {
    const response = await api.delete(`/api/ayuda/recursos/${id}/`)
    return response.data
  },

  // ═══════════════════════════════════════════════════════════
  // BÚSQUEDA Y ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Búsqueda global en todo el centro de ayuda
   * @param {string} query - Texto de búsqueda
   * @returns {Promise}
   */
  busquedaGlobal: async (query) => {
    const response = await api.get('/api/ayuda/buscar/', { params: { q: query } })
    return response.data
  },

  /**
   * Obtener estadísticas del centro de ayuda
   * @returns {Promise}
   */
  getEstadisticas: async () => {
    const response = await api.get('/api/ayuda/estadisticas/')
    return response.data
  }
}

export default ayudaService
