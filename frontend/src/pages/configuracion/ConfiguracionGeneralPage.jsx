import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import configuracionService from '../../services/configuracionService'
import {
  SettingsIcon,
  BuildingIcon,
  CoinsIcon,
  ClockIcon,
  CalendarIcon,
  SaveIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  UploadIcon,
  XIcon,
  Loader2Icon
} from 'lucide-react'

const ConfiguracionGeneralPage = () => {
  const audit = useAudit('Configuración General')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('empresa')
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  const [logoPreview, setLogoPreview] = useState(null)
  
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
    
    // Configuración de nómina
    dia_pago_nomina: 30,
    periodo_nomina: 'mensual',
    
    // Configuración contable
    cuenta_efectivo_defecto: '',
    cuenta_nomina_defecto: '',
  })

  useEffect(() => {
    loadConfiguracion()
  }, [])

  const loadConfiguracion = async () => {
    try {
      setLoading(true)
      const data = await configuracionService.getConfiguracionGeneral()
      console.log('📋 Configuración cargada:', data)
      
      setFormData({
        ...formData,
        ...data
      })
      
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
    setFormData({ ...formData, [field]: value })
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
      await loadConfiguracion() // Recargar para obtener la URL del logo guardado
    } catch (error) {
      console.error('Error al guardar:', error)
      showNotification('error', 'Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'empresa', label: 'Información Empresa', icon: BuildingIcon },
    { id: 'moneda', label: 'Moneda y Formato', icon: CoinsIcon },
    { id: 'fechas', label: 'Fechas y Horarios', icon: ClockIcon },
    { id: 'nomina', label: 'Nómina', icon: CalendarIcon },
  ]

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
      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <SettingsIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Configuración General</h1>
              <p className="text-blue-100 mt-1">Administra los parámetros principales del sistema</p>
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
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
          
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

          {/* Moneda y Formato */}
          {activeTab === 'moneda' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración de Moneda</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código de Moneda *</label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => handleInputChange('moneda', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="COP">COP - Peso Colombiano</option>
                    <option value="USD">USD - Dólar Estadounidense</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="MXN">MXN - Peso Mexicano</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Símbolo de Moneda *</label>
                  <input
                    type="text"
                    value={formData.simbolo_moneda}
                    onChange={(e) => handleInputChange('simbolo_moneda', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    maxLength="5"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Vista previa:</strong> {formData.simbolo_moneda} 1,000,000.00 {formData.moneda}
                </p>
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
                    <option value="America/Bogota">America/Bogota (UTC-5)</option>
                    <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                  </select>
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
                </div>
              </div>
            </div>
          )}

          {/* Nómina */}
          {activeTab === 'nomina' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración de Nómina</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Día de Pago de Nómina *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dia_pago_nomina}
                    onChange={(e) => handleInputChange('dia_pago_nomina', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Día del mes para el pago (1-31)</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Período de Nómina *</label>
                  <select
                    value={formData.periodo_nomina}
                    onChange={(e) => handleInputChange('periodo_nomina', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cuenta Efectivo por Defecto</label>
                  <input
                    type="text"
                    value={formData.cuenta_efectivo_defecto || ''}
                    onChange={(e) => handleInputChange('cuenta_efectivo_defecto', e.target.value)}
                    placeholder="Ej: 110505"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Código de cuenta contable</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cuenta Nómina por Defecto</label>
                  <input
                    type="text"
                    value={formData.cuenta_nomina_defecto || ''}
                    onChange={(e) => handleInputChange('cuenta_nomina_defecto', e.target.value)}
                    placeholder="Ej: 510506"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Código de cuenta contable</p>
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
          </div>
        </div>
      </form>
    </div>
  )
}

export default ConfiguracionGeneralPage
