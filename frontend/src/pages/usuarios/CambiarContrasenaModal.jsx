import { useState } from 'react'
import { toast } from 'react-toastify'
import { XMarkIcon, KeyIcon, CheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import usuariosService from '../../services/usuariosService'
import { useAudit } from '../../hooks/useAudit'

export default function CambiarContrasenaModal({ usuario, onClose, onSuccess }) {
  const audit = useAudit('Usuarios')

  const [formData, setFormData] = useState({
    nueva_password: '',
    confirmar_password: '',
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

    if (!formData.nueva_password) {
      newErrors.nueva_password = 'La contraseña es requerida'
    } else if (formData.nueva_password.length < 8) {
      newErrors.nueva_password = 'La contraseña debe tener al menos 8 caracteres'
    } else if (!/(?=.*[a-z])/.test(formData.nueva_password)) {
      newErrors.nueva_password = 'Debe contener al menos una letra minúscula'
    } else if (!/(?=.*[A-Z])/.test(formData.nueva_password)) {
      newErrors.nueva_password = 'Debe contener al menos una letra mayúscula'
    } else if (!/(?=.*\d)/.test(formData.nueva_password)) {
      newErrors.nueva_password = 'Debe contener al menos un número'
    }

    if (!formData.confirmar_password) {
      newErrors.confirmar_password = 'Confirme la contraseña'
    } else if (formData.nueva_password !== formData.confirmar_password) {
      newErrors.confirmar_password = 'Las contraseñas no coinciden'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calcularFortaleza = () => {
    const password = formData.nueva_password
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
        nueva_password: formData.nueva_password,
        confirmar_password: formData.confirmar_password,
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-600 p-6 rounded-t-3xl relative overflow-hidden">
          <div className="flex items-center justify-between text-white relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
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
          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <KeyIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                name="nueva_password"
                value={formData.nueva_password}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-12 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all ${
                  errors.new_password ? 'border-red-500' : 'border-gray-200'
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
{errors.nueva_password && (
              <p className="text-red-500 text-xs mt-1">{errors.nueva_password}</p>
            )}

            {/* Indicador de fortaleza */}
            {formData.nueva_password && (
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
                name="confirmar_password"
                value={formData.confirmar_password}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-12 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all ${
                  errors.confirm_password ? 'border-red-500' : 'border-gray-200'
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
            {errors.confirmar_password && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmar_password}</p>
            )}

            {/* Indicador de coincidencia */}
            {formData.confirmar_password && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                {formData.nueva_password === formData.confirmar_password ? (
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
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Requisitos de contraseña:
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  formData.nueva_password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Mínimo 8 caracteres
              </li>
              <li className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  /(?=.*[a-z])/.test(formData.nueva_password) ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Al menos una letra minúscula
              </li>
              <li className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  /(?=.*[A-Z])/.test(formData.nueva_password) ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Al menos una letra mayúscula
              </li>
              <li className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  /(?=.*\d)/.test(formData.nueva_password) ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Al menos un número
              </li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] transform"
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
