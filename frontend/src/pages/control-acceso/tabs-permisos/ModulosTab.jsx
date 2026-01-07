import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import permisosService from '../../../services/permisosService'
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Search,
  Power,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  FolderTree,
} from 'lucide-react'

const ModulosTab = () => {
  const [modulos, setModulos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [moduloActual, setModuloActual] = useState(null)
  const [vistaJerarquica, setVistaJerarquica] = useState(false)
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    version: '1.0.0',
    icono: '',
    color: '#6366f1',
    orden: 0,
    url_base: '',
    padre: '',
    activo: true,
    es_sistema: false,
    requiere_licencia: false
  })

  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    sistema: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await permisosService.getAllModulos()
      const modulosList = Array.isArray(data.results) ? data.results : data
      setModulos(modulosList)

      setStats({
        total: modulosList.length,
        activos: modulosList.filter(m => m.activo).length,
        inactivos: modulosList.filter(m => !m.activo).length,
        sistema: modulosList.filter(m => m.es_sistema).length
      })
    } catch (error) {
      showNotification('error', 'Error al cargar módulos')
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
        await permisosService.updateModulo(moduloActual.id, formData)
        showNotification('success', 'Módulo actualizado exitosamente')
      } else {
        await permisosService.createModulo(formData)
        showNotification('success', 'Módulo creado exitosamente')
      }
      resetForm()
      setShowModal(false)
      loadData()
    } catch (error) {
      showNotification('error', 'Error al guardar módulo')
      console.error(error)
    }
  }

  const handleEdit = (modulo) => {
    setModuloActual(modulo)
    setModoEdicion(true)
    setFormData({
      nombre: modulo.nombre,
      codigo: modulo.codigo,
      descripcion: modulo.descripcion || '',
      version: modulo.version || '1.0.0',
      icono: modulo.icono || '',
      color: modulo.color || '#6366f1',
      orden: modulo.orden || 0,
      url_base: modulo.url_base || '',
      padre: modulo.padre || '',
      activo: modulo.activo,
      es_sistema: modulo.es_sistema,
      requiere_licencia: modulo.requiere_licencia
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este módulo?')) return
    try {
      await permisosService.deleteModulo(id)
      showNotification('success', 'Módulo eliminado')
      loadData()
    } catch (error) {
      showNotification('error', 'Error al eliminar módulo')
      console.error(error)
    }
  }

  const handleToggleActive = async (id) => {
    try {
      await permisosService.toggleModuloActive(id)
      showNotification('success', 'Estado actualizado')
      loadData()
    } catch (error) {
      showNotification('error', 'Error al cambiar estado')
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      codigo: '',
      descripcion: '',
      version: '1.0.0',
      icono: '',
      color: '#6366f1',
      orden: 0,
      url_base: '',
      padre: '',
      activo: true,
      es_sistema: false,
      requiere_licencia: false
    })
    setModoEdicion(false)
    setModuloActual(null)
  }

  const modulosFiltrados = modulos.filter(modulo => {
    if (filtroActivo === 'activos' && !modulo.activo) return false
    if (filtroActivo === 'inactivos' && modulo.activo) return false
    if (filtroActivo === 'sistema' && !modulo.es_sistema) return false

    if (busqueda) {
      const search = busqueda.toLowerCase()
      return (
        modulo.nombre?.toLowerCase().includes(search) ||
        modulo.codigo?.toLowerCase().includes(search)
      )
    }

    return true
  })

  const renderVistaLista = () => (
    <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden border border-gray-200/50">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Módulo</th>
              <th className="px-6 py-4 text-left font-semibold">Código</th>
              <th className="px-6 py-4 text-center font-semibold">Nivel</th>
              <th className="px-6 py-4 text-center font-semibold">Padre</th>
              <th className="px-6 py-4 text-center font-semibold">Estado</th>
              <th className="px-6 py-4 text-center font-semibold">Sistema</th>
              <th className="px-6 py-4 text-center font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center">
                  <div className="flex justify-center items-center space-x-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">Cargando...</span>
                  </div>
                </td>
              </tr>
            ) : modulosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  No se encontraron módulos
                </td>
              </tr>
            ) : (
              modulosFiltrados.map((modulo, index) => (
                <tr key={modulo.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {modulo.icono && (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${modulo.color}20` }}>
                          <span className="text-xl" style={{ color: modulo.color }}>{modulo.icono}</span>
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">{modulo.nombre}</div>
                        {modulo.descripcion && (
                          <div className="text-xs text-gray-500 mt-1">{modulo.descripcion}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-800">{modulo.codigo}</code>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                      Nivel {modulo.nivel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">
                    {modulo.padre_nombre || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {modulo.activo ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {modulo.es_sistema && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Sistema
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(modulo.id)}
                        className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-all"
                        title={modulo.activo ? 'Desactivar' : 'Activar'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(modulo)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!modulo.es_sistema && (
                        <button
                          onClick={() => handleDelete(modulo.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${notification.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setVistaJerarquica(!vistaJerarquica)}
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
        >
          <FolderTree className="w-5 h-5" />
          <span>{vistaJerarquica ? 'Vista Lista' : 'Vista Jerárquica'}</span>
        </button>
        <button
          onClick={() => { setShowModal(true); resetForm() }}
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Módulo</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Módulos</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <Layers className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Activos</p>
              <p className="text-3xl font-bold">{stats.activos}</p>
            </div>
            <CheckCircle className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Inactivos</p>
              <p className="text-3xl font-bold">{stats.inactivos}</p>
            </div>
            <XCircle className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Del Sistema</p>
              <p className="text-3xl font-bold">{stats.sistema}</p>
            </div>
            <AlertCircle className="w-16 h-16 text-white/30" />
          </div>
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
              placeholder="Buscar por nombre o código..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={filtroActivo}
            onChange={(e) => setFiltroActivo(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          >
            <option value="todos">Todos los módulos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="sistema">Del sistema</option>
          </select>
        </div>
      </div>

      {/* Table/Tree View */}
      {renderVistaLista()}

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-2xl font-bold">{modoEdicion ? 'Editar Módulo' : 'Nuevo Módulo'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código *</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Versión</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({...formData, version: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="w-full h-12 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Orden</label>
                  <input
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({...formData, orden: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Icono (emoji)</label>
                  <input
                    type="text"
                    value={formData.icono}
                    onChange={(e) => setFormData({...formData, icono: e.target.value})}
                    placeholder="📦"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">URL Base</label>
                  <input
                    type="text"
                    value={formData.url_base}
                    onChange={(e) => setFormData({...formData, url_base: e.target.value})}
                    placeholder="/dashboard/..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Módulo Padre</label>
                <select
                  value={formData.padre}
                  onChange={(e) => setFormData({...formData, padre: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                >
                  <option value="">Sin padre (raíz)</option>
                  {modulos.filter(m => m.id !== moduloActual?.id).map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Activo</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.es_sistema}
                    onChange={(e) => setFormData({...formData, es_sistema: e.target.checked})}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Es del sistema</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiere_licencia}
                    onChange={(e) => setFormData({...formData, requiere_licencia: e.target.checked})}
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Requiere licencia</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold transition-all transform hover:scale-105 shadow-lg"
                >
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

export default ModulosTab
