import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import tiposCantidadService from '../../services/tiposCantidadService'
import {
  RulerIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  HashIcon,
  TypeIcon,
  CircleDotIcon,
} from 'lucide-react'

const TiposCantidadPage = () => {
  const audit = useAudit('TiposCantidad')
  const [tiposCantidad, setTiposCantidad] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActivo, setFilterActivo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTipo, setEditingTipo] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(15)
  
  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    simbolo: '',
    activo: true,
    es_sistema: false,
    orden: 0,
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    loadTiposCantidad()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterActivo])

  const loadTiposCantidad = async () => {
    try {
      setLoading(true)
      const data = await tiposCantidadService.getAllTiposCantidad()
      console.log('📦 Tipos de cantidad recibidos:', data)
      console.log('🔍 Es array?', Array.isArray(data))
      // Asegurar que siempre sea un array
      setTiposCantidad(Array.isArray(data) ? data : [])
    } catch (error) {
      showNotification('error', 'Error al cargar tipos de cantidad')
      console.error(error)
      setTiposCantidad([]) // Asegurar array vacío en caso de error
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
        await tiposCantidadService.updateTipoCantidad(editingTipo.id, formData)
        audit.button('modificar_tipo_cantidad', { tipo_id: editingTipo.id, codigo: formData.codigo })
        showNotification('success', 'Tipo de cantidad actualizado exitosamente')
      } else {
        const result = await tiposCantidadService.createTipoCantidad(formData)
        audit.button('crear_tipo_cantidad', { codigo: formData.codigo })
        showNotification('success', 'Tipo de cantidad creado exitosamente')
      }
      setShowModal(false)
      resetForm()
      loadTiposCantidad()
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Error al guardar')
      console.error(error)
    }
  }

  const handleEdit = (tipo) => {
    audit.modalOpen('editar_tipo_cantidad', { tipo_id: tipo.id, codigo: tipo.codigo })
    setEditingTipo(tipo)
    setFormData({
      codigo: tipo.codigo,
      descripcion: tipo.descripcion,
      simbolo: tipo.simbolo || '',
      activo: tipo.activo,
      es_sistema: tipo.es_sistema,
      orden: tipo.orden,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este tipo de cantidad?')) return
    try {
      const tipo = tiposCantidad.find(t => t.id === id)
      await tiposCantidadService.deleteTipoCantidad(id)
      audit.button('eliminar_tipo_cantidad', { tipo_id: id, codigo: tipo?.codigo })
      showNotification('success', 'Tipo de cantidad eliminado exitosamente')
      loadTiposCantidad()
    } catch (error) {
      showNotification('error', 'Error al eliminar tipo de cantidad')
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: '',
      descripcion: '',
      simbolo: '',
      activo: true,
      es_sistema: false,
      orden: 0,
    })
    setEditingTipo(null)
  }

  const filteredTipos = tiposCantidad.filter(tipo => {
    const matchSearch = 
      tipo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tipo.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tipo.simbolo && tipo.simbolo.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <RulerIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Tipos de Cantidad</h1>
              <p className="text-cyan-100 mt-1">Gestión de unidades de medida</p>
            </div>
          </div>
          <button 
            onClick={() => { 
              audit.modalOpen('crear_tipo_cantidad')
              setShowModal(true)
              resetForm() 
            }} 
            className="flex items-center space-x-2 px-5 py-3 bg-white text-cyan-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nueva Unidad</span>
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
                  audit.search('tipos_cantidad', { termino: e.target.value })
                }
              }}
              placeholder="Buscar por código, descripción o símbolo..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all" 
            />
          </div>
          <select 
            value={filterActivo} 
            onChange={(e) => {
              setFilterActivo(e.target.value)
              audit.filter('tipos_cantidad_estado', { estado: e.target.value })
            }}
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
          >
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
            <thead className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Código</th>
                <th className="px-6 py-4 text-left font-semibold">Descripción</th>
                <th className="px-6 py-4 text-left font-semibold">Símbolo</th>
                <th className="px-6 py-4 text-center font-semibold">Orden</th>
                <th className="px-6 py-4 text-center font-semibold">Sistema</th>
                <th className="px-6 py-4 text-center font-semibold">Estado</th>
                <th className="px-6 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center space-x-3">
                      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600">Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedTipos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No se encontraron tipos de cantidad
                  </td>
                </tr>
              ) : (
                paginatedTipos.map((tipo, index) => (
                  <tr key={tipo.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-cyan-50 transition-colors`}>
                    <td className="px-6 py-4 font-mono font-semibold text-cyan-700">{tipo.codigo}</td>
                    <td className="px-6 py-4 text-gray-800">{tipo.descripcion}</td>
                    <td className="px-6 py-4 text-gray-600 text-center">{tipo.simbolo || '-'}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{tipo.orden}</td>
                    <td className="px-6 py-4 text-center">
                      {tipo.es_sistema ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          Sistema
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          Usuario
                        </span>
                      )}
                    </td>
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
                        {!tipo.es_sistema && (
                          <button onClick={() => handleDelete(tipo.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all">
                            <TrashIcon className="w-4 h-4" />
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
              <span className="px-4 py-2 bg-cyan-600 text-white rounded-lg">
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
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-2xl font-bold">{editingTipo ? 'Editar Tipo de Cantidad' : 'Nueva Tipo de Cantidad'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Código */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Código *
                  </label>
                  <div className="relative">
                    <HashIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-all" placeholder="m2, m3, ml, global..." required />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Solo letras, números, guiones (-) y guión bajo (_)</p>
                </div>

                {/* Símbolo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Símbolo
                  </label>
                  <div className="relative">
                    <CircleDotIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={formData.simbolo} onChange={(e) => setFormData({ ...formData, simbolo: e.target.value })} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-all" placeholder="m², m³, ml..." maxLength={10} />
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción *
                </label>
                <div className="relative">
                  <TypeIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-all" placeholder="Descripción completa de la unidad de medida" rows={3} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Orden */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Orden
                  </label>
                  <input type="number" value={formData.orden} onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-all" min={0} />
                </div>

                {/* Es Sistema */}
                <div className="flex items-center space-x-3 mt-8">
                  <input type="checkbox" id="es_sistema" checked={formData.es_sistema} onChange={(e) => setFormData({ ...formData, es_sistema: e.target.checked })} className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" disabled={editingTipo?.es_sistema} />
                  <label htmlFor="es_sistema" className="text-sm font-medium text-gray-700">
                    Es del sistema
                  </label>
                </div>

                {/* Activo */}
                <div className="flex items-center space-x-3 mt-8">
                  <input type="checkbox" id="activo" checked={formData.activo} onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" />
                  <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                    Activo
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 font-semibold transition-all transform hover:scale-105 shadow-lg">
                  {editingTipo ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TiposCantidadPage
