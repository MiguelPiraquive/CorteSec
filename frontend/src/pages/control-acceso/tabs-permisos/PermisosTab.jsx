import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import permisosService from '../../../services/permisosService'
import {
  Key,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  Award,
  Shield,
} from 'lucide-react'

const PermisosTab = () => {
  const [permisos, setPermisos] = useState([])
  const [modulos, setModulos] = useState([])
  const [tiposPermiso, setTiposPermiso] = useState([])
  const [condiciones, setCondiciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroAmbito, setFiltroAmbito] = useState('todos')
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [permisoActual, setPermisoActual] = useState(null)
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    modulo: '',
    tipo_permiso: '',
    ambito: 'modulo',
    condiciones: [],
    es_heredable: true,
    es_revocable: true,
    prioridad: 0,
    vigencia_inicio: '',
    vigencia_fin: '',
    activo: true,
    es_sistema: false
  })

  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    heredables: 0,
    temporales: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [permisosData, modulosData, tiposData, condicionesData] = await Promise.all([
        permisosService.getAllPermisos(),
        permisosService.getAllModulos(),
        permisosService.getAllTiposPermiso(),
        permisosService.getAllCondiciones()
      ])

      const permisosList = Array.isArray(permisosData.results) ? permisosData.results : permisosData
      const modulosList = Array.isArray(modulosData.results) ? modulosData.results : modulosData
      const tiposList = Array.isArray(tiposData.results) ? tiposData.results : tiposData
      const condicionesList = Array.isArray(condicionesData.results) ? condicionesData.results : condicionesData

      setPermisos(permisosList)
      setModulos(modulosList)
      setTiposPermiso(tiposList)
      setCondiciones(condicionesList)

      const temporales = permisosList.filter(p => p.vigencia_inicio || p.vigencia_fin).length

      setStats({
        total: permisosList.length,
        activos: permisosList.filter(p => p.activo).length,
        heredables: permisosList.filter(p => p.es_heredable).length,
        temporales
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
    try {
      const dataToSend = {
        ...formData,
        vigencia_inicio: formData.vigencia_inicio || null,
        vigencia_fin: formData.vigencia_fin || null,
        condiciones: formData.condiciones.length > 0 ? formData.condiciones : []
      }

      if (modoEdicion) {
        await permisosService.updatePermiso(permisoActual.id, dataToSend)
        showNotification('success', 'Permiso actualizado')
      } else {
        await permisosService.createPermiso(dataToSend)
        showNotification('success', 'Permiso creado')
      }
      resetForm()
      setShowModal(false)
      loadData()
    } catch (error) {
      showNotification('error', 'Error al guardar permiso')
      console.error(error)
    }
  }

  const handleEdit = (permiso) => {
    setPermisoActual(permiso)
    setModoEdicion(true)
    setFormData({
      nombre: permiso.nombre,
      codigo: permiso.codigo,
      descripcion: permiso.descripcion || '',
      modulo: permiso.modulo,
      tipo_permiso: permiso.tipo_permiso,
      ambito: permiso.ambito,
      condiciones: permiso.condiciones || [],
      es_heredable: permiso.es_heredable,
      es_revocable: permiso.es_revocable,
      prioridad: permiso.prioridad || 0,
      vigencia_inicio: permiso.vigencia_inicio ? permiso.vigencia_inicio.split('T')[0] : '',
      vigencia_fin: permiso.vigencia_fin ? permiso.vigencia_fin.split('T')[0] : '',
      activo: permiso.activo,
      es_sistema: permiso.es_sistema
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este permiso?')) return
    try {
      await permisosService.deletePermiso(id)
      showNotification('success', 'Permiso eliminado')
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
      modulo: '',
      tipo_permiso: '',
      ambito: 'modulo',
      condiciones: [],
      es_heredable: true,
      es_revocable: true,
      prioridad: 0,
      vigencia_inicio: '',
      vigencia_fin: '',
      activo: true,
      es_sistema: false
    })
    setModoEdicion(false)
    setPermisoActual(null)
  }

  const permisosFiltrados = permisos.filter(permiso => {
    if (filtroAmbito !== 'todos' && permiso.ambito !== filtroAmbito) return false
    if (filtroActivo === 'activos' && !permiso.activo) return false
    if (filtroActivo === 'inactivos' && permiso.activo) return false
    if (busqueda) {
      const search = busqueda.toLowerCase()
      return permiso.nombre?.toLowerCase().includes(search) || permiso.codigo?.toLowerCase().includes(search)
    }
    return true
  })

  const getAmbitoLabel = (ambito) => {
    const labels = {
      global: 'Global',
      modulo: 'Módulo',
      organizacion: 'Organización',
      recurso: 'Recurso',
      usuario: 'Usuario'
    }
    return labels[ambito] || ambito
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
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Permiso</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Total</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <Key className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Activos</p>
              <p className="text-3xl font-bold">{stats.activos}</p>
            </div>
            <CheckCircle className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Heredables</p>
              <p className="text-3xl font-bold">{stats.heredables}</p>
            </div>
            <Award className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Temporales</p>
              <p className="text-3xl font-bold">{stats.temporales}</p>
            </div>
            <Calendar className="w-16 h-16 text-white/30" />
          </div>
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
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-orange-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={filtroAmbito}
            onChange={(e) => setFiltroAmbito(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-orange-500 focus:bg-white transition-all"
          >
            <option value="todos">Todos los ámbitos</option>
            <option value="global">Global</option>
            <option value="modulo">Módulo</option>
            <option value="organizacion">Organización</option>
            <option value="recurso">Recurso</option>
            <option value="usuario">Usuario</option>
          </select>
          <select
            value={filtroActivo}
            onChange={(e) => setFiltroActivo(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-orange-500 focus:bg-white transition-all"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Permiso</th>
                <th className="px-6 py-4 text-left font-semibold">Código</th>
                <th className="px-6 py-4 text-center font-semibold">Módulo</th>
                <th className="px-6 py-4 text-center font-semibold">Ámbito</th>
                <th className="px-6 py-4 text-center font-semibold">Prioridad</th>
                <th className="px-6 py-4 text-center font-semibold">Estado</th>
                <th className="px-6 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center"><div className="flex justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div></td></tr>
              ) : permisosFiltrados.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No hay permisos</td></tr>
              ) : (
                permisosFiltrados.map((permiso, i) => (
                  <tr key={permiso.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Key className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{permiso.nombre}</div>
                          {permiso.descripcion && (
                            <div className="text-xs text-gray-500 mt-1">{permiso.descripcion}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><code className="px-2 py-1 bg-gray-100 rounded text-sm">{permiso.codigo}</code></td>
                    <td className="px-6 py-4 text-center text-sm">{permiso.modulo_info?.nombre || 'N/A'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                        {getAmbitoLabel(permiso.ambito)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                        {permiso.prioridad}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        {permiso.activo ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        {permiso.es_sistema && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Sistema</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => handleEdit(permiso)} className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-all"><Edit className="w-4 h-4" /></button>
                        {!permiso.es_sistema && (
                          <button onClick={() => handleDelete(permiso.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"><Trash2 className="w-4 h-4" /></button>
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

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-2xl font-bold">{modoEdicion ? 'Editar Permiso' : 'Nuevo Permiso'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Nombre *</label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Código *</label>
                  <input type="text" value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Descripción</label>
                <textarea value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} rows={2} className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Módulo *</label>
                  <select value={formData.modulo} onChange={(e) => setFormData({...formData, modulo: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none" required>
                    <option value="">Seleccionar módulo</option>
                    {modulos.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Tipo de Permiso *</label>
                  <select value={formData.tipo_permiso} onChange={(e) => setFormData({...formData, tipo_permiso: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none" required>
                    <option value="">Seleccionar tipo</option>
                    {tiposPermiso.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Ámbito</label>
                  <select value={formData.ambito} onChange={(e) => setFormData({...formData, ambito: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none">
                    <option value="global">Global</option>
                    <option value="modulo">Módulo</option>
                    <option value="organizacion">Organización</option>
                    <option value="recurso">Recurso</option>
                    <option value="usuario">Usuario</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Prioridad</label>
                  <input type="number" value={formData.prioridad} onChange={(e) => setFormData({...formData, prioridad: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Condiciones</label>
                <select 
                  multiple 
                  value={formData.condiciones} 
                  onChange={(e) => setFormData({...formData, condiciones: Array.from(e.target.selectedOptions, option => option.value)})} 
                  className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none"
                  size={4}
                >
                  {condiciones.filter(c => c.activa).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Mantén presionado Ctrl/Cmd para seleccionar múltiples</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Vigencia Inicio</label>
                  <input type="date" value={formData.vigencia_inicio} onChange={(e) => setFormData({...formData, vigencia_inicio: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Vigencia Fin</label>
                  <input type="date" value={formData.vigencia_fin} onChange={(e) => setFormData({...formData, vigencia_fin: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none" />
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={formData.es_heredable} onChange={(e) => setFormData({...formData, es_heredable: e.target.checked})} className="w-5 h-5" />
                  <span className="text-sm font-medium">Heredable</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={formData.es_revocable} onChange={(e) => setFormData({...formData, es_revocable: e.target.checked})} className="w-5 h-5" />
                  <span className="text-sm font-medium">Revocable</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={formData.activo} onChange={(e) => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5" />
                  <span className="text-sm font-medium">Activo</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={formData.es_sistema} onChange={(e) => setFormData({...formData, es_sistema: e.target.checked})} className="w-5 h-5" />
                  <span className="text-sm font-medium">Sistema</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 font-semibold">
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

export default PermisosTab
