/**
 * Hook personalizado para auditoría fácil
 * ========================================
 * 
 * Uso:
 * const audit = useAudit('NombreModulo')
 * audit.button('Crear Prestamo')
 * audit.modal('Editar Usuario', { id: 123 })
 * audit.search('admin')
 */

import { useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import auditLogger from '../services/auditLogger'

export const useAudit = (moduleName = 'General') => {
  const location = useLocation()

  // Log automático cuando se monta el componente (visita la página)
  useEffect(() => {
    auditLogger.logNavigation(
      document.referrer || 'inicio',
      location.pathname
    )
  }, [location.pathname])

  return {
    // Log de botones
    button: useCallback((buttonName, action = null) => {
      auditLogger.logButtonClick(buttonName, moduleName, action)
    }, [moduleName]),

    // Log de modales
    modalOpen: useCallback((modalName, data = null) => {
      auditLogger.logModalOpen(modalName, moduleName, data)
    }, [moduleName]),

    modalClose: useCallback((modalName) => {
      auditLogger.logModalClose(modalName, moduleName)
    }, [moduleName]),

    // Log de búsquedas
    search: useCallback((searchTerm, results = null) => {
      auditLogger.logSearch(searchTerm, moduleName, results)
    }, [moduleName]),

    // Log de filtros
    filter: useCallback((filterName, filterValue) => {
      auditLogger.logFilter(filterName, filterValue, moduleName)
    }, [moduleName]),

    // Log de formularios
    formSubmit: useCallback((formName, data = null) => {
      auditLogger.logFormSubmit(formName, moduleName, data)
    }, [moduleName]),

    // Log de descargas
    download: useCallback((fileName, fileType) => {
      auditLogger.logDownload(fileName, fileType, moduleName)
    }, [moduleName]),

    // Log de exportaciones
    export: useCallback((exportType, recordCount = null) => {
      auditLogger.logExport(exportType, moduleName, recordCount)
    }, [moduleName]),

    // Log de cambio de tab
    tab: useCallback((tabName) => {
      auditLogger.logTabChange(tabName, moduleName)
    }, [moduleName]),

    // Log de errores
    error: useCallback((errorMessage, context = null) => {
      auditLogger.logError(errorMessage, moduleName, context)
    }, [moduleName]),

    // Log personalizado
    custom: useCallback((action, metadata = {}) => {
      auditLogger.logCustomAction(action, moduleName, metadata)
    }, [moduleName])
  }
}

export default useAudit
