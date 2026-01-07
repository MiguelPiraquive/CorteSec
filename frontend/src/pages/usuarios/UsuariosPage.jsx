import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  UserIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  UserPlusIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import usuariosService from '../../services/usuariosService'
import { useAudit } from '../../hooks/useAudit'
import UsuarioModal from './UsuarioModal'
import UsuarioDetalleModal from './UsuarioDetalleModal'
import CambiarContrasenaModal from './CambiarContrasenaModal'
import AsignarRolesModal from './AsignarRolesModal'

export default function UsuariosPage() {
  const audit = useAudit('Usuarios')

  // Estados principales
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    current_page: 1,
    total_pages: 1,
  })

  // Estados de búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filtros, setFiltros] = useState({
    is_active: '',
    is_staff: '',
    ordering: '-date_joined',
  })
  const [showFiltros, setShowFiltros] = useState(false)

  // Estados de modales
  const [showModalUsuario, setShowModalUsuario] = useState(false)
  const [showModalDetalle, setShowModalDetalle] = useState(false)
  const [showModalContrasena, setShowModalContrasena] = useState(false)
  const [showModalRoles, setShowModalRoles] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [modoEdicion, setModoEdicion] = useState(false)

  // Estadísticas
  const [estadisticas, setEstadisticas] = useState(null)

  useEffect(() => {
    cargarUsuarios()
    cargarEstadisticas()
  }, [filtros])

  const cargarUsuarios = async (page = 1) => {
    try {
      setLoading(true)
      const params = {
        page,
        search: searchTerm,
        ...filtros,
      }
      const data = await usuariosService.getUsuarios(params)
      setUsuarios(data.results)
      setPagination({
        count: data.count,
        next: data.next,
        previous: data.previous,
        current_page: page,
        total_pages: Math.ceil(data.count / 10),
      })
      audit.custom('ver_lista_usuarios', { page, filtros })
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const data = await usuariosService.getEstadisticas()
      setEstadisticas(data)
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  const handleBuscar = (e) => {
    e.preventDefault()
    cargarUsuarios(1)
  }

  const handleCrear = () => {
    setUsuarioSeleccionado(null)
    setModoEdicion(false)
    setShowModalUsuario(true)
    audit.modalOpen('crear_usuario')
  }

  const handleEditar = (usuario) => {
    setUsuarioSeleccionado(usuario)
    setModoEdicion(true)
    setShowModalUsuario(true)
    audit.button('editar_usuario', usuario.id)
  }

  const handleVerDetalle = (usuario) => {
    setUsuarioSeleccionado(usuario)
    setShowModalDetalle(true)
    audit.button('ver_detalle_usuario', usuario.id)
  }

  const handleCambiarContrasena = (usuario) => {
    setUsuarioSeleccionado(usuario)
    setShowModalContrasena(true)
    audit.modalOpen('cambiar_contrasena_usuario', usuario.id)
  }

  const handleAsignarRoles = (usuario) => {
    setUsuarioSeleccionado(usuario)
    setShowModalRoles(true)
    audit.modalOpen('asignar_roles_usuario', usuario.id)
  }

  const handleToggleActivo = async (usuario) => {
    try {
      const nuevoEstado = !usuario.is_active
      await usuariosService.toggleActivoUsuario(usuario.id, nuevoEstado)
      toast.success(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`)
      cargarUsuarios(pagination.current_page)
      audit.button(nuevoEstado ? 'activar_usuario' : 'desactivar_usuario', usuario.id)
    } catch (error) {
      console.error('Error cambiando estado:', error)
      toast.error('Error al cambiar estado del usuario')
    }
  }

  const handleEliminar = async (usuario) => {
    if (!window.confirm(`¿Está seguro de eliminar al usuario "${usuario.username}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await usuariosService.eliminarUsuario(usuario.id)
      toast.success('Usuario eliminado correctamente')
      cargarUsuarios(pagination.current_page)
      audit.button('eliminar_usuario', usuario.id)
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      toast.error('Error al eliminar usuario')
    }
  }

  const handleExportar = async () => {
    try {
      const blob = await usuariosService.exportarUsuarios(filtros)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usuarios_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Usuarios exportados correctamente')
      audit.button('exportar_usuarios')
    } catch (error) {
      console.error('Error exportando:', error)
      toast.error('Error al exportar usuarios')
    }
  }

  const handleGuardarUsuario = () => {
    cargarUsuarios(pagination.current_page)
    cargarEstadisticas()
    setShowModalUsuario(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 mt-1">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>

        <button
          onClick={handleCrear}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Usuarios</p>
                <p className="text-3xl font-bold mt-1">{estadisticas.total_usuarios}</p>
              </div>
              <UserIcon className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Usuarios Activos</p>
                <p className="text-3xl font-bold mt-1">{estadisticas.usuarios_activos}</p>
              </div>
              <CheckCircleIcon className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Usuarios Inactivos</p>
                <p className="text-3xl font-bold mt-1">{estadisticas.usuarios_inactivos}</p>
              </div>
              <XCircleIcon className="w-12 h-12 text-red-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Administradores</p>
                <p className="text-3xl font-bold mt-1">{estadisticas.usuarios_staff}</p>
              </div>
              <ShieldCheckIcon className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <form onSubmit={handleBuscar} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, usuario o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Buscar
            </button>

            <button
              type="button"
              onClick={() => setShowFiltros(!showFiltros)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <FunnelIcon className="w-5 h-5" />
              Filtros
            </button>

            <button
              type="button"
              onClick={handleExportar}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Exportar
            </button>
          </div>

          {/* Panel de filtros */}
          {showFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={filtros.is_active}
                  onChange={(e) => setFiltros({ ...filtros, is_active: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Usuario
                </label>
                <select
                  value={filtros.is_staff}
                  onChange={(e) => setFiltros({ ...filtros, is_staff: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="true">Administradores</option>
                  <option value="false">Usuarios Regulares</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  value={filtros.ordering}
                  onChange={(e) => setFiltros({ ...filtros, ordering: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="-date_joined">Más recientes</option>
                  <option value="date_joined">Más antiguos</option>
                  <option value="first_name">Nombre (A-Z)</option>
                  <option value="-first_name">Nombre (Z-A)</option>
                  <option value="email">Email (A-Z)</option>
                  <option value="-email">Email (Z-A)</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-12">
            <UserPlusIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron usuarios</p>
            <button
              onClick={handleCrear}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Crear primer usuario
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Registro
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuarios.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {usuario.username.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {usuario.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {usuario.first_name} {usuario.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{usuario.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {usuario.is_superuser ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            Superusuario
                          </span>
                        ) : usuario.is_staff ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Administrador
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Usuario
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {usuario.is_active ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Activo
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(usuario.date_joined).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleVerDetalle(usuario)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Ver detalle"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEditar(usuario)}
                            className="text-indigo-600 hover:text-indigo-900 transition-colors"
                            title="Editar"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleCambiarContrasena(usuario)}
                            className="text-yellow-600 hover:text-yellow-900 transition-colors"
                            title="Cambiar contraseña"
                          >
                            <KeyIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleAsignarRoles(usuario)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="Asignar roles"
                          >
                            <ShieldCheckIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleToggleActivo(usuario)}
                            className={`transition-colors ${
                              usuario.is_active
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={usuario.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {usuario.is_active ? (
                              <XCircleIcon className="w-5 h-5" />
                            ) : (
                              <CheckCircleIcon className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEliminar(usuario)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Eliminar"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.total_pages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">
                      {(pagination.current_page - 1) * 10 + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(pagination.current_page * 10, pagination.count)}
                    </span>{' '}
                    de <span className="font-medium">{pagination.count}</span> resultados
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => cargarUsuarios(pagination.current_page - 1)}
                      disabled={!pagination.previous}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>

                    {[...Array(pagination.total_pages)].map((_, index) => {
                      const page = index + 1
                      if (
                        page === 1 ||
                        page === pagination.total_pages ||
                        (page >= pagination.current_page - 1 &&
                          page <= pagination.current_page + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => cargarUsuarios(page)}
                            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                              page === pagination.current_page
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (
                        page === pagination.current_page - 2 ||
                        page === pagination.current_page + 2
                      ) {
                        return <span key={page} className="px-2 py-2">...</span>
                      }
                      return null
                    })}

                    <button
                      onClick={() => cargarUsuarios(pagination.current_page + 1)}
                      disabled={!pagination.next}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      {showModalUsuario && (
        <UsuarioModal
          usuario={usuarioSeleccionado}
          modoEdicion={modoEdicion}
          onClose={() => setShowModalUsuario(false)}
          onGuardar={handleGuardarUsuario}
        />
      )}

      {showModalDetalle && usuarioSeleccionado && (
        <UsuarioDetalleModal
          usuario={usuarioSeleccionado}
          onClose={() => setShowModalDetalle(false)}
        />
      )}

      {showModalContrasena && usuarioSeleccionado && (
        <CambiarContrasenaModal
          usuario={usuarioSeleccionado}
          onClose={() => setShowModalContrasena(false)}
        />
      )}

      {showModalRoles && usuarioSeleccionado && (
        <AsignarRolesModal
          usuario={usuarioSeleccionado}
          onClose={() => setShowModalRoles(false)}
          onGuardar={() => {
            cargarUsuarios(pagination.current_page)
            setShowModalRoles(false)
          }}
        />
      )}
    </div>
  )
}
