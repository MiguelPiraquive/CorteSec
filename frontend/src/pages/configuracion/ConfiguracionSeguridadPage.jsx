import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import { usePermissions } from '../../context/PermissionsContext'
import configuracionService from '../../services/configuracionService'
import {
  ShieldIcon,
  SaveIcon,
  XIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  ClockIcon,
  LockIcon,
  KeyIcon,
  FileTextIcon,
  UsersIcon,
  BellIcon
} from 'lucide-react'

const ConfiguracionSeguridadPage = () => {
  const audit = useAudit('Configuración de Seguridad')
  const { hasPermission, initialized } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('sesiones')
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  
  const [formData, setFormData] = useState({
    // Sesiones
    tiempo_sesion: 30,
    max_intentos_login: 3,
    tiempo_bloqueo: 15,
    
    // Contraseñas
    longitud_minima_password: 8,
    requiere_mayusculas: true,
    requiere_minusculas: true,
    requiere_numeros: true,
    requiere_simbolos: true,
    dias_expiracion_password: 90,
    historial_passwords: 5,
    
    // Auditoría
    habilitar_auditoria: true,
    dias_retencion_logs: 365,
    
    // Acceso
    permitir_multiples_sesiones: false,
    ips_permitidas: '',
    
    // Notificaciones
    notificar_login_fallido: true,
    notificar_cambio_password: true,
  })

  useEffect(() => {
    loadConfiguracion()
  }, [])

  const loadConfiguracion = async () => {
    try {
      setLoading(true)
      const data = await configuracionService.getConfiguracionSeguridad()
      setFormData({
        ...formData,
        ...data
      })
    } catch (error) {
      console.error('Error al cargar configuración:', error)
      showNotification('error', 'Error al cargar la configuración de seguridad')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validaciones
    if (formData.tiempo_sesion < 5 || formData.tiempo_sesion > 480) {
      showNotification('error', 'El tiempo de sesión debe estar entre 5 y 480 minutos')
      return
    }
    
    if (formData.longitud_minima_password < 4 || formData.longitud_minima_password > 50) {
      showNotification('error', 'La longitud mínima de contraseña debe estar entre 4 y 50 caracteres')
      return
    }

    try {
      setSaving(true)
      await configuracionService.updateConfiguracionSeguridad(formData)
      audit.button('actualizar_configuracion_seguridad', { seccion: activeTab })
      showNotification('success', 'Configuración de seguridad guardada exitosamente')
      await loadConfiguracion()
    } catch (error) {
      console.error('Error al guardar:', error)
      showNotification('error', 'Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'sesiones', label: 'Sesiones', icon: ClockIcon },
    { id: 'passwords', label: 'Contraseñas', icon: LockIcon },
    { id: 'auditoria', label: 'Auditoría', icon: FileTextIcon },
    { id: 'acceso', label: 'Control de Acceso', icon: UsersIcon },
    { id: 'notificaciones', label: 'Notificaciones', icon: BellIcon },
  ]

  if (!initialized) return <div className="flex items-center justify-center h-screen"><Loader2Icon className="w-8 h-8 text-green-500 animate-spin" /></div>
  if (!hasPermission('configuracion.manage_seguridad')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

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
      <div className="backdrop-blur-xl bg-gradient-to-br from-red-500 via-orange-600 to-yellow-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <ShieldIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Configuración de Seguridad</h1>
              <p className="text-orange-100 mt-1">Administra las políticas de seguridad del sistema</p>
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
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
          
          {/* Configuración de Sesiones */}
          {activeTab === 'sesiones' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración de Sesiones</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tiempo de Sesión (minutos) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={formData.tiempo_sesion}
                    onChange={(e) => handleInputChange('tiempo_sesion', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Tiempo de inactividad antes de cerrar sesión (5-480 min)</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Máximo Intentos de Login *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_intentos_login}
                    onChange={(e) => handleInputChange('max_intentos_login', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Intentos fallidos antes de bloquear cuenta</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tiempo de Bloqueo (minutos) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={formData.tiempo_bloqueo}
                    onChange={(e) => handleInputChange('tiempo_bloqueo', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Duración del bloqueo por intentos fallidos</p>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Configuración actual:</strong> Las sesiones expirarán después de {formData.tiempo_sesion} minutos de inactividad. 
                  Después de {formData.max_intentos_login} intentos fallidos, la cuenta se bloqueará por {formData.tiempo_bloqueo} minutos.
                </p>
              </div>
            </div>
          )}

          {/* Configuración de Contraseñas */}
          {activeTab === 'passwords' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Políticas de Contraseñas</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Longitud Mínima *
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="50"
                    value={formData.longitud_minima_password}
                    onChange={(e) => handleInputChange('longitud_minima_password', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Mínimo de caracteres (4-50)</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Días para Expiración *
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="365"
                    value={formData.dias_expiracion_password}
                    onChange={(e) => handleInputChange('dias_expiracion_password', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Cada cuántos días expira la contraseña</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Historial de Contraseñas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.historial_passwords}
                    onChange={(e) => handleInputChange('historial_passwords', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Contraseñas anteriores que no se pueden reutilizar</p>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-bold text-gray-800">Requisitos de Complejidad</h3>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiere_mayusculas}
                    onChange={(e) => handleInputChange('requiere_mayusculas', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Requiere al menos una letra mayúscula (A-Z)
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiere_minusculas}
                    onChange={(e) => handleInputChange('requiere_minusculas', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Requiere al menos una letra minúscula (a-z)
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiere_numeros}
                    onChange={(e) => handleInputChange('requiere_numeros', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Requiere al menos un número (0-9)
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiere_simbolos}
                    onChange={(e) => handleInputChange('requiere_simbolos', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Requiere al menos un símbolo especial (!@#$%^&*)
                  </span>
                </label>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Nota:</strong> Los cambios en las políticas de contraseñas afectarán a todos los usuarios. 
                  Los usuarios existentes deberán actualizar sus contraseñas en el próximo inicio de sesión si no cumplen con los nuevos requisitos.
                </p>
              </div>
            </div>
          )}

          {/* Configuración de Auditoría */}
          {activeTab === 'auditoria' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración de Auditoría</h2>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.habilitar_auditoria}
                  onChange={(e) => handleInputChange('habilitar_auditoria', e.target.checked)}
                  className="w-6 h-6 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                />
                <div>
                  <span className="text-base font-semibold text-gray-700">
                    Habilitar sistema de auditoría
                  </span>
                  <p className="text-sm text-gray-500">Registrar todas las acciones de los usuarios en el sistema</p>
                </div>
              </label>

              {formData.habilitar_auditoria && (
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Días de Retención de Logs *
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="3650"
                    value={formData.dias_retencion_logs}
                    onChange={(e) => handleInputChange('dias_retencion_logs', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Número de días para mantener los logs de auditoría (30-3650 días)
                  </p>
                </div>
              )}

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-green-800">
                  <strong>✓ Recomendación:</strong> Mantener la auditoría habilitada es crucial para el cumplimiento normativo 
                  y la seguridad del sistema. Se recomienda un período de retención de al menos 365 días.
                </p>
              </div>
            </div>
          )}

          {/* Control de Acceso */}
          {activeTab === 'acceso' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Control de Acceso</h2>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.permitir_multiples_sesiones}
                  onChange={(e) => handleInputChange('permitir_multiples_sesiones', e.target.checked)}
                  className="w-6 h-6 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                />
                <div>
                  <span className="text-base font-semibold text-gray-700">
                    Permitir múltiples sesiones simultáneas
                  </span>
                  <p className="text-sm text-gray-500">
                    Permitir que un usuario tenga sesiones activas en múltiples dispositivos
                  </p>
                </div>
              </label>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  IPs Permitidas (opcional)
                </label>
                <textarea
                  value={formData.ips_permitidas || ''}
                  onChange={(e) => handleInputChange('ips_permitidas', e.target.value)}
                  rows="4"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all font-mono text-sm"
                  placeholder="192.168.1.1, 10.0.0.1, 172.16.0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lista de direcciones IP permitidas separadas por comas. Dejar vacío para permitir todas.
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Si configura IPs permitidas, solo los usuarios conectados desde esas 
                  direcciones podrán acceder al sistema. Asegúrese de incluir su IP actual para no perder el acceso.
                </p>
              </div>
            </div>
          )}

          {/* Notificaciones de Seguridad */}
          {activeTab === 'notificaciones' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Notificaciones de Seguridad</h2>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notificar_login_fallido}
                  onChange={(e) => handleInputChange('notificar_login_fallido', e.target.checked)}
                  className="w-6 h-6 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                />
                <div>
                  <span className="text-base font-semibold text-gray-700">
                    Notificar intentos de login fallidos
                  </span>
                  <p className="text-sm text-gray-500">
                    Enviar notificación al administrador cuando hay múltiples intentos fallidos
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notificar_cambio_password}
                  onChange={(e) => handleInputChange('notificar_cambio_password', e.target.checked)}
                  className="w-6 h-6 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                />
                <div>
                  <span className="text-base font-semibold text-gray-700">
                    Notificar cambios de contraseña
                  </span>
                  <p className="text-sm text-gray-500">
                    Enviar notificación al usuario cuando su contraseña es cambiada
                  </p>
                </div>
              </label>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Información:</strong> Las notificaciones se enviarán a los correos electrónicos configurados 
                  en los perfiles de usuario y administrador. Asegúrese de que la configuración de email esté correcta.
                </p>
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
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-xl hover:from-red-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
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

export default ConfiguracionSeguridadPage
