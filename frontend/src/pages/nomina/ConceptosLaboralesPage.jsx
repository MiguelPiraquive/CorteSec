import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import conceptosLaboralesService from '../../services/conceptosLaboralesService'
import {
  DollarSignIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PercentIcon,
  CoinsIcon,
} from 'lucide-react'

const TIPOS_CONCEPTO = [
  { value: 'DEVENGADO', label: 'Devengado', color: 'green', icon: TrendingUpIcon },
  { value: 'DEDUCCION', label: 'Deducción', color: 'red', icon: TrendingDownIcon },
]

const BASES_CALCULO = [
  { value: 'SALARIO', label: 'Salario' },
  { value: 'IBC', label: 'Ingreso Base de Cotización (IBC)' },
  { value: 'DEVENGADO', label: 'Total Devengado' },
]

const ConceptosLaboralesPage = () => {
  const audit = useAudit('Conceptos Laborales')
  const [conceptos, setConceptos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterActivo, setFilterActivo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingConcepto, setEditingConcepto] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(12)
  
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: 'DEVENGADO',
    aplica_porcentaje: false,
    porcentaje: '',
    monto_fijo: '',
    base_calculo: 'SALARIO',
    es_legal: false,
    orden: 100,
    activo: true,
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    loadConceptos()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipo, filterActivo])

  const loadConceptos = async () => {
    try {
      setLoading(true)
      const data = await conceptosLaboralesService.getAll()
      const results = Array.isArray(data) ? data : data.results || []
      setConceptos(results)
    } catch (error) {
      showNotification('error', 'Error al cargar conceptos laborales')
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
    
    // Validaciones
    if (!formData.codigo?.trim()) {
      showNotification('error', 'El código es obligatorio')
      return
    }
    
    if (!formData.nombre?.trim()) {
      showNotification('error', 'El nombre es obligatorio')
      return
    }
    
    if (formData.aplica_porcentaje) {
      if (!formData.porcentaje || parseFloat(formData.porcentaje) < 0 || parseFloat(formData.porcentaje) > 100) {
        showNotification('error', 'El porcentaje debe estar entre 0 y 100')
        return
      }
    } else {
      if (!formData.monto_fijo || parseFloat(formData.monto_fijo) < 0) {
        showNotification('error', 'El monto fijo debe ser mayor o igual a 0')
        return
      }
    }

    try {
      const dataToSend = {
        codigo: formData.codigo.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || '',
        tipo: formData.tipo,
        aplica_porcentaje: formData.aplica_porcentaje,
        porcentaje: formData.aplica_porcentaje ? parseFloat(formData.porcentaje) : 0,
        monto_fijo: !formData.aplica_porcentaje ? parseFloat(formData.monto_fijo) : 0,
        base_calculo: formData.base_calculo,
        es_legal: formData.es_legal,
        orden: parseInt(formData.orden) || 100,
        activo: formData.activo,
      }

      console.log('Enviando concepto:', dataToSend)

      if (editingConcepto) {
        await conceptosLaboralesService.update(editingConcepto.id, dataToSend)
        audit.button('modificar_concepto_laboral', { concepto_id: editingConcepto.id, codigo: dataToSend.codigo })
        showNotification('success', 'Concepto laboral actualizado exitosamente')
      } else {
        await conceptosLaboralesService.create(dataToSend)
        audit.button('crear_concepto_laboral', { codigo: dataToSend.codigo, nombre: dataToSend.nombre })
        showNotification('success', 'Concepto laboral creado exitosamente')
      }
      
      setShowModal(false)
      resetForm()
      await loadConceptos()
    } catch (error) {
      console.error('Error guardando:', error)
      console.error('Detalle:', error.response?.data)
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.codigo?.[0] || 
                       Object.values(error.response?.data || {})[0] ||
                       'Error al guardar concepto laboral'
      showNotification('error', errorMsg)
    }
  }

  const handleEdit = (concepto) => {
    audit.modalOpen('editar_concepto_laboral', { concepto_id: concepto.id, codigo: concepto.codigo })
    setEditingConcepto(concepto)
    
    console.log('Editando concepto:', concepto)
    
    setFormData({
      codigo: concepto.codigo || '',
      nombre: concepto.nombre || '',
      descripcion: concepto.descripcion || '',
      tipo: concepto.tipo || 'DEVENGADO',
      aplica_porcentaje: concepto.aplica_porcentaje ?? false,
      porcentaje: concepto.porcentaje || '',
      monto_fijo: concepto.monto_fijo || '',
      base_calculo: concepto.base_calculo || 'SALARIO',
      es_legal: concepto.es_legal ?? false,
      orden: concepto.orden || 100,
      activo: concepto.activo ?? true,
    })
    
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este concepto laboral?')) return
    try {
      await conceptosLaboralesService.delete(id)
      showNotification('success', 'Concepto laboral eliminado exitosamente')
      loadConceptos()
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al eliminar concepto laboral'
      showNotification('error', errorMsg)
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      tipo: 'DEVENGADO',
      aplica_porcentaje: false,
      porcentaje: '',
      monto_fijo: '',
      base_calculo: 'SALARIO',
      es_legal: false,
      orden: 100,
      activo: true,
    })
    setEditingConcepto(null)
  }

  const filteredConceptos = conceptos.filter(concepto => {
    const matchSearch = (concepto.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                       (concepto.codigo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                       (concepto.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    
    const matchTipo = !filterTipo || concepto.tipo === filterTipo
    const matchActivo = filterActivo === '' || (filterActivo === 'true' ? concepto.activo : !concepto.activo)
    
    return matchSearch && matchTipo && matchActivo
  })

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedConceptos = filteredConceptos.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredConceptos.length / pageSize)

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const formatCurrency = (value) => {
    if (!value) return '$0'
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
  }

  const getTipoConfig = (tipo) => {
    return TIPOS_CONCEPTO.find(t => t.value === tipo) || TIPOS_CONCEPTO[0]
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
      <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <DollarSignIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Conceptos Laborales</h1>
              <p className="text-emerald-100 mt-1">Devengados y deducciones de nómina</p>
            </div>
          </div>
          <button 
            onClick={() => { setShowModal(true); resetForm() }} 
            className="flex items-center space-x-2 px-5 py-3 bg-white text-emerald-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nuevo Concepto</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Buscar por código, nombre o descripción..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" 
            />
          </div>
          <select 
            value={filterTipo} 
            onChange={(e) => setFilterTipo(e.target.value)} 
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          >
            <option value="">Todos los tipos</option>
            {TIPOS_CONCEPTO.map(tipo => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
          <select 
            value={filterActivo} 
            onChange={(e) => setFilterActivo(e.target.value)} 
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
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
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Cargando conceptos...</span>
            </div>
          </div>
        ) : paginatedConceptos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No se encontraron conceptos laborales
          </div>
        ) : (
          paginatedConceptos.map(concepto => {
            const tipoConfig = getTipoConfig(concepto.tipo)
            const TipoIcon = tipoConfig.icon
            
            return (
              <div 
                key={concepto.id} 
                className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-200/50 overflow-hidden"
              >
                <div className={`h-2 ${concepto.activo ? `bg-gradient-to-r from-${tipoConfig.color}-400 to-${tipoConfig.color}-600` : 'bg-gray-400'}`}></div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <TipoIcon className={`w-4 h-4 text-${tipoConfig.color}-500`} />
                        <h3 className="text-lg font-bold text-gray-800">{concepto.nombre}</h3>
                      </div>
                      <p className="text-sm text-gray-500">Código: {concepto.codigo}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${concepto.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {concepto.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${concepto.tipo === 'DEVENGADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {concepto.tipo_display || concepto.tipo}
                      </span>
                    </div>
                  </div>

                  {concepto.descripcion && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{concepto.descripcion}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    {concepto.aplica_porcentaje ? (
                      <div className="flex items-center space-x-2 text-sm bg-blue-50 p-2 rounded-lg">
                        <PercentIcon className="w-4 h-4 text-blue-500" />
                        <div className="flex-1">
                          <span className="font-semibold text-blue-700">{concepto.porcentaje}%</span>
                          <span className="text-gray-600 text-xs ml-2">sobre {concepto.base_calculo_display || concepto.base_calculo}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-sm bg-green-50 p-2 rounded-lg">
                        <CoinsIcon className="w-4 h-4 text-green-500" />
                        <div className="flex-1">
                          <span className="font-semibold text-green-700">{formatCurrency(concepto.monto_fijo)}</span>
                          <span className="text-gray-600 text-xs ml-2">Monto fijo</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Orden: {concepto.orden}</span>
                      {concepto.es_legal && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">Legal</span>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEdit(concepto)} 
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors text-sm font-semibold"
                    >
                      <EditIcon className="w-4 h-4" />
                      <span>Editar</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(concepto.id)} 
                      className="flex items-center justify-center px-3 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
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
                className={`px-3 py-1 rounded-lg transition-all ${currentPage === page ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-gray-100'}`}
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
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingConcepto ? 'Editar Concepto Laboral' : 'Nuevo Concepto Laboral'}</h2>
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
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all" 
                    placeholder="Ej: BONIF01"
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
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all" 
                    placeholder="Ej: Bonificación por Desempeño"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.tipo} 
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} 
                    required 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    {TIPOS_CONCEPTO.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                </div>

                {/* Orden */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Orden de Aplicación</label>
                  <input 
                    type="number" 
                    value={formData.orden} 
                    onChange={(e) => setFormData({ ...formData, orden: e.target.value })} 
                    min="1"
                    max="999"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all" 
                    placeholder="100"
                  />
                </div>

                {/* Aplica Porcentaje */}
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-3 cursor-pointer bg-gray-50 p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-300 transition-all">
                    <input 
                      type="checkbox" 
                      checked={formData.aplica_porcentaje} 
                      onChange={(e) => setFormData({ ...formData, aplica_porcentaje: e.target.checked, porcentaje: '', monto_fijo: '' })} 
                      className="w-5 h-5 text-emerald-500 rounded focus:ring-2 focus:ring-emerald-500" 
                    />
                    <div className="flex-1">
                      <span className="text-gray-700 font-semibold">¿Se calcula como porcentaje?</span>
                      <p className="text-xs text-gray-500 mt-1">Si no, se aplicará un monto fijo</p>
                    </div>
                  </label>
                </div>

                {/* Porcentaje o Monto Fijo */}
                {formData.aplica_porcentaje ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Porcentaje (%) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number" 
                        value={formData.porcentaje} 
                        onChange={(e) => setFormData({ ...formData, porcentaje: e.target.value })} 
                        required={formData.aplica_porcentaje}
                        min="0"
                        max="100"
                        step="0.001"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all" 
                        placeholder="10.000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Base de Cálculo <span className="text-red-500">*</span>
                      </label>
                      <select 
                        value={formData.base_calculo} 
                        onChange={(e) => setFormData({ ...formData, base_calculo: e.target.value })} 
                        required 
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all"
                      >
                        {BASES_CALCULO.map(base => (
                          <option key={base.value} value={base.value}>{base.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Monto Fijo (COP) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      value={formData.monto_fijo} 
                      onChange={(e) => setFormData({ ...formData, monto_fijo: e.target.value })} 
                      required={!formData.aplica_porcentaje}
                      min="0"
                      step="1000"
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all" 
                      placeholder="100000"
                    />
                  </div>
                )}

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                  <textarea 
                    value={formData.descripcion} 
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} 
                    rows={3} 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all resize-none" 
                    placeholder="Descripción opcional del concepto..."
                  />
                </div>

                {/* Checkboxes */}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.es_legal} 
                        onChange={(e) => setFormData({ ...formData, es_legal: e.target.checked })} 
                        className="w-5 h-5 text-emerald-500 rounded focus:ring-2 focus:ring-emerald-500" 
                      />
                      <span className="text-gray-700">Es concepto legal (salud, pensión, etc.)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.activo} 
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} 
                        className="w-5 h-5 text-emerald-500 rounded focus:ring-2 focus:ring-emerald-500" 
                      />
                      <span className="text-gray-700">Activo</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 mt-8">
                <button 
                  type="submit" 
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
                >
                  <CheckIcon className="w-5 h-5" />
                  <span>{editingConcepto ? 'Actualizar' : 'Guardar'}</span>
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

export default ConceptosLaboralesPage
