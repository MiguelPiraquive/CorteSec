import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import tiposRolService from '../../../services/tiposRolService'
import {
  Shield,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  TypeIcon,
  FileTextIcon,
} from 'lucide-react'

const TiposRolTab = () => {
  const [tiposRol, setTiposRol] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActivo, setFilterActivo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTipo, setEditingTipo] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(15)
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activo: true
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    loadTiposRol()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterActivo])

  const loadTiposRol = async () => {
    try {
      setLoading(true)
      const data = await tiposRolService.getAllTiposRol()
      const tipos = data.results || data
      setTiposRol(Array.isArray(tipos) ? tipos : [])
    } catch (error) {
      showNotification('error', 'Error al cargar tipos de rol')
      console.error(error)
      setTiposRol([])
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
      if (editingTipo) {
        await tiposRolService.updateTipoRol(editingTipo.id, formData)
        showNotification('success', 'Tipo de rol actualizado exitosamente')
      } else {
        await tiposRolService.createTipoRol(formData)
        showNotification('success', 'Tipo de rol creado exitosamente')
      }
      setShowModal(false)
      resetForm()
      loadTiposRol()
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Error al guardar')
      console.error(error)
    }
  }

  const handleEdit = (tipo) => {
    setEditingTipo(tipo)
    setFormData({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      activo: tipo.activo
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este tipo de rol?')) return
    try {
      await tiposRolService.deleteTipoRol(id)
      showNotification('success', 'Tipo de rol eliminado exitosamente')
      loadTiposRol()
    } catch (error) {
      showNotification('error', 'Error al eliminar tipo de rol')
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      activo: true
    })
    setEditingTipo(null)
  }

  const filteredTipos = tiposRol.filter(tipo => {
    const matchSearch = 
      tipo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tipo.descripcion && tipo.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchActivo = filterActivo === '' || tipo.activo.toString() === filterActivo
    return matchSearch && matchActivo
  })

  const totalPages = Math.ceil(filteredTipos.length / pageSize)
  const paginatedTipos = filteredTipos.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-6">
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${notification.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckIcon className="w-6 h-6" /> : <AlertCircleIcon className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-end">
        <button onClick={() => { setShowModal(true); resetForm() }} className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg">
          <PlusIcon className="w-5 h-5" />
          <span>Nuevo Tipo</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Total Tipos</p>
              <p className="text-3xl font-bold">{tiposRol.length}</p>
            </div>
            <Shield className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Activos</p>
              <p className="text-3xl font-bold">{tiposRol.filter(t => t.activo).length}</p>
            </div>
            <CheckIcon className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-100 text-sm">Inactivos</p>
              <p className="text-3xl font-bold">{tiposRol.filter(t => !t.activo).length}</p>
            </div>
            <XIcon className="w-16 h-16 text-white/30" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre o descripción..." className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all" />
          </div>
          <select value={filterActivo} onChange={(e) => setFilterActivo(e.target.value)} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all">
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden border border-gray-200/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Nombre</th>
                <th className="px-6 py-4 text-left font-semibold">Descripción</th>
                <th className="px-6 py-4 text-center font-semibold">Estado</th>
                <th className="px-6 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center space-x-3">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600">Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedTipos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    No se encontraron tipos de rol
                  </td>
                </tr>
              ) : (
                paginatedTipos.map((tipo, index) => (
                  <tr key={tipo.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                          <Shield className="w-5 h-5 text-indigo-600" />
                        </div>
                        <span className="font-semibold text-gray-800">{tipo.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{tipo.descripcion || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${tipo.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {tipo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => handleEdit(tipo)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(tipo.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredTipos.length)} de {filteredTipos.length}
            </div>
            <div className="flex space-x-2">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                Anterior
              </button>
              <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                {currentPage} / {totalPages}
              </span>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-2xl font-bold">{editingTipo ? 'Editar Tipo de Rol' : 'Nuevo Tipo de Rol'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre *
                </label>
                <div className="relative">
                  <TypeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-all" placeholder="Administrativo, Operativo..." required />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción
                </label>
                <div className="relative">
                  <FileTextIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-all" placeholder="Descripción del tipo de rol" rows={3} />
                </div>
              </div>

              {/* Activo */}
              <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-xl">
                <input type="checkbox" id="activo" checked={formData.activo} onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                  Tipo activo
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 font-semibold transition-all transform hover:scale-105 shadow-lg">
                  {editingTipo ? 'Actualizar' : 'Crear'}
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

export default TiposRolTab
