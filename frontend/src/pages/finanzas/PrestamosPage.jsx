import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle, XCircle, Clock, FileText, TrendingUp, User, Banknote, AlertTriangle, Calendar, Percent, Hash } from 'lucide-react'
import useAudit from '../../hooks/useAudit'
import Can from '../../components/permissions/Can'
import { usePermissions } from '../../context/PermissionsContext'
import { useConfiguracion } from '../../context/ConfiguracionContext'
import { useActiveProject } from '../../context/ActiveProjectContext'
import useServerPagination from '../../hooks/useServerPagination'
import Pagination from '../../components/Pagination'
import prestamosService from '../../services/prestamosService'
import tiposPrestamoService from '../../services/tiposPrestamoService'
import empleadosService from '../../services/empleadosService'
import useProductTour from '../../hooks/useProductTour'
import { TOUR_CONFIGS } from '../../data/tourConfigs'

const ESTADOS = [
  { value: 'borrador', label: 'Borrador', color: 'bg-gray-100 text-gray-800' },
  { value: 'solicitado', label: 'Solicitado', color: 'bg-blue-100 text-blue-800' },
  { value: 'en_revision', label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'pendiente', label: 'Pendiente', color: 'bg-orange-100 text-orange-800' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-green-100 text-green-800' },
  { value: 'rechazado', label: 'Rechazado', color: 'bg-red-100 text-red-800' },
  { value: 'desembolsado', label: 'Desembolsado', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'activo', label: 'Activo', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'completado', label: 'Completado', color: 'bg-green-100 text-green-800' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
  { value: 'en_mora', label: 'En Mora', color: 'bg-red-100 text-red-800' },
  { value: 'reestructurado', label: 'Reestructurado', color: 'bg-purple-100 text-purple-800' },
]

const ESTADOS_CREACION = ['borrador', 'solicitado']

const TIPOS_GARANTIA = [
  { value: 'ninguna', label: 'Sin Garantía' },
  { value: 'personal', label: 'Garantía Personal' },
  { value: 'hipotecaria', label: 'Garantía Hipotecaria' },
  { value: 'vehicular', label: 'Garantía Vehicular' },
  { value: 'prendaria', label: 'Garantía Prendaria' },
  { value: 'deposito', label: 'Depósito en Garantía' },
  { value: 'codeudor', label: 'Codeudor' },
  { value: 'otra', label: 'Otra' },
]

const ESTADO_BAR_COLORS = {
  borrador: 'bg-gray-400',
  solicitado: 'bg-gradient-to-r from-blue-400 to-blue-500',
  en_revision: 'bg-gradient-to-r from-yellow-400 to-amber-500',
  pendiente: 'bg-gradient-to-r from-orange-400 to-orange-500',
  aprobado: 'bg-gradient-to-r from-green-400 to-emerald-500',
  rechazado: 'bg-gradient-to-r from-red-400 to-red-500',
  desembolsado: 'bg-gradient-to-r from-emerald-400 to-teal-500',
  activo: 'bg-gradient-to-r from-cyan-400 to-cyan-500',
  completado: 'bg-gradient-to-r from-green-500 to-emerald-600',
  cancelado: 'bg-gray-400',
  en_mora: 'bg-gradient-to-r from-red-500 to-rose-600',
  reestructurado: 'bg-gradient-to-r from-purple-400 to-purple-500',
}

export default function PrestamosPage() {
  const audit = useAudit('Prestamos')
  const { hasPermission, initialized } = usePermissions()
  const { formatCurrency: formatMoney, formatDate } = useConfiguracion()
  const { activeProject, getProjectFilter } = useActiveProject()

  // --- Notification ---
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  // --- Server-side paginated data ---
  const pf = getProjectFilter()
  const fetchPrestamos = useCallback((params) => prestamosService.getPrestamos({ ...params, ...pf }), [activeProject])
  const {
    data: prestamos,
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
  } = useServerPagination(fetchPrestamos, { pageSize: 12 })

  // --- Dropdown data ---
  const [tiposPrestamo, setTiposPrestamo] = useState([])
  const [empleados, setEmpleados] = useState([])

  // --- Dashboard stats ---
  const [dashboardStats, setDashboardStats] = useState(null)

  // --- Filter state ---
  const [filterEstado, setFilterEstado] = useState('')
  const [filterEmpleado, setFilterEmpleado] = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  // --- Modal / form state ---
  const [showModal, setShowModal] = useState(false)
  const [editingPrestamo, setEditingPrestamo] = useState(null)

  // --- Aprobar modal ---
  const [showAprobarModal, setShowAprobarModal] = useState(false)
  const [aprobarTarget, setAprobarTarget] = useState(null)
  const [aprobarData, setAprobarData] = useState({ monto_aprobado: '', observaciones: '' })

  // --- Rechazar modal ---
  const [showRechazarModal, setShowRechazarModal] = useState(false)
  const [rechazarTarget, setRechazarTarget] = useState(null)
  const [rechazarMotivo, setRechazarMotivo] = useState('')

  const [formData, setFormData] = useState({
    empleado: '',
    tipo_prestamo: '',
    monto_solicitado: '',
    tasa_interes: '',
    plazo_meses: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    tipo_garantia: 'ninguna',
    garantia_descripcion: '',
    observaciones: '',
    estado: 'solicitado',
  })

  const [errors, setErrors] = useState({})

  // --- Load data ---
  const refreshDashboard = useCallback(async () => {
    try {
      const data = await prestamosService.getDashboard(getProjectFilter())
      setDashboardStats(data.resumen)
    } catch {
      // Dashboard stats are optional
    }
  }, [activeProject])

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const pf = getProjectFilter()
        const [tiposData, empleadosData] = await Promise.all([
          tiposPrestamoService.getActiveTiposPrestamo(),
          empleadosService.getAllEmpleados(pf),
        ])
        setTiposPrestamo(Array.isArray(tiposData) ? tiposData : [])
        setEmpleados(Array.isArray(empleadosData) ? empleadosData.filter(e => e.estado === 'activo') : [])
      } catch {
        showNotification('error', 'Error al cargar datos iniciales')
      }
    }
    loadDropdownData()
    refreshDashboard()
  }, [refreshDashboard])

  // --- Filters ---
  const buildFilters = (estadoVal, empleadoVal, tipoVal) => {
    const filters = {}
    if (estadoVal) filters.estado = estadoVal
    if (empleadoVal) filters.empleado = empleadoVal
    if (tipoVal) filters.tipo_prestamo = tipoVal
    setFilters(filters)
  }

  const handleFilterEstado = (value) => {
    setFilterEstado(value)
    buildFilters(value, filterEmpleado, filterTipo)
  }

  const handleFilterEmpleado = (value) => {
    setFilterEmpleado(value)
    buildFilters(filterEstado, value, filterTipo)
  }

  const handleFilterTipo = (value) => {
    setFilterTipo(value)
    buildFilters(filterEstado, filterEmpleado, value)
  }

  // --- Helpers ---
  const getEstadoColor = (estado) => {
    const obj = ESTADOS.find(e => e.value === estado)
    return obj ? obj.color : 'bg-gray-100 text-gray-800'
  }

  const getEstadoLabel = (estado) => {
    const obj = ESTADOS.find(e => e.value === estado)
    return obj ? obj.label : estado
  }

  const getEmpleadoNombre = (prestamo) => {
    if (prestamo.empleado_detail) {
      return prestamo.empleado_detail.nombre_completo ||
        `${prestamo.empleado_detail.nombres || ''} ${prestamo.empleado_detail.apellidos || ''}`.trim() || 'Sin nombre'
    }
    return prestamo.empleado_nombre || 'N/A'
  }

  const getTipoNombre = (prestamo) => {
    if (prestamo.tipo_prestamo_detail) return prestamo.tipo_prestamo_detail.nombre || 'Sin nombre'
    return prestamo.tipo_prestamo_nombre || 'N/A'
  }

  const calcularCuotaEstimada = () => {
    const monto = parseFloat(formData.monto_solicitado)
    const tasa = parseFloat(formData.tasa_interes)
    const plazo = parseInt(formData.plazo_meses)
    if (!monto || !plazo || monto <= 0 || plazo <= 0) return null
    if (!tasa || tasa === 0) return monto / plazo
    const tasaMensual = tasa / 100 / 12
    const factor = Math.pow(1 + tasaMensual, plazo)
    return (monto * tasaMensual * factor) / (factor - 1)
  }

  // --- Form handlers ---
  const resetForm = () => {
    setFormData({
      empleado: '',
      tipo_prestamo: '',
      monto_solicitado: '',
      tasa_interes: '',
      plazo_meses: '',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      tipo_garantia: 'ninguna',
      garantia_descripcion: '',
      observaciones: '',
      estado: 'solicitado',
    })
    setErrors({})
    setEditingPrestamo(null)
  }

  const handleTipoPrestamoChange = (tipoId) => {
    const tipo = tiposPrestamo.find(t => t.id === tipoId)
    if (tipo) {
      setFormData(prev => ({
        ...prev,
        tipo_prestamo: tipoId,
        tasa_interes: tipo.tasa_interes_defecto || '',
        plazo_meses: tipo.plazo_minimo_meses || '',
      }))
    } else {
      setFormData(prev => ({ ...prev, tipo_prestamo: tipoId }))
    }
  }

  const handleEdit = (prestamo) => {
    audit.modalOpen('editar_prestamo', { prestamo_id: prestamo.id, numero: prestamo.numero_prestamo })
    setEditingPrestamo(prestamo)
    setFormData({
      empleado: prestamo.empleado || '',
      tipo_prestamo: prestamo.tipo_prestamo || '',
      monto_solicitado: prestamo.monto_solicitado || '',
      tasa_interes: prestamo.tasa_interes || '',
      plazo_meses: prestamo.plazo_meses || '',
      fecha_solicitud: prestamo.fecha_solicitud || new Date().toISOString().split('T')[0],
      tipo_garantia: prestamo.tipo_garantia || 'ninguna',
      garantia_descripcion: prestamo.garantia_descripcion || '',
      observaciones: prestamo.observaciones || '',
      estado: prestamo.estado || 'solicitado',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este préstamo?')) return
    try {
      const prestamo = prestamos.find(p => p.id === id)
      await prestamosService.deletePrestamo(id)
      audit.button('eliminar_prestamo', { prestamo_id: id, numero: prestamo?.numero_prestamo })
      showNotification('success', 'Préstamo eliminado exitosamente')
      refresh()
      refreshDashboard()
    } catch (error) {
      showNotification('error', 'Error al eliminar: ' + (error.response?.data?.detail || error.message))
    }
  }

  // --- Aprobar ---
  const handleAprobar = (prestamo) => {
    if (!['solicitado', 'en_revision', 'pendiente'].includes(prestamo.estado)) {
      showNotification('error', `No se puede aprobar. Estado actual: ${getEstadoLabel(prestamo.estado)}`)
      return
    }
    setAprobarTarget(prestamo)
    setAprobarData({ monto_aprobado: prestamo.monto_solicitado, observaciones: '' })
    setShowAprobarModal(true)
  }

  const confirmarAprobacion = async () => {
    const monto = parseFloat(aprobarData.monto_aprobado)
    if (isNaN(monto) || monto <= 0) {
      showNotification('error', 'Monto aprobado inválido')
      return
    }
    try {
      await prestamosService.aprobarPrestamo(aprobarTarget.id, {
        monto_aprobado: monto,
        observaciones: aprobarData.observaciones,
      })
      audit.button('aprobar_prestamo', { prestamo_id: aprobarTarget.id, numero: aprobarTarget.numero_prestamo, monto_aprobado: monto })
      showNotification('success', 'Préstamo aprobado exitosamente')
      setShowAprobarModal(false)
      setAprobarTarget(null)
      refresh()
      refreshDashboard()
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.detail || error.message
      showNotification('error', 'Error al aprobar: ' + msg)
    }
  }

  // --- Rechazar ---
  const handleRechazar = (prestamo) => {
    if (!['solicitado', 'en_revision', 'pendiente'].includes(prestamo.estado)) {
      showNotification('error', `No se puede rechazar. Estado actual: ${getEstadoLabel(prestamo.estado)}`)
      return
    }
    setRechazarTarget(prestamo)
    setRechazarMotivo('')
    setShowRechazarModal(true)
  }

  const confirmarRechazo = async () => {
    if (!rechazarMotivo || rechazarMotivo.trim().length < 10) {
      showNotification('error', 'El motivo debe tener al menos 10 caracteres')
      return
    }
    try {
      await prestamosService.rechazarPrestamo(rechazarTarget.id, { motivo: rechazarMotivo })
      audit.button('rechazar_prestamo', { prestamo_id: rechazarTarget.id, numero: rechazarTarget.numero_prestamo, motivo: rechazarMotivo })
      showNotification('success', 'Préstamo rechazado')
      setShowRechazarModal(false)
      setRechazarTarget(null)
      refresh()
      refreshDashboard()
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.detail || error.message
      showNotification('error', 'Error al rechazar: ' + msg)
    }
  }

  // --- Desembolsar ---
  const handleDesembolsar = async (prestamo) => {
    if (prestamo.estado !== 'aprobado') {
      showNotification('error', `No se puede desembolsar. Estado actual: ${getEstadoLabel(prestamo.estado)}`)
      return
    }
    if (!window.confirm(
      `¿Desembolsar préstamo ${prestamo.numero_prestamo}?\n\nMonto: ${formatMoney(prestamo.monto_aprobado || prestamo.monto_solicitado)}\n\nSe registrará la fecha de hoy y el primer pago será en 1 mes.`
    )) return
    try {
      await prestamosService.desembolsarPrestamo(prestamo.id, {})
      audit.button('desembolsar_prestamo', { prestamo_id: prestamo.id, numero: prestamo.numero_prestamo })
      showNotification('success', 'Préstamo desembolsado exitosamente')
      refresh()
      refreshDashboard()
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.detail || error.message
      showNotification('error', 'Error al desembolsar: ' + msg)
    }
  }

  // --- Submit ---
  const validateForm = () => {
    const newErrors = {}
    if (!formData.empleado) newErrors.empleado = 'El empleado es requerido'
    if (!formData.tipo_prestamo) newErrors.tipo_prestamo = 'El tipo de préstamo es requerido'
    if (!formData.monto_solicitado || parseFloat(formData.monto_solicitado) <= 0) {
      newErrors.monto_solicitado = 'El monto debe ser mayor a 0'
    }
    const tipo = tiposPrestamo.find(t => t.id === formData.tipo_prestamo)
    if (tipo && formData.monto_solicitado) {
      const monto = parseFloat(formData.monto_solicitado)
      if (monto < parseFloat(tipo.monto_minimo)) newErrors.monto_solicitado = `Monto mínimo: ${formatMoney(tipo.monto_minimo)}`
      if (monto > parseFloat(tipo.monto_maximo)) newErrors.monto_solicitado = `Monto máximo: ${formatMoney(tipo.monto_maximo)}`
    }
    if (!formData.tasa_interes || parseFloat(formData.tasa_interes) < 0) newErrors.tasa_interes = 'La tasa de interés es requerida'
    if (!formData.plazo_meses || parseInt(formData.plazo_meses) <= 0) newErrors.plazo_meses = 'El plazo debe ser mayor a 0'
    if (tipo && formData.plazo_meses) {
      const plazo = parseInt(formData.plazo_meses)
      if (plazo < tipo.plazo_minimo_meses) newErrors.plazo_meses = `Plazo mínimo: ${tipo.plazo_minimo_meses} meses`
      if (plazo > tipo.plazo_maximo_meses) newErrors.plazo_meses = `Plazo máximo: ${tipo.plazo_maximo_meses} meses`
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const dataToSend = {
        empleado: formData.empleado,
        tipo_prestamo: formData.tipo_prestamo,
        monto_solicitado: parseFloat(formData.monto_solicitado),
        tasa_interes: parseFloat(formData.tasa_interes),
        plazo_meses: parseInt(formData.plazo_meses),
        fecha_solicitud: formData.fecha_solicitud,
        tipo_garantia: formData.tipo_garantia,
        garantia_descripcion: formData.garantia_descripcion,
        observaciones: formData.observaciones,
        estado: formData.estado,
      }
      if (editingPrestamo) {
        await prestamosService.updatePrestamo(editingPrestamo.id, dataToSend)
        audit.button('modificar_prestamo', { prestamo_id: editingPrestamo.id, numero: editingPrestamo.numero_prestamo })
        showNotification('success', 'Préstamo actualizado exitosamente')
      } else {
        await prestamosService.createPrestamo(dataToSend)
        audit.button('crear_prestamo', { monto: dataToSend.monto_solicitado, empleado_id: dataToSend.empleado })
        showNotification('success', 'Préstamo creado exitosamente')
      }
      setShowModal(false)
      resetForm()
      refresh()
      refreshDashboard()
    } catch (error) {
      const data = error.response?.data
      let errorMsg = 'Error al guardar préstamo'
      if (data) {
        if (typeof data === 'string') {
          errorMsg = data
        } else if (data.message || data.detail) {
          errorMsg = data.message || data.detail
        } else {
          const serverErrors = {}
          Object.keys(data).forEach(key => {
            serverErrors[key] = Array.isArray(data[key]) ? data[key][0] : data[key]
          })
          setErrors(serverErrors)
          const firstValue = Object.values(data)[0]
          errorMsg = Array.isArray(firstValue) ? firstValue[0] : (firstValue || errorMsg)
        }
      }
      showNotification('error', errorMsg)
    }
  }

  useProductTour('prestamos', TOUR_CONFIGS.prestamos.steps, {
    ready: !loading && initialized,
  })

  // --- Guards ---
  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('prestamos.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${notification.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div id="tour-prestamos-header" className="backdrop-blur-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Banknote className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Préstamos</h1>
              <p className="text-emerald-100 mt-1">Gestión de préstamos a empleados</p>
            </div>
          </div>
          <Can permission="prestamos.add">
            <button
              id="tour-prestamos-btn-nuevo"
              onClick={() => { audit.modalOpen('crear_prestamo'); resetForm(); setShowModal(true) }}
              className="flex items-center space-x-2 px-5 py-3 bg-white text-emerald-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Préstamo</span>
            </button>
          </Can>
        </div>

        {/* Stats */}
        <div id="tour-prestamos-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-emerald-100 text-sm">Total Préstamos</div>
                <div className="text-2xl font-bold">{dashboardStats?.total_prestamos ?? totalCount}</div>
              </div>
              <FileText className="w-8 h-8 text-emerald-200" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-emerald-100 text-sm">Activos</div>
                <div className="text-2xl font-bold">{dashboardStats?.prestamos_activos ?? '—'}</div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-300" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-emerald-100 text-sm">Pendientes</div>
                <div className="text-2xl font-bold">{dashboardStats?.prestamos_pendientes ?? '—'}</div>
              </div>
              <Clock className="w-8 h-8 text-yellow-300" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-emerald-100 text-sm">En Mora</div>
                <div className="text-2xl font-bold">{dashboardStats?.prestamos_en_mora ?? '—'}</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div id="tour-prestamos-filters" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={filterEmpleado}
            onChange={(e) => handleFilterEmpleado(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          >
            <option value="">Todos los empleados</option>
            {empleados.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre_completo || `${emp.primer_nombre} ${emp.primer_apellido}`}</option>
            ))}
          </select>
          <select
            value={filterTipo}
            onChange={(e) => handleFilterTipo(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          >
            <option value="">Todos los tipos</option>
            {tiposPrestamo.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => handleFilterEstado(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(estado => (
              <option key={estado.value} value={estado.value}>{estado.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div id="tour-prestamos-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Cargando préstamos...</span>
            </div>
          </div>
        ) : prestamos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No se encontraron préstamos</p>
            <p className="text-sm mt-1">Crea tu primer préstamo para comenzar</p>
          </div>
        ) : (
          prestamos.map(prestamo => (
            <div
              key={prestamo.id}
              className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-200/50 overflow-hidden"
            >
              <div className={`h-2 ${ESTADO_BAR_COLORS[prestamo.estado] || 'bg-gray-400'}`}></div>

              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <h3 className="text-lg font-bold text-gray-800 truncate">{getEmpleadoNombre(prestamo)}</h3>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{getTipoNombre(prestamo)}</p>
                  </div>
                  <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getEstadoColor(prestamo.estado)}`}>
                    {getEstadoLabel(prestamo.estado)}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Hash className="w-3 h-3" />
                    <span>{prestamo.numero_prestamo}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <Banknote className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700 font-semibold">{formatMoney(prestamo.monto_solicitado)}</span>
                  </div>

                  {prestamo.monto_aprobado && prestamo.monto_aprobado !== prestamo.monto_solicitado && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>Aprobado: {formatMoney(prestamo.monto_aprobado)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <div className="flex items-center space-x-2">
                      <Percent className="w-4 h-4 text-emerald-500" />
                      <span>{prestamo.tasa_interes}%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <span>{prestamo.plazo_meses} meses</span>
                    </div>
                  </div>

                  {prestamo.cuota_mensual && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>Cuota: {formatMoney(prestamo.cuota_mensual)}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(prestamo.fecha_solicitud)}</span>
                  </div>

                  {prestamo.fecha_primer_pago && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>1er Pago: {formatDate(prestamo.fecha_primer_pago)}</span>
                    </div>
                  )}
                </div>

                {prestamo.observaciones && (
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{prestamo.observaciones}</p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-1">
                  {['solicitado', 'en_revision', 'pendiente'].includes(prestamo.estado) && (
                    <>
                      <Can permission="prestamos.change">
                        <button onClick={() => handleAprobar(prestamo)} className="flex items-center space-x-1 px-2 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors text-xs font-semibold" title="Aprobar">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Aprobar</span>
                        </button>
                        <button onClick={() => handleRechazar(prestamo)} className="flex items-center space-x-1 px-2 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors text-xs font-semibold" title="Rechazar">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rechazar</span>
                        </button>
                      </Can>
                    </>
                  )}
                  {prestamo.estado === 'aprobado' && (
                    <Can permission="prestamos.change">
                      <button onClick={() => handleDesembolsar(prestamo)} className="flex items-center space-x-1 px-2 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors text-xs font-semibold" title="Desembolsar">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Desembolsar</span>
                      </button>
                    </Can>
                  )}
                  <Can permission="prestamos.change">
                    <button onClick={() => handleEdit(prestamo)} className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors text-sm font-semibold">
                      <Edit2 className="w-4 h-4" />
                      <span>Editar</span>
                    </button>
                  </Can>
                  <Can permission="prestamos.delete">
                    {!['completado', 'cancelado'].includes(prestamo.estado) && (
                      <button onClick={() => handleDelete(prestamo.id)} className="flex items-center justify-center px-3 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
        itemLabel="préstamos"
      />

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingPrestamo ? 'Editar Préstamo' : 'Nuevo Préstamo'}</h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
              {(errors.non_field_errors || errors.detail) && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
                  <p className="font-semibold mb-2">No se pudo guardar el préstamo</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {Array.isArray(errors.non_field_errors) && errors.non_field_errors.map((err, idx) => <li key={idx}>{err}</li>)}
                    {errors.detail && <li>{errors.detail}</li>}
                  </ul>
                </div>
              )}

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
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.empleado ? 'border-red-500' : 'border-gray-200'}`}
                  >
                    <option value="">Seleccione un empleado</option>
                    {empleados.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre_completo || `${emp.primer_nombre || ''} ${emp.primer_apellido || ''}`.trim()} - {emp.numero_documento || 'Sin documento'}
                      </option>
                    ))}
                  </select>
                  {errors.empleado && <p className="text-red-500 text-xs mt-1">{errors.empleado}</p>}
                </div>

                {/* Tipo Préstamo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Préstamo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo_prestamo}
                    onChange={(e) => handleTipoPrestamoChange(e.target.value)}
                    required
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.tipo_prestamo ? 'border-red-500' : 'border-gray-200'}`}
                  >
                    <option value="">Seleccione un tipo</option>
                    {tiposPrestamo.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nombre} ({tipo.tasa_interes_defecto}%)</option>
                    ))}
                  </select>
                  {errors.tipo_prestamo && <p className="text-red-500 text-xs mt-1">{errors.tipo_prestamo}</p>}
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Monto Solicitado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" step="0.01" value={formData.monto_solicitado}
                    onChange={(e) => setFormData({ ...formData, monto_solicitado: e.target.value })}
                    required
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.monto_solicitado ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="0.00"
                  />
                  {errors.monto_solicitado && <p className="text-red-500 text-xs mt-1">{errors.monto_solicitado}</p>}
                </div>

                {/* Tasa */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tasa de Interés (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" step="0.01" value={formData.tasa_interes}
                    onChange={(e) => setFormData({ ...formData, tasa_interes: e.target.value })}
                    required
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.tasa_interes ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="0.00"
                  />
                  {errors.tasa_interes && <p className="text-red-500 text-xs mt-1">{errors.tasa_interes}</p>}
                </div>

                {/* Plazo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Plazo (meses) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" value={formData.plazo_meses}
                    onChange={(e) => setFormData({ ...formData, plazo_meses: e.target.value })}
                    required
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.plazo_meses ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="12"
                  />
                  {errors.plazo_meses && <p className="text-red-500 text-xs mt-1">{errors.plazo_meses}</p>}
                </div>

                {/* Fecha Solicitud */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Solicitud</label>
                  <input
                    type="date" value={formData.fecha_solicitud}
                    onChange={(e) => setFormData({ ...formData, fecha_solicitud: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Cuota estimada */}
                {formData.monto_solicitado && formData.plazo_meses && (
                  <div className="md:col-span-2">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-emerald-700">Cuota mensual estimada:</span>
                        <span className="text-lg font-bold text-emerald-600">
                          {calcularCuotaEstimada() ? formatMoney(calcularCuotaEstimada()) : '—'}
                        </span>
                      </div>
                      {formData.plazo_meses && calcularCuotaEstimada() && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-emerald-600">Total estimado a pagar:</span>
                          <span className="text-sm font-semibold text-emerald-600">
                            {formatMoney(calcularCuotaEstimada() * parseInt(formData.plazo_meses))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tipo Garantía */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Garantía</label>
                  <select
                    value={formData.tipo_garantia}
                    onChange={(e) => setFormData({ ...formData, tipo_garantia: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    {TIPOS_GARANTIA.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estado Inicial</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    disabled={!!editingPrestamo}
                    className={`w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${editingPrestamo ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    {(editingPrestamo ? ESTADOS : ESTADOS.filter(e => ESTADOS_CREACION.includes(e.value))).map(estado => (
                      <option key={estado.value} value={estado.value}>{estado.label}</option>
                    ))}
                  </select>
                  {editingPrestamo && <p className="text-xs text-gray-500 mt-1">Para cambiar el estado use los botones de aprobar/desembolsar.</p>}
                </div>

                {/* Garantía descripción */}
                {formData.tipo_garantia !== 'ninguna' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción de la Garantía</label>
                    <textarea
                      value={formData.garantia_descripcion}
                      onChange={(e) => setFormData({ ...formData, garantia_descripcion: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all resize-none"
                      placeholder="Describa la garantía ofrecida..."
                    />
                  </div>
                )}

                {/* Observaciones */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all resize-none"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{editingPrestamo ? 'Actualizar' : 'Crear Préstamo'}</span>
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

      {/* Modal Aprobar */}
      {showAprobarModal && aprobarTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Aprobar Préstamo</h2>
                <button onClick={() => setShowAprobarModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500">Préstamo</div>
                <div className="font-bold text-gray-900">{aprobarTarget.numero_prestamo}</div>
                <div className="text-sm text-gray-500 mt-1">Empleado: {getEmpleadoNombre(aprobarTarget)}</div>
                <div className="text-sm text-gray-500">Monto solicitado: <span className="font-semibold text-emerald-600">{formatMoney(aprobarTarget.monto_solicitado)}</span></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Monto Aprobado <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" step="0.01" value={aprobarData.monto_aprobado}
                  onChange={(e) => setAprobarData({ ...aprobarData, monto_aprobado: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all"
                  placeholder="Puede ser diferente al solicitado"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                <textarea
                  value={aprobarData.observaciones}
                  onChange={(e) => setAprobarData({ ...aprobarData, observaciones: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all resize-none"
                  placeholder="Observaciones de aprobación (opcional)"
                />
              </div>
              <div className="flex space-x-4 pt-2">
                <button type="button" onClick={confirmarAprobacion}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-500 text-white hover:bg-green-600 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg">
                  <CheckCircle className="w-5 h-5" />
                  <span>Aprobar</span>
                </button>
                <button type="button" onClick={() => setShowAprobarModal(false)}
                  className="px-6 py-3 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-xl transition-all duration-300 font-semibold">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {showRechazarModal && rechazarTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Rechazar Préstamo</h2>
                <button onClick={() => setShowRechazarModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500">Préstamo</div>
                <div className="font-bold text-gray-900">{rechazarTarget.numero_prestamo}</div>
                <div className="text-sm text-gray-500 mt-1">Empleado: {getEmpleadoNombre(rechazarTarget)}</div>
                <div className="text-sm text-gray-500">Monto: <span className="font-semibold">{formatMoney(rechazarTarget.monto_solicitado)}</span></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo del Rechazo <span className="text-red-500">*</span> <span className="text-xs text-gray-400">(mín. 10 caracteres)</span>
                </label>
                <textarea
                  value={rechazarMotivo}
                  onChange={(e) => setRechazarMotivo(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all resize-none"
                  placeholder="Explique el motivo del rechazo..."
                />
                <p className="text-xs text-gray-400 mt-1">{rechazarMotivo.length}/10 caracteres mínimo</p>
              </div>
              <div className="flex space-x-4 pt-2">
                <button type="button" onClick={confirmarRechazo}
                  disabled={rechazarMotivo.trim().length < 10}
                  className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                    rechazarMotivo.trim().length < 10
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600 transform hover:scale-105'
                  }`}>
                  <XCircle className="w-5 h-5" />
                  <span>Rechazar</span>
                </button>
                <button type="button" onClick={() => setShowRechazarModal(false)}
                  className="px-6 py-3 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-xl transition-all duration-300 font-semibold">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
