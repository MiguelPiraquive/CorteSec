import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import contratosService from '../../services/contratosService'
import empleadosService from '../../services/empleadosService'
import tiposContratoService from '../../services/tiposContratoService'
import cargosService from '../../services/cargosService'
import {
  FileSignatureIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  DollarSignIcon,
  CalendarIcon,
  UserIcon,
  BriefcaseIcon,
  AlertTriangleIcon,
} from 'lucide-react'

const NIVELES_ARL = [
  { value: 'I', label: 'Nivel I - Riesgo Mínimo' },
  { value: 'II', label: 'Nivel II - Riesgo Bajo' },
  { value: 'III', label: 'Nivel III - Riesgo Medio' },
  { value: 'IV', label: 'Nivel IV - Riesgo Alto' },
  { value: 'V', label: 'Nivel V - Riesgo Máximo' },
]

const ContratosPage = () => {
  const audit = useAudit('Contratos')
  const [contratos, setContratos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [tiposContrato, setTiposContrato] = useState([])
  const [cargos, setCargos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEmpleado, setFilterEmpleado] = useState('')
  const [filterTipoContrato, setFilterTipoContrato] = useState('')
  const [filterActivo, setFilterActivo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingContrato, setEditingContrato] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(12)
  
  const [formData, setFormData] = useState({
    empleado: '',
    tipo_contrato: '',
    salario: '',
    nivel_arl: 'I',
    fecha_inicio: '',
    fecha_fin: '',
    cargo: '',
    observaciones: '',
    activo: true,
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  const [requiereFechaFin, setRequiereFechaFin] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEmpleado, filterTipoContrato, filterActivo])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [contratosData, empleadosData, tiposData, cargosData] = await Promise.all([
        contratosService.getAllContratos(),
        empleadosService.getAllEmpleados(),
        tiposContratoService.getActivos(),
        cargosService.getAll(),
      ])
      console.log('Contratos recibidos:', contratosData)
      console.log('Cargos recibidos:', cargosData)
      setContratos(contratosData)
      setEmpleados(empleadosData.filter(e => e.estado === 'activo'))
      setTiposContrato(tiposData)
      setCargos(cargosData.filter(c => c.activo === true))
      console.log('Cargos filtrados (activos):', cargosData.filter(c => c.activo === true))
    } catch (error) {
      showNotification('error', 'Error al cargar datos')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const handleTipoContratoChange = (tipoId) => {
    const tipo = tiposContrato.find(t => t.id === tipoId)
    setRequiereFechaFin(tipo?.requiere_fecha_fin || false)
    setFormData({ ...formData, tipo_contrato: tipoId, fecha_fin: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validaciones
    if (!formData.empleado) {
      showNotification('error', 'Debe seleccionar un empleado')
      return
    }
    
    if (!formData.tipo_contrato) {
      showNotification('error', 'Debe seleccionar un tipo de contrato')
      return
    }
    
    if (!formData.salario || parseFloat(formData.salario) <= 0) {
      showNotification('error', 'El salario debe ser mayor a cero')
      return
    }
    
    if (requiereFechaFin && !formData.fecha_fin) {
      showNotification('error', 'Este tipo de contrato requiere fecha de finalización')
      return
    }
    
    if (formData.fecha_fin && formData.fecha_inicio && formData.fecha_fin <= formData.fecha_inicio) {
      showNotification('error', 'La fecha de finalización debe ser posterior a la fecha de inicio')
      return
    }

    try {
      const dataToSend = {
        empleado: formData.empleado,
        tipo_contrato: formData.tipo_contrato,
        salario: parseFloat(formData.salario),
        nivel_arl: formData.nivel_arl,
        fecha_inicio: formData.fecha_inicio || new Date().toISOString().split('T')[0],
        fecha_fin: formData.fecha_fin || null,
        cargo: formData.cargo || null,  // Ahora es ID del cargo, no texto
        observaciones: formData.observaciones?.trim() || '',
        activo: formData.activo,
      }

      console.log('Enviando contrato:', dataToSend)

      if (editingContrato) {
        await contratosService.update(editingContrato.id, dataToSend)
        audit.button('modificar_contrato', { contrato_id: editingContrato.id })
        showNotification('success', 'Contrato actualizado exitosamente')
      } else {
        await contratosService.create(dataToSend)
        audit.button('crear_contrato', { empleado_id: dataToSend.empleado })
        showNotification('success', 'Contrato creado exitosamente')
      }
      
      setShowModal(false)
      resetForm()
      await loadInitialData()
    } catch (error) {
      console.error('Error guardando:', error)
      console.error('Detalle:', error.response?.data)
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.fecha_fin?.[0] ||
                       error.response?.data?.salario?.[0] ||
                       Object.values(error.response?.data || {})[0] ||
                       'Error al guardar contrato'
      showNotification('error', errorMsg)
    }
  }

  const handleEdit = async (contrato) => {
    audit.modalOpen('editar_contrato', { contrato_id: contrato.id })
    setEditingContrato(contrato)
    
    console.log('Editando contrato:', contrato)
    
    // Extraer IDs
    const empleadoId = typeof contrato.empleado === 'object' ? contrato.empleado?.id : contrato.empleado
    const tipoContratoId = typeof contrato.tipo_contrato === 'object' ? contrato.tipo_contrato?.id : contrato.tipo_contrato
    const cargoId = typeof contrato.cargo === 'object' ? contrato.cargo?.id : contrato.cargo
    
    // Verificar si requiere fecha fin
    const tipo = tiposContrato.find(t => t.id === tipoContratoId)
    setRequiereFechaFin(tipo?.requiere_fecha_fin || false)
    
    setFormData({
      empleado: empleadoId || '',
      tipo_contrato: tipoContratoId || '',
      salario: contrato.salario || '',
      nivel_arl: contrato.nivel_arl || 'I',
      fecha_inicio: contrato.fecha_inicio || '',
      fecha_fin: contrato.fecha_fin || '',
      cargo: cargoId || '',
      observaciones: contrato.observaciones || '',
      activo: contrato.activo ?? true,
    })
    
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este contrato?')) return
    try {
      await contratosService.delete(id)
      showNotification('success', 'Contrato eliminado exitosamente')
      loadInitialData()
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al eliminar contrato'
      showNotification('error', errorMsg)
    }
  }

  const resetForm = () => {
    setFormData({
      empleado: '',
      tipo_contrato: '',
      salario: '',
      nivel_arl: 'I',
      fecha_inicio: '',
      fecha_fin: '',
      cargo: '',
      observaciones: '',
      activo: true,
    })
    setEditingContrato(null)
    setRequiereFechaFin(false)
  }

  const filteredContratos = contratos.filter(contrato => {
    const empleadoNombre = contrato.empleado_nombre?.toLowerCase() || ''
    const tipoNombre = contrato.tipo_contrato_nombre?.toLowerCase() || ''
    const cargo = contrato.cargo?.toLowerCase() || ''
    
    const matchSearch = empleadoNombre.includes(searchTerm.toLowerCase()) ||
                       tipoNombre.includes(searchTerm.toLowerCase()) ||
                       cargo.includes(searchTerm.toLowerCase())
    
    const matchEmpleado = !filterEmpleado || contrato.empleado === filterEmpleado || 
                          (typeof contrato.empleado === 'object' && contrato.empleado?.id === filterEmpleado)
    
    const matchTipo = !filterTipoContrato || contrato.tipo_contrato === filterTipoContrato ||
                      (typeof contrato.tipo_contrato === 'object' && contrato.tipo_contrato?.id === filterTipoContrato)
    
    const matchActivo = filterActivo === '' || (filterActivo === 'true' ? contrato.activo : !contrato.activo)
    
    return matchSearch && matchEmpleado && matchTipo && matchActivo
  })

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedContratos = filteredContratos.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredContratos.length / pageSize)

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
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
      <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500 via-fuchsia-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <FileSignatureIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Contratos</h1>
              <p className="text-purple-100 mt-1">Gestión de contratos laborales</p>
            </div>
          </div>
          <button 
            onClick={() => { setShowModal(true); resetForm() }} 
            className="flex items-center space-x-2 px-5 py-3 bg-white text-purple-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nuevo Contrato</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Buscar por empleado, tipo o cargo..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-purple-500 focus:bg-white transition-all" 
            />
          </div>
          <select 
            value={filterEmpleado} 
            onChange={(e) => setFilterEmpleado(e.target.value)} 
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
          >
            <option value="">Todos los empleados</option>
            {empleados.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre_completo || `${emp.primer_nombre} ${emp.primer_apellido}`}</option>
            ))}
          </select>
          <select 
            value={filterTipoContrato} 
            onChange={(e) => setFilterTipoContrato(e.target.value)} 
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
          >
            <option value="">Todos los tipos</option>
            {tiposContrato.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
          </select>
          <select 
            value={filterActivo} 
            onChange={(e) => setFilterActivo(e.target.value)} 
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
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
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Cargando contratos...</span>
            </div>
          </div>
        ) : paginatedContratos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No se encontraron contratos
          </div>
        ) : (
          paginatedContratos.map(contrato => (
            <div 
              key={contrato.id} 
              className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-200/50 overflow-hidden"
            >
              <div className={`h-2 ${contrato.activo ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gray-400'}`}></div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <UserIcon className="w-4 h-4 text-purple-500" />
                      <h3 className="text-lg font-bold text-gray-800">{contrato.empleado_nombre}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{contrato.tipo_contrato_nombre}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${contrato.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {contrato.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {contrato.cargo_nombre && (
                    <div className="flex items-center space-x-2 text-sm">
                      <BriefcaseIcon className="w-4 h-4 text-purple-500" />
                      <span className="text-gray-700">{contrato.cargo_nombre}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <DollarSignIcon className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700 font-semibold">{formatCurrency(contrato.salario)}</span>
                  </div>
                  
                  {contrato.ibc && (
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span>IBC: {formatCurrency(contrato.ibc)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <AlertTriangleIcon className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-700">ARL Nivel {contrato.nivel_arl}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatDate(contrato.fecha_inicio)} {contrato.fecha_fin ? `- ${formatDate(contrato.fecha_fin)}` : '(Indefinido)'}</span>
                  </div>
                </div>

                {contrato.observaciones && (
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{contrato.observaciones}</p>
                )}

                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEdit(contrato)} 
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-purple-500 text-white hover:bg-purple-600 rounded-lg transition-colors text-sm font-semibold"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(contrato.id)} 
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
                className={`px-3 py-1 rounded-lg transition-all ${currentPage === page ? 'bg-purple-500 text-white' : 'bg-white hover:bg-gray-100'}`}
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
            <div className="bg-gradient-to-r from-purple-500 to-fuchsia-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingContrato ? 'Editar Contrato' : 'Nuevo Contrato'}</h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Empleado */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Empleado <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.empleado} 
                    onChange={(e) => setFormData({ ...formData, empleado: e.target.value })} 
                    required 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="">Seleccione un empleado</option>
                    {empleados.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre_completo || `${emp.primer_nombre} ${emp.primer_apellido}`} - {emp.numero_documento}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Contrato */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Contrato <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.tipo_contrato} 
                    onChange={(e) => handleTipoContratoChange(e.target.value)} 
                    required 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="">Seleccione un tipo</option>
                    {tiposContrato.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Salario */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Salario <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    value={formData.salario} 
                    onChange={(e) => setFormData({ ...formData, salario: e.target.value })} 
                    required 
                    min="0"
                    step="1000"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all" 
                    placeholder="Ej: 1300000"
                  />
                </div>

                {/* Nivel ARL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nivel de Riesgo ARL <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.nivel_arl} 
                    onChange={(e) => setFormData({ ...formData, nivel_arl: e.target.value })} 
                    required 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                  >
                    {NIVELES_ARL.map(nivel => (
                      <option key={nivel.value} value={nivel.value}>{nivel.label}</option>
                    ))}
                  </select>
                </div>

                {/* Cargo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cargo</label>
                  <select 
                    value={formData.cargo} 
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="">Seleccione un cargo (opcional)</option>
                    {cargos.map(cargo => (
                      <option key={cargo.id} value={cargo.id}>
                        {cargo.nombre} - {cargo.departamento_nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha Inicio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha de Inicio <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    value={formData.fecha_inicio} 
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })} 
                    required 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all" 
                  />
                </div>

                {/* Fecha Fin */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha de Finalización {requiereFechaFin && <span className="text-red-500">*</span>}
                  </label>
                  <input 
                    type="date" 
                    value={formData.fecha_fin} 
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })} 
                    required={requiereFechaFin}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all" 
                  />
                  {requiereFechaFin && (
                    <p className="text-xs text-orange-600 mt-1">Este tipo de contrato requiere fecha de finalización</p>
                  )}
                </div>

                {/* Observaciones */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                  <textarea 
                    value={formData.observaciones} 
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} 
                    rows={3} 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all resize-none" 
                    placeholder="Observaciones adicionales del contrato..."
                  />
                </div>

                {/* Activo */}
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.activo} 
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} 
                      className="w-5 h-5 text-purple-500 rounded focus:ring-2 focus:ring-purple-500" 
                    />
                    <span className="text-gray-700 font-semibold">Contrato Activo</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">Al activar este contrato, se desactivarán automáticamente otros contratos del mismo empleado</p>
                </div>
              </div>

              <div className="flex space-x-4 mt-8">
                <button 
                  type="submit" 
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-purple-500 text-white hover:bg-purple-600 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
                >
                  <CheckIcon className="w-5 h-5" />
                  <span>{editingContrato ? 'Actualizar' : 'Guardar'}</span>
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

export default ContratosPage
