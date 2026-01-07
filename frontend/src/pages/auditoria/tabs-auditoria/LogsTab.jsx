import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import auditoriaService from '../../../services/auditoriaService'
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
} from 'lucide-react'

const LogsTab = () => {
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
    hoy: 0,
    semana: 0,
    mes: 0
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

      const logsData = await auditoriaService.getAllLogs(params)
      
      // Manejar paginación de DRF
      let logsList = []
      if (logsData.results) {
        logsList = logsData.results
        setLogs(logsData.results)
        setTotalCount(logsData.count || 0)
        setTotalPages(Math.ceil((logsData.count || 0) / pageSize))
      } else {
        logsList = Array.isArray(logsData) ? logsData : []
        setLogs(logsList)
        setTotalCount(logsList.length)
        setTotalPages(1)
      }

      // Calcular estadísticas
      const ahora = new Date()
      const hoyInicio = new Date(ahora.setHours(0, 0, 0, 0))
      const semanaInicio = new Date(ahora.setDate(ahora.getDate() - 7))
      const mesInicio = new Date(ahora.setMonth(ahora.getMonth() - 1))

      setStats({
        total: logsList.length,
        hoy: logsList.filter(log => new Date(log.created_at) >= hoyInicio).length,
        semana: logsList.filter(log => new Date(log.created_at) >= semanaInicio).length,
        mes: logsList.filter(log => new Date(log.created_at) >= mesInicio).length
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

      <div className="flex justify-end">
        <button
          onClick={handleExportarCSV}
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
        >
          <Download className="w-5 h-5" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Eventos</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <FileText className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Hoy</p>
              <p className="text-3xl font-bold">{stats.hoy}</p>
            </div>
            <Calendar className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Esta Semana</p>
              <p className="text-3xl font-bold">{stats.semana}</p>
            </div>
            <Activity className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Este Mes</p>
              <p className="text-3xl font-bold">{stats.mes}</p>
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

      {/* Modal Detalle */}
      {showModal && logSeleccionado && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-2xl font-bold">Detalle del Log</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Usuario</label>
                  <p className="text-lg font-medium">{logSeleccionado.usuario?.username || 'Sistema'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Fecha y Hora</label>
                  <p className="text-lg font-medium">{new Date(logSeleccionado.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Acción</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getAccionColor(logSeleccionado.accion)}`}>
                    {logSeleccionado.accion}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Módulo</label>
                  <p className="text-lg font-medium">{logSeleccionado.modelo}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">IP Address</label>
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm">{logSeleccionado.ip_address || 'N/A'}</code>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">ID del Objeto</label>
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm">{logSeleccionado.objeto_id}</code>
                </div>
              </div>

              {logSeleccionado.user_agent && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">User Agent</label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{logSeleccionado.user_agent}</p>
                </div>
              )}

              {logSeleccionado.datos_antes && Object.keys(logSeleccionado.datos_antes).length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Datos Antes</label>
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-48">{JSON.stringify(logSeleccionado.datos_antes, null, 2)}</pre>
                </div>
              )}

              {logSeleccionado.datos_despues && Object.keys(logSeleccionado.datos_despues).length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Datos Después</label>
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-48">{JSON.stringify(logSeleccionado.datos_despues, null, 2)}</pre>
                </div>
              )}

              {logSeleccionado.metadata && Object.keys(logSeleccionado.metadata).length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Metadatos</label>
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-48">{JSON.stringify(logSeleccionado.metadata, null, 2)}</pre>
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
