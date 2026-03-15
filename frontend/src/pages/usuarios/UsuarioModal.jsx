import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import usuariosService from '../../services/usuariosService'
import { useAudit } from '../../hooks/useAudit'
import Can from '../../components/permissions/Can'
import { usePermissions } from '../../context/PermissionsContext'

export default function UsuarioModal({ usuario, modoEdicion, onClose, onGuardar }) {
  const audit = useAudit('Usuarios')
  const { hasPermission, initialized } = usePermissions()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [verificandoUsername, setVerificandoUsername] = useState(false)
  const [verificandoEmail, setVerificandoEmail] = useState(false)

  useEffect(() => {
    if (modoEdicion && usuario) {
      setFormData({
        username: usuario.username || '',
        email: usuario.email || '',
        first_name: usuario.first_name || '',
        last_name: usuario.last_name || '',
        password: '',
        password_confirm: '',
      })
    }
  }, [usuario, modoEdicion])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Limpiar error del campo
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const verificarUsernameDisponible = async (username) => {
    if (!username || (modoEdicion && username === usuario.username)) return

    setVerificandoUsername(true)
    try {
      const response = await usuariosService.verificarUsername(username)
      if (!response.disponible) {
        setErrors((prev) => ({ ...prev, username: 'Este nombre de usuario ya está en uso' }))
      }
    } catch (error) {
      console.error('Error verificando username:', error)
    } finally {
      setVerificandoUsername(false)
    }
  }

  const verificarEmailDisponible = async (email) => {
    if (!email || (modoEdicion && email === usuario.email)) return

    setVerificandoEmail(true)
    try {
      const response = await usuariosService.verificarEmail(email)
      if (!response.disponible) {
        setErrors((prev) => ({ ...prev, email: 'Este email ya está registrado' }))
      }
    } catch (error) {
      console.error('Error verificando email:', error)
    } finally {
      setVerificandoEmail(false)
    }
  }

  const validarFormulario = () => {
    const newErrors = {}

    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido'
    } else if (formData.username.length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido'
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido'
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido'
    }

    if (!modoEdicion) {
      if (!formData.password) {
        newErrors.password = 'La contraseña es requerida'
      } else if (formData.password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres'
      }

      if (!formData.password_confirm) {
        newErrors.password_confirm = 'Confirme la contraseña'
      } else if (formData.password !== formData.password_confirm) {
        newErrors.password_confirm = 'Las contraseñas no coinciden'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validarFormulario()) {
      toast.error('Por favor corrija los errores en el formulario')
      return
    }

    setLoading(true)

    try {
      const dataToSend = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
      }

      if (!modoEdicion) {
        dataToSend.password = formData.password
        dataToSend.password_confirm = formData.password_confirm
      }

      if (modoEdicion) {
        await usuariosService.actualizarUsuario(usuario.id, dataToSend)
        toast.success('Usuario actualizado correctamente')
        audit.formSubmit('actualizar_usuario', usuario.id)
      } else {
        await usuariosService.crearUsuario(dataToSend)
        toast.success('Usuario creado correctamente')
        audit.formSubmit('crear_usuario')
      }

      onGuardar()
    } catch (error) {
      console.error('Error guardando usuario:', error)
      if (error.response?.data) {
        const apiErrors = error.response.data
        setErrors(apiErrors)
        toast.error('Error al guardar usuario. Verifique los datos.')
      } else {
        toast.error('Error al guardar usuario')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 p-6 rounded-t-3xl relative overflow-hidden">
          <div className="flex items-center justify-between text-white relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                <UserIcon className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <p className="text-indigo-100 text-sm mt-1">
                  {modoEdicion
                    ? 'Modifica la información del usuario'
                    : 'Completa los datos para crear un nuevo usuario'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 backdrop-blur-sm p-2 rounded-xl hover:bg-white/30 transition-all"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de Usuario <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  onBlur={(e) => verificarUsernameDisponible(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all ${
                    errors.username ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="usuario123"
                />
                {verificandoUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  </div>
                )}
              </div>
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={(e) => verificarEmailDisponible(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all ${
                    errors.email ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="usuario@ejemplo.com"
                />
                {verificandoEmail && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all ${
                  errors.first_name ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Juan"
              />
              {errors.first_name && (
                <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all ${
                  errors.last_name ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Pérez"
              />
              {errors.last_name && (
                <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Contraseña - Solo al crear */}
          {!modoEdicion && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <KeyIcon className="w-5 h-5 text-purple-500" />
                Contraseña
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all ${
                        errors.password ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Contraseña <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CheckIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="password"
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all ${
                        errors.password_confirm ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Confirmar contraseña"
                    />
                  </div>
                  {errors.password_confirm && (
                    <p className="text-red-500 text-xs mt-1">{errors.password_confirm}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Nota informativa en modo edición */}
          {modoEdicion && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Nota:</span> Para cambiar la contraseña o asignar roles,
                usa las acciones correspondientes en la tabla de usuarios.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Can permission={modoEdicion ? 'usuarios.change' : 'usuarios.add'}>
              <button
                type="submit"
                disabled={loading || verificandoUsername || verificandoEmail}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] transform"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Guardando...
                  </div>
                ) : (
                  modoEdicion ? 'Actualizar Usuario' : 'Crear Usuario'
                )}
              </button>
            </Can>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
