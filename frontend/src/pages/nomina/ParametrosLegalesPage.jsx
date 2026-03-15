import { useState, useCallback } from 'react'
import useAudit from '../../hooks/useAudit'
import Can from '../../components/permissions/Can'
import { usePermissions } from '../../context/PermissionsContext'
import { useConfiguracion } from '../../context/ConfiguracionContext'
import useServerPagination from '../../hooks/useServerPagination'
import Pagination from '../../components/Pagination'
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
  const { hasPermission, initialized } = usePermissions()
  const { formatCurrency: cfgFormatCurrency, formatDate: cfgFormatDate } = useConfiguracion()
  const [filterConcepto, setFilterConcepto] = useState('')
  const [filterActivo, setFilterActivo] = useState('true') // Por defecto solo activos
  const [showModal, setShowModal] = useState(false)
  const [editingParametro, setEditingParametro] = useState(null)
  
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

  const fetchParametros = useCallback((params) => parametrosLegalesService.getAll(params), [])
  const {
    data: parametros,
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
  } = useServerPagination(fetchParametros, { pageSize: 12, initialFilters: { activo: 'true' } })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  const handleFilterConcepto = (value) => {
    setFilterConcepto(value)
    const filters = {}
    if (value) filters.concepto = value
    if (filterActivo !== '') filters.activo = filterActivo
    setFilters(filters)
  }

  const handleFilterActivo = (value) => {
    setFilterActivo(value)
    const filters = {}
    if (filterConcepto) filters.concepto = filterConcepto
    if (value !== '') filters.activo = value
    setFilters(filters)
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
        valor_fijo: formData.valor_fijo ? parseFloat(formData.valor_fijo) : 0,
        vigente_desde: formData.vigente_desde,
        vigente_hasta: formData.vigente_hasta || null,
        activo: formData.activo,
      }

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
      refresh()
    } catch (error) {
      const data = error.response?.data || {}
      const errorMsg = typeof data === 'string' ? data
        : data.detail?.[0] || data.detail
        || data.porcentaje_total?.[0]
        || data.non_field_errors?.[0]
        || (typeof Object.values(data)[0] === 'string' ? Object.values(data)[0] : Object.values(data)[0]?.[0])
        || 'Error al guardar parámetro legal'
      showNotification('error', errorMsg)
    }
  }

  const handleEdit = (parametro) => {
    audit.modalOpen('editar_parametro_legal', { parametro_id: parametro.id, concepto: parametro.concepto })
    setEditingParametro(parametro)
    
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
      refresh()
    } catch (error) {
      const data = error.response?.data || {}
      const errorMsg = data.detail?.[0] || data.detail || 'Error al eliminar parámetro legal'
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

  const formatCurrency = (value) => {
    if (!value) return 'N/A'
    return cfgFormatCurrency(value)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return cfgFormatDate(dateStr)
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

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('parametros_legales.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

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
          <Can permission="parametros_legales.add">
            <button
              onClick={() => { setShowModal(true); resetForm() }}
              className="flex items-center space-x-2 px-5 py-3 bg-white text-amber-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Nuevo Parámetro</span>
            </button>
          </Can>
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
            onChange={(e) => handleFilterConcepto(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
          >
            <option value="">Todos los conceptos</option>
            {parametrosLegalesService.conceptos.map(concepto => (
              <option key={concepto.value} value={concepto.value}>{concepto.label}</option>
            ))}
          </select>
          <select
            value={filterActivo}
            onChange={(e) => handleFilterActivo(e.target.value)}
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
        ) : parametros.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No se encontraron parámetros legales
          </div>
        ) : (
          parametros.map(param => (
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
                  <Can permission="parametros_legales.change">
                    <button
                      onClick={() => handleEdit(param)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition-colors text-sm font-semibold"
                    >
                      <EditIcon className="w-4 h-4" />
                      <span>Editar</span>
                    </button>
                  </Can>
                  <Can permission="parametros_legales.delete">
                    <button
                      onClick={() => handleDelete(param.id)}
                      className="flex items-center justify-center px-3 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </Can>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="parámetros"
      />

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
                    <optgroup label="Seguridad Social">
                      <option value="SALUD">Salud</option>
                      <option value="PENSION">Pensión</option>
                    </optgroup>
                    <optgroup label="ARL por Nivel de Riesgo">
                      <option value="ARL_NIVEL_I">ARL Nivel I - Mínimo</option>
                      <option value="ARL_NIVEL_II">ARL Nivel II - Bajo</option>
                      <option value="ARL_NIVEL_III">ARL Nivel III - Medio</option>
                      <option value="ARL_NIVEL_IV">ARL Nivel IV - Alto</option>
                      <option value="ARL_NIVEL_V">ARL Nivel V - Máximo</option>
                    </optgroup>
                    <optgroup label="Parafiscales">
                      <option value="CAJA_COMPENSACION">Caja de Compensación</option>
                      <option value="SENA">SENA</option>
                      <option value="ICBF">ICBF</option>
                    </optgroup>
                    <optgroup label="Prestaciones Sociales">
                      <option value="CESANTIAS">Cesantías</option>
                      <option value="INTERESES_CESANTIAS">Intereses Cesantías</option>
                      <option value="PRIMA_SERVICIOS">Prima de Servicios</option>
                      <option value="VACACIONES">Vacaciones</option>
                    </optgroup>
                    <optgroup label="Fondo de Solidaridad Pensional">
                      <option value="TOPE_FSP">Tope FSP (4 SMMLV)</option>
                      <option value="FSP">Fondo de Solidaridad Pensional</option>
                      <option value="TOPE_SUBSISTENCIA">Tope Subsistencia (16 SMMLV)</option>
                      <option value="SUBSISTENCIA">Aporte Subsistencia</option>
                    </optgroup>
                    <optgroup label="Valores de Referencia">
                      <option value="SMMLV">Salario Mínimo (SMMLV)</option>
                      <option value="AUXILIO_TRANSPORTE">Auxilio de Transporte</option>
                      <option value="TOPE_AUXILIO_TRANSPORTE">Tope Auxilio Transporte</option>
                      <option value="IBC_SERVICIOS">IBC Servicios (40%)</option>
                      <option value="UVT">UVT</option>
                    </optgroup>
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
                    step="0.01"
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
