/**
 * ConfiguracionContext
 * Provee la configuración general del sistema a todos los componentes.
 * Carga moneda, símbolo, zona horaria, formato de fecha y locale.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import configuracionService from '../services/configuracionService'
import { getLocaleForCurrency } from '../data/currencies'
import { useAuth } from './AuthContext'

const ConfiguracionContext = createContext(null)

// Defaults que coinciden con el backend
const DEFAULTS = {
  moneda: 'COP',
  simbolo_moneda: '$',
  zona_horaria: 'America/Bogota',
  formato_fecha: '%d/%m/%Y',
  locale: 'es-CO',
}

// Mapeo de formato Python → Intl options
const FORMATO_MAP = {
  '%d/%m/%Y': { day: '2-digit', month: '2-digit', year: 'numeric' },
  '%m/%d/%Y': { month: '2-digit', day: '2-digit', year: 'numeric' },
  '%Y-%m-%d': { year: 'numeric', month: '2-digit', day: '2-digit' },
}

export const ConfiguracionProvider = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [config, setConfig] = useState(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  const loadConfig = useCallback(async () => {
    if (!isAuthenticated) {
      setConfig(DEFAULTS)
      setLoaded(true)
      return
    }
    try {
      const data = await configuracionService.getConfiguracionGeneral()
      if (data && data.moneda) {
        const locale = getLocaleForCurrency(data.moneda)
        setConfig({
          moneda: data.moneda || DEFAULTS.moneda,
          simbolo_moneda: data.simbolo_moneda || DEFAULTS.simbolo_moneda,
          zona_horaria: data.zona_horaria || DEFAULTS.zona_horaria,
          formato_fecha: data.formato_fecha || DEFAULTS.formato_fecha,
          locale,
        })
      }
    } catch {
      // Si falla, usar defaults
    } finally {
      setLoaded(true)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  /**
   * Formatea un valor numérico como moneda usando la config del sistema
   */
  const formatCurrency = useCallback((value) => {
    if (value === null || value === undefined || value === '') return `${config.simbolo_moneda} 0`
    try {
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.moneda,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Number(value))
    } catch {
      // Fallback si Intl no soporta la moneda
      return `${config.simbolo_moneda} ${Number(value).toLocaleString()}`
    }
  }, [config.locale, config.moneda, config.simbolo_moneda])

  /**
   * Formatea una fecha según la configuración del sistema
   */
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      const options = FORMATO_MAP[config.formato_fecha] || FORMATO_MAP['%d/%m/%Y']
      return date.toLocaleDateString(config.locale, options)
    } catch {
      return dateStr
    }
  }, [config.locale, config.formato_fecha])

  /**
   * Formatea fecha + hora
   */
  const formatDateTime = useCallback((dateStr) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      const dateOpts = FORMATO_MAP[config.formato_fecha] || FORMATO_MAP['%d/%m/%Y']
      return date.toLocaleString(config.locale, {
        ...dateOpts,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateStr
    }
  }, [config.locale, config.formato_fecha])

  /**
   * Formatea un número genérico
   */
  const formatNumber = useCallback((value, decimals = 0) => {
    if (value === null || value === undefined) return '0'
    return Number(value).toLocaleString(config.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }, [config.locale])

  /**
   * Recarga la configuración (ej: después de guardar cambios)
   */
  const reloadConfig = useCallback(() => {
    return loadConfig()
  }, [loadConfig])

  const value = {
    ...config,
    loaded,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatNumber,
    reloadConfig,
  }

  return (
    <ConfiguracionContext.Provider value={value}>
      {children}
    </ConfiguracionContext.Provider>
  )
}

/**
 * Hook para acceder a la configuración y formateadores
 * 
 * Uso:
 *   const { formatCurrency, formatDate, moneda } = useConfiguracion()
 *   formatCurrency(150000)  // → "$150.000"
 *   formatDate('2026-02-18') // → "18/02/2026"
 */
export const useConfiguracion = () => {
  const ctx = useContext(ConfiguracionContext)
  if (!ctx) {
    // Si se usa fuera del provider (ej: LandingPage, RegisterPage), retornar defaults
    return {
      ...DEFAULTS,
      loaded: false,
      formatCurrency: (v) => `$ ${Number(v || 0).toLocaleString('es-CO')}`,
      formatDate: (d) => d ? new Date(d).toLocaleDateString('es-CO') : '',
      formatDateTime: (d) => d ? new Date(d).toLocaleString('es-CO') : '',
      formatNumber: (v) => Number(v || 0).toLocaleString('es-CO'),
      reloadConfig: () => {},
    }
  }
  return ctx
}

export default ConfiguracionContext
