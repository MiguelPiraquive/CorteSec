import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import permisosService from '../../../services/permisosService'
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Code,
  Database,
  Clock,
  MapPin,
  FileJson,
  Play,
  XCircle,
} from 'lucide-react'

const tipoIcons = {
  python: Code,
  sql: Database,
  json: FileJson,
  time: Clock,
  location: MapPin,
  custom: Shield
}

const CondicionesTab = () => {
  const [condiciones, setCondiciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [condicionActual, setCondicionActual] = useState(null)
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    tipo: 'python',
    descripcion: '',
    configuracion: {},
    codigo_evaluacion: '',
    cacheable: true,
    tiempo_cache: 300,
    activa: true
  })

  const [stats, setStats] = useState({
    total: 0,
    activas: 0,
    inactivas: 0,
    python: 0,
    sql: 0,
    json: 0,
    time: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await permisosService.getAllCondiciones()
      const condicionesList = Array.isArray(data.results) ? data.results : data
      setCondiciones(condicionesList)

      setStats({
        total: condicionesList.length,
        activas: condicionesList.filter(c => c.activa).length,
        inactivas: condicionesList.filter(c => !c.activa).length,
        python: condicionesList.filter(c => c.tipo === 'python').length,
        sql: condicionesList.filter(c => c.tipo === 'sql').length,
        json: condicionesList.filter(c => c.tipo === 'json').length,
        time: condicionesList.filter(c => c.tipo === 'time').length
      })
    } catch (error) {
      showNotification('error', 'Error al cargar condiciones')
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
    try {
      const dataToSend = {
        ...formData,
        configuracion: typeof formData.configuracion === 'string' 
          ? JSON.parse(formData.configuracion) 
          : formData.configuracion
      }

      if (modoEdicion) {
        await permisosService.updateCondicion(condicionActual.id, dataToSend)
        showNotification('success', 'Condición actualizada')
      } else {
        await permisosService.createCondicion(dataToSend)
        showNotification('success', 'Condición creada')
      }
      resetForm()
      setShowModal(false)
      loadData()
    } catch (error) {
      showNotification('error', 'Error al guardar condición')
      console.error(error)
    }
  }

  const handleEdit = (condicion) => {
    setCondicionActual(condicion)
    setModoEdicion(true)
    setFormData({
      nombre: condicion.nombre,
      codigo: condicion.codigo,
      tipo: condicion.tipo,
      descripcion: condicion.descripcion || '',
      configuracion: JSON.stringify(condicion.configuracion || {}, null, 2),
      codigo_evaluacion: condicion.codigo_evaluacion || '',
      cacheable: condicion.cacheable,
      tiempo_cache: condicion.tiempo_cache || 300,
      activa: condicion.activa
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta condición?')) return
    try {
      await permisosService.deleteCondicion(id)
      showNotification('success', 'Condición eliminada')
      loadData()
    } catch (error) {
      showNotification('error', 'Error al eliminar')
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      codigo: '',
      tipo: 'python',
      descripcion: '',
      configuracion: {},
      codigo_evaluacion: '',
      cacheable: true,
      tiempo_cache: 300,
      activa: true
    })
    setModoEdicion(false)
    setCondicionActual(null)
  }

  const condicionesFiltradas = condiciones.filter(condicion => {
    if (filtroTipo !== 'todos' && condicion.tipo !== filtroTipo) return false
    if (filtroActivo === 'activas' && !condicion.activa) return false
    if (filtroActivo === 'inactivas' && condicion.activa) return false
    if (busqueda) {
      const search = busqueda.toLowerCase()
      return condicion.nombre?.toLowerCase().includes(search) || condicion.codigo?.toLowerCase().includes(search)
    }
    return true
  })

  const getTipoLabel = (tipo) => {
    const labels = {
      python: 'Python',
      sql: 'SQL',
      json: 'JSON',
      time: 'Temporal',
      location: 'Ubicación',
      custom: 'Personalizado'
    }
    return labels[tipo] || tipo
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
          onClick={() => { setShowModal(true); resetForm() }}
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Condición</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow p-6 text-white">
          <p className="text-sm opacity-90">Total</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow p-6 text-white">
          <p className="text-sm opacity-90">Activas</p>
          <p className="text-3xl font-bold">{stats.activas}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow p-6 text-white">
          <p className="text-sm opacity-90">Python</p>
          <p className="text-3xl font-bold">{stats.python}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow p-6 text-white">
          <p className="text-sm opacity-90">Temporales</p>
          <p className="text-3xl font-bold">{stats.time}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-green-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-green-500 focus:bg-white transition-all"
          >
            <option value="todos">Todos los tipos</option>
            <option value="python">Python</option>
            <option value="sql">SQL</option>
            <option value="json">JSON</option>
            <option value="time">Temporal</option>
            <option value="location">Ubicación</option>
            <option value="custom">Personalizado</option>
          </select>
          <select
            value={filtroActivo}
            onChange={(e) => setFiltroActivo(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-green-500 focus:bg-white transition-all"
          >
            <option value="todos">Todos</option>
            <option value="activas">Activas</option>
            <option value="inactivas">Inactivas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Condición</th>
              <th className="px-6 py-4 text-left font-semibold">Código</th>
              <th className="px-6 py-4 text-center font-semibold">Tipo</th>
              <th className="px-6 py-4 text-center font-semibold">Cache</th>
              <th className="px-6 py-4 text-center font-semibold">Estado</th>
              <th className="px-6 py-4 text-center font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="flex justify-center"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div></td></tr>
            ) : condicionesFiltradas.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No hay condiciones</td></tr>
            ) : (
              condicionesFiltradas.map((condicion, i) => {
                const Icon = tipoIcons[condicion.tipo] || Shield
                return (
                  <tr key={condicion.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-green-50 transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{condicion.nombre}</div>
                          {condicion.descripcion && (
                            <div className="text-xs text-gray-500 mt-1">{condicion.descripcion}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><code className="px-2 py-1 bg-gray-100 rounded text-sm">{condicion.codigo}</code></td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        {getTipoLabel(condicion.tipo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {condicion.cacheable ? (
                        <span className="text-xs text-gray-600">{condicion.tiempo_cache}s</span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {condicion.activa ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => handleEdit(condicion)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(condicion.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-2xl font-bold">{modoEdicion ? 'Editar Condición' : 'Nueva Condición'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Nombre *</label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-green-500 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Código *</label>
                  <input type="text" value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-green-500 focus:outline-none" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Tipo de Condición *</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-green-500 focus:outline-none">
                  <option value="python">Python</option>
                  <option value="sql">SQL</option>
                  <option value="json">JSON</option>
                  <option value="time">Temporal</option>
                  <option value="location">Ubicación</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Descripción</label>
                <textarea value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} rows={2} className="w-full px-4 py-3 border-2 rounded-xl focus:border-green-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Código de Evaluación</label>
                <textarea 
                  value={formData.codigo_evaluacion} 
                  onChange={(e) => setFormData({...formData, codigo_evaluacion: e.target.value})} 
                  rows={6} 
                  className="w-full px-4 py-3 border-2 rounded-xl focus:border-green-500 focus:outline-none font-mono text-sm"
                  placeholder="# Código Python, SQL, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Configuración (JSON)</label>
                <textarea 
                  value={typeof formData.configuracion === 'string' ? formData.configuracion : JSON.stringify(formData.configuracion, null, 2)} 
                  onChange={(e) => setFormData({...formData, configuracion: e.target.value})} 
                  rows={4} 
                  className="w-full px-4 py-3 border-2 rounded-xl focus:border-green-500 focus:outline-none font-mono text-sm"
                  placeholder='{"key": "value"}'
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Tiempo de Cache (segundos)</label>
                  <input 
                    type="number" 
                    value={formData.tiempo_cache} 
                    onChange={(e) => setFormData({...formData, tiempo_cache: parseInt(e.target.value) || 300})} 
                    className="w-full px-4 py-3 border-2 rounded-xl focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end space-x-6 pb-3">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={formData.cacheable} onChange={(e) => setFormData({...formData, cacheable: e.target.checked})} className="w-5 h-5" />
                    <span className="text-sm font-medium">Cacheable</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={formData.activa} onChange={(e) => setFormData({...formData, activa: e.target.checked})} className="w-5 h-5" />
                    <span className="text-sm font-medium">Activa</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 font-semibold">
                  {modoEdicion ? 'Actualizar' : 'Crear'}
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

export default CondicionesTab
