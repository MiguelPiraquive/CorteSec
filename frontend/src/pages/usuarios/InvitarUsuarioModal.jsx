import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  XMarkIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import invitacionService from '../../services/invitacionService'
import rolesService from '../../services/rolesService'

export default function InvitarUsuarioModal({ onClose, onInvitado }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [rolesDisponibles, setRolesDisponibles] = useState([])
  const [formData, setFormData] = useState({
    email: '',
    rbac_rol_id: null,
    mensaje: '',
  })

  useEffect(() => {
    cargarRoles()
  }, [])

  const cargarRoles = async () => {
    setLoadingRoles(true)
    try {
      const response = await rolesService.getAllRoles({ activo: true })
      const roles = Array.isArray(response) ? response : response.results || []
      setRolesDisponibles(roles)
    } catch (error) {
      console.error('Error cargando roles:', error)
    } finally {
      setLoadingRoles(false)
    }
  }

  // Derivar organization_role automáticamente según el rol RBAC seleccionado
  const getOrgRole = () => {
    if (!formData.rbac_rol_id) return 'MEMBER'
    const rol = rolesDisponibles.find((r) => r.id === formData.rbac_rol_id)
    if (!rol) return 'MEMBER'
    const code = (rol.codigo || rol.nombre || '').toUpperCase()
    if (code.includes('ADMIN') || code.includes('ADMINISTRADOR')) return 'ADMIN'
    if (code.includes('GERENTE') || code.includes('MANAGER')) return 'MANAGER'
    if (code.includes('VIEWER') || code.includes('VISOR') || code.includes('VISUALIZADOR') || code.includes('LECTURA')) return 'VIEWER'
    return 'MEMBER'
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSelectRol = (rolId) => {
    setFormData((prev) => ({
      ...prev,
      rbac_rol_id: rolId,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email) {
      toast.error('El email es requerido')
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        email: formData.email,
        role: getOrgRole(),
        mensaje: formData.mensaje,
      }
      if (formData.rbac_rol_id) {
        payload.rbac_rol_id = formData.rbac_rol_id
      }

      const response = await invitacionService.createInvitacion(payload)

      if (response.success !== false) {
        toast.success(response.message || `Invitación enviada a ${formData.email}`)
        if (onInvitado) onInvitado()
        onClose()
      } else {
        toast.error(response.message || 'Error al enviar invitación')
      }
    } catch (error) {
      console.error('Error enviando invitación:', error)
      if (error.message) {
        toast.error(error.message)
      } else if (error.errors) {
        Object.keys(error.errors).forEach((key) => {
          const errorMessages = error.errors[key]
          if (Array.isArray(errorMessages)) {
            errorMessages.forEach((msg) => toast.error(`${key}: ${msg}`))
          } else {
            toast.error(`${key}: ${errorMessages}`)
          }
        })
      } else {
        toast.error('Error al enviar la invitación')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const selectedRol = rolesDisponibles.find((r) => r.id === formData.rbac_rol_id)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-600 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between text-white relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                <EnvelopeIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Agregar Usuario</h3>
                <p className="text-indigo-100 text-sm mt-1">
                  Envía una invitación por email para unirse a tu organización
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

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email del usuario <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="usuario@ejemplo.com"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Se enviará un email con un enlace para registrarse y unirse a la organización
              </p>
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-indigo-500" />
                Rol <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                El rol determina qué puede ver y hacer el usuario en el sistema
              </p>

              {loadingRoles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="ml-3 text-sm text-gray-500">Cargando roles...</span>
                </div>
              ) : rolesDisponibles.length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {rolesDisponibles.map((rol) => {
                    const isSelected = formData.rbac_rol_id === rol.id
                    return (
                      <label
                        key={rol.id}
                        className={`flex items-center p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 shadow-md'
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rbac_rol"
                          checked={isSelected}
                          onChange={() => handleSelectRol(rol.id)}
                          disabled={isLoading}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">{rol.nombre || rol.name}</p>
                            {(rol.total_permisos !== undefined || rol.permissions) && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {rol.total_permisos || rol.permissions?.length || 0} permisos
                              </span>
                            )}
                          </div>
                          {(rol.descripcion || rol.description) && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {rol.descripcion || rol.description}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-amber-50 rounded-xl border-2 border-dashed border-amber-200">
                  <ShieldCheckIcon className="w-10 h-10 mx-auto text-amber-400 mb-2" />
                  <p className="text-sm text-amber-700 font-medium">No hay roles configurados</p>
                  <p className="text-xs text-amber-500 mt-1">
                    Ve al módulo de <strong>Roles y Permisos</strong> para crear roles primero.
                    <br />
                    El usuario se agregará como Miembro por defecto.
                  </p>
                </div>
              )}
            </div>

            {/* Mensaje */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mensaje personalizado (opcional)
              </label>
              <textarea
                name="mensaje"
                value={formData.mensaje}
                onChange={handleChange}
                placeholder="Ej: Bienvenido al equipo, te esperamos..."
                rows={2}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Resumen */}
            {formData.email && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-indigo-900">
                    <p className="font-medium mb-1">Resumen</p>
                    <ul className="space-y-0.5 text-indigo-700">
                      <li><span className="font-medium">Email:</span> {formData.email}</li>
                      <li>
                        <span className="font-medium">Rol:</span>{' '}
                        {selectedRol ? (selectedRol.nombre || selectedRol.name) : 'Miembro (por defecto)'}
                      </li>
                    </ul>
                    <p className="text-xs text-indigo-500 mt-2">
                      Recibirá un email con enlace para completar su registro. Expira en 7 días.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-2.5 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.email}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-medium flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-[1.02] transform"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Enviar Invitación
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
