import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import configuracionService from '../../services/configuracionService'
import {
  MailIcon,
  SaveIcon,
  XIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  ServerIcon,
  UserIcon,
  FileTextIcon,
  TrendingUpIcon,
  SendIcon
} from 'lucide-react'

const ConfiguracionEmailPage = () => {
  const audit = useAudit('Configuración de Email')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [activeTab, setActiveTab] = useState('smtp')
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  const [testEmail, setTestEmail] = useState('')
  
  const [formData, setFormData] = useState({
    // SMTP
    servidor_smtp: 'smtp.gmail.com',
    puerto_smtp: 587,
    usuario_smtp: '',
    password_smtp: '',
    usar_tls: true,
    usar_ssl: false,
    
    // Remitente
    email_remitente: 'noreply@empresa.com',
    nombre_remitente: 'Sistema CorteSec',
    email_respuesta: '',
    
    // Plantillas
    plantilla_header: '',
    plantilla_footer: '',
    
    // Límites
    limite_emails_hora: 100,
    limite_emails_dia: 1000,
    
    // Notificaciones
    notificar_error_envio: true,
    email_administrador: '',
    servicio_activo: true,
  })

  useEffect(() => {
    loadConfiguracion()
  }, [])

  const loadConfiguracion = async () => {
    try {
      setLoading(true)
      const data = await configuracionService.getConfiguracionEmail()
      console.log('📧 Configuración de email cargada:', data)
      setFormData({
        ...formData,
        ...data
      })
    } catch (error) {
      console.error('Error al cargar configuración:', error)
      showNotification('error', 'Error al cargar la configuración de email')
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

  const handleTestEmail = async () => {
    if (!testEmail) {
      showNotification('error', 'Por favor ingresa un email de destino')
      return
    }

    try {
      setSendingTest(true)
      const response = await configuracionService.testEmail(testEmail)
      audit.button('test_email', { email_destino: testEmail })
      showNotification('success', response.message || 'Email de prueba enviado exitosamente')
      setTestEmail('')
    } catch (error) {
      console.error('Error al enviar email de prueba:', error)
      const errorMsg = error.response?.data?.message || 'Error al enviar el email de prueba'
      showNotification('error', errorMsg)
    } finally {
      setSendingTest(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validaciones
    if (formData.puerto_smtp < 1 || formData.puerto_smtp > 65535) {
      showNotification('error', 'El puerto SMTP debe estar entre 1 y 65535')
      return
    }

    try {
      setSaving(true)
      await configuracionService.updateConfiguracionEmail(formData)
      audit.button('actualizar_configuracion_email', { seccion: activeTab })
      showNotification('success', 'Configuración de email guardada exitosamente')
      await loadConfiguracion()
    } catch (error) {
      console.error('Error al guardar:', error)
      showNotification('error', 'Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'smtp', label: 'Servidor SMTP', icon: ServerIcon },
    { id: 'remitente', label: 'Remitente', icon: UserIcon },
    { id: 'plantillas', label: 'Plantillas', icon: FileTextIcon },
    { id: 'limites', label: 'Límites y Notificaciones', icon: TrendingUpIcon },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center space-x-3">
          <Loader2Icon className="w-8 h-8 text-blue-500 animate-spin" />
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
              <MailIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Configuración de Email</h1>
              <p className="text-blue-100 mt-1">Administra el servicio de correo electrónico del sistema</p>
            </div>
          </div>
          
          {/* Estado del servicio */}
          <div className={`px-6 py-3 rounded-xl font-bold ${
            formData.servicio_activo ? 'bg-green-500/20 text-green-100 border-2 border-green-400' : 'bg-red-500/20 text-red-100 border-2 border-red-400'
          }`}>
            {formData.servicio_activo ? '✓ Servicio Activo' : '✗ Servicio Inactivo'}
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
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
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
          
          {/* Configuración SMTP */}
          {activeTab === 'smtp' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración del Servidor SMTP</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Servidor SMTP *
                  </label>
                  <input
                    type="text"
                    value={formData.servidor_smtp}
                    onChange={(e) => handleInputChange('servidor_smtp', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="smtp.gmail.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Dirección del servidor SMTP (ej: smtp.gmail.com)</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Puerto SMTP *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={formData.puerto_smtp}
                    onChange={(e) => handleInputChange('puerto_smtp', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Puerto común: 587 (TLS), 465 (SSL), 25 (sin cifrado)</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Usuario SMTP *
                  </label>
                  <input
                    type="text"
                    value={formData.usuario_smtp}
                    onChange={(e) => handleInputChange('usuario_smtp', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Usuario para autenticación SMTP</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contraseña SMTP *
                  </label>
                  <input
                    type="password"
                    value={formData.password_smtp}
                    onChange={(e) => handleInputChange('password_smtp', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Contraseña o token de aplicación</p>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-bold text-gray-800">Tipo de Conexión Segura</h3>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.usar_tls}
                    onChange={(e) => handleInputChange('usar_tls', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-700">
                      Usar TLS (Transport Layer Security)
                    </span>
                    <p className="text-xs text-gray-500">Recomendado para puerto 587</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.usar_ssl}
                    onChange={(e) => handleInputChange('usar_ssl', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-700">
                      Usar SSL (Secure Sockets Layer)
                    </span>
                    <p className="text-xs text-gray-500">Recomendado para puerto 465</p>
                  </div>
                </label>
              </div>

              {/* Test Email */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mt-6">
                <h3 className="text-lg font-bold text-blue-900 mb-4">🧪 Probar Configuración</h3>
                <p className="text-sm text-blue-700 mb-4">Envía un email de prueba para verificar que la configuración funciona correctamente.</p>
                
                <div className="flex space-x-3">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="flex-1 px-4 py-3 bg-white border-2 border-blue-300 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={sendingTest || !testEmail}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
                  >
                    {sendingTest ? (
                      <>
                        <Loader2Icon className="w-5 h-5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <SendIcon className="w-5 h-5" />
                        <span>Enviar Prueba</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Configuración de Remitente */}
          {activeTab === 'remitente' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Información del Remitente</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Remitente *
                  </label>
                  <input
                    type="email"
                    value={formData.email_remitente}
                    onChange={(e) => handleInputChange('email_remitente', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="noreply@empresa.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Dirección que aparecerá como remitente</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Remitente *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_remitente}
                    onChange={(e) => handleInputChange('nombre_remitente', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Sistema CorteSec"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Nombre que aparecerá como remitente</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email de Respuesta (opcional)
                  </label>
                  <input
                    type="email"
                    value={formData.email_respuesta || ''}
                    onChange={(e) => handleInputChange('email_respuesta', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="soporte@empresa.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email para respuestas (opcional). Si está vacío, se usará el email remitente</p>
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Consejo:</strong> Para evitar que los emails sean marcados como spam, usa un dominio válido y verifica que 
                  el email remitente coincida con el dominio del servidor SMTP.
                </p>
              </div>
            </div>
          )}

          {/* Plantillas */}
          {activeTab === 'plantillas' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Plantillas de Email</h2>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Header HTML (opcional)
                </label>
                <textarea
                  value={formData.plantilla_header || ''}
                  onChange={(e) => handleInputChange('plantilla_header', e.target.value)}
                  rows="6"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                  placeholder="<div style='background-color: #f0f0f0; padding: 20px;'>
  <h1>Mi Empresa</h1>
</div>"
                />
                <p className="text-xs text-gray-500 mt-1">HTML que se incluirá al inicio de todos los emails</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Footer HTML (opcional)
                </label>
                <textarea
                  value={formData.plantilla_footer || ''}
                  onChange={(e) => handleInputChange('plantilla_footer', e.target.value)}
                  rows="6"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                  placeholder="<div style='background-color: #333; color: white; padding: 20px; text-align: center;'>
  <p>© 2026 Mi Empresa. Todos los derechos reservados.</p>
</div>"
                />
                <p className="text-xs text-gray-500 mt-1">HTML que se incluirá al final de todos los emails</p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Información:</strong> Las plantillas se aplicarán automáticamente a todos los emails enviados por el sistema. 
                  Puedes usar HTML y CSS inline para personalizar el diseño.
                </p>
              </div>
            </div>
          )}

          {/* Límites y Notificaciones */}
          {activeTab === 'limites' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Límites y Notificaciones</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Límite de Emails por Hora *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.limite_emails_hora}
                    onChange={(e) => handleInputChange('limite_emails_hora', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Máximo de emails que se pueden enviar por hora</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Límite de Emails por Día *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={formData.limite_emails_dia}
                    onChange={(e) => handleInputChange('limite_emails_dia', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Máximo de emails que se pueden enviar por día</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email del Administrador (opcional)
                  </label>
                  <input
                    type="email"
                    value={formData.email_administrador || ''}
                    onChange={(e) => handleInputChange('email_administrador', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="admin@empresa.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email para recibir notificaciones de errores</p>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-bold text-gray-800">Configuración de Notificaciones</h3>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notificar_error_envio}
                    onChange={(e) => handleInputChange('notificar_error_envio', e.target.checked)}
                    className="w-6 h-6 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-base font-semibold text-gray-700">
                      Notificar errores de envío
                    </span>
                    <p className="text-sm text-gray-500">
                      Enviar notificación al administrador cuando falle el envío de un email
                    </p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.servicio_activo}
                    onChange={(e) => handleInputChange('servicio_activo', e.target.checked)}
                    className="w-6 h-6 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-base font-semibold text-gray-700">
                      Servicio de email activo
                    </span>
                    <p className="text-sm text-gray-500">
                      Si está desactivado, no se enviarán emails desde el sistema
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Los límites de envío ayudan a prevenir el bloqueo de tu cuenta SMTP por 
                  parte del proveedor. Ajústalos según los límites de tu plan de email.
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
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
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

export default ConfiguracionEmailPage
