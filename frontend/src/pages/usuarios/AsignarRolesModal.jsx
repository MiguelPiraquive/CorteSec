import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  XMarkIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CheckIcon,
  ChevronRightIcon,
  UserIcon,
  LockClosedIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import usuariosService from '../../services/usuariosService'
import rolesService from '../../services/rolesService'
import { useAudit } from '../../hooks/useAudit'

export default function AsignarRolesModal({ usuario, onClose, onSuccess }) {
  const audit = useAudit('Usuarios')

  const [rolesDisponibles, setRolesDisponibles] = useState([])
  const [rolesSeleccionados, setRolesSeleccionados] = useState([])
  const [rolesOriginales, setRolesOriginales] = useState([])
  const [rolDetalle, setRolDetalle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cargandoRoles, setCargandoRoles] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  useEffect(() => {
    cargarRoles()
  }, [])

  const cargarRoles = async () => {
    setCargandoRoles(true)
    try {
      const response = await rolesService.getAllRoles({ activo: true })
      const roles = Array.isArray(response) ? response : response.results || []
      setRolesDisponibles(roles)

      // Cargar roles actuales del usuario
      if (usuario.roles && Array.isArray(usuario.roles)) {
        const rolesActuales = usuario.roles.map((r) => r.id)
        setRolesSeleccionados(rolesActuales)
        setRolesOriginales(rolesActuales)

        // Mostrar detalle del primer rol actual
        if (rolesActuales.length > 0) {
          cargarDetalleRol(rolesActuales[0])
        }
      }
    } catch (error) {
      console.error('Error cargando roles:', error)
      toast.error('Error al cargar roles disponibles')
    } finally {
      setCargandoRoles(false)
    }
  }

  const cargarDetalleRol = async (rolId) => {
    setCargandoDetalle(true)
    try {
      const data = await rolesService.getRolById(rolId)
      setRolDetalle(data)
    } catch (error) {
      console.error('Error cargando detalle del rol:', error)
      setRolDetalle(null)
    } finally {
      setCargandoDetalle(false)
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
    // Mostrar detalle del rol seleccionado/clickeado
    cargarDetalleRol(rolId)
  }

  const handleSelectRolDetalle = (rolId) => {
    cargarDetalleRol(rolId)
  }

  const hayCambios = () => {
    if (rolesSeleccionados.length !== rolesOriginales.length) return true
    return !rolesSeleccionados.every((id) => rolesOriginales.includes(id))
  }

  const getRolesAgregados = () => {
    return rolesSeleccionados.filter((id) => !rolesOriginales.includes(id))
  }

  const getRolesRemovidos = () => {
    return rolesOriginales.filter((id) => !rolesSeleccionados.includes(id))
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

  const getRolColor = (rol) => {
    if (rol.color) return rol.color
    const colores = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
    return colores[rol.id % colores.length]
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-600 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between text-white relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                <ShieldCheckIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Asignar Roles</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center text-xs font-bold">
                    {usuario.username?.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-indigo-100 text-sm">
                    {usuario.first_name} {usuario.last_name} <span className="text-indigo-200">({usuario.username})</span>
                  </p>
                </div>
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

        {/* Rol actual */}
        {rolesOriginales.length > 0 && (
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              <UserIcon className="w-3.5 h-3.5" />
              Roles actuales
            </div>
            <div className="flex flex-wrap gap-2">
              {rolesOriginales.map((rolId) => {
                const rol = rolesDisponibles.find((r) => r.id === rolId)
                if (!rol) return null
                const removido = !rolesSeleccionados.includes(rolId)
                return (
                  <span
                    key={rolId}
                    className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1.5 transition-all ${
                      removido
                        ? 'bg-red-50 text-red-600 line-through border border-red-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: removido ? '#ef4444' : getRolColor(rol) }}
                    />
                    {rol.nombre}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex border-t border-gray-100 mt-2">
          {/* Lista de roles */}
          <div className="w-1/2 border-r border-gray-100 overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
                  <UserGroupIcon className="w-4 h-4 text-indigo-500" />
                  Roles Disponibles
                </h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {rolesDisponibles.length} roles
                </span>
              </div>

              {cargandoRoles ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                  <p className="text-sm text-gray-400">Cargando roles...</p>
                </div>
              ) : rolesDisponibles.length > 0 ? (
                <div className="space-y-2">
                  {rolesDisponibles.map((rol) => {
                    const isSelected = rolesSeleccionados.includes(rol.id)
                    const isNew = isSelected && !rolesOriginales.includes(rol.id)
                    const isViewing = rolDetalle?.id === rol.id
                    return (
                      <div
                        key={rol.id}
                        className={`group relative rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? isNew
                              ? 'border-green-400 bg-green-50/50 shadow-md shadow-green-100'
                              : 'border-indigo-400 bg-indigo-50/50 shadow-md shadow-indigo-100'
                            : 'border-gray-200 hover:border-indigo-300 bg-white hover:bg-gray-50/50'
                        }`}
                      >
                        <label className="flex items-center gap-3 p-3.5 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRol(rol.id)}
                              className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-500 border-2 border-gray-300"
                            />
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div
                            className="w-2 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getRolColor(rol) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900 text-sm">
                                {rol.nombre}
                              </span>
                              {isNew && (
                                <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full uppercase">
                                  Nuevo
                                </span>
                              )}
                            </div>
                            {rol.descripcion && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {rol.descripcion}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5">
                              {rol.total_usuarios !== undefined && (
                                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                  <UserIcon className="w-3 h-3" />
                                  {rol.total_usuarios} usuarios
                                </span>
                              )}
                              {rol.codigo && (
                                <span className="text-[11px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                  {rol.codigo}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                        {/* Ver detalle button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectRolDetalle(rol.id)
                          }}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                            isViewing
                              ? 'bg-indigo-100 text-indigo-600'
                              : 'opacity-0 group-hover:opacity-100 hover:bg-gray-100 text-gray-400'
                          }`}
                          title="Ver permisos del rol"
                        >
                          <ChevronRightIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No hay roles disponibles</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Crea roles desde el módulo de Roles y Permisos
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Panel de detalle del rol */}
          <div className="w-1/2 bg-gray-50/50 overflow-y-auto">
            <div className="p-5">
              {cargandoDetalle ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                  <p className="text-sm text-gray-400">Cargando permisos...</p>
                </div>
              ) : rolDetalle ? (
                <div className="space-y-4">
                  {/* Rol info */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: getRolColor(rolDetalle) }}
                      >
                        {rolDetalle.icono || rolDetalle.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900">{rolDetalle.nombre}</h4>
                        {rolDetalle.descripcion && (
                          <p className="text-sm text-gray-500 mt-0.5">{rolDetalle.descripcion}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {rolDetalle.codigo && (
                            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                              {rolDetalle.codigo}
                            </span>
                          )}
                          {rolDetalle.tipo_rol_detalle && (
                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                              {rolDetalle.tipo_rol_detalle.nombre}
                            </span>
                          )}
                          {rolDetalle.asignaciones_activas !== undefined && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {rolDetalle.asignaciones_activas} activos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Permisos del rol */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <LockClosedIcon className="w-3.5 h-3.5" />
                      Permisos incluidos
                      {rolDetalle.permisos_efectivos && (
                        <span className="text-gray-400 font-normal">
                          ({rolDetalle.permisos_efectivos.length})
                        </span>
                      )}
                    </h4>

                    {rolDetalle.permisos_efectivos && rolDetalle.permisos_efectivos.length > 0 ? (
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                        {rolDetalle.permisos_efectivos.map((permiso, idx) => (
                          <div
                            key={permiso.id || idx}
                            className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
                          >
                            <CheckIcon className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm text-gray-800 font-medium">
                                {permiso.nombre || permiso.name}
                              </span>
                              {(permiso.codigo || permiso.codename) && (
                                <span className="text-[11px] text-gray-400 ml-2 font-mono">
                                  {permiso.codigo || permiso.codename}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
                        <ShieldCheckIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm text-gray-400">Sin permisos configurados</p>
                      </div>
                    )}
                  </div>

                  {/* Herencia */}
                  {rolDetalle.hereda_permisos && rolDetalle.rol_padre_detalle && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <InformationCircleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">
                          <span className="font-semibold">Hereda permisos</span> del rol{' '}
                          <span className="font-semibold">{rolDetalle.rol_padre_detalle.nombre}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <ShieldCheckIcon className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">Detalle del rol</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Selecciona o haz clic en un rol para<br />ver sus permisos y detalles
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 bg-white">
          {/* Resumen de cambios */}
          {hayCambios() && (
            <div className="mb-3 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center gap-2 text-sm">
                <ArrowPathIcon className="w-4 h-4 text-indigo-500" />
                <span className="text-indigo-700 font-medium">Cambios pendientes:</span>
                {getRolesAgregados().length > 0 && (
                  <span className="text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded-full font-medium">
                    +{getRolesAgregados().length} nuevo{getRolesAgregados().length > 1 ? 's' : ''}
                  </span>
                )}
                {getRolesRemovidos().length > 0 && (
                  <span className="text-red-600 text-xs bg-red-100 px-2 py-0.5 rounded-full font-medium">
                    -{getRolesRemovidos().length} removido{getRolesRemovidos().length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-indigo-600">{rolesSeleccionados.length}</span>{' '}
              {rolesSeleccionados.length === 1 ? 'rol seleccionado' : 'roles seleccionados'}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !hayCambios()}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl hover:from-indigo-600 hover:to-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] transform flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
