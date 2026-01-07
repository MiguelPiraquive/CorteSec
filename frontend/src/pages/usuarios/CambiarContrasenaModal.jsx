import { useState } from 'react'
import { toast } from 'react-toastify'
import { XMarkIcon, KeyIcon, CheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import usuariosService from '../../services/usuariosService'
import { useAudit } from '../../hooks/useAudit'

export default function CambiarContrasenaModal({ usuario, onClose, onSuccess }) {
  const audit = useAudit('Usuarios')

  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [mostrarConfirm, setMostrarConfirm] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validarFormulario = () => {
    const newErrors = {}

    if (!formData.new_password) {
      newErrors.new_password = 'La contraseña es requerida'
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'La contraseña debe tener al menos 8 caracteres'
    } else if (!/(?=.*[a-z])/.test(formData.new_password)) {
      newErrors.new_password = 'Debe contener al menos una letra minúscula'
    } else if (!/(?=.*[A-Z])/.test(formData.new_password)) {
      newErrors.new_password = 'Debe contener al menos una letra mayúscula'
    } else if (!/(?=.*\d)/.test(formData.new_password)) {
      newErrors.new_password = 'Debe contener al menos un número'
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Confirme la contraseña'
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Las contraseñas no coinciden'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calcularFortaleza = () => {
    const password = formData.new_password
    if (!password) return { nivel: 0, texto: '', color: '' }

    let puntos = 0

    // Longitud
    if (password.length >= 8) puntos += 1
    if (password.length >= 12) puntos += 1

    // Complejidad
    if (/[a-z]/.test(password)) puntos += 1
    if (/[A-Z]/.test(password)) puntos += 1
    if (/\d/.test(password)) puntos += 1
    if (/[^A-Za-z0-9]/.test(password)) puntos += 1

    if (puntos <= 2) return { nivel: 1, texto: 'Débil', color: 'bg-red-500' }
    if (puntos <= 4) return { nivel: 2, texto: 'Media', color: 'bg-yellow-500' }
    return { nivel: 3, texto: 'Fuerte', color: 'bg-green-500' }
  }

  const fortaleza = calcularFortaleza()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validarFormulario()) {
      toast.error('Por favor corrija los errores en el formulario')
      return
    }

    setLoading(true)

    try {
      await usuariosService.cambiarContrasenaUsuario(usuario.id, {
        new_password: formData.new_password,
      })

      toast.success('Contraseña cambiada correctamente')
      audit.formSubmit('cambiar_contrasena', usuario.id)
      onSuccess()
    } catch (error) {
      console.error('Error cambiando contraseña:', error)
      if (error.response?.data) {
        setErrors(error.response.data)
        toast.error('Error al cambiar contraseña')
      } else {
        toast.error('Error al cambiar contraseña')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <KeyIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Cambiar Contraseña</h2>
                <p className="text-purple-100 text-sm mt-1">
                  Usuario: <span className="font-semibold">{usuario.username}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <KeyIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                name="new_password"
                value={formData.new_password}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.new_password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrarPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.new_password && (
              <p className="text-red-500 text-xs mt-1">{errors.new_password}</p>
            )}

            {/* Indicador de fortaleza */}
            {formData.new_password && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Fortaleza de la contraseña:</span>
                  <span className={`font-semibold ${
                    fortaleza.nivel === 1 ? 'text-red-600' :
                    fortaleza.nivel === 2 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {fortaleza.texto}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${fortaleza.color}`}
                    style={{ width: `${(fortaleza.nivel / 3) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <CheckIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type={mostrarConfirm ? 'text' : 'password'}
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.confirm_password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Repita la contraseña"
              />
              <button
                type="button"
                onClick={() => setMostrarConfirm(!mostrarConfirm)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrarConfirm ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="text-red-500 text-xs mt-1">{errors.confirm_password}</p>
            )}

            {/* Indicador de coincidencia */}
            {formData.confirm_password && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                {formData.new_password === formData.confirm_password ? (
                  <>
                    <CheckIcon className="w-5 h-5 text-green-600" />
                    <span className="text-green-600">Las contraseñas coinciden</span>
                  </>
                ) : (
                  <>
                    <XMarkIcon className="w-5 h-5 text-red-600" />
                    <span className="text-red-600">Las contraseñas no coinciden</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Requisitos */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Requisitos de contraseña:
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  formData.new_password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Mínimo 8 caracteres
              </li>
              <li className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  /(?=.*[a-z])/.test(formData.new_password) ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Al menos una letra minúscula
              </li>
              <li className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  /(?=.*[A-Z])/.test(formData.new_password) ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Al menos una letra mayúscula
              </li>
              <li className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  /(?=.*\d)/.test(formData.new_password) ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Al menos un número
              </li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Cambiando...
                </div>
              ) : (
                'Cambiar Contraseña'
              )}
            </button>
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
