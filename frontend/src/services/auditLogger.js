/**
 * Sistema de Auditoría Automática del Frontend
 * ==============================================
 * 
 * Registra automáticamente TODAS las acciones del usuario:
 * - Navegación entre páginas
 * - Clicks en botones
 * - Apertura de modales
 * - Envío de formularios
 * - Búsquedas
 * - Filtros aplicados
 * - Descargas de archivos
 * - Y mucho más...
 */

import api from './api'

class AuditLogger {
  constructor() {
    this.enabled = true
    this.queue = []
    this.batchSize = 10
    this.flushInterval = 5000 // 5 segundos
    this.startBatchFlush()
  }

  /**
   * Log de navegación entre páginas
   */
  logNavigation(from, to) {
    if (!this.enabled) return
    
    this.log({
      accion: 'navegar_pagina',
      modelo: 'Navegacion',
      metadata: {
        desde: from,
        hacia: to,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log de click en botón
   */
  logButtonClick(buttonName, module, action = null) {
    if (!this.enabled) return
    
    this.log({
      accion: action || 'click_boton',
      modelo: module,
      metadata: {
        boton: buttonName,
        tipo: 'button_click',
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log de apertura de modal
   */
  logModalOpen(modalName, module, data = null) {
    if (!this.enabled) return
    
    this.log({
      accion: 'abrir_modal',
      modelo: module,
      metadata: {
        modal: modalName,
        datos: data,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log de cierre de modal
   */
  logModalClose(modalName, module) {
    if (!this.enabled) return
    
    this.log({
      accion: 'cerrar_modal',
      modelo: module,
      metadata: {
        modal: modalName,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log de búsqueda
   */
  logSearch(searchTerm, module, results = null) {
    if (!this.enabled) return
    
    this.log({
      accion: 'buscar',
      modelo: module,
      metadata: {
        termino: searchTerm,
        resultados: results,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log de aplicar filtros
   */
  logFilter(filterName, filterValue, module) {
    if (!this.enabled) return
    
    this.log({
      accion: 'aplicar_filtro',
      modelo: module,
      metadata: {
        filtro: filterName,
        valor: filterValue,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log de envío de formulario
   */
  logFormSubmit(formName, module, data = null) {
    if (!this.enabled) return
    
    this.log({
      accion: 'enviar_formulario',
      modelo: module,
      metadata: {
        formulario: formName,
        datos: data,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log de descarga de archivo
   */
  logDownload(fileName, fileType, module) {
    if (!this.enabled) return
    
    this.log({
      accion: 'descargar_archivo',
      modelo: module,
      metadata: {
        archivo: fileName,
        tipo: fileType,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log de exportación
   */
  logExport(exportType, module, recordCount = null) {
    if (!this.enabled) return
    
    this.log({
      accion: 'exportar_datos',
      modelo: module,
      metadata: {
        tipo_exportacion: exportType,
        cantidad_registros: recordCount,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log de cambio de tab
   */
  logTabChange(tabName, module) {
    if (!this.enabled) return
    
    this.log({
      accion: 'cambiar_tab',
      modelo: module,
      metadata: {
        tab: tabName,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log de error de usuario
   */
  logError(errorMessage, module, context = null) {
    if (!this.enabled) return
    
    this.log({
      accion: 'error_usuario',
      modelo: module,
      metadata: {
        error: errorMessage,
        contexto: context,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log genérico personalizado
   */
  logCustomAction(action, module, metadata = {}) {
    if (!this.enabled) return
    
    this.log({
      accion: action,
      modelo: module,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Agregar log a la cola
   */
  log(logData) {
    this.queue.push({
      ...logData,
      url: window.location.pathname,
      user_agent: navigator.userAgent
    })

    // Si la cola está llena, enviar inmediatamente
    if (this.queue.length >= this.batchSize) {
      this.flush()
    }
  }

  /**
   * Enviar logs al backend
   */
  async flush() {
    if (this.queue.length === 0) return

    const logsToSend = [...this.queue]
    this.queue = []

    try {
      await api.post('/api/auditoria/log-frontend/', {
        logs: logsToSend
      })
      console.log(`✅ ${logsToSend.length} logs enviados al backend`)
    } catch (error) {
      console.error('❌ Error enviando logs:', error)
      // Volver a agregar a la cola si falla
      this.queue.unshift(...logsToSend)
    }
  }

  /**
   * Iniciar envío automático por lotes
   */
  startBatchFlush() {
    setInterval(() => {
      this.flush()
    }, this.flushInterval)

    // Enviar logs antes de cerrar la ventana
    window.addEventListener('beforeunload', () => {
      if (this.queue.length > 0) {
        // Usar sendBeacon para envío síncrono
        const blob = new Blob([JSON.stringify({ logs: this.queue })], {
          type: 'application/json'
        })
        navigator.sendBeacon('/api/auditoria/log-frontend/', blob)
      }
    })
  }

  /**
   * Habilitar auditoría
   */
  enable() {
    this.enabled = true
  }

  /**
   * Deshabilitar auditoría
   */
  disable() {
    this.enabled = false
  }
}

// Exportar instancia única
const auditLogger = new AuditLogger()
export default auditLogger
