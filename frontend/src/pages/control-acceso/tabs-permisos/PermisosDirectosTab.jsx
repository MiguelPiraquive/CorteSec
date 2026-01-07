import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import permisosService from '../../../services/permisosService'
import {
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  Shield,
  Clock,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'

const PermisosDirectosTab = () => {
  const [permisosDirectos, setPermisosDirectos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [permisos, setPermisos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [permisoDirectoActual, setPermisoDirectoActual] = useState(null)
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  const [formData, setFormData] = useState({
    usuario: '',
    permiso: '',
    tipo: 'grant',
    justificacion: '',
    vigencia_inicio: '',
    vigencia_fin: '',
    activo: true
  })

  const [stats, setStats] = useState({
    total: 0,
    grants: 0,
    denies: 0,
    temporales: 0
  })

  useEffect(() => {
    loadData()
    loadUsuarios()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [directosData, permisosData] = await Promise.all([
        permisosService.getAllPermisosDirectos(),
        permisosService.getAllPermisos()
      ])

      const directosList = Array.isArray(directosData.results) ? directosData.results : directosData
      const permisosList = Array.isArray(permisosData.results) ? permisosData.results : permisosData

      setPermisosDirectos(directosList)
      setPermisos(permisosList)

      const grants = directosList.filter(pd => pd.tipo === 'grant').length
      const denies = directosList.filter(pd => pd.tipo === 'deny').length
      const temporales = directosList.filter(pd => pd.vigencia_inicio || pd.vigencia_fin).length

      setStats({
        total: directosList.length,
        grants,
        denies,
        temporales
      })
    } catch (error) {
      showNotification('error', 'Error al cargar datos')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsuarios = async () => {
    try {
      // Simulación - en producción debes tener un endpoint para usuarios
      // const response = await fetch('/api/usuarios/')
      // const data = await response.json()
      // setUsuarios(data)
      
      // Placeholder temporal
      setUsuarios([
        { id: 1, username: 'admin', nombre_completo: 'Administrador' },
        { id: 2, username: 'usuario1', nombre_completo: 'Usuario Uno' }
      ])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
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
        vigencia_fin: formData.vigencia_fin || null
      }

      if (modoEdicion) {
        await permisosService.updatePermisoDirecto(permisoDirectoActual.id, dataToSend)
        showNotification('success', 'Permiso directo actualizado')
      } else {
        await permisosService.createPermisoDirecto(dataToSend)
        showNotification('success', 'Permiso directo creado')
      }
      resetForm()
      setShowModal(false)
      loadData()
    } catch (error) {
      showNotification('error', 'Error al guardar permiso directo')
      console.error(error)
    }
  }

  const handleEdit = (permisoDirecto) => {
    setPermisoDirectoActual(permisoDirecto)
    setModoEdicion(true)
    setFormData({
      usuario: permisoDirecto.usuario,
      permiso: permisoDirecto.permiso,
      tipo: permisoDirecto.tipo,
      justificacion: permisoDirecto.justificacion || '',
      vigencia_inicio: permisoDirecto.vigencia_inicio ? permisoDirecto.vigencia_inicio.split('T')[0] : '',
      vigencia_fin: permisoDirecto.vigencia_fin ? permisoDirecto.vigencia_fin.split('T')[0] : '',
      activo: permisoDirecto.activo
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este permiso directo?')) return
    try {
      await permisosService.deletePermisoDirecto(id)
      showNotification('success', 'Permiso directo eliminado')
      loadData()
    } catch (error) {
      showNotification('error', 'Error al eliminar')
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      usuario: '',
      permiso: '',
      tipo: 'grant',
      justificacion: '',
      vigencia_inicio: '',
      vigencia_fin: '',
      activo: true
    })
    setModoEdicion(false)
    setPermisoDirectoActual(null)
  }

  const permisosDirectosFiltrados = permisosDirectos.filter(pd => {
    if (filtroTipo !== 'todos' && pd.tipo !== filtroTipo) return false
    if (filtroActivo === 'activos' && !pd.activo) return false
    if (filtroActivo === 'inactivos' && pd.activo) return false
    if (busqueda) {
      const search = busqueda.toLowerCase()
      return pd.usuario_info?.username?.toLowerCase().includes(search) ||
             pd.permiso_info?.nombre?.toLowerCase().includes(search) ||
             pd.justificacion?.toLowerCase().includes(search)
    }
    return true
  })

  const getTipoLabel = (tipo) => {
    const labels = {
      grant: 'Conceder',
      deny: 'Denegar',
      temporary: 'Temporal'
    }
    return labels[tipo] || tipo
  }

  const getTipoColor = (tipo) => {
    const colors = {
      grant: 'bg-green-100 text-green-700',
      deny: 'bg-red-100 text-red-700',
      temporary: 'bg-orange-100 text-orange-700'
    }
    return colors[tipo] || 'bg-gray-100 text-gray-700'
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
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Permiso Directo</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-sm">Total</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <UserCheck className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Concedidos</p>
              <p className="text-3xl font-bold">{stats.grants}</p>
            </div>
            <ThumbsUp className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Denegados</p>
              <p className="text-3xl font-bold">{stats.denies}</p>
            </div>
            <ThumbsDown className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Temporales</p>
              <p className="text-3xl font-bold">{stats.temporales}</p>
            </div>
            <Clock className="w-16 h-16 text-white/30" />
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
              placeholder="Buscar usuario o permiso..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-cyan-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-cyan-500 focus:bg-white transition-all"
          >
            <option value="todos">Todos los tipos</option>
            <option value="grant">Conceder</option>
            <option value="deny">Denegar</option>
            <option value="temporary">Temporal</option>
          </select>
          <select
            value={filtroActivo}
            onChange={(e) => setFiltroActivo(e.target.value)}
            className="px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:border-cyan-500 focus:bg-white transition-all"
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
            <thead className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Usuario</th>
                <th className="px-6 py-4 text-left font-semibold">Permiso</th>
                <th className="px-6 py-4 text-center font-semibold">Tipo</th>
                <th className="px-6 py-4 text-center font-semibold">Vigencia</th>
                <th className="px-6 py-4 text-left font-semibold">Justificación</th>
                <th className="px-6 py-4 text-center font-semibold">Estado</th>
                <th className="px-6 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center"><div className="flex justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div></td></tr>
              ) : permisosDirectosFiltrados.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No hay permisos directos</td></tr>
              ) : (
                permisosDirectosFiltrados.map((pd, i) => (
                  <tr key={pd.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-cyan-50 transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-cyan-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{pd.usuario_info?.username || 'N/A'}</div>
                          {pd.usuario_info?.nombre_completo && (
                            <div className="text-xs text-gray-500">{pd.usuario_info.nombre_completo}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-orange-600" />
                        <span className="font-medium">{pd.permiso_info?.nombre || 'N/A'}</span>
                      </div>
                      {pd.permiso_info?.codigo && (
                        <code className="text-xs text-gray-500">{pd.permiso_info.codigo}</code>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTipoColor(pd.tipo)}`}>
                        {getTipoLabel(pd.tipo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      {pd.vigencia_inicio || pd.vigencia_fin ? (
                        <div className="space-y-1">
                          {pd.vigencia_inicio && (
                            <div className="text-green-700">Desde: {new Date(pd.vigencia_inicio).toLocaleDateString()}</div>
                          )}
                          {pd.vigencia_fin && (
                            <div className="text-red-700">Hasta: {new Date(pd.vigencia_fin).toLocaleDateString()}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Permanente</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate" title={pd.justificacion}>
                        {pd.justificacion || <span className="text-gray-400">Sin justificación</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {pd.activo ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => handleEdit(pd)} className="p-2 bg-cyan-100 text-cyan-600 rounded-lg hover:bg-cyan-200 transition-all"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(pd.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-2xl font-bold">{modoEdicion ? 'Editar Permiso Directo' : 'Nuevo Permiso Directo'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Usuario *</label>
                  <select value={formData.usuario} onChange={(e) => setFormData({...formData, usuario: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:outline-none" required>
                    <option value="">Seleccionar usuario</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.username} - {u.nombre_completo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Permiso *</label>
                  <select value={formData.permiso} onChange={(e) => setFormData({...formData, permiso: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:outline-none" required>
                    <option value="">Seleccionar permiso</option>
                    {permisos.filter(p => p.activo).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Tipo *</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:outline-none" required>
                  <option value="grant">Conceder</option>
                  <option value="deny">Denegar</option>
                  <option value="temporary">Temporal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Justificación *</label>
                <textarea 
                  value={formData.justificacion} 
                  onChange={(e) => setFormData({...formData, justificacion: e.target.value})} 
                  rows={3} 
                  className="w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:outline-none"
                  placeholder="Razón para otorgar/denegar este permiso..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Vigencia Inicio</label>
                  <input 
                    type="date" 
                    value={formData.vigencia_inicio} 
                    onChange={(e) => setFormData({...formData, vigencia_inicio: e.target.value})} 
                    className="w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Vigencia Fin</label>
                  <input 
                    type="date" 
                    value={formData.vigencia_fin} 
                    onChange={(e) => setFormData({...formData, vigencia_fin: e.target.value})} 
                    className="w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="activo"
                  checked={formData.activo} 
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})} 
                  className="w-5 h-5" 
                />
                <label htmlFor="activo" className="text-sm font-medium">Activo</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-cyan-700 font-semibold">
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

export default PermisosDirectosTab

