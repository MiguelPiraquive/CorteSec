import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import configuracionService from '../../services/configuracionService'
import Can from '../../components/permissions/Can'
import { usePermissions } from '../../context/PermissionsContext'
import { useConfiguracion } from '../../context/ConfiguracionContext'
import useProductTour from '../../hooks/useProductTour'
import { TOUR_CONFIGS } from '../../data/tourConfigs'
import currencies, { getSymbolForCurrency } from '../../data/currencies'
import {
  SettingsIcon,
  BuildingIcon,
  CoinsIcon,
  ClockIcon,
  BookOpenIcon,
  SaveIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  UploadIcon,
  XIcon,
  Loader2Icon,
  RefreshCwIcon,
  ArrowRightLeftIcon,
  TrendingUpIcon
} from 'lucide-react'

const ConfiguracionGeneralPage = () => {
  const audit = useAudit('Configuración General')
  const { hasPermission, initialized } = usePermissions()
  const { reloadConfig } = useConfiguracion()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useProductTour('configuracion', TOUR_CONFIGS.configuracion.steps, {
    ready: !loading && initialized,
  })
  const [activeTab, setActiveTab] = useState('empresa')
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  const [logoPreview, setLogoPreview] = useState(null)

  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState(null)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [ratesError, setRatesError] = useState('')
  const [converterFrom, setConverterFrom] = useState(1)
  const [converterTo, setConverterTo] = useState('USD')
  
  const [formData, setFormData] = useState({
    // Información de la empresa
    nombre_empresa: '',
    nit: '',
    direccion: '',
    telefono: '',
    email: '',
    sitio_web: '',
    logo: null,
    
    // Configuración de moneda
    moneda: 'COP',
    simbolo_moneda: '$',
    
    // Configuración de fechas y horarios
    zona_horaria: 'America/Bogota',
    formato_fecha: '%d/%m/%Y',
    
    // Configuración contable
    cuenta_efectivo_defecto: '',
    cuenta_nomina_defecto: '',
    cuenta_prestamos_defecto: '',
    cuenta_intereses_prestamo_defecto: '',
    cuenta_mora_prestamo_defecto: '',
    cuenta_otras_deducciones_defecto: '',
  })

  useEffect(() => {
    loadConfiguracion()
  }, [])

  const loadExchangeRates = async (base) => {
    setRatesLoading(true)
    setRatesError('')
    try {
      const data = await configuracionService.getExchangeRates(base || formData.moneda)
      setExchangeRates(data)
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al obtener tasas de cambio'
      setRatesError(msg)
    } finally {
      setRatesLoading(false)
    }
  }

  const getConvertedAmount = () => {
    if (!exchangeRates?.rates || !converterTo) return null
    const rate = exchangeRates.rates[converterTo]
    if (!rate) return null
    return converterFrom * rate
  }

  const loadConfiguracion = async () => {
    try {
      setLoading(true)
      const data = await configuracionService.getConfiguracionGeneral()
      
      setFormData(prev => ({
        ...prev,
        ...data
      }))
      
      if (data.logo) {
        setLogoPreview(data.logo)
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error)
      showNotification('error', 'Error al cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const handleInputChange = (field, value) => {
    if (field === 'moneda') {
      // Auto-actualizar símbolo al cambiar moneda
      const symbol = getSymbolForCurrency(value)
      setFormData(prev => ({ ...prev, moneda: value, simbolo_moneda: symbol }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({ ...formData, logo: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await configuracionService.updateConfiguracionGeneral(formData)
      audit.button('actualizar_configuracion', { seccion: activeTab })
      showNotification('success', 'Configuración guardada exitosamente')
      await loadConfiguracion()
      await reloadConfig() // Actualizar contexto global de moneda/fechas
    } catch (error) {
      console.error('Error al guardar:', error)
      let msg = 'Error al guardar la configuración'
      if (error.response?.data) {
        const errs = error.response.data
        const details = Object.entries(errs)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join(', ')
        if (details) msg += ': ' + details
      }
      showNotification('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'empresa', label: 'Información Empresa', icon: BuildingIcon },
    { id: 'moneda', label: 'Moneda', icon: CoinsIcon },
    { id: 'fechas', label: 'Fechas y Horarios', icon: ClockIcon },
    { id: 'contabilidad', label: 'Contabilidad (PUC)', icon: BookOpenIcon },
  ]

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('configuracion.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center space-x-3">
          <Loader2Icon className="w-8 h-8 text-green-500 animate-spin" />
          <span className="text-gray-600">Cargando configuración...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${
          notification.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
        }`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckCircleIcon className="w-6 h-6" /> : <AlertCircleIcon className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div id="tour-config-header" className="backdrop-blur-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <SettingsIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Configuración General</h1>
              <p className="text-blue-100 mt-1">Administra los parámetros principales del sistema</p>
              {formData.fecha_modificacion && (
                <p className="text-blue-200 text-xs mt-2">
                  Última modificación: {new Date(formData.fecha_modificacion).toLocaleString('es-CO')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-x-auto">
        <div className="flex space-x-2 p-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div id="tour-config-content" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
          
          {/* Información de la Empresa */}
          {activeTab === 'empresa' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Información de la Empresa</h2>
              
              {/* Logo */}
              <div className="flex flex-col items-center space-y-4 mb-6">
                <div className="relative">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-32 h-32 object-contain border-4 border-blue-500 rounded-2xl shadow-lg" />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-2xl flex items-center justify-center border-4 border-gray-300">
                      <BuildingIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 p-2 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 transition-all shadow-lg">
                    <UploadIcon className="w-5 h-5" />
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
                <p className="text-sm text-gray-600">Click para cargar logo de la empresa</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre de la Empresa *</label>
                  <input
                    type="text"
                    value={formData.nombre_empresa}
                    onChange={(e) => handleInputChange('nombre_empresa', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">NIT *</label>
                  <input
                    type="text"
                    value={formData.nit}
                    onChange={(e) => handleInputChange('nit', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección *</label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    rows="2"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono *</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sitio Web</label>
                  <input
                    type="url"
                    value={formData.sitio_web || ''}
                    onChange={(e) => handleInputChange('sitio_web', e.target.value)}
                    placeholder="https://www.ejemplo.com"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Moneda */}
          {activeTab === 'moneda' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración de Moneda</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Moneda del Sistema *</label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => handleInputChange('moneda', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  >
                    {currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name} ({c.symbol})</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Esta moneda se usa en todo el sistema: nómina, préstamos, items, dashboard</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Símbolo de Moneda</label>
                  <input
                    type="text"
                    value={formData.simbolo_moneda}
                    onChange={(e) => handleInputChange('simbolo_moneda', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    maxLength="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Se actualiza automáticamente al cambiar la moneda</p>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Vista previa:</strong>{' '}
                  {(() => {
                    try {
                      return new Intl.NumberFormat(
                        currencies.find(c => c.code === formData.moneda)?.locale || 'es-CO',
                        { style: 'currency', currency: formData.moneda, minimumFractionDigits: 0 }
                      ).format(1500000)
                    } catch {
                      return `${formData.simbolo_moneda} 1,500,000`
                    }
                  })()}
                </p>
              </div>

              {/* Tasas de Cambio en Vivo */}
              <div className="border-t-2 border-gray-100 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUpIcon className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-gray-800">Tasas de Cambio en Vivo</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadExchangeRates()}
                    disabled={ratesLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-all text-sm font-semibold disabled:opacity-50"
                  >
                    <RefreshCwIcon className={`w-4 h-4 ${ratesLoading ? 'animate-spin' : ''}`} />
                    <span>{ratesLoading ? 'Cargando...' : exchangeRates ? 'Actualizar' : 'Cargar Tasas'}</span>
                  </button>
                </div>

                {ratesError && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                    <p className="text-sm text-red-700">{ratesError}</p>
                  </div>
                )}

                {exchangeRates?.rates && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                      {Object.entries(exchangeRates.rates).map(([code, rate]) => {
                        const currInfo = currencies.find(c => c.code === code)
                        return (
                          <div key={code} className="bg-gray-50 border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900 text-sm">{code}</span>
                              <span className="text-xs text-gray-500">{currInfo?.symbol || ''}</span>
                            </div>
                            <p className="text-lg font-semibold text-green-700 mt-1">{rate < 0.01 ? rate.toFixed(6) : rate < 1 ? rate.toFixed(4) : rate.toFixed(2)}</p>
                            <p className="text-xs text-gray-500 truncate" title={currInfo?.name}>{currInfo?.name || code}</p>
                          </div>
                        )
                      })}
                    </div>

                    <p className="text-xs text-gray-400 mb-4">
                      Base: {exchangeRates.base} · {exchangeRates.cached ? 'Desde caché' : 'Actualizado'} · Fecha: {exchangeRates.date}
                    </p>

                    {/* Convertidor */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-5">
                      <div className="flex items-center space-x-2 mb-4">
                        <ArrowRightLeftIcon className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-bold text-indigo-900">Convertidor de Moneda</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-indigo-700 mb-1">Cantidad ({exchangeRates.base})</label>
                          <input
                            type="number"
                            value={converterFrom}
                            onChange={(e) => setConverterFrom(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all text-lg font-semibold"
                            min="0"
                            step="any"
                          />
                        </div>
                        <div className="flex items-center justify-center">
                          <ArrowRightLeftIcon className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-indigo-700 mb-1">Moneda destino</label>
                          <select
                            value={converterTo}
                            onChange={(e) => setConverterTo(e.target.value)}
                            className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                          >
                            {Object.keys(exchangeRates.rates).map(code => {
                              const ci = currencies.find(c => c.code === code)
                              return <option key={code} value={code}>{code} - {ci?.name || code}</option>
                            })}
                          </select>
                        </div>
                      </div>
                      {getConvertedAmount() !== null && (
                        <div className="mt-4 bg-white rounded-xl p-4 border border-indigo-200">
                          <p className="text-center">
                            <span className="text-gray-600">
                              {(() => {
                                try {
                                  return new Intl.NumberFormat(
                                    currencies.find(c => c.code === exchangeRates.base)?.locale || 'es-CO',
                                    { style: 'currency', currency: exchangeRates.base, minimumFractionDigits: 2 }
                                  ).format(converterFrom)
                                } catch { return `${converterFrom} ${exchangeRates.base}` }
                              })()}
                            </span>
                            <span className="mx-3 text-indigo-400">=</span>
                            <span className="text-2xl font-bold text-indigo-700">
                              {(() => {
                                try {
                                  return new Intl.NumberFormat(
                                    currencies.find(c => c.code === converterTo)?.locale || 'en-US',
                                    { style: 'currency', currency: converterTo, minimumFractionDigits: 2 }
                                  ).format(getConvertedAmount())
                                } catch { return `${getConvertedAmount().toFixed(2)} ${converterTo}` }
                              })()}
                            </span>
                          </p>
                          <p className="text-center text-xs text-gray-500 mt-2">
                            1 {exchangeRates.base} = {exchangeRates.rates[converterTo]?.toFixed(4)} {converterTo}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!exchangeRates && !ratesLoading && !ratesError && (
                  <div className="text-center py-8 text-gray-400">
                    <TrendingUpIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Haz clic en "Cargar Tasas" para ver las tasas de cambio en vivo</p>
                    <p className="text-xs mt-1">Powered by Fixer.io · Datos actualizados cada 6 horas</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fechas y Horarios */}
          {activeTab === 'fechas' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración de Fechas y Horarios</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Zona Horaria *</label>
                  <select
                    value={formData.zona_horaria}
                    onChange={(e) => handleInputChange('zona_horaria', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  >
                    <optgroup label="América">
                      <option value="America/Bogota">Bogotá, Colombia (UTC-5)</option>
                      <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                      <option value="America/Lima">Lima, Perú (UTC-5)</option>
                      <option value="America/Buenos_Aires">Buenos Aires, Argentina (UTC-3)</option>
                      <option value="America/Santiago">Santiago, Chile (UTC-4)</option>
                      <option value="America/Sao_Paulo">São Paulo, Brasil (UTC-3)</option>
                      <option value="America/Caracas">Caracas, Venezuela (UTC-4)</option>
                      <option value="America/Guayaquil">Guayaquil, Ecuador (UTC-5)</option>
                      <option value="America/La_Paz">La Paz, Bolivia (UTC-4)</option>
                      <option value="America/Panama">Panamá (UTC-5)</option>
                      <option value="America/Montevideo">Montevideo, Uruguay (UTC-3)</option>
                      <option value="America/Asuncion">Asunción, Paraguay (UTC-4)</option>
                      <option value="America/New_York">Nueva York, EEUU (UTC-5)</option>
                      <option value="America/Chicago">Chicago, EEUU (UTC-6)</option>
                      <option value="America/Denver">Denver, EEUU (UTC-7)</option>
                      <option value="America/Los_Angeles">Los Ángeles, EEUU (UTC-8)</option>
                      <option value="America/Toronto">Toronto, Canadá (UTC-5)</option>
                    </optgroup>
                    <optgroup label="Europa">
                      <option value="Europe/Madrid">Madrid, España (UTC+1)</option>
                      <option value="Europe/London">Londres, UK (UTC+0)</option>
                      <option value="Europe/Paris">París, Francia (UTC+1)</option>
                      <option value="Europe/Berlin">Berlín, Alemania (UTC+1)</option>
                      <option value="Europe/Rome">Roma, Italia (UTC+1)</option>
                    </optgroup>
                    <optgroup label="Asia/Oceanía">
                      <option value="Asia/Tokyo">Tokio, Japón (UTC+9)</option>
                      <option value="Asia/Shanghai">Shanghái, China (UTC+8)</option>
                      <option value="Asia/Dubai">Dubái, EAU (UTC+4)</option>
                      <option value="Asia/Kolkata">India (UTC+5:30)</option>
                      <option value="Australia/Sydney">Sídney, Australia (UTC+11)</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Afecta la hora mostrada en fechas del sistema</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Formato de Fecha *</label>
                  <select
                    value={formData.formato_fecha}
                    onChange={(e) => handleInputChange('formato_fecha', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="%d/%m/%Y">DD/MM/YYYY (31/12/2026)</option>
                    <option value="%m/%d/%Y">MM/DD/YYYY (12/31/2026)</option>
                    <option value="%Y-%m-%d">YYYY-MM-DD (2026-12-31)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Este formato se usa en todas las fechas del sistema</p>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Vista previa:</strong>{' '}
                  {(() => {
                    const now = new Date()
                    const fmt = formData.formato_fecha
                    const pad = (n) => String(n).padStart(2, '0')
                    const d = pad(now.getDate()), m = pad(now.getMonth() + 1), y = now.getFullYear()
                    if (fmt === '%m/%d/%Y') return `${m}/${d}/${y}`
                    if (fmt === '%Y-%m-%d') return `${y}-${m}-${d}`
                    return `${d}/${m}/${y}`
                  })()}
                  {' — '}
                  {new Date().toLocaleTimeString('es-CO', { timeZone: formData.zona_horaria, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  {' '}<span className="text-blue-600 font-mono text-xs">({formData.zona_horaria})</span>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'contabilidad' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración Contable (PUC)</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cuenta Efectivo por Defecto</label>
                  <input
                    type="text"
                    value={formData.cuenta_efectivo_defecto || ''}
                    onChange={(e) => handleInputChange('cuenta_efectivo_defecto', e.target.value)}
                    placeholder="Ej: 1105"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Caja/Bancos</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cuenta Nómina (Gasto)</label>
                  <input
                    type="text"
                    value={formData.cuenta_nomina_defecto || ''}
                    onChange={(e) => handleInputChange('cuenta_nomina_defecto', e.target.value)}
                    placeholder="Ej: 5105"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Gasto de nómina bruto</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cuenta Préstamos (Capital)</label>
                  <input
                    type="text"
                    value={formData.cuenta_prestamos_defecto || ''}
                    onChange={(e) => handleInputChange('cuenta_prestamos_defecto', e.target.value)}
                    placeholder="Ej: 1365"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Cuentas por cobrar a trabajadores</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cuenta Intereses Préstamo</label>
                  <input
                    type="text"
                    value={formData.cuenta_intereses_prestamo_defecto || ''}
                    onChange={(e) => handleInputChange('cuenta_intereses_prestamo_defecto', e.target.value)}
                    placeholder="Ej: 421005"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ingresos financieros</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cuenta Mora Préstamo</label>
                  <input
                    type="text"
                    value={formData.cuenta_mora_prestamo_defecto || ''}
                    onChange={(e) => handleInputChange('cuenta_mora_prestamo_defecto', e.target.value)}
                    placeholder="Ej: 4175"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ingresos por mora</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cuenta Otras Deducciones</label>
                  <input
                    type="text"
                    value={formData.cuenta_otras_deducciones_defecto || ''}
                    onChange={(e) => handleInputChange('cuenta_otras_deducciones_defecto', e.target.value)}
                    placeholder="Ej: 2370"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Retenciones, libranzas, embargos</p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={loadConfiguracion}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
            >
              <XIcon className="w-5 h-5 inline mr-2" />
              Cancelar
            </button>
            <Can permission="configuracion.change">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
              >
                {saving ? (
                  <>
                    <Loader2Icon className="w-5 h-5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-5 h-5" />
                    <span>Guardar Configuración</span>
                  </>
                )}
              </button>
            </Can>
          </div>
        </div>
      </form>
    </div>
  )
}

export default ConfiguracionGeneralPage
