import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  KeyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import usuariosService from '../../services/usuariosService'
import Can from '../../components/permissions/Can'

export default function UsuarioDetalleModal({ usuario, onClose, onEditar, onCambiarContrasena, onAsignarRoles }) {
  const [tabActiva, setTabActiva] = useState('info')
  const [permisos, setPermisos] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tabActiva === 'permisos') {
      cargarPermisos()
    } else if (tabActiva === 'actividad') {
      cargarHistorial()
    }
  }, [tabActiva, usuario])

  const cargarPermisos = async () => {
    setLoading(true)
    try {
      const data = await usuariosService.getPermisosUsuario(usuario.id)
      setPermisos(data.permisos || data || [])
    } catch (error) {
      console.error('Error cargando permisos:', error)
      toast.error('Error al cargar permisos')
    } finally {
      setLoading(false)
    }
  }

  const cargarHistorial = async () => {
    setLoading(true)
    try {
      const data = await usuariosService.getHistorialActividad(usuario.id, { page: 1, page_size: 10 })
      setHistorial(data.results || [])
    } catch (error) {
      console.error('Error cargando historial:', error)
      toast.error('Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A'
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const InfoField = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
      {Icon && <Icon className="w-5 h-5 text-indigo-500 mt-0.5" />}
      <div className="flex-1">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="font-semibold text-gray-900 mt-1">{value || 'N/A'}</div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between text-white relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{usuario.username}</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {usuario.first_name} {usuario.last_name}
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

          {/* Status badges */}
          <div className="flex gap-2 mt-4 relative z-10">
            {usuario.is_active ? (
              <span className="px-3 py-1 bg-green-500/20 backdrop-blur-sm text-green-100 rounded-full text-sm font-medium flex items-center gap-1">
                <CheckCircleIcon className="w-4 h-4" />
                Activo
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-500/20 backdrop-blur-sm text-red-100 rounded-full text-sm font-medium flex items-center gap-1">
                <XCircleIcon className="w-4 h-4" />
                Inactivo
              </span>
            )}
            {usuario.is_staff && (
              <span className="px-3 py-1 bg-blue-500/20 backdrop-blur-sm text-blue-100 rounded-full text-sm font-medium">
                Staff
              </span>
            )}
            {usuario.is_superuser && (
              <span className="px-3 py-1 bg-purple-500/20 backdrop-blur-sm text-purple-100 rounded-full text-sm font-medium">
                Superusuario
              </span>
            )}
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10" />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 bg-gray-50/80">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setTabActiva('info')}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${
                tabActiva === 'info'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
              }`}
            >
              Información
            </button>
            <button
              onClick={() => setTabActiva('permisos')}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${
                tabActiva === 'permisos'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
              }`}
            >
              Permisos
            </button>
            <button
              onClick={() => setTabActiva('actividad')}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${
                tabActiva === 'actividad'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
              }`}
            >
              Actividad
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tabActiva === 'info' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-indigo-500" />
                Datos Personales
              </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Nombre" value={usuario.first_name} icon={UserIcon} />
                  <InfoField label="Apellido" value={usuario.last_name} icon={UserIcon} />
                  <InfoField label="Email" value={usuario.email} icon={EnvelopeIcon} />
                  <InfoField label="Usuario" value={usuario.username} icon={UserIcon} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-indigo-500" />
                Información del Sistema
              </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField
                    label="Fecha de Registro"
                    value={formatearFecha(usuario.date_joined)}
                    icon={ClockIcon}
                  />
                  <InfoField
                    label="Último Acceso"
                    value={formatearFecha(usuario.last_login)}
                    icon={ClockIcon}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-indigo-500" />
                Roles
              </h3>
                {usuario.roles && usuario.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {usuario.roles.map((rol, idx) => (
                      <span
                        key={rol.id || idx}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                      >
                        {rol.nombre || rol.name}
                      </span>
                    ))}
                  </div>
                ) : usuario.organization_role ? (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {usuario.organization_role === 'ADMIN' ? 'Administrador'
                      : usuario.organization_role === 'OWNER' ? 'Propietario'
                      : usuario.organization_role === 'MANAGER' ? 'Gerente'
                      : usuario.organization_role === 'VIEWER' ? 'Visualizador'
                      : 'Miembro'}
                  </span>
                ) : (
                  <p className="text-gray-500 text-sm">No tiene roles asignados</p>
                )}
              </div>
            </div>
          )}

          {tabActiva === 'permisos' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
                Permisos del Usuario
              </h3>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : permisos.length > 0 ? (
                <div className="space-y-2">
                  {permisos.map((permiso) => (
                    <div
                      key={permiso.id}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">{permiso.nombre || permiso.name}</div>
                        <div className="text-sm text-gray-500">{permiso.codigo || permiso.codename}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShieldCheckIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tiene permisos específicos asignados</p>
                </div>
              )}
            </div>
          )}

          {tabActiva === 'actividad' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-indigo-500" />
                Actividad Reciente
              </h3>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : historial.length > 0 ? (
                <div className="space-y-3">
                  {historial.map((actividad, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <ClockIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{actividad.accion}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatearFecha(actividad.fecha)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay actividad registrada</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="border-t border-gray-100 p-4 bg-gray-50/80">
          <div className="flex gap-2 justify-end">
            <Can permission="usuarios.change">
              <button
                onClick={() => {
                  onClose()
                  onEditar(usuario)
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <PencilIcon className="w-4 h-4" />
                Editar
              </button>
            </Can>
            <Can permission="usuarios.change">
              <button
                onClick={() => {
                  onClose()
                  onCambiarContrasena(usuario)
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <KeyIcon className="w-4 h-4" />
                Cambiar Contraseña
              </button>
            </Can>
            <Can permission="usuarios.change">
              <button
                onClick={() => {
                  onClose()
                  onAsignarRoles(usuario)
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <UserGroupIcon className="w-4 h-4" />
                Asignar Roles
              </button>
            </Can>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
