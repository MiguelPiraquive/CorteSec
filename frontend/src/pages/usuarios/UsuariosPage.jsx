import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  UserIcon,
  MagnifyingGlassIcon,
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
import Can from '../../components/permissions/Can'
import { usePermissions } from '../../context/PermissionsContext'
import useProductTour from '../../hooks/useProductTour'
import { TOUR_CONFIGS } from '../../data/tourConfigs'
import UsuarioModal from './UsuarioModal'
import UsuarioDetalleModal from './UsuarioDetalleModal'
import CambiarContrasenaModal from './CambiarContrasenaModal'
import AsignarRolesModal from './AsignarRolesModal'
import InvitarUsuarioModal from './InvitarUsuarioModal'

export default function UsuariosPage() {
  const audit = useAudit('Usuarios')
  const { hasPermission, initialized } = usePermissions()

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
  const [showModalInvitar, setShowModalInvitar] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [modoEdicion, setModoEdicion] = useState(false)

  // Estadisticas
  const [estadisticas, setEstadisticas] = useState(null)

  // Product Tour
  useProductTour('usuarios', TOUR_CONFIGS.usuarios.steps, {
    ready: !loading && initialized,
  })

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

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('usuarios.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div id="usuarios-header" className="backdrop-blur-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Gestión de Usuarios</h1>
              <p className="text-indigo-100 mt-1">
                Administra usuarios, roles y permisos del sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Can permission="usuarios.add">
              <button
                id="btn-agregar-usuario"
                onClick={() => setShowModalInvitar(true)}
                className="bg-white text-indigo-700 px-6 py-3 rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold hover:scale-105 transform"
              >
                <UserPlusIcon className="w-5 h-5" />
                Agregar Usuario
              </button>
            </Can>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 pointer-events-none" />
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div id="usuarios-estadisticas" className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Usuarios</p>
                <p className="text-4xl font-bold mt-1">{estadisticas.total_usuarios}</p>
              </div>
            </div>
            <UserIcon className="w-16 h-16 text-white/20 absolute -bottom-2 -right-2" />
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-green-100 text-sm font-medium">Usuarios Activos</p>
                <p className="text-4xl font-bold mt-1">{estadisticas.usuarios_activos}</p>
              </div>
            </div>
            <CheckCircleIcon className="w-16 h-16 text-white/20 absolute -bottom-2 -right-2" />
          </div>

          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-red-100 text-sm font-medium">Usuarios Inactivos</p>
                <p className="text-4xl font-bold mt-1">{estadisticas.usuarios_inactivos}</p>
              </div>
            </div>
            <XCircleIcon className="w-16 h-16 text-white/20 absolute -bottom-2 -right-2" />
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-purple-100 text-sm font-medium">Administradores</p>
                <p className="text-4xl font-bold mt-1">{estadisticas.usuarios_staff}</p>
              </div>
            </div>
            <ShieldCheckIcon className="w-16 h-16 text-white/20 absolute -bottom-2 -right-2" />
          </div>
        </div>
      )}

      {/* Barra de busqueda y filtros */}
      <div id="usuarios-busqueda" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 p-6">
        <form onSubmit={handleBuscar} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, usuario o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
            >
              Buscar
            </button>

            <button
              type="button"
              onClick={() => setShowFiltros(!showFiltros)}
              className={`px-6 py-3 rounded-xl transition-all flex items-center gap-2 font-medium border-2 ${
                showFiltros 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300' 
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              Filtros
            </button>

            <Can permission="usuarios.admin">
              <button
                type="button"
                onClick={handleExportar}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Exportar
              </button>
            </Can>
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
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
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
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
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
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
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
      <div id="usuarios-tabla" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-12">
            <UserPlusIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron usuarios</p>
            <Can permission="usuarios.add">
              <button
                onClick={handleCrear}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Crear primer usuario
              </button>
            </Can>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-500 to-purple-600">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Fecha Registro
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {usuarios.map((usuario, idx) => (
                    <tr
                      key={usuario.id}
                      className={`hover:bg-indigo-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
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
                        <div className="flex flex-wrap gap-1">
                          {usuario.roles && usuario.roles.length > 0 ? (
                            usuario.roles.map((rol, ri) => (
                              <span
                                key={ri}
                                className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800"
                              >
                                {rol.nombre || rol.name || rol}
                              </span>
                            ))
                          ) : usuario.organization_role ? (
                            <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {usuario.organization_role === 'ADMIN' ? 'Administrador'
                                : usuario.organization_role === 'OWNER' ? 'Propietario'
                                : usuario.organization_role === 'MANAGER' ? 'Gerente'
                                : usuario.organization_role === 'VIEWER' ? 'Visualizador'
                                : 'Miembro'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Sin rol
                            </span>
                          )}
                        </div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleVerDetalle(usuario)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                            title="Ver detalle"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <Can permission="usuarios.change">
                            <button
                              onClick={() => handleEditar(usuario)}
                              className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all"
                              title="Editar"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          </Can>
                          <Can permission="usuarios.change">
                            <button
                              onClick={() => handleCambiarContrasena(usuario)}
                              className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-all"
                              title="Cambiar contraseña"
                            >
                              <KeyIcon className="w-4 h-4" />
                            </button>
                          </Can>
                          <Can permission="usuarios.change">
                            <button
                              onClick={() => handleAsignarRoles(usuario)}
                              className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-all"
                              title="Asignar roles"
                            >
                              <ShieldCheckIcon className="w-4 h-4" />
                            </button>
                          </Can>
                          <Can permission="usuarios.change">
                            <button
                              onClick={() => handleToggleActivo(usuario)}
                              className={`p-2 rounded-lg transition-all ${
                                usuario.is_active
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                  : 'bg-green-100 text-green-600 hover:bg-green-200'
                              }`}
                              title={usuario.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {usuario.is_active ? (
                                <XCircleIcon className="w-4 h-4" />
                              ) : (
                                <CheckCircleIcon className="w-4 h-4" />
                              )}
                            </button>
                          </Can>
                          <Can permission="usuarios.delete">
                            <button
                              onClick={() => handleEliminar(usuario)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                              title="Eliminar"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.total_pages > 1 && (
              <div className="bg-gray-50/80 px-6 py-4 border-t border-gray-200/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando{' '}
                    <span className="font-semibold text-gray-900">
                      {(pagination.current_page - 1) * 10 + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-semibold text-gray-900">
                      {Math.min(pagination.current_page * 10, pagination.count)}
                    </span>{' '}
                    de <span className="font-semibold text-gray-900">{pagination.count}</span> resultados
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => cargarUsuarios(pagination.current_page - 1)}
                      disabled={!pagination.previous}
                      className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              page === pagination.current_page
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                                : 'border-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (
                        page === pagination.current_page - 2 ||
                        page === pagination.current_page + 2
                      ) {
                        return <span key={page} className="px-2 py-2 text-gray-400">...</span>
                      }
                      return null
                    })}

                    <button
                      onClick={() => cargarUsuarios(pagination.current_page + 1)}
                      disabled={!pagination.next}
                      className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
          onEditar={(u) => {
            setShowModalDetalle(false)
            handleEditar(u)
          }}
          onCambiarContrasena={(u) => {
            setShowModalDetalle(false)
            handleCambiarContrasena(u)
          }}
          onAsignarRoles={(u) => {
            setShowModalDetalle(false)
            handleAsignarRoles(u)
          }}
        />
      )}

      {showModalContrasena && usuarioSeleccionado && (
        <CambiarContrasenaModal
          usuario={usuarioSeleccionado}
          onClose={() => setShowModalContrasena(false)}
          onSuccess={() => {
            setShowModalContrasena(false)
            cargarUsuarios(pagination.current_page)
          }}
        />
      )}

      {showModalRoles && usuarioSeleccionado && (
        <AsignarRolesModal
          usuario={usuarioSeleccionado}
          onClose={() => setShowModalRoles(false)}
          onSuccess={() => {
            cargarUsuarios(pagination.current_page)
            setShowModalRoles(false)
          }}
        />
      )}

      {showModalInvitar && (
        <InvitarUsuarioModal
          onClose={() => setShowModalInvitar(false)}
          onInvitado={() => {
            cargarUsuarios(pagination.current_page)
            cargarEstadisticas()
          }}
        />
      )}
    </div>
  )
}
