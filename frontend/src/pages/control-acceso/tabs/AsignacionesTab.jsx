import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import asignacionesRolService from '../../../services/asignacionesRolService'
import rolesService from '../../../services/rolesService'
import {
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  UserGroupIcon,
  Bars3BottomLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'

const AsignacionesTab = () => {
  const [asignaciones, setAsignaciones] = useState([])
  const [roles, setRoles] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [agruparPorUsuario, setAgruparPorUsuario] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [historialAsignaciones, setHistorialAsignaciones] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [historialPage, setHistorialPage] = useState(1)
  const [historialPageSize] = useState(10)
  const [historialFiltroEstado, setHistorialFiltroEstado] = useState('todos')
  const [historialBusqueda, setHistorialBusqueda] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(15)
  
  const [formData, setFormData] = useState({
    usuario: '',
    rol: '',
    justificacion: '',
    fecha_fin: '',
    observaciones: ''
  })
  
  const [stats, setStats] = useState({
    total: 0,
    activas: 0,
    pendientes: 0,
    usuarios_con_roles: 0
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [busqueda, filtroEstado, agruparPorUsuario])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rolesData, usuariosData, asignacionesData] = await Promise.all([
        rolesService.getAllRoles({ activo: true }),
        asignacionesRolService.getUsuariosDisponibles(),
        asignacionesRolService.getAllAsignaciones()
      ])
      
      setRoles(Array.isArray(rolesData.results) ? rolesData.results : rolesData)
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : [])
      
      const asignacionesList = Array.isArray(asignacionesData.results) ? asignacionesData.results : asignacionesData
      setAsignaciones(asignacionesList)
      
      const activas = asignacionesList.filter(a => a.estado_nombre === 'ACTIVA').length
      const pendientes = asignacionesList.filter(a => a.estado_nombre === 'PENDIENTE').length
      const usuariosUnicos = new Set(asignacionesList.filter(a => a.activa).map(a => a.usuario)).size
      
      setStats({
        total: asignacionesList.length,
        activas,
        pendientes,
        usuarios_con_roles: usuariosUnicos
      })
      
    } catch (error) {
      showNotification('error', 'Error al cargar datos')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.usuario || !formData.rol) {
      showNotification('error', 'Por favor selecciona usuario y rol')
      return
    }
    
    try {
      const data = {
        usuario: parseInt(formData.usuario),
        rol: parseInt(formData.rol),
        justificacion: formData.justificacion || '',
        fecha_fin: formData.fecha_fin || null,
        observaciones: formData.observaciones || ''
      }
      
      await asignacionesRolService.createAsignacion(data)
      
      const rolSeleccionado = roles.find(r => r.id === parseInt(formData.rol))
      const mensaje = rolSeleccionado?.requiere_aprobacion 
        ? 'Asignación creada (PENDIENTE - requiere aprobación)'
        : 'Asignación creada y activada automáticamente'
      
      showNotification('success', mensaje)
      resetForm()
      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Error:', error)
      const errorMsg = error.response?.data?.detail || 
                       JSON.stringify(error.response?.data) || 
                       error.message
      showNotification('error', 'Error al asignar rol: ' + errorMsg)
    }
  }

  const resetForm = () => {
    setFormData({
      usuario: '',
      rol: '',
      justificacion: '',
      fecha_fin: '',
      observaciones: ''
    })
  }

  const handleAprobar = async (asignacionId) => {
    if (!window.confirm('¿Estás seguro de aprobar esta asignación?')) return
    
    try {
      await asignacionesRolService.aprobarAsignacion(asignacionId)
      showNotification('success', 'Asignación aprobada exitosamente')
      loadData()
    } catch (error) {
      showNotification('error', 'Error al aprobar: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleRechazar = async (asignacionId) => {
    const motivo = prompt('Ingresa el motivo del rechazo:')
    if (!motivo) return
    
    try {
      await asignacionesRolService.rechazarAsignacion(asignacionId, { motivo })
      showNotification('success', 'Asignación rechazada')
      loadData()
    } catch (error) {
      showNotification('error', 'Error al rechazar: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleRevocar = async (asignacionId) => {
    const motivo = prompt('Ingresa el motivo de la revocación:')
    if (!motivo) return
    
    try {
      await asignacionesRolService.revocarAsignacion(asignacionId, { motivo })
      showNotification('success', 'Asignación revocada')
      loadData()
    } catch (error) {
      showNotification('error', 'Error al revocar: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleVerHistorial = async (usuario) => {
    setUsuarioSeleccionado(usuario)
    setShowHistorialModal(true)
    setLoadingHistorial(true)
    setHistorialPage(1)
    setHistorialFiltroEstado('todos')
    setHistorialBusqueda('')
    
    try {
      const data = await asignacionesRolService.getAllAsignaciones()
      const asignacionesList = Array.isArray(data.results) ? data.results : data
      const historial = asignacionesList.filter(a => a.usuario === usuario.id || a.usuario_detalle?.id === usuario.id)
      setHistorialAsignaciones(historial)
    } catch (error) {
      showNotification('error', 'Error al cargar historial')
      console.error(error)
    } finally {
      setLoadingHistorial(false)
    }
  }

  const asignacionesFiltradas = asignaciones.filter(asignacion => {
    if (filtroEstado !== 'todos') {
      const estadoMatch = asignacion.estado_nombre?.toUpperCase() === filtroEstado.toUpperCase()
      if (!estadoMatch) return false
    }
    
    if (busqueda) {
      const search = busqueda.toLowerCase()
      const nombreUsuario = asignacion.usuario_detalle?.username?.toLowerCase() || ''
      const nombreRol = asignacion.rol_detalle?.nombre?.toLowerCase() || ''
      return nombreUsuario.includes(search) || nombreRol.includes(search)
    }
    
    return true
  })

  // Agrupar por usuario si está activado
  const asignacionesOrganizadas = agruparPorUsuario
    ? Object.entries(
        asignacionesFiltradas.reduce((grupos, asignacion) => {
          const usuarioKey = asignacion.usuario_detalle?.id || asignacion.usuario
          if (!grupos[usuarioKey]) {
            grupos[usuarioKey] = {
              usuario: asignacion.usuario_detalle || { id: asignacion.usuario },
              asignaciones: []
            }
          }
          grupos[usuarioKey].asignaciones.push(asignacion)
          return grupos
        }, {})
      ).map(([key, value]) => value)
    : asignacionesFiltradas.map(a => ({ usuario: a.usuario_detalle || { id: a.usuario }, asignaciones: [a] }))

  const totalPages = Math.ceil(
    agruparPorUsuario 
      ? asignacionesOrganizadas.length / pageSize
      : asignacionesFiltradas.length / pageSize
  )
  
  const paginatedData = agruparPorUsuario
    ? asignacionesOrganizadas.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : asignacionesFiltradas.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(a => ({ 
        usuario: a.usuario_detalle || { id: a.usuario }, 
        asignaciones: [a] 
      }))

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const getEstadoBadge = (estado) => {
    const badges = {
      'PENDIENTE': 'bg-yellow-100 text-yellow-700',
      'ACTIVA': 'bg-green-100 text-green-700',
      'APROBADA': 'bg-blue-100 text-blue-700',
      'REVOCADA': 'bg-red-100 text-red-700',
      'RECHAZADA': 'bg-gray-100 text-gray-700',
      'INACTIVA': 'bg-gray-100 text-gray-700',
      'EXPIRADA': 'bg-orange-100 text-orange-700'
    }
    return badges[estado] || 'bg-gray-100 text-gray-700'
  }

  const handleAsignarRolAdicional = (usuario) => {
    setFormData({
      usuario: usuario.id?.toString() || '',
      rol: '',
      justificacion: '',
      fecha_fin: '',
      observaciones: ''
    })
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${notification.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckIcon className="w-6 h-6" /> : <ExclamationTriangleIcon className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-end">
        <button onClick={() => { setShowModal(true); resetForm() }} className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg">
          <UserPlusIcon className="w-5 h-5" />
          <span>Nueva Asignación</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Asignaciones</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <UserGroupIcon className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Activas</p>
              <p className="text-3xl font-bold">{stats.activas}</p>
            </div>
            <CheckIcon className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Pendientes</p>
              <p className="text-3xl font-bold">{stats.pendientes}</p>
            </div>
            <ClockIcon className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Usuarios con Roles</p>
              <p className="text-3xl font-bold">{stats.usuarios_con_roles}</p>
            </div>
            <UserPlusIcon className="w-16 h-16 text-white/30" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por usuario o rol..." className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all" />
          </div>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all">
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="activa">Activas</option>
            <option value="revocada">Revocadas</option>
            <option value="rechazada">Rechazadas</option>
          </select>
          <button
            onClick={() => setAgruparPorUsuario(!agruparPorUsuario)}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              agruparPorUsuario
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <UserGroupIcon className="w-5 h-5" />
            <span>{agruparPorUsuario ? 'Agrupado por Usuario' : 'Agrupar por Usuario'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden border border-gray-200/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Usuario</th>
                <th className="px-6 py-4 text-left font-semibold">Rol</th>
                <th className="px-6 py-4 text-center font-semibold">Estado</th>
                <th className="px-6 py-4 text-center font-semibold">Fecha Asignación</th>
                <th className="px-6 py-4 text-center font-semibold">Asignado Por</th>
                <th className="px-6 py-4 text-center font-semibold">Historial</th>
                <th className="px-6 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center space-x-3">
                      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600">Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No se encontraron asignaciones
                  </td>
                </tr>
              ) : agruparPorUsuario ? (
                // Vista agrupada por usuario
                paginatedData.map((grupo, grupoIndex) => (
                  <React.Fragment key={`grupo-${grupo.usuario.id || grupoIndex}`}>
                    {/* Fila del usuario (header del grupo) */}
                    <tr className="bg-gradient-to-r from-cyan-50 to-blue-50 border-t-2 border-cyan-300">
                      <td colSpan="7" className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="bg-cyan-600 p-2 rounded-lg">
                              <UserGroupIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-base font-bold text-gray-900">
                                {grupo.usuario.nombre_completo || grupo.usuario.username || `Usuario ID: ${grupo.usuario.id}`}
                              </div>
                              {grupo.usuario.email && (
                                <div className="text-sm text-gray-600">
                                  {grupo.usuario.email}
                                </div>
                              )}
                            </div>
                            <span className="px-3 py-1 bg-cyan-600 text-white rounded-full text-xs font-bold">
                              {grupo.asignaciones.length} {grupo.asignaciones.length === 1 ? 'rol' : 'roles'}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleVerHistorial(grupo.usuario)}
                              className="inline-flex items-center space-x-1 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all font-medium text-sm"
                            >
                              <ClipboardDocumentListIcon className="w-4 h-4" />
                              <span>Ver Historial</span>
                            </button>
                            <button 
                              onClick={() => handleAsignarRolAdicional(grupo.usuario)}
                              className="inline-flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all font-medium text-sm"
                            >
                              <UserPlusIcon className="w-4 h-4" />
                              <span>Asignar Rol Adicional</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* Filas de asignaciones del usuario */}
                    {grupo.asignaciones.map((asignacion, asigIndex) => (
                      <tr key={asignacion.id} className={`${asigIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-cyan-50 transition-colors`}>
                        <td className="px-6 py-3 pl-16 text-sm text-gray-500">
                          <span className="text-xs">↳</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-sm text-gray-900 font-medium">
                            {asignacion.rol_detalle?.nombre || asignacion.rol}
                          </div>
                          {asignacion.rol_detalle?.requiere_aprobacion && (
                            <div className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                              <ExclamationTriangleIcon className="h-3 w-3" />
                              Requiere aprobación
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getEstadoBadge(asignacion.estado_nombre)}`}>
                            {asignacion.estado_nombre}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center text-sm text-gray-600">
                          {new Date(asignacion.fecha_asignacion).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-center text-sm text-gray-600">
                          {asignacion.asignado_por_nombre || 'N/A'}
                        </td>
                        <td className="px-6 py-3"></td>
                        <td className="px-6 py-3">
                          <div className="flex justify-center space-x-2">
                            {asignacion.estado_nombre === 'PENDIENTE' && (
                              <>
                                <button onClick={() => handleAprobar(asignacion.id)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all" title="Aprobar">
                                  <CheckIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleRechazar(asignacion.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all" title="Rechazar">
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {(asignacion.estado_nombre === 'ACTIVA' || asignacion.estado_nombre === 'APROBADA') && asignacion.activa && (
                              <button onClick={() => handleRevocar(asignacion.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all" title="Revocar">
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                // Vista normal (sin agrupar)
                paginatedData.map((item, index) => {
                  const asignacion = item.asignaciones[0]
                  return (
                    <tr key={asignacion.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-cyan-50 transition-colors`}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {asignacion.usuario_detalle?.nombre_completo || asignacion.usuario_detalle?.username || `Usuario ID: ${asignacion.usuario}`}
                        </div>
                        {asignacion.usuario_detalle?.email && (
                          <div className="text-xs text-gray-500 mt-1">
                            {asignacion.usuario_detalle.email}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {asignacion.rol_detalle?.nombre || asignacion.rol}
                        </div>
                        {asignacion.rol_detalle?.requiere_aprobacion && (
                          <div className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            Requiere aprobación
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getEstadoBadge(asignacion.estado_nombre)}`}>
                          {asignacion.estado_nombre}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {new Date(asignacion.fecha_asignacion).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {asignacion.asignado_por_nombre || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleVerHistorial(asignacion.usuario_detalle || { id: asignacion.usuario })}
                          className="inline-flex items-center space-x-1 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all font-medium text-sm"
                          title="Ver historial completo"
                        >
                          <ClipboardDocumentListIcon className="w-4 h-4" />
                          <span>Ver Historial</span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center space-x-2">
                          <button 
                            onClick={() => handleAsignarRolAdicional(asignacion.usuario_detalle || { id: asignacion.usuario })}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all" 
                            title="Asignar Rol Adicional"
                          >
                            <UserPlusIcon className="w-4 h-4" />
                          </button>
                          {asignacion.estado_nombre === 'PENDIENTE' && (
                            <>
                              <button onClick={() => handleAprobar(asignacion.id)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all" title="Aprobar">
                                <CheckIcon className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleRechazar(asignacion.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all" title="Rechazar">
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(asignacion.estado_nombre === 'ACTIVA' || asignacion.estado_nombre === 'APROBADA') && asignacion.activa && (
                            <button onClick={() => handleRevocar(asignacion.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all" title="Revocar">
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {agruparPorUsuario 
                ? `Mostrando ${((currentPage - 1) * pageSize) + 1} - ${Math.min(currentPage * pageSize, asignacionesOrganizadas.length)} de ${asignacionesOrganizadas.length} usuarios`
                : `Mostrando ${((currentPage - 1) * pageSize) + 1} - ${Math.min(currentPage * pageSize, asignacionesFiltradas.length)} de ${asignacionesFiltradas.length} asignaciones`
              }
            </div>
            <div className="flex space-x-2">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                Anterior
              </button>
              <span className="px-4 py-2 bg-cyan-600 text-white rounded-lg">
                {currentPage} / {totalPages}
              </span>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Historial */}
      {showHistorialModal && usuarioSeleccionado && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Historial de Asignaciones</h2>
                <p className="text-indigo-100 text-sm mt-1">
                  Usuario: {usuarioSeleccionado.username || usuarioSeleccionado.nombre_completo || 'N/A'}
                </p>
              </div>
              <button onClick={() => setShowHistorialModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Stats del usuario */}
            <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
              <div className="bg-white rounded-xl shadow p-4">
                <div className="text-2xl font-bold text-blue-600">{historialAsignaciones.length}</div>
                <div className="text-xs text-gray-600">Total Asignaciones</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <div className="text-2xl font-bold text-green-600">
                  {historialAsignaciones.filter(a => a.estado_nombre === 'ACTIVA').length}
                </div>
                <div className="text-xs text-gray-600">Activas</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {historialAsignaciones.filter(a => a.estado_nombre === 'PENDIENTE').length}
                </div>
                <div className="text-xs text-gray-600">Pendientes</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <div className="text-2xl font-bold text-red-600">
                  {historialAsignaciones.filter(a => a.estado_nombre === 'REVOCADA' || a.estado_nombre === 'RECHAZADA').length}
                </div>
                <div className="text-xs text-gray-600">Revocadas/Rechazadas</div>
              </div>
            </div>

            {/* Filtros del historial */}
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={historialBusqueda}
                    onChange={(e) => { setHistorialBusqueda(e.target.value); setHistorialPage(1) }}
                    placeholder="Buscar por nombre de rol..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <select
                  value={historialFiltroEstado}
                  onChange={(e) => { setHistorialFiltroEstado(e.target.value); setHistorialPage(1) }}
                  className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="ACTIVA">Activas</option>
                  <option value="PENDIENTE">Pendientes</option>
                  <option value="APROBADA">Aprobadas</option>
                  <option value="REVOCADA">Revocadas</option>
                  <option value="RECHAZADA">Rechazadas</option>
                  <option value="EXPIRADA">Expiradas</option>
                </select>
              </div>
            </div>

            {/* Tabla de historial */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistorial ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                (() => {
                  const historialFiltrado = historialAsignaciones.filter(a => {
                    const estadoMatch = historialFiltroEstado === 'todos' || a.estado_nombre === historialFiltroEstado
                    const searchMatch = !historialBusqueda || a.rol_detalle?.nombre?.toLowerCase().includes(historialBusqueda.toLowerCase())
                    return estadoMatch && searchMatch
                  })

                  const totalHistorialPages = Math.ceil(historialFiltrado.length / historialPageSize)
                  const paginatedHistorial = historialFiltrado.slice(
                    (historialPage - 1) * historialPageSize,
                    historialPage * historialPageSize
                  )

                  return (
                    <>
                      <div className="space-y-4">
                        {paginatedHistorial.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            No se encontraron asignaciones con los filtros aplicados
                          </div>
                        ) : (
                          paginatedHistorial.map((asignacion, index) => (
                            <div key={asignacion.id} className="bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-3">
                                  {/* Header del registro */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="bg-indigo-100 p-2 rounded-lg">
                                        <FunnelIcon className="w-5 h-5 text-indigo-600" />
                                      </div>
                                      <div>
                                        <h4 className="text-lg font-bold text-gray-900">
                                          {asignacion.rol_detalle?.nombre || 'Rol N/A'}
                                        </h4>
                                        <div className="flex items-center space-x-2 mt-1">
                                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getEstadoBadge(asignacion.estado_nombre)}`}>
                                            {asignacion.estado_nombre}
                                          </span>
                                          {asignacion.rol_detalle?.requiere_aprobacion && (
                                            <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                                              <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                              Requiere Aprobación
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Información detallada */}
                                  <div className="grid grid-cols-2 gap-4 bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2 text-sm">
                                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Fecha Asignación:</span>
                                        <span className="font-semibold text-gray-900">
                                          {new Date(asignacion.fecha_asignacion).toLocaleDateString('es-ES', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                          })}
                                        </span>
                                      </div>
                                      {asignacion.fecha_fin && (
                                        <div className="flex items-center space-x-2 text-sm">
                                          <ClockIcon className="w-4 h-4 text-gray-400" />
                                          <span className="text-gray-600">Fecha Fin:</span>
                                          <span className="font-semibold text-gray-900">
                                            {new Date(asignacion.fecha_fin).toLocaleDateString('es-ES', { 
                                              year: 'numeric', 
                                              month: 'long', 
                                              day: 'numeric' 
                                            })}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-center space-x-2 text-sm">
                                        <UserGroupIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Asignado por:</span>
                                        <span className="font-semibold text-gray-900">
                                          {asignacion.asignado_por_nombre || 'N/A'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      {asignacion.fecha_aprobacion && (
                                        <div className="flex items-center space-x-2 text-sm">
                                          <CheckIcon className="w-4 h-4 text-green-600" />
                                          <span className="text-gray-600">Aprobado:</span>
                                          <span className="font-semibold text-gray-900">
                                            {new Date(asignacion.fecha_aprobacion).toLocaleDateString('es-ES')}
                                          </span>
                                        </div>
                                      )}
                                      {asignacion.aprobado_por_nombre && (
                                        <div className="flex items-center space-x-2 text-sm">
                                          <UserGroupIcon className="w-4 h-4 text-gray-400" />
                                          <span className="text-gray-600">Aprobador:</span>
                                          <span className="font-semibold text-gray-900">
                                            {asignacion.aprobado_por_nombre}
                                          </span>
                                        </div>
                                      )}
                                      {asignacion.activa !== undefined && (
                                        <div className="flex items-center space-x-2 text-sm">
                                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                            asignacion.activa 
                                              ? 'bg-green-100 text-green-700' 
                                              : 'bg-gray-100 text-gray-700'
                                          }`}>
                                            {asignacion.activa ? '✓ Activo' : '✗ Inactivo'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Justificación y Observaciones */}
                                  {(asignacion.justificacion || asignacion.observaciones) && (
                                    <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                                      {asignacion.justificacion && (
                                        <div>
                                          <div className="flex items-center space-x-2 mb-1">
                                            <Bars3BottomLeftIcon className="w-4 h-4 text-blue-600" />
                                            <span className="text-xs font-semibold text-blue-900">Justificación:</span>
                                          </div>
                                          <p className="text-sm text-blue-800 pl-6">{asignacion.justificacion}</p>
                                        </div>
                                      )}
                                      {asignacion.observaciones && (
                                        <div>
                                          <div className="flex items-center space-x-2 mb-1">
                                            <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                                            <span className="text-xs font-semibold text-blue-900">Observaciones:</span>
                                          </div>
                                          <p className="text-sm text-blue-800 pl-6">{asignacion.observaciones}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Información del rol */}
                                  {asignacion.rol_detalle && (
                                    <div className="bg-purple-50 rounded-lg p-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <FunnelIcon className="w-4 h-4 text-purple-600" />
                                        <span className="text-xs font-semibold text-purple-900">Detalles del Rol:</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs pl-6">
                                        {asignacion.rol_detalle.descripcion && (
                                          <div className="col-span-2">
                                            <span className="text-purple-700">Descripción:</span>
                                            <span className="text-purple-900 ml-2">{asignacion.rol_detalle.descripcion}</span>
                                          </div>
                                        )}
                                        {asignacion.rol_detalle.tipo_rol_nombre && (
                                          <div>
                                            <span className="text-purple-700">Tipo:</span>
                                            <span className="text-purple-900 ml-2">{asignacion.rol_detalle.tipo_rol_nombre}</span>
                                          </div>
                                        )}
                                        {asignacion.rol_detalle.nivel_jerarquico !== undefined && (
                                          <div>
                                            <span className="text-purple-700">Nivel:</span>
                                            <span className="text-purple-900 ml-2">{asignacion.rol_detalle.nivel_jerarquico}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Paginación del historial */}
                      {totalHistorialPages > 1 && (
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-600">
                            Mostrando {((historialPage - 1) * historialPageSize) + 1} - {Math.min(historialPage * historialPageSize, historialFiltrado.length)} de {historialFiltrado.length}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setHistorialPage(historialPage - 1)}
                              disabled={historialPage === 1}
                              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                            >
                              Anterior
                            </button>
                            <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">
                              {historialPage} / {totalHistorialPages}
                            </span>
                            <button
                              onClick={() => setHistorialPage(historialPage + 1)}
                              disabled={historialPage === totalHistorialPages}
                              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-2xl font-bold">Nueva Asignación de Rol</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Usuario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Usuario *
                </label>
                <div className="relative">
                  <UserGroupIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select value={formData.usuario} onChange={(e) => setFormData({...formData, usuario: e.target.value})} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-all" required>
                    <option value="">Seleccione un usuario</option>
                    {usuarios.map(usuario => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre_completo} ({usuario.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Rol */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rol *
                </label>
                <div className="relative">
                  <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select value={formData.rol} onChange={(e) => setFormData({...formData, rol: e.target.value})} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-all" required>
                    <option value="">Seleccione un rol</option>
                    {roles.map(rol => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre} {rol.requiere_aprobacion ? '⚠️ (Requiere aprobación)' : '✅ (Auto-aprobado)'}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.rol && roles.find(r => r.id === parseInt(formData.rol))?.requiere_aprobacion && (
                  <p className="mt-2 text-sm text-yellow-600 flex items-center gap-1">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    Este rol requiere aprobación. La asignación quedará en estado PENDIENTE.
                  </p>
                )}
                {formData.rol && !roles.find(r => r.id === parseInt(formData.rol))?.requiere_aprobacion && (
                  <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                    <CheckIcon className="h-4 w-4" />
                    Este rol se activará automáticamente sin necesidad de aprobación.
                  </p>
                )}
              </div>
              
              {/* Justificación */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Justificación
                </label>
                <div className="relative">
                  <Bars3BottomLeftIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea value={formData.justificacion} onChange={(e) => setFormData({...formData, justificacion: e.target.value})} rows={3} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-all" placeholder="Razón de la asignación..." />
                </div>
              </div>
              
              {/* Fecha de fin */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de fin (opcional)
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="date" value={formData.fecha_fin} onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-all" />
                </div>
              </div>
              
              {/* Observaciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observaciones
                </label>
                <div className="relative">
                  <DocumentTextIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} rows={2} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-all" placeholder="Notas adicionales..." />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 font-semibold transition-all transform hover:scale-105 shadow-lg">
                  Asignar Rol
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default AsignacionesTab
