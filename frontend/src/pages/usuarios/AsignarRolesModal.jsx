import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  XMarkIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import usuariosService from '../../services/usuariosService'
import rolesService from '../../services/rolesService'
import { useAudit } from '../../hooks/useAudit'

export default function AsignarRolesModal({ usuario, onClose, onSuccess }) {
  const audit = useAudit('Usuarios')

  const [rolesDisponibles, setRolesDisponibles] = useState([])
  const [rolesSeleccionados, setRolesSeleccionados] = useState([])
  const [permisosPreview, setPermisosPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [cargandoRoles, setCargandoRoles] = useState(true)

  useEffect(() => {
    cargarRoles()
  }, [])

  const cargarRoles = async () => {
    setCargandoRoles(true)
    try {
      // Cargar todos los roles disponibles desde la API de roles personalizados
      const response = await rolesService.getAllRoles({ activo: true })
      const roles = Array.isArray(response) ? response : response.results || []
      setRolesDisponibles(roles)

      // Cargar roles actuales del usuario
      if (usuario.roles && Array.isArray(usuario.roles)) {
        const rolesActuales = usuario.roles.map((r) => r.id)
        setRolesSeleccionados(rolesActuales)
      }
    } catch (error) {
      console.error('Error cargando roles:', error)
      toast.error('Error al cargar roles disponibles')
    } finally {
      setCargandoRoles(false)
    }
  }

  const handleToggleRol = (rolId) => {
    let nuevosRoles
    if (rolesSeleccionados.includes(rolId)) {
      nuevosRoles = rolesSeleccionados.filter((id) => id !== rolId)
    } else {
      nuevosRoles = [...rolesSeleccionados, rolId]
    }
    setRolesSeleccionados(nuevosRoles)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await usuariosService.asignarRoles(usuario.id, rolesSeleccionados)
      toast.success('Roles asignados correctamente')
      audit.formSubmit('asignar_roles', usuario.id)
      onSuccess()
    } catch (error) {
      console.error('Error asignando roles:', error)
      toast.error('Error al asignar roles')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-6">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Asignar Roles</h2>
                <p className="text-indigo-100 text-sm mt-1">
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

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Lista de roles */}
          <div className="w-1/2 border-r overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Roles Disponibles ({rolesDisponibles.length})
              </h3>

              {cargandoRoles ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : rolesDisponibles.length > 0 ? (
                <div className="space-y-2">
                  {rolesDisponibles.map((rol) => {
                    const isSelected = rolesSeleccionados.includes(rol.id)
                    return (
                      <label
                        key={rol.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRol(rol.id)}
                          className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {rol.name}
                            {isSelected && (
                              <CheckIcon className="w-5 h-5 text-indigo-600" />
                            )}
                          </div>
                          {rol.description && (
                            <div className="text-sm text-gray-500 mt-1">
                              {rol.description}
                            </div>
                          )}
                          {rol.permissions && (
                            <div className="text-xs text-gray-400 mt-2">
                              {rol.permissions.length} permisos
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UserGroupIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay roles disponibles</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview de permisos */}
          <div className="w-1/2 bg-gray-50 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Información de Grupos
              </h3>

              {rolesSeleccionados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShieldCheckIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Selecciona grupos para asignar al usuario</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                      <UserGroupIcon className="w-5 h-5" />
                      <span className="font-semibold">Grupos Seleccionados</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Has seleccionado {rolesSeleccionados.length} grupo(s) para este usuario.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-2">
                      <ShieldCheckIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-medium mb-1">Gestión de Permisos</p>
                        <p className="text-blue-700">
                          Los permisos se gestionan a nivel de grupo. Puedes configurar
                          los permisos de cada grupo desde el módulo de Roles y Permisos.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{rolesSeleccionados.length}</span> grupos seleccionados
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </div>
              ) : (
                'Guardar Cambios'
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
        </div>
      </div>
    </div>
  )
}
