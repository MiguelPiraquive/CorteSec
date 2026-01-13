import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import tiposContratoService from '../../services/tiposContratoService'
import {
  FileTextIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  XCircleIcon,
  PercentIcon,
} from 'lucide-react'

const TiposContratoPage = () => {
  const audit = useAudit('Tipos de Contrato')
  const [tiposContrato, setTiposContrato] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActivo, setFilterActivo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTipo, setEditingTipo] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(12)
  
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    aplica_salud: true,
    aplica_pension: true,
    aplica_arl: true,
    aplica_parafiscales: true,
    ibc_porcentaje: 100,
    requiere_fecha_fin: false,
    activo: true,
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    loadTiposContrato()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterActivo])

  const loadTiposContrato = async () => {
    try {
      setLoading(true)
      const data = await tiposContratoService.getAllTiposContrato()
      setTiposContrato(data)
    } catch (error) {
      showNotification('error', 'Error al cargar tipos de contrato')
      console.error('Error:', error)
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
    
    // Validación: Código no puede estar vacío
    if (!formData.codigo?.trim()) {
      showNotification('error', 'El código es obligatorio')
      return
    }
    
    // Validación: IBC debe estar entre 0 y 100
    if (formData.ibc_porcentaje < 0 || formData.ibc_porcentaje > 100) {
      showNotification('error', 'El porcentaje de IBC debe estar entre 0 y 100')
      return
    }

    try {
      const dataToSend = {
        codigo: formData.codigo.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || '',
        aplica_salud: formData.aplica_salud,
        aplica_pension: formData.aplica_pension,
        aplica_arl: formData.aplica_arl,
        aplica_parafiscales: formData.aplica_parafiscales,
        ibc_porcentaje: parseFloat(formData.ibc_porcentaje),
        requiere_fecha_fin: formData.requiere_fecha_fin,
        activo: formData.activo,
      }

      if (editingTipo) {
        await tiposContratoService.update(editingTipo.id, dataToSend)
        audit.button('modificar_tipo_contrato', { tipo_id: editingTipo.id, codigo: dataToSend.codigo })
        showNotification('success', 'Tipo de contrato actualizado exitosamente')
      } else {
        await tiposContratoService.create(dataToSend)
        audit.button('crear_tipo_contrato', { codigo: dataToSend.codigo, nombre: dataToSend.nombre })
        showNotification('success', 'Tipo de contrato creado exitosamente')
      }
      
      setShowModal(false)
      resetForm()
      await loadTiposContrato()
    } catch (error) {
      console.error('Error guardando:', error)
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.codigo?.[0] || 
                       error.response?.data?.nombre?.[0] ||
                       'Error al guardar tipo de contrato'
      showNotification('error', errorMsg)
    }
  }

  const handleEdit = (tipo) => {
    audit.modalOpen('editar_tipo_contrato', { tipo_id: tipo.id, codigo: tipo.codigo })
    setEditingTipo(tipo)
    setFormData({
      codigo: tipo.codigo || '',
      nombre: tipo.nombre || '',
      descripcion: tipo.descripcion || '',
      aplica_salud: tipo.aplica_salud ?? true,
      aplica_pension: tipo.aplica_pension ?? true,
      aplica_arl: tipo.aplica_arl ?? true,
      aplica_parafiscales: tipo.aplica_parafiscales ?? true,
      ibc_porcentaje: tipo.ibc_porcentaje ?? 100,
      requiere_fecha_fin: tipo.requiere_fecha_fin ?? false,
      activo: tipo.activo ?? true,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este tipo de contrato?')) return
    try {
      await tiposContratoService.delete(id)
      showNotification('success', 'Tipo de contrato eliminado exitosamente')
      loadTiposContrato()
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al eliminar tipo de contrato'
      showNotification('error', errorMsg)
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      aplica_salud: true,
      aplica_pension: true,
      aplica_arl: true,
      aplica_parafiscales: true,
      ibc_porcentaje: 100,
      requiere_fecha_fin: false,
      activo: true,
    })
    setEditingTipo(null)
  }

  const filteredTipos = tiposContrato.filter(tipo => {
    const matchSearch = (tipo.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                       (tipo.codigo?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchActivo = filterActivo === '' || (filterActivo === 'true' ? tipo.activo : !tipo.activo)
    return matchSearch && matchActivo
  })

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedTipos = filteredTipos.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredTipos.length / pageSize)

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
      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <FileTextIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Tipos de Contrato</h1>
              <p className="text-blue-100 mt-1">Configuración de contratos laborales</p>
            </div>
          </div>
          <button 
            onClick={() => { setShowModal(true); resetForm() }} 
            className="flex items-center space-x-2 px-5 py-3 bg-white text-blue-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nuevo Tipo</span>
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
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Buscar por código o nombre..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all" 
            />
          </div>
          <select 
            value={filterActivo} 
            onChange={(e) => setFilterActivo(e.target.value)} 
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Cargando tipos de contrato...</span>
            </div>
          </div>
        ) : paginatedTipos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No se encontraron tipos de contrato
          </div>
        ) : (
          paginatedTipos.map(tipo => (
            <div 
              key={tipo.id} 
              className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-200/50 overflow-hidden"
            >
              <div className={`h-2 ${tipo.activo ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gray-400'}`}></div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{tipo.nombre}</h3>
                    <p className="text-sm text-gray-500 mt-1">Código: {tipo.codigo}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${tipo.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {tipo.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {tipo.descripcion && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{tipo.descripcion}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <PercentIcon className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700">IBC: {tipo.ibc_porcentaje}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center space-x-1 ${tipo.aplica_salud ? 'text-green-600' : 'text-gray-400'}`}>
                      {tipo.aplica_salud ? <CheckCircle2Icon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                      <span>Salud</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${tipo.aplica_pension ? 'text-green-600' : 'text-gray-400'}`}>
                      {tipo.aplica_pension ? <CheckCircle2Icon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                      <span>Pensión</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${tipo.aplica_arl ? 'text-green-600' : 'text-gray-400'}`}>
                      {tipo.aplica_arl ? <CheckCircle2Icon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                      <span>ARL</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${tipo.aplica_parafiscales ? 'text-green-600' : 'text-gray-400'}`}>
                      {tipo.aplica_parafiscales ? <CheckCircle2Icon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                      <span>Parafiscales</span>
                    </div>
                  </div>
                  {tipo.requiere_fecha_fin && (
                    <div className="flex items-center space-x-1 text-xs text-orange-600">
                      <AlertCircleIcon className="w-3 h-3" />
                      <span>Requiere fecha fin</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEdit(tipo)} 
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors text-sm font-semibold"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(tipo.id)} 
                    className="flex items-center justify-center px-3 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <button 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 1} 
            className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Anterior
          </button>
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page} 
                onClick={() => handlePageChange(page)} 
                className={`px-3 py-1 rounded-lg transition-all ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage === totalPages} 
            className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingTipo ? 'Editar Tipo de Contrato' : 'Nuevo Tipo de Contrato'}</h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Código */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.codigo} 
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })} 
                    required 
                    maxLength={20}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all" 
                    placeholder="Ej: INDEFINIDO"
                  />
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.nombre} 
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                    required 
                    maxLength={100}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all" 
                    placeholder="Ej: Contrato Indefinido"
                  />
                </div>

                {/* IBC Porcentaje */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Porcentaje de IBC (%) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    value={formData.ibc_porcentaje} 
                    onChange={(e) => setFormData({ ...formData, ibc_porcentaje: e.target.value })} 
                    required 
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all" 
                    placeholder="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Porcentaje del salario para calcular el IBC (0-100)</p>
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                  <textarea 
                    value={formData.descripcion} 
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} 
                    rows={3} 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all resize-none" 
                    placeholder="Descripción opcional del tipo de contrato..."
                  />
                </div>

                {/* Checkboxes - Aplica */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Aportes que aplican</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.aplica_salud} 
                        onChange={(e) => setFormData({ ...formData, aplica_salud: e.target.checked })} 
                        className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500" 
                      />
                      <span className="text-gray-700">Salud</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.aplica_pension} 
                        onChange={(e) => setFormData({ ...formData, aplica_pension: e.target.checked })} 
                        className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500" 
                      />
                      <span className="text-gray-700">Pensión</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.aplica_arl} 
                        onChange={(e) => setFormData({ ...formData, aplica_arl: e.target.checked })} 
                        className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500" 
                      />
                      <span className="text-gray-700">ARL</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.aplica_parafiscales} 
                        onChange={(e) => setFormData({ ...formData, aplica_parafiscales: e.target.checked })} 
                        className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500" 
                      />
                      <span className="text-gray-700">Parafiscales</span>
                    </label>
                  </div>
                </div>

                {/* Checkboxes - Otros */}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.requiere_fecha_fin} 
                        onChange={(e) => setFormData({ ...formData, requiere_fecha_fin: e.target.checked })} 
                        className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500" 
                      />
                      <span className="text-gray-700">Requiere fecha fin</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.activo} 
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} 
                        className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500" 
                      />
                      <span className="text-gray-700">Activo</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 mt-8">
                <button 
                  type="submit" 
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 text-white hover:bg-blue-600 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
                >
                  <CheckIcon className="w-5 h-5" />
                  <span>{editingTipo ? 'Actualizar' : 'Guardar'}</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); resetForm() }} 
                  className="px-6 py-3 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-xl transition-all duration-300 font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TiposContratoPage
