import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import parametrosLegalesService from '../../services/parametrosLegalesService'
import {
  ScaleIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  PercentIcon,
  CalendarIcon,
  DollarSignIcon,
} from 'lucide-react'

const ParametrosLegalesPage = () => {
  const audit = useAudit('Parámetros Legales')
  const [parametros, setParametros] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterConcepto, setFilterConcepto] = useState('')
  const [filterActivo, setFilterActivo] = useState('true') // Por defecto solo activos
  const [showModal, setShowModal] = useState(false)
  const [editingParametro, setEditingParametro] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(12)
  
  const [formData, setFormData] = useState({
    concepto: '',
    descripcion: '',
    porcentaje_total: '',
    porcentaje_empleado: '',
    porcentaje_empleador: '',
    valor_fijo: '',
    vigente_desde: '',
    vigente_hasta: '',
    activo: true,
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    loadParametros()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterConcepto, filterActivo])

  const loadParametros = async () => {
    try {
      setLoading(true)
      const data = await parametrosLegalesService.getAllParametros()
      setParametros(data)
    } catch (error) {
      showNotification('error', 'Error al cargar parámetros legales')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const handlePorcentajeChange = (field, value) => {
    const newFormData = { ...formData, [field]: value }
    
    // Calcular total automáticamente si se ingresan empleado y empleador
    if (field === 'porcentaje_empleado' || field === 'porcentaje_empleador') {
      const empleado = parseFloat(field === 'porcentaje_empleado' ? value : formData.porcentaje_empleado) || 0
      const empleador = parseFloat(field === 'porcentaje_empleador' ? value : formData.porcentaje_empleador) || 0
      newFormData.porcentaje_total = (empleado + empleador).toFixed(3)
    }
    
    setFormData(newFormData)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validaciones
    if (!formData.concepto) {
      showNotification('error', 'Debe seleccionar un concepto')
      return
    }
    
    if (!formData.vigente_desde) {
      showNotification('error', 'La fecha de vigencia desde es obligatoria')
      return
    }
    
    if (formData.vigente_hasta && formData.vigente_hasta <= formData.vigente_desde) {
      showNotification('error', 'La fecha de vigencia hasta debe ser posterior a la fecha desde')
      return
    }
    
    // Validar que los porcentajes estén entre 0 y 100
    const total = parseFloat(formData.porcentaje_total) || 0
    const empleado = parseFloat(formData.porcentaje_empleado) || 0
    const empleador = parseFloat(formData.porcentaje_empleador) || 0
    
    if (total < 0 || total > 100 || empleado < 0 || empleado > 100 || empleador < 0 || empleador > 100) {
      showNotification('error', 'Los porcentajes deben estar entre 0 y 100')
      return
    }

    try {
      const dataToSend = {
        concepto: formData.concepto,
        descripcion: formData.descripcion?.trim() || '',
        porcentaje_total: parseFloat(formData.porcentaje_total) || 0,
        porcentaje_empleado: parseFloat(formData.porcentaje_empleado) || 0,
        porcentaje_empleador: parseFloat(formData.porcentaje_empleador) || 0,
        valor_fijo: formData.valor_fijo ? parseFloat(formData.valor_fijo) : null,
        vigente_desde: formData.vigente_desde,
        vigente_hasta: formData.vigente_hasta || null,
        activo: formData.activo,
      }

      console.log('Enviando parámetro:', dataToSend)

      if (editingParametro) {
        await parametrosLegalesService.update(editingParametro.id, dataToSend)
        audit.button('modificar_parametro_legal', { parametro_id: editingParametro.id, concepto: dataToSend.concepto })
        showNotification('success', 'Parámetro legal actualizado exitosamente')
      } else {
        await parametrosLegalesService.create(dataToSend)
        audit.button('crear_parametro_legal', { concepto: dataToSend.concepto })
        showNotification('success', 'Parámetro legal creado exitosamente')
      }
      
      setShowModal(false)
      resetForm()
      await loadParametros()
    } catch (error) {
      console.error('Error guardando:', error)
      console.error('Detalle:', error.response?.data)
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.porcentaje_total?.[0] ||
                       Object.values(error.response?.data || {})[0] ||
                       'Error al guardar parámetro legal'
      showNotification('error', errorMsg)
    }
  }

  const handleEdit = (parametro) => {
    audit.modalOpen('editar_parametro_legal', { parametro_id: parametro.id, concepto: parametro.concepto })
    setEditingParametro(parametro)
    
    console.log('Editando parámetro:', parametro)
    
    setFormData({
      concepto: parametro.concepto || '',
      descripcion: parametro.descripcion || '',
      porcentaje_total: parametro.porcentaje_total || '',
      porcentaje_empleado: parametro.porcentaje_empleado || '',
      porcentaje_empleador: parametro.porcentaje_empleador || '',
      valor_fijo: parametro.valor_fijo || '',
      vigente_desde: parametro.vigente_desde || '',
      vigente_hasta: parametro.vigente_hasta || '',
      activo: parametro.activo ?? true,
    })
    
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este parámetro legal?')) return
    try {
      await parametrosLegalesService.delete(id)
      showNotification('success', 'Parámetro legal eliminado exitosamente')
      loadParametros()
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al eliminar parámetro legal'
      showNotification('error', errorMsg)
    }
  }

  const resetForm = () => {
    setFormData({
      concepto: '',
      descripcion: '',
      porcentaje_total: '',
      porcentaje_empleado: '',
      porcentaje_empleador: '',
      valor_fijo: '',
      vigente_desde: '',
      vigente_hasta: '',
      activo: true,
    })
    setEditingParametro(null)
  }

  const filteredParametros = parametros.filter(param => {
    const conceptoDisplay = param.concepto_display?.toLowerCase() || param.concepto?.toLowerCase() || ''
    const descripcion = param.descripcion?.toLowerCase() || ''
    
    const matchSearch = conceptoDisplay.includes(searchTerm.toLowerCase()) ||
                       descripcion.includes(searchTerm.toLowerCase())
    
    const matchConcepto = !filterConcepto || param.concepto === filterConcepto
    const matchActivo = filterActivo === '' || (filterActivo === 'true' ? param.activo : !param.activo)
    
    return matchSearch && matchConcepto && matchActivo
  })

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedParametros = filteredParametros.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredParametros.length / pageSize)

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const formatCurrency = (value) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const isVigente = (param) => {
    const hoy = new Date().toISOString().split('T')[0]
    const desde = param.vigente_desde
    const hasta = param.vigente_hasta
    
    if (!desde) return false
    if (desde > hoy) return false
    if (hasta && hasta < hoy) return false
    
    return true
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
      <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <ScaleIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Parámetros Legales</h1>
              <p className="text-amber-100 mt-1">Configuración de aportes y prestaciones sociales</p>
            </div>
          </div>
          <button 
            onClick={() => { setShowModal(true); resetForm() }} 
            className="flex items-center space-x-2 px-5 py-3 bg-white text-amber-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nuevo Parámetro</span>
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
              placeholder="Buscar por concepto o descripción..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all" 
            />
          </div>
          <select 
            value={filterConcepto} 
            onChange={(e) => setFilterConcepto(e.target.value)} 
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
          >
            <option value="">Todos los conceptos</option>
            {parametrosLegalesService.conceptos.map(concepto => (
              <option key={concepto.value} value={concepto.value}>{concepto.label}</option>
            ))}
          </select>
          <select 
            value={filterActivo} 
            onChange={(e) => setFilterActivo(e.target.value)} 
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
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
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Cargando parámetros...</span>
            </div>
          </div>
        ) : paginatedParametros.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No se encontraron parámetros legales
          </div>
        ) : (
          paginatedParametros.map(param => (
            <div 
              key={param.id} 
              className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-200/50 overflow-hidden"
            >
              <div className={`h-2 ${param.activo && isVigente(param) ? 'bg-gradient-to-r from-green-400 to-emerald-500' : param.activo ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gray-400'}`}></div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">{param.concepto_display || param.concepto}</h3>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${param.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {param.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    {param.activo && isVigente(param) && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        Vigente
                      </span>
                    )}
                  </div>
                </div>

                {param.descripcion && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{param.descripcion}</p>
                )}

                <div className="space-y-2 mb-4">
                  {(param.porcentaje_total > 0) && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-bold text-amber-600">{param.porcentaje_total}%</span>
                      </div>
                      {param.porcentaje_empleado > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Empleado:</span>
                          <span className="text-gray-700">{param.porcentaje_empleado}%</span>
                        </div>
                      )}
                      {param.porcentaje_empleador > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Empleador:</span>
                          <span className="text-gray-700">{param.porcentaje_empleador}%</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {param.valor_fijo && (
                    <div className="flex items-center space-x-2 text-sm">
                      <DollarSignIcon className="w-4 h-4 text-green-500" />
                      <span className="text-gray-700 font-semibold">{formatCurrency(param.valor_fijo)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatDate(param.vigente_desde)} - {param.vigente_hasta ? formatDate(param.vigente_hasta) : 'Indefinido'}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEdit(param)} 
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition-colors text-sm font-semibold"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(param.id)} 
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
                className={`px-3 py-1 rounded-lg transition-all ${currentPage === page ? 'bg-amber-500 text-white' : 'bg-white hover:bg-gray-100'}`}
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
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingParametro ? 'Editar Parámetro Legal' : 'Nuevo Parámetro Legal'}</h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Concepto */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Concepto <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.concepto} 
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })} 
                    required 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 transition-all"
                  >
                    <option value="">Seleccione un concepto</option>
                    {parametrosLegalesService.conceptos.map(concepto => (
                      <option key={concepto.value} value={concepto.value}>{concepto.label}</option>
                    ))}
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                  <input 
                    type="text" 
                    value={formData.descripcion} 
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} 
                    maxLength={200}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 transition-all" 
                    placeholder="Descripción opcional"
                  />
                </div>

                {/* Porcentajes */}
                <div className="md:col-span-2 bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">Porcentajes (%)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total</label>
                      <input 
                        type="number" 
                        value={formData.porcentaje_total} 
                        onChange={(e) => handlePorcentajeChange('porcentaje_total', e.target.value)} 
                        min="0"
                        max="100"
                        step="0.001"
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 transition-all" 
                        placeholder="0.000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Empleado</label>
                      <input 
                        type="number" 
                        value={formData.porcentaje_empleado} 
                        onChange={(e) => handlePorcentajeChange('porcentaje_empleado', e.target.value)} 
                        min="0"
                        max="100"
                        step="0.001"
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 transition-all" 
                        placeholder="0.000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Empleador</label>
                      <input 
                        type="number" 
                        value={formData.porcentaje_empleador} 
                        onChange={(e) => handlePorcentajeChange('porcentaje_empleador', e.target.value)} 
                        min="0"
                        max="100"
                        step="0.001"
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 transition-all" 
                        placeholder="0.000"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Ingrese hasta 3 decimales. Al ingresar empleado + empleador se calcula el total automáticamente.</p>
                </div>

                {/* Valor Fijo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Valor Fijo (COP)</label>
                  <input 
                    type="number" 
                    value={formData.valor_fijo} 
                    onChange={(e) => setFormData({ ...formData, valor_fijo: e.target.value })} 
                    min="0"
                    step="1000"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 transition-all" 
                    placeholder="Ej: 1300000 (para SMMLV)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Para conceptos como SMMLV, Auxilio Transporte</p>
                </div>

                {/* Vigencia Desde */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vigente Desde <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    value={formData.vigente_desde} 
                    onChange={(e) => setFormData({ ...formData, vigente_desde: e.target.value })} 
                    required 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 transition-all" 
                  />
                </div>

                {/* Vigencia Hasta */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Vigente Hasta</label>
                  <input 
                    type="date" 
                    value={formData.vigente_hasta} 
                    onChange={(e) => setFormData({ ...formData, vigente_hasta: e.target.value })} 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 transition-all" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Dejar vacío para vigencia indefinida</p>
                </div>

                {/* Activo */}
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.activo} 
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} 
                      className="w-5 h-5 text-amber-500 rounded focus:ring-2 focus:ring-amber-500" 
                    />
                    <span className="text-gray-700 font-semibold">Activo</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-4 mt-8">
                <button 
                  type="submit" 
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-amber-500 text-white hover:bg-amber-600 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
                >
                  <CheckIcon className="w-5 h-5" />
                  <span>{editingParametro ? 'Actualizar' : 'Guardar'}</span>
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

export default ParametrosLegalesPage
