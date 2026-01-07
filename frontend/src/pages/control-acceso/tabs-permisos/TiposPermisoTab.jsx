import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import permisosService from '../../../services/permisosService'
import {
  Filter,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Shield,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react'

const categoriaIcons = {
  crud: FileText,
  workflow: Shield,
  report: BarChart3,
  admin: Settings,
  custom: Filter
}

const TiposPermisoTab = () => {
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [tipoActual, setTipoActual] = useState(null)
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    categoria: 'crud',
    icono: '',
    color: '#6b7280',
    es_critico: false,
    requiere_auditoria: false,
    activo: true
  })

  const [stats, setStats] = useState({
    total: 0,
    crud: 0,
    workflow: 0,
    report: 0,
    admin: 0,
    custom: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await permisosService.getAllTiposPermiso()
      const tiposList = Array.isArray(data.results) ? data.results : data
      setTipos(tiposList)

      const statsCalc = {
        total: tiposList.length,
        crud: tiposList.filter(t => t.categoria === 'crud').length,
        workflow: tiposList.filter(t => t.categoria === 'workflow').length,
        report: tiposList.filter(t => t.categoria === 'report').length,
        admin: tiposList.filter(t => t.categoria === 'admin').length,
        custom: tiposList.filter(t => t.categoria === 'custom').length
      }
      setStats(statsCalc)
    } catch (error) {
      showNotification('error', 'Error al cargar tipos de permiso')
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
      if (modoEdicion) {
        await permisosService.updateTipoPermiso(tipoActual.id, formData)
        showNotification('success', 'Tipo de permiso actualizado')
      } else {
        await permisosService.createTipoPermiso(formData)
        showNotification('success', 'Tipo de permiso creado')
      }
      resetForm()
      setShowModal(false)
      loadData()
    } catch (error) {
      showNotification('error', 'Error al guardar tipo de permiso')
      console.error(error)
    }
  }

  const handleEdit = (tipo) => {
    setTipoActual(tipo)
    setModoEdicion(true)
    setFormData({
      nombre: tipo.nombre,
      codigo: tipo.codigo,
      descripcion: tipo.descripcion || '',
      categoria: tipo.categoria,
      icono: tipo.icono || '',
      color: tipo.color || '#6b7280',
      es_critico: tipo.es_critico,
      requiere_auditoria: tipo.requiere_auditoria,
      activo: tipo.activo
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este tipo de permiso?')) return
    try {
      await permisosService.deleteTipoPermiso(id)
      showNotification('success', 'Tipo eliminado')
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
      descripcion: '',
      categoria: 'crud',
      icono: '',
      color: '#6b7280',
      es_critico: false,
      requiere_auditoria: false,
      activo: true
    })
    setModoEdicion(false)
    setTipoActual(null)
  }

  const tiposFiltrados = tipos.filter(tipo => {
    if (filtroCategoria !== 'todos' && tipo.categoria !== filtroCategoria) return false
    if (busqueda) {
      const search = busqueda.toLowerCase()
      return tipo.nombre?.toLowerCase().includes(search) || tipo.codigo?.toLowerCase().includes(search)
    }
    return true
  })

  const getCategoriaLabel = (cat) => {
    const labels = {
      crud: 'CRUD',
      workflow: 'Flujo de trabajo',
      report: 'Reportes',
      admin: 'Administración',
      custom: 'Personalizado'
    }
    return labels[cat] || cat
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
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Tipo</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow p-4 text-white">
          <p className="text-xs opacity-90">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow p-4 text-white">
          <p className="text-xs opacity-90">CRUD</p>
          <p className="text-2xl font-bold">{stats.crud}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow p-4 text-white">
          <p className="text-xs opacity-90">Workflow</p>
          <p className="text-2xl font-bold">{stats.workflow}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow p-4 text-white">
          <p className="text-xs opacity-90">Reportes</p>
          <p className="text-2xl font-bold">{stats.report}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow p-4 text-white">
          <p className="text-xs opacity-90">Admin</p>
          <p className="text-2xl font-bold">{stats.admin}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow p-4 text-white">
          <p className="text-xs opacity-90">Custom</p>
          <p className="text-2xl font-bold">{stats.custom}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-purple-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-purple-500 focus:bg-white transition-all"
          >
            <option value="todos">Todas las categorías</option>
            <option value="crud">CRUD</option>
            <option value="workflow">Flujo de trabajo</option>
            <option value="report">Reportes</option>
            <option value="admin">Administración</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Tipo</th>
              <th className="px-6 py-4 text-left font-semibold">Código</th>
              <th className="px-6 py-4 text-center font-semibold">Categoría</th>
              <th className="px-6 py-4 text-center font-semibold">Crítico</th>
              <th className="px-6 py-4 text-center font-semibold">Auditoría</th>
              <th className="px-6 py-4 text-center font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="flex justify-center"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div></td></tr>
            ) : tiposFiltrados.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No hay tipos</td></tr>
            ) : (
              tiposFiltrados.map((tipo, i) => (
                <tr key={tipo.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50 transition-colors`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tipo.color}20` }}>
                        <Filter className="w-5 h-5" style={{ color: tipo.color }} />
                      </div>
                      <div className="font-semibold">{tipo.nombre}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><code className="px-2 py-1 bg-gray-100 rounded text-sm">{tipo.codigo}</code></td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                      {getCategoriaLabel(tipo.categoria)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {tipo.es_critico && <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Crítico</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {tipo.requiere_auditoria && <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button onClick={() => handleEdit(tipo)} className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-all"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(tipo.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-2xl font-bold">{modoEdicion ? 'Editar Tipo' : 'Nuevo Tipo'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Nombre *</label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-purple-500 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Código *</label>
                  <input type="text" value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-purple-500 focus:outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Descripción</label>
                <textarea value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} rows={3} className="w-full px-4 py-3 border-2 rounded-xl focus:border-purple-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Categoría</label>
                  <select value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-purple-500 focus:outline-none">
                    <option value="crud">CRUD</option>
                    <option value="workflow">Flujo de trabajo</option>
                    <option value="report">Reportes</option>
                    <option value="admin">Administración</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Color</label>
                  <input type="color" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} className="w-full h-12 border-2 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Icono</label>
                  <input type="text" value={formData.icono} onChange={(e) => setFormData({...formData, icono: e.target.value})} placeholder="🔒" className="w-full px-4 py-3 border-2 rounded-xl focus:border-purple-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={formData.es_critico} onChange={(e) => setFormData({...formData, es_critico: e.target.checked})} className="w-5 h-5" />
                  <span className="text-sm font-medium">Es crítico</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={formData.requiere_auditoria} onChange={(e) => setFormData({...formData, requiere_auditoria: e.target.checked})} className="w-5 h-5" />
                  <span className="text-sm font-medium">Requiere auditoría</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={formData.activo} onChange={(e) => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5" />
                  <span className="text-sm font-medium">Activo</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 font-semibold">
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

export default TiposPermisoTab
