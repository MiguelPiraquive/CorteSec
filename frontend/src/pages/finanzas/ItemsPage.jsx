import { useState, useEffect, useCallback } from 'react'
import useAudit from '../../hooks/useAudit'
import useServerPagination from '../../hooks/useServerPagination'
import useProductTour from '../../hooks/useProductTour'
import { TOUR_CONFIGS } from '../../data/tourConfigs'
import Pagination from '../../components/Pagination'
import Can from '../../components/permissions/Can'
import { usePermissions } from '../../context/PermissionsContext'
import { useConfiguracion } from '../../context/ConfiguracionContext'
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
  Settings2Icon,
} from 'lucide-react'

const ItemsPage = () => {
  const audit = useAudit('Items')
  const { hasPermission, initialized } = usePermissions()

  const [tiposCantidad, setTiposCantidad] = useState([])
  const [filterTipo, setFilterTipo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    codigo: '',
    tipo_cantidad: '',
    precio_unitario: '',
    observaciones: '',
    activo: true,
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  const [errors, setErrors] = useState({})

  // --- Tipos de Cantidad inline management ---
  const [showTiposModal, setShowTiposModal] = useState(false)
  const [editingTipo, setEditingTipo] = useState(null)
  const [tipoForm, setTipoForm] = useState({ codigo: '', descripcion: '', simbolo: '', activo: true, orden: 0 })
  const [tipoErrors, setTipoErrors] = useState({})

  // Server-side pagination
  const fetchItems = useCallback((params) => itemsService.getItems(params), [])
  const {
    data: items,
    loading,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    searchTerm,
    setSearchTerm,
    setCurrentPage,
    setFilters,
    refresh,
  } = useServerPagination(fetchItems, { pageSize: 15 })

  useProductTour('items', TOUR_CONFIGS.items.steps, {
    ready: !loading && initialized,
  })

  // Load tipos de cantidad on mount
  useEffect(() => {
    const loadTipos = async () => {
      try {
        const tiposData = await tiposCantidadService.getAllTiposCantidad()
        setTiposCantidad(Array.isArray(tiposData) ? tiposData.filter(t => t.activo) : [])
        if (tiposData.length > 0) {
          setFormData(prev => ({ ...prev, tipo_cantidad: tiposData[0].codigo }))
        }
      } catch (error) {
        console.error('Error al cargar tipos de cantidad:', error)
      }
    }
    loadTipos()
  }, [])

  // Sync filterTipo with server-side filters
  useEffect(() => {
    const f = {}
    if (filterTipo) f.tipo_cantidad = filterTipo
    setFilters(f)
  }, [filterTipo, setFilters])

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const generateCodigo = (nombre) => {
    if (!nombre.trim()) return ''
    return nombre
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w.slice(0, 4))
      .join('_')
      .slice(0, 50)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    try {
      const codigo = editingItem ? formData.codigo : generateCodigo(formData.nombre)
      const dataToSend = {
        ...formData,
        codigo,
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
      refresh()
    } catch (error) {
      if (error.response?.data) {
        const serverErrors = {}
        Object.keys(error.response.data).forEach(key => {
          serverErrors[key] = Array.isArray(error.response.data[key]) ? error.response.data[key][0] : error.response.data[key]
        })
        setErrors(serverErrors)
      }
      showNotification('error', error.response?.data?.detail || error.response?.data?.message || 'Error al guardar item')
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
      observaciones: item.observaciones || '',
      activo: item.activo !== undefined ? item.activo : true,
    })
    setErrors({})
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este item?')) return
    try {
      const item = items.find(i => i.id === id)
      await itemsService.deleteItem(id)
      audit.button('eliminar_item', { item_id: id, nombre: item?.nombre })
      showNotification('success', 'Item eliminado exitosamente')
      refresh()
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
      observaciones: '',
      activo: true,
    })
    setEditingItem(null)
    setErrors({})
  }

  const getTipoLabel = (tipo) => {
    const found = tiposCantidad.find(t => t.codigo === tipo)
    return found ? (found.descripcion_completa || found.descripcion) : tipo
  }

  // --- Tipos de Cantidad CRUD ---
  const reloadTipos = async () => {
    try {
      const tiposData = await tiposCantidadService.getAllTiposCantidad()
      const all = Array.isArray(tiposData) ? tiposData : []
      setTiposCantidad(all.filter(t => t.activo))
    } catch { /* silent */ }
  }

  const resetTipoForm = () => {
    setTipoForm({ codigo: '', descripcion: '', simbolo: '', activo: true, orden: 0 })
    setEditingTipo(null)
    setTipoErrors({})
  }

  const handleEditTipo = (tipo) => {
    setEditingTipo(tipo)
    setTipoForm({
      codigo: tipo.codigo || '',
      descripcion: tipo.descripcion || '',
      simbolo: tipo.simbolo || '',
      activo: tipo.activo !== undefined ? tipo.activo : true,
      orden: tipo.orden || 0,
    })
    setTipoErrors({})
  }

  const handleSubmitTipo = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!tipoForm.codigo.trim()) errs.codigo = 'Requerido'
    if (!tipoForm.descripcion.trim()) errs.descripcion = 'Requerido'
    if (Object.keys(errs).length) { setTipoErrors(errs); return }
    try {
      if (editingTipo) {
        await tiposCantidadService.updateTipoCantidad(editingTipo.id, tipoForm)
        showNotification('success', 'Tipo actualizado')
      } else {
        await tiposCantidadService.createTipoCantidad(tipoForm)
        showNotification('success', 'Tipo creado')
      }
      resetTipoForm()
      await reloadTipos()
    } catch (error) {
      if (error.response?.data) {
        const serverErrs = {}
        Object.entries(error.response.data).forEach(([k, v]) => { serverErrs[k] = Array.isArray(v) ? v[0] : v })
        setTipoErrors(serverErrs)
      }
      showNotification('error', 'Error al guardar tipo: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeleteTipo = async (tipo) => {
    if (tipo.es_sistema) { showNotification('error', 'No se puede eliminar un tipo del sistema'); return }
    if (!window.confirm(`¿Eliminar tipo "${tipo.descripcion}"?`)) return
    try {
      await tiposCantidadService.deleteTipoCantidad(tipo.id)
      showNotification('success', 'Tipo eliminado')
      resetTipoForm()
      await reloadTipos()
    } catch (error) {
      showNotification('error', 'Error al eliminar: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleToggleTipoActivo = async (tipo) => {
    try {
      await tiposCantidadService.toggleActivo(tipo.id)
      showNotification('success', `Tipo ${tipo.activo ? 'desactivado' : 'activado'}`)
      await reloadTipos()
    } catch (error) {
      showNotification('error', 'Error al cambiar estado')
    }
  }

  const { formatCurrency } = useConfiguracion()

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('items.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

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
      <div id="tour-items-header" className="backdrop-blur-xl bg-gradient-to-br from-orange-500 via-red-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
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
          <Can permission="items.add">
            <button
              id="tour-items-btn-nuevo"
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
          </Can>
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
          <div className="flex gap-2">
            <select
              value={filterTipo}
              onChange={(e) => {
                setFilterTipo(e.target.value)
                audit.filter('items_tipo', { tipo: e.target.value })
              }}
              className="flex-1 px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
            >
              <option value="">Todos los tipos</option>
              {tiposCantidad.map(tipo => (
                <option key={tipo.codigo} value={tipo.codigo}>{tipo.descripcion_completa || tipo.descripcion}</option>
              ))}
            </select>
            <button
              onClick={() => { resetTipoForm(); setShowTiposModal(true) }}
              className="flex items-center space-x-1.5 px-4 py-3 bg-orange-50 border-2 border-orange-200 rounded-xl text-orange-600 hover:bg-orange-100 hover:border-orange-400 transition-all font-semibold text-sm whitespace-nowrap"
              title="Gestionar tipos de cantidad"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Tipos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div id="tour-items-table" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
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
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No se encontraron items</td>
                </tr>
              ) : (
                items.map((item, index) => (
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
                        <Can permission="items.change">
                          <button onClick={() => handleEdit(item)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all transform hover:scale-110">
                            <EditIcon className="w-4 h-4" />
                          </button>
                        </Can>
                        <Can permission="items.delete">
                          <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all transform hover:scale-110">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="items"
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-200/50 max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingItem ? 'Editar Item' : 'Nuevo Item'}</h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-88px)]">
              {(errors.non_field_errors || errors.detail) && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                  <p className="font-semibold mb-2">No se pudo guardar el item</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {Array.isArray(errors.non_field_errors) && errors.non_field_errors.map((err, idx) => <li key={idx}>{err}</li>)}
                    {errors.detail && <li>{errors.detail}</li>}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Trabajo/Servicio *</label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Excavación manual, Instalación tubería PVC..." className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${errors.nombre ? 'border-red-500' : 'border-gray-200'}`} required />
                  {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
                  {errors.codigo && <p className="text-red-500 text-sm mt-1">{errors.codigo}</p>}
                </div>

                {editingItem && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Código</label>
                    <div className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-mono text-gray-500">
                      {formData.codigo || 'N/A'}
                    </div>
                  </div>
                )}

                <div className={editingItem ? '' : ''}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Cantidad *</label>
                  <select value={formData.tipo_cantidad} onChange={(e) => setFormData({...formData, tipo_cantidad: e.target.value})} className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${errors.tipo_cantidad ? 'border-red-500' : 'border-gray-200'}`} required>
                    {tiposCantidad.map(tipo => (
                      <option key={tipo.codigo} value={tipo.codigo}>{tipo.descripcion_completa || tipo.descripcion}</option>
                    ))}
                  </select>
                  {errors.tipo_cantidad && <p className="text-red-500 text-sm mt-1">{errors.tipo_cantidad}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Precio Unitario *</label>
                  <div className="relative">
                    <DollarSignIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="number" step="0.01" min="0" value={formData.precio_unitario} onChange={(e) => setFormData({...formData, precio_unitario: e.target.value})} placeholder="0.00" className={`w-full pl-12 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${errors.precio_unitario ? 'border-red-500' : 'border-gray-200'}`} required />
                  </div>
                  {errors.precio_unitario && <p className="text-red-500 text-sm mt-1">{errors.precio_unitario}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                  <textarea value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} rows={3} placeholder="Descripción detallada del trabajo o servicio..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-all resize-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                  <textarea value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} rows={2} placeholder="Notas adicionales..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-all resize-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input type="checkbox" checked={formData.activo} onChange={(e) => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500" />
                    <span className="text-sm font-medium text-gray-700">Item activo</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all font-semibold">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all transform hover:scale-105 shadow-lg">
                  {editingItem ? 'Actualizar' : 'Crear'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Gestionar Tipos de Cantidad */}
      {showTiposModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Tipos de Cantidad</h2>
                <p className="text-orange-100 text-sm mt-1">Unidades de medida para items</p>
              </div>
              <button onClick={() => { setShowTiposModal(false); resetTipoForm() }} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Formulario inline */}
              <form onSubmit={handleSubmitTipo} className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h4 className="text-sm font-bold text-gray-700">{editingTipo ? 'Editar Tipo' : 'Agregar Nuevo Tipo'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Código *</label>
                    <input
                      type="text" value={tipoForm.codigo}
                      onChange={(e) => setTipoForm({ ...tipoForm, codigo: e.target.value.toLowerCase() })}
                      className={`w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-colors font-mono ${tipoErrors.codigo ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="m2"
                      disabled={!!editingTipo}
                    />
                    {tipoErrors.codigo && <p className="text-red-500 text-xs mt-0.5">{tipoErrors.codigo}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción *</label>
                    <input
                      type="text" value={tipoForm.descripcion}
                      onChange={(e) => setTipoForm({ ...tipoForm, descripcion: e.target.value })}
                      className={`w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-colors ${tipoErrors.descripcion ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Metro cuadrado"
                    />
                    {tipoErrors.descripcion && <p className="text-red-500 text-xs mt-0.5">{tipoErrors.descripcion}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Símbolo</label>
                    <input
                      type="text" value={tipoForm.simbolo}
                      onChange={(e) => setTipoForm({ ...tipoForm, simbolo: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="m²"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={tipoForm.activo} onChange={(e) => setTipoForm({ ...tipoForm, activo: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                    <span className="text-sm text-gray-700">Activo</span>
                  </label>
                  <div className="flex space-x-2">
                    {editingTipo && (
                      <button type="button" onClick={resetTipoForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors">
                        Cancelar
                      </button>
                    )}
                    <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors shadow">
                      {editingTipo ? 'Actualizar' : 'Agregar'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Lista de tipos existentes */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3">Tipos Existentes</h4>
                <div className="space-y-2">
                  {tiposCantidad.length === 0 ? (
                    <p className="text-center text-gray-400 py-6">No hay tipos de cantidad registrados</p>
                  ) : (
                    tiposCantidad.map((tipo) => (
                      <div key={tipo.id || tipo.codigo} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${editingTipo?.id === tipo.id ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-sm font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">{tipo.codigo}</span>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{tipo.descripcion}</span>
                            {tipo.simbolo && <span className="text-xs text-gray-400 ml-2">({tipo.simbolo})</span>}
                          </div>
                          {tipo.es_sistema && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Sistema</span>}
                        </div>
                        <div className="flex items-center space-x-1">
                          <button onClick={() => handleToggleTipoActivo(tipo)} className={`p-1.5 rounded-lg transition-colors ${tipo.activo ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`} title={tipo.activo ? 'Desactivar' : 'Activar'}>
                            <PowerIcon className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleEditTipo(tipo)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors" title="Editar">
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          {!tipo.es_sistema && (
                            <button onClick={() => handleDeleteTipo(tipo)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Eliminar">
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ItemsPage
