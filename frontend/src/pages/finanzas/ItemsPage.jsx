import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import itemsService from '../../services/itemsService'
import tiposCantidadService from '../../services/tiposCantidadService'
import {
  PackageIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  PowerIcon,
  DollarSignIcon,
} from 'lucide-react'

const ItemsPage = () => {
  const audit = useAudit('Items')
  const [items, setItems] = useState([])
  const [tiposCantidad, setTiposCantidad] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(15)
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    codigo: '',
    tipo_cantidad: '',
    precio_unitario: '',
    activo: true,
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipo])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [itemsData, tiposData] = await Promise.all([
        itemsService.getAllItems(),
        tiposCantidadService.getAllTiposCantidad(),
      ])
      setItems(itemsData)
      setTiposCantidad(Array.isArray(tiposData) ? tiposData.filter(t => t.activo) : [])
      
      // Establecer el primer tipo como default si existe
      if (tiposData.length > 0) {
        setFormData(prev => ({ ...prev, tipo_cantidad: tiposData[0].codigo }))
      }
    } catch (error) {
      showNotification('error', 'Error al cargar datos')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadItems = async () => {
    try {
      const data = await itemsService.getAllItems()
      setItems(data)
    } catch (error) {
      showNotification('error', 'Error al cargar items')
      console.error(error)
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
        precio_unitario: parseFloat(formData.precio_unitario) || 0,
      }

      if (editingItem) {
        await itemsService.updateItem(editingItem.id, dataToSend)
        audit.button('modificar_item', { item_id: editingItem.id, nombre: formData.nombre })
        showNotification('success', 'Item actualizado exitosamente')
      } else {
        await itemsService.createItem(dataToSend)
        audit.button('crear_item', { nombre: formData.nombre, tipo: formData.tipo_cantidad })
        showNotification('success', 'Item creado exitosamente')
      }
      setShowModal(false)
      resetForm()
      loadItems()
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Error al guardar item')
      console.error(error)
    }
  }

  const handleEdit = (item) => {
    audit.modalOpen('editar_item', { item_id: item.id, nombre: item.nombre })
    setEditingItem(item)
    setFormData({
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      codigo: item.codigo || '',
      tipo_cantidad: item.tipo_cantidad,
      precio_unitario: item.precio_unitario || '',
      activo: item.activo !== undefined ? item.activo : true,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este item?')) return
    try {
      const item = items.find(i => i.id === id)
      await itemsService.deleteItem(id)
      audit.button('eliminar_item', { item_id: id, nombre: item?.nombre })
      showNotification('success', 'Item eliminado exitosamente')
      loadItems()
    } catch (error) {
      showNotification('error', 'Error al eliminar item')
    }
  }

  const resetForm = () => {
    const defaultTipo = tiposCantidad.length > 0 ? tiposCantidad[0].codigo : ''
    setFormData({
      nombre: '',
      descripcion: '',
      codigo: '',
      tipo_cantidad: defaultTipo,
      precio_unitario: '',
      activo: true,
    })
    setEditingItem(null)
  }

  const filteredItems = items.filter(item => {
    const matchSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.codigo && item.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchTipo = !filterTipo || item.tipo_cantidad === filterTipo
    return matchSearch && matchTipo
  })

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedItems = filteredItems.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredItems.length / pageSize)

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const getTipoLabel = (tipo) => {
    const found = tiposCantidad.find(t => t.codigo === tipo)
    return found ? (found.descripcion_completa || found.descripcion) : tipo
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
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
      <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500 via-red-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <PackageIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Items de Construcción</h1>
              <p className="text-orange-100 mt-1">Gestión de trabajos y servicios de construcción</p>
            </div>
          </div>
          <button 
            onClick={() => { 
              audit.modalOpen('crear_item')
              setShowModal(true)
              resetForm() 
            }} 
            className="flex items-center space-x-2 px-5 py-3 bg-white text-orange-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nuevo Item</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (e.target.value.length > 2) {
                  audit.search('items', { termino: e.target.value })
                }
              }}
              placeholder="Buscar por nombre o código..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all" 
            />
          </div>
          <select 
            value={filterTipo} 
            onChange={(e) => {
              setFilterTipo(e.target.value)
              audit.filter('items_tipo', { tipo: e.target.value })
            }}
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
          >
            <option value="">Todos los tipos</option>
            {tiposCantidad.map(tipo => (
              <option key={tipo.codigo} value={tipo.codigo}>{tipo.descripcion_completa || tipo.descripcion}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <th className="px-6 py-4 text-left text-sm font-bold">Código</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Tipo</th>
                <th className="px-6 py-4 text-right text-sm font-bold">Precio Unitario</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Estado</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-3">
                      <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No se encontraron items</td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr key={item.id} className={`border-b border-gray-200/50 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-700">{item.codigo || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.nombre}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold text-xs">
                        {getTipoLabel(item.tipo_cantidad)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className="inline-flex items-center space-x-1 font-bold text-gray-900">
                        <DollarSignIcon className="w-4 h-4 text-green-600" />
                        <span>{formatCurrency(item.precio_unitario)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full font-semibold ${item.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => handleEdit(item)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all transform hover:scale-110">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all transform hover:scale-110">
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
        {filteredItems.length > pageSize && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando <span className="font-semibold text-gray-900">{startIndex + 1}</span> a{' '}
                <span className="font-semibold text-gray-900">{Math.min(endIndex, filteredItems.length)}</span> de{' '}
                <span className="font-semibold text-gray-900">{filteredItems.length}</span> items
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Primera
                </button>
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Anterior
                </button>
                <div className="flex items-center space-x-2">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button key={i} onClick={() => handlePageChange(pageNum)} className={`px-4 py-2 rounded-lg transition-all ${currentPage === pageNum ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold shadow-lg' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Siguiente
                </button>
                <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Última
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-200/50 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center justify-between text-white">
                <h2 className="text-2xl font-bold">{editingItem ? 'Editar Item' : 'Nuevo Item'}</h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Trabajo/Servicio *</label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Excavación manual, Instalación tubería PVC..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-all" required />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código</label>
                  <input type="text" value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} placeholder="Código único" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Cantidad *</label>
                  <select value={formData.tipo_cantidad} onChange={(e) => setFormData({...formData, tipo_cantidad: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-all" required>
                    {tiposCantidad.map(tipo => (
                      <option key={tipo.codigo} value={tipo.codigo}>{tipo.descripcion_completa || tipo.descripcion}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Precio Unitario *</label>
                  <div className="relative">
                    <DollarSignIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="number" step="0.01" min="0" value={formData.precio_unitario} onChange={(e) => setFormData({...formData, precio_unitario: e.target.value})} placeholder="0.00" className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-all" required />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                  <textarea value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} rows="4" placeholder="Descripción detallada del trabajo o servicio..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-all"></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input type="checkbox" checked={formData.activo} onChange={(e) => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors">Item activo</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 transition-all font-semibold shadow-lg">
                  {editingItem ? 'Actualizar' : 'Crear'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ItemsPage
