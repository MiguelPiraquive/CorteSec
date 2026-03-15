import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import auditoriaService from '../../../services/auditoriaService'
import { usePermissions } from '../../../context/PermissionsContext'
import {
  FileText,
  Search,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  Filter,
  Calendar,
  User,
  Database,
  XCircle,
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Shield,
  Hash,
  Copy,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  LogIn,
  Info,
  Layers,
  Tag,
  Fingerprint,
} from 'lucide-react'

const LogsTab = () => {
  const { hasPermission } = usePermissions()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('todos')
  const [filtroModelo, setFiltroModelo] = useState('todos')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [logSeleccionado, setLogSeleccionado] = useState(null)
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)

  const [stats, setStats] = useState({
    total: 0,
    usuarios_activos: 0,
    modulos_activos: 0,
    hoy: 0
  })

  useEffect(() => {
    loadData()
  }, [currentPage, fechaInicio, fechaFin])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        page_size: pageSize
      }
      if (fechaInicio) params.fecha_inicio = fechaInicio
      if (fechaFin) params.fecha_fin = fechaFin

      // Cargar logs + estadísticas en paralelo del backend
      const [logsData, statsData] = await Promise.all([
        auditoriaService.getAllLogs(params),
        auditoriaService.getEstadisticas(fechaInicio, fechaFin)
      ])
      
      // Manejar paginación de DRF
      if (logsData.results) {
        setLogs(logsData.results)
        setTotalCount(logsData.count || 0)
        setTotalPages(Math.ceil((logsData.count || 0) / pageSize))
      } else {
        const logsList = Array.isArray(logsData) ? logsData : []
        setLogs(logsList)
        setTotalCount(logsList.length)
        setTotalPages(1)
      }

      // Usar stats REALES del backend
      setStats({
        total: statsData?.total_eventos || logsData?.count || 0,
        usuarios_activos: statsData?.usuarios_activos || 0,
        modulos_activos: statsData?.modulos_activos || 0,
        hoy: statsData?.actividad_diaria?.slice(-1)?.[0]?.eventos || 0
      })
    } catch (error) {
      showNotification('error', 'Error al cargar logs de auditoría')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const handleVerDetalle = (log) => {
    setLogSeleccionado(log)
    setShowModal(true)
  }

  const handleExportarCSV = async () => {
    try {
      const params = {}
      if (fechaInicio) params.fecha_inicio = fechaInicio
      if (fechaFin) params.fecha_fin = fechaFin
      if (filtroAccion !== 'todos') params.accion = filtroAccion
      if (filtroModelo !== 'todos') params.modelo = filtroModelo

      await auditoriaService.exportarCSV(params)
      showNotification('success', 'CSV exportado correctamente')
    } catch (error) {
      showNotification('error', 'Error al exportar CSV')
      console.error(error)
    }
  }

  const handleExportarExcel = async () => {
    try {
      const params = {}
      if (fechaInicio) params.fecha_inicio = fechaInicio
      if (fechaFin) params.fecha_fin = fechaFin
      if (filtroAccion !== 'todos') params.accion = filtroAccion
      if (filtroModelo !== 'todos') params.modelo = filtroModelo

      await auditoriaService.exportarExcel(params)
      showNotification('success', 'Excel exportado correctamente')
    } catch (error) {
      showNotification('error', 'Error al exportar Excel')
      console.error(error)
    }
  }

  const logsFiltrados = logs.filter(log => {
    if (filtroAccion !== 'todos' && log.accion !== filtroAccion) return false
    if (filtroModelo !== 'todos' && log.modelo !== filtroModelo) return false
    if (busqueda) {
      const search = busqueda.toLowerCase()
      return log.accion?.toLowerCase().includes(search) ||
             log.modelo?.toLowerCase().includes(search) ||
             log.usuario?.username?.toLowerCase().includes(search)
    }
    return true
  })

  const acciones = [...new Set(logs.map(log => log.accion).filter(Boolean))]
  const modelos = [...new Set(logs.map(log => log.modelo).filter(Boolean))]

  const getAccionColor = (accion) => {
    if (accion?.includes('crear') || accion?.includes('create')) return 'text-green-600 bg-green-100'
    if (accion?.includes('modificar') || accion?.includes('update')) return 'text-blue-600 bg-blue-100'
    if (accion?.includes('eliminar') || accion?.includes('delete')) return 'text-red-600 bg-red-100'
    if (accion?.includes('login') || accion?.includes('acceso')) return 'text-purple-600 bg-purple-100'
    return 'text-gray-600 bg-gray-100'
  }

  return (
    <div className="space-y-6">
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border ${notification.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {hasPermission('auditoria.export') && (
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleExportarCSV}
            className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
          >
            <Download className="w-5 h-5" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handleExportarExcel}
            className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
          >
            <Download className="w-5 h-5" />
            <span>Exportar Excel</span>
          </button>
        </div>
      )}

      {/* Stats — valores REALES del backend */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Eventos</p>
              <p className="text-3xl font-bold">{stats.total?.toLocaleString()}</p>
            </div>
            <FileText className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Hoy</p>
              <p className="text-3xl font-bold">{stats.hoy?.toLocaleString()}</p>
            </div>
            <Calendar className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Usuarios Activos</p>
              <p className="text-3xl font-bold">{stats.usuarios_activos}</p>
            </div>
            <Activity className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Módulos</p>
              <p className="text-3xl font-bold">{stats.modulos_activos}</p>
            </div>
            <Database className="w-16 h-16 text-white/30" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en logs..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all"
          >
            <option value="todos">Todas las acciones</option>
            {acciones.map(accion => (
              <option key={accion} value={accion}>{accion}</option>
            ))}
          </select>
          <select
            value={filtroModelo}
            onChange={(e) => setFiltroModelo(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all"
          >
            <option value="todos">Todos los módulos</option>
            {modelos.map(modelo => (
              <option key={modelo} value={modelo}>{modelo}</option>
            ))}
          </select>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all"
          />
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Fecha/Hora</th>
                <th className="px-6 py-4 text-left font-semibold">Usuario</th>
                <th className="px-6 py-4 text-center font-semibold">Acción</th>
                <th className="px-6 py-4 text-center font-semibold">Módulo</th>
                <th className="px-6 py-4 text-left font-semibold">IP</th>
                <th className="px-6 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="flex justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div></td></tr>
              ) : logsFiltrados.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No hay logs de auditoría</td></tr>
              ) : (
                logsFiltrados.map((log, i) => (
                  <tr key={log.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{new Date(log.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium">{log.usuario?.username || 'Sistema'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getAccionColor(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Database className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{log.modelo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 bg-gray-100 rounded text-xs">{log.ip_address || 'N/A'}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button onClick={() => handleVerDetalle(log)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"><Eye className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle — Diseño Profesional */}
      {showModal && logSeleccionado && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
            
            {/* Header dinámico según tipo de acción */}
            {(() => {
              const accion = logSeleccionado.accion?.toLowerCase() || ''
              let headerGradient = 'from-blue-600 via-blue-500 to-indigo-600'
              let HeaderIcon = Info
              let accionLabel = logSeleccionado.accion
              
              if (accion.includes('crear') || accion.includes('create')) {
                headerGradient = 'from-emerald-600 via-green-500 to-teal-600'
                HeaderIcon = Plus
                accionLabel = 'Creación'
              } else if (accion.includes('modificar') || accion.includes('update') || accion.includes('editar')) {
                headerGradient = 'from-amber-600 via-orange-500 to-yellow-600'
                HeaderIcon = Edit3
                accionLabel = 'Modificación'
              } else if (accion.includes('eliminar') || accion.includes('delete')) {
                headerGradient = 'from-red-600 via-rose-500 to-pink-600'
                HeaderIcon = Trash2
                accionLabel = 'Eliminación'
              } else if (accion.includes('login') || accion.includes('acceso') || accion.includes('logout')) {
                headerGradient = 'from-violet-600 via-purple-500 to-fuchsia-600'
                HeaderIcon = LogIn
                accionLabel = 'Acceso'
              } else if (accion.includes('security') || accion.includes('seguridad')) {
                headerGradient = 'from-red-700 via-red-600 to-orange-600'
                HeaderIcon = Shield
                accionLabel = 'Seguridad'
              }

              return (
                <div className={`bg-gradient-to-r ${headerGradient} text-white px-8 py-6 flex items-center justify-between relative overflow-hidden rounded-t-3xl`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-8 -top-8 w-40 h-40 border-[3px] border-white rounded-full"></div>
                    <div className="absolute -right-4 -bottom-12 w-56 h-56 border-[3px] border-white rounded-full"></div>
                    <div className="absolute left-1/2 -top-6 w-24 h-24 border-[3px] border-white rounded-full"></div>
                  </div>
                  
                  <div className="flex items-center space-x-5 relative z-10">
                    <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                      <HeaderIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-bold">Detalle del Evento</h2>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold backdrop-blur-sm">
                          {accionLabel}
                        </span>
                      </div>
                      <p className="text-white/80 mt-1 text-sm flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{(() => {
                          const now = new Date()
                          const eventDate = new Date(logSeleccionado.created_at)
                          const diffMs = now - eventDate
                          const diffMins = Math.floor(diffMs / 60000)
                          const diffHours = Math.floor(diffMs / 3600000)
                          const diffDays = Math.floor(diffMs / 86400000)
                          if (diffMins < 1) return 'Hace un momento'
                          if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
                          if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
                          if (diffDays < 30) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
                          return eventDate.toLocaleDateString()
                        })()}</span>
                        <span className="text-white/50">•</span>
                        <span>{new Date(logSeleccionado.created_at).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 relative z-10">
                    <button
                      onClick={() => {
                        const idx = logsFiltrados.findIndex(l => l.id === logSeleccionado.id)
                        if (idx > 0) setLogSeleccionado(logsFiltrados[idx - 1])
                      }}
                      disabled={logsFiltrados.findIndex(l => l.id === logSeleccionado.id) === 0}
                      className="p-2.5 hover:bg-white/20 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Log anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-white/70 font-medium min-w-[60px] text-center">
                      {logsFiltrados.findIndex(l => l.id === logSeleccionado.id) + 1} / {logsFiltrados.length}
                    </span>
                    <button
                      onClick={() => {
                        const idx = logsFiltrados.findIndex(l => l.id === logSeleccionado.id)
                        if (idx < logsFiltrados.length - 1) setLogSeleccionado(logsFiltrados[idx + 1])
                      }}
                      disabled={logsFiltrados.findIndex(l => l.id === logSeleccionado.id) === logsFiltrados.length - 1}
                      className="p-2.5 hover:bg-white/20 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Log siguiente"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="w-px h-8 bg-white/30 mx-1"></div>
                    <button onClick={() => setShowModal(false)} className="p-2.5 hover:bg-white/20 rounded-xl transition-all" title="Cerrar">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )
            })()}
            
            {/* Contenido scrollable */}
            <div className="overflow-y-auto flex-1 p-8 space-y-6">
              
              {/* Fila principal: Usuario + Acción + IDs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Card Usuario */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border-2 border-blue-100 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {logSeleccionado.usuario?.username?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase font-bold text-blue-400 tracking-wider mb-0.5">Usuario</p>
                      <p className="text-xl font-bold text-gray-800 truncate">{logSeleccionado.usuario?.username || 'Sistema'}</p>
                      {logSeleccionado.usuario?.email && (
                        <p className="text-sm text-gray-500 truncate">{logSeleccionado.usuario.email}</p>
                      )}
                      {logSeleccionado.usuario?.first_name && (
                        <p className="text-sm text-gray-500">
                          {logSeleccionado.usuario.first_name} {logSeleccionado.usuario.last_name || ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Acción + Módulo */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-slate-50 to-purple-50 rounded-2xl p-6 border-2 border-purple-100 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase font-bold text-purple-400 tracking-wider mb-1.5">Acción Realizada</p>
                      <span className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold ${getAccionColor(logSeleccionado.accion)} shadow-sm`}>
                        <Activity className="w-4 h-4" />
                        <span>{logSeleccionado.accion}</span>
                      </span>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-purple-400 tracking-wider mb-1.5">Módulo / Modelo</p>
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Layers className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-lg font-semibold text-gray-800">{logSeleccionado.modelo || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Identificadores */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-slate-50 to-amber-50 rounded-2xl p-6 border-2 border-amber-100 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase font-bold text-amber-500 tracking-wider mb-1.5">ID del Objeto</p>
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Hash className="w-4 h-4 text-amber-600" />
                        </div>
                        <code className="text-sm font-mono font-semibold text-gray-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                          {logSeleccionado.objeto_id || '—'}
                        </code>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-amber-500 tracking-wider mb-1.5">ID del Log</p>
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Fingerprint className="w-4 h-4 text-amber-600" />
                        </div>
                        <code className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 truncate max-w-[180px]" title={logSeleccionado.id}>
                          {logSeleccionado.id}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(logSeleccionado.id)}
                          className="p-1.5 hover:bg-amber-100 rounded-lg transition-all text-gray-400 hover:text-amber-600"
                          title="Copiar ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contexto técnico: IP + Fecha + Dispositivo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-100 rounded-xl">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Dirección IP</p>
                    <code className="text-sm font-mono font-semibold text-gray-700">{logSeleccionado.ip_address || 'No disponible'}</code>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center space-x-3">
                  <div className="p-2.5 bg-green-100 rounded-xl">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Fecha y Hora Exacta</p>
                    <p className="text-sm font-semibold text-gray-700">{new Date(logSeleccionado.created_at).toLocaleString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center space-x-3">
                  <div className="p-2.5 bg-purple-100 rounded-xl">
                    {(() => {
                      const ua = logSeleccionado.user_agent?.toLowerCase() || ''
                      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
                        return <Smartphone className="w-5 h-5 text-purple-600" />
                      }
                      return <Monitor className="w-5 h-5 text-purple-600" />
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Dispositivo</p>
                    <p className="text-sm font-semibold text-gray-700 truncate">
                      {(() => {
                        const ua = logSeleccionado.user_agent || ''
                        if (!ua) return 'No disponible'
                        let browser = 'Navegador desconocido'
                        if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
                        else if (ua.includes('Firefox')) browser = 'Firefox'
                        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
                        else if (ua.includes('Edg')) browser = 'Edge'
                        else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera'
                        else if (ua.includes('python') || ua.includes('Python')) browser = 'Python/API'
                        else if (ua.includes('curl')) browser = 'cURL'
                        else if (ua.includes('Postman')) browser = 'Postman'
                        let os = ''
                        if (ua.includes('Windows')) os = 'Windows'
                        else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS'
                        else if (ua.includes('Linux')) os = 'Linux'
                        else if (ua.includes('Android')) os = 'Android'
                        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
                        return os ? `${browser} · ${os}` : browser
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* User Agent completo (colapsable) */}
              {logSeleccionado.user_agent && (
                <details className="bg-gray-50 border border-gray-200 rounded-xl group">
                  <summary className="px-5 py-3 text-sm font-semibold text-gray-500 cursor-pointer hover:text-gray-700 flex items-center space-x-2">
                    <Monitor className="w-4 h-4" />
                    <span>User Agent completo</span>
                  </summary>
                  <div className="px-5 pb-4">
                    <code className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-100 block break-all">{logSeleccionado.user_agent}</code>
                  </div>
                </details>
              )}

              {/* Diff View: datos_antes vs datos_despues */}
              {(logSeleccionado.datos_antes && Object.keys(logSeleccionado.datos_antes).length > 0) || 
               (logSeleccionado.datos_despues && Object.keys(logSeleccionado.datos_despues).length > 0) ? (
                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">Cambios en los Datos</h3>
                          <p className="text-xs text-gray-500">Comparación detallada de los valores antes y después</p>
                        </div>
                      </div>
                      {(() => {
                        const antes = logSeleccionado.datos_antes || {}
                        const despues = logSeleccionado.datos_despues || {}
                        const allKeys = [...new Set([...Object.keys(antes), ...Object.keys(despues)])]
                        const changed = allKeys.filter(k => JSON.stringify(antes[k]) !== JSON.stringify(despues[k])).length
                        return changed > 0 ? (
                          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                            {changed} campo{changed > 1 ? 's' : ''} modificado{changed > 1 ? 's' : ''}
                          </span>
                        ) : null
                      })()}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {(() => {
                      const antes = logSeleccionado.datos_antes || {}
                      const despues = logSeleccionado.datos_despues || {}
                      const allKeys = [...new Set([...Object.keys(antes), ...Object.keys(despues)])]
                      const addedKeys = allKeys.filter(k => !(k in antes) && k in despues)
                      const removedKeys = allKeys.filter(k => k in antes && !(k in despues))
                      const changedKeys = allKeys.filter(k => k in antes && k in despues && JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
                      const unchangedKeys = allKeys.filter(k => k in antes && k in despues && JSON.stringify(antes[k]) === JSON.stringify(despues[k]))

                      if (Object.keys(antes).length === 0 && Object.keys(despues).length > 0) {
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2 mb-4">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <Plus className="w-5 h-5 text-green-600" />
                              </div>
                              <span className="font-bold text-green-700">Registro Creado — {Object.keys(despues).length} campos</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {Object.entries(despues).map(([key, val]) => (
                                <div key={key} className="bg-green-50 rounded-xl p-3 border border-green-200 hover:border-green-300 transition-all">
                                  <p className="text-[10px] uppercase font-bold text-green-500 tracking-wider mb-1">{key}</p>
                                  <p className="text-sm font-mono text-green-800 break-all">
                                    {typeof val === 'object' && val !== null ? JSON.stringify(val, null, 1) : String(val ?? '—')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      if (Object.keys(despues).length === 0 && Object.keys(antes).length > 0) {
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2 mb-4">
                              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                              </div>
                              <span className="font-bold text-red-700">Registro Eliminado — {Object.keys(antes).length} campos</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {Object.entries(antes).map(([key, val]) => (
                                <div key={key} className="bg-red-50 rounded-xl p-3 border border-red-200 hover:border-red-300 transition-all">
                                  <p className="text-[10px] uppercase font-bold text-red-400 tracking-wider mb-1">{key}</p>
                                  <p className="text-sm font-mono text-red-700 break-all line-through decoration-red-300">
                                    {typeof val === 'object' && val !== null ? JSON.stringify(val, null, 1) : String(val ?? '—')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div className="space-y-4">
                          {changedKeys.length > 0 && (
                            <div className="space-y-3">
                              {changedKeys.map(key => (
                                <div key={key} className="bg-white rounded-xl border-2 border-amber-200 overflow-hidden hover:shadow-md transition-all">
                                  <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                                      <span className="font-bold text-sm text-gray-700">{key}</span>
                                    </div>
                                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                                  </div>
                                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                                    <div className="p-4 bg-red-50/50">
                                      <div className="flex items-center space-x-1.5 mb-2">
                                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                        <span className="text-[10px] uppercase font-bold text-red-400 tracking-widest">Valor Anterior</span>
                                      </div>
                                      <div className="text-sm font-mono text-red-700 bg-red-100/60 px-3 py-2 rounded-lg break-all border border-red-200/60">
                                        {antes[key] !== undefined ? (typeof antes[key] === 'object' ? JSON.stringify(antes[key], null, 1) : String(antes[key])) : <span className="italic text-red-300">vacío</span>}
                                      </div>
                                    </div>
                                    <div className="p-4 bg-green-50/50">
                                      <div className="flex items-center space-x-1.5 mb-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-[10px] uppercase font-bold text-green-500 tracking-widest">Valor Nuevo</span>
                                      </div>
                                      <div className="text-sm font-mono text-green-700 bg-green-100/60 px-3 py-2 rounded-lg break-all border border-green-200/60">
                                        {despues[key] !== undefined ? (typeof despues[key] === 'object' ? JSON.stringify(despues[key], null, 1) : String(despues[key])) : <span className="italic text-green-300">vacío</span>}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {addedKeys.length > 0 && (
                            <div>
                              <div className="flex items-center space-x-2 mb-3">
                                <Plus className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-bold text-green-700">{addedKeys.length} campo{addedKeys.length > 1 ? 's' : ''} agregado{addedKeys.length > 1 ? 's' : ''}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {addedKeys.map(key => (
                                  <div key={key} className="bg-green-50 rounded-lg p-3 border border-green-200">
                                    <p className="text-[10px] uppercase font-bold text-green-500 tracking-wider">{key}</p>
                                    <p className="text-sm font-mono text-green-700 mt-1 break-all">
                                      {typeof despues[key] === 'object' ? JSON.stringify(despues[key]) : String(despues[key])}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {removedKeys.length > 0 && (
                            <div>
                              <div className="flex items-center space-x-2 mb-3">
                                <Trash2 className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-bold text-red-700">{removedKeys.length} campo{removedKeys.length > 1 ? 's' : ''} eliminado{removedKeys.length > 1 ? 's' : ''}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {removedKeys.map(key => (
                                  <div key={key} className="bg-red-50 rounded-lg p-3 border border-red-200">
                                    <p className="text-[10px] uppercase font-bold text-red-400 tracking-wider">{key}</p>
                                    <p className="text-sm font-mono text-red-700 mt-1 break-all line-through">
                                      {typeof antes[key] === 'object' ? JSON.stringify(antes[key]) : String(antes[key])}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {unchangedKeys.length > 0 && (
                            <details className="bg-gray-50 border border-gray-200 rounded-xl group">
                              <summary className="px-5 py-3 text-sm font-semibold text-gray-400 cursor-pointer hover:text-gray-600 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>{unchangedKeys.length} campo{unchangedKeys.length > 1 ? 's' : ''} sin modificar</span>
                                </div>
                                <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                              </summary>
                              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {unchangedKeys.map(key => (
                                  <div key={key} className="bg-white rounded-lg p-2.5 border border-gray-100 flex items-start space-x-2">
                                    <span className="text-xs font-semibold text-gray-400 min-w-[120px]">{key}</span>
                                    <span className="text-xs font-mono text-gray-500 break-all">
                                      {typeof antes[key] === 'object' ? JSON.stringify(antes[key]) : String(antes[key] ?? '—')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ) : null}

              {/* Metadatos */}
              {logSeleccionado.metadata && Object.keys(logSeleccionado.metadata).length > 0 && (
                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        <Info className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">Metadatos Adicionales</h3>
                        <p className="text-xs text-gray-500">{Object.keys(logSeleccionado.metadata).length} propiedades</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(logSeleccionado.metadata).map(([key, val]) => (
                        <div key={key} className="bg-gray-50 rounded-xl p-3 border border-gray-200 hover:border-gray-300 transition-all">
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">{key}</p>
                          <p className="text-sm font-mono text-gray-700 break-all">
                            {typeof val === 'object' && val !== null ? JSON.stringify(val, null, 1) : String(val ?? '—')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Paginación */}
      {!loading && logsFiltrados.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
          <div className="text-sm text-gray-600">
            Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} de {totalCount} logs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = idx + 1
                } else if (currentPage <= 3) {
                  pageNum = idx + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + idx
                } else {
                  pageNum = currentPage - 2 + idx
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium transition-all ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LogsTab
