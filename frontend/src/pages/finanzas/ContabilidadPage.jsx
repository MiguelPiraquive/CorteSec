import { useState, useEffect, useCallback } from 'react'
import useAudit from '../../hooks/useAudit'
import useServerPagination from '../../hooks/useServerPagination'
import Pagination from '../../components/Pagination'
import Can from '../../components/permissions/Can'
import { usePermissions } from '../../context/PermissionsContext'
import { useConfiguracion } from '../../context/ConfiguracionContext'
import { useActiveProject } from '../../context/ActiveProjectContext'
import contabilidadService from '../../services/contabilidadService'
import {
  WalletIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  CalendarIcon,
  FilterIcon,
} from 'lucide-react'

const ContabilidadPage = () => {
  const audit = useAudit('FlujoCaja')
  const { hasPermission, initialized } = usePermissions()
  const { formatCurrency } = useConfiguracion()
  const { activeProject, getProjectFilter } = useActiveProject()

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  const [showModal, setShowModal] = useState(false)
  const [editingFlujo, setEditingFlujo] = useState(null)
  const [filterTipo, setFilterTipo] = useState('all')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [resumen, setResumen] = useState({ total_ingresos: 0, total_egresos: 0, flujo_neto: 0 })
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo_movimiento: 'ingreso',
    concepto: '',
    valor: '',
    observaciones: '',
  })

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const fetchFlujo = useCallback((params) => {
    const finalParams = { ...params, ...getProjectFilter() }
    if (fechaDesde) finalParams.fecha_desde = fechaDesde
    if (fechaHasta) finalParams.fecha_hasta = fechaHasta
    return contabilidadService.getFlujoCaja(finalParams)
  }, [fechaDesde, fechaHasta, activeProject])

  const {
    data: movimientos,
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
  } = useServerPagination(fetchFlujo, { pageSize: 15 })

  const loadResumen = useCallback(async () => {
    try {
      const data = await contabilidadService.getFlujoCajaResumen(getProjectFilter())
      setResumen(data)
    } catch (error) {
      console.error('Error loading resumen:', error)
    }
  }, [activeProject])

  useEffect(() => { loadResumen() }, [loadResumen])

  useEffect(() => {
    if (filterTipo === 'all') setFilters({})
    else setFilters({ tipo_movimiento: filterTipo })
  }, [filterTipo, setFilters])

  useEffect(() => { refresh() }, [fechaDesde, fechaHasta])

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      tipo_movimiento: 'ingreso',
      concepto: '',
      valor: '',
      observaciones: '',
    })
    setEditingFlujo(null)
    setErrors({})
  }

  const handleEdit = (flujo) => {
    audit.modalOpen('editar_flujo', { flujo_id: flujo.id, concepto: flujo.concepto })
    setEditingFlujo(flujo)
    setFormData({
      fecha: flujo.fecha || new Date().toISOString().split('T')[0],
      tipo_movimiento: flujo.tipo_movimiento || 'ingreso',
      concepto: flujo.concepto || '',
      valor: flujo.valor || '',
      observaciones: flujo.observaciones || '',
    })
    setErrors({})
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('\u00bfEst\u00e1 seguro de eliminar este movimiento?')) return
    try {
      const flujo = movimientos.find(m => m.id === id)
      await contabilidadService.deleteFlujoCaja(id)
      audit.button('eliminar_flujo', { flujo_id: id, concepto: flujo?.concepto })
      showNotification('success', 'Movimiento eliminado exitosamente')
      refresh()
      loadResumen()
    } catch (error) {
      showNotification('error', 'Error al eliminar: ' + (error.response?.data?.detail || error.message))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.fecha) newErrors.fecha = 'La fecha es requerida'
    if (!formData.concepto.trim()) newErrors.concepto = 'El concepto es requerido'
    if (!formData.valor || parseFloat(formData.valor) <= 0) newErrors.valor = 'El valor debe ser mayor a 0'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const dataToSend = {
        ...formData,
        valor: parseFloat(formData.valor),
      }
      if (editingFlujo) {
        await contabilidadService.updateFlujoCaja(editingFlujo.id, dataToSend)
        audit.button('actualizar_flujo', { flujo_id: editingFlujo.id, concepto: formData.concepto })
        showNotification('success', 'Movimiento actualizado exitosamente')
      } else {
        await contabilidadService.createFlujoCaja(dataToSend)
        audit.button('crear_flujo', { concepto: formData.concepto, tipo: formData.tipo_movimiento })
        showNotification('success', 'Movimiento registrado exitosamente')
      }
      setShowModal(false)
      resetForm()
      refresh()
      loadResumen()
    } catch (error) {
      if (error.response?.data) {
        const serverErrors = {}
        Object.keys(error.response.data).forEach(key => {
          serverErrors[key] = Array.isArray(error.response.data[key]) ? error.response.data[key][0] : error.response.data[key]
        })
        setErrors(serverErrors)
      }
      showNotification('error', 'Error al guardar: ' + (error.response?.data?.detail || error.message))
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('contabilidad.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta secci&oacute;n</div>

  return (
    <div className="space-y-6">
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${
          notification.type === 'success'
            ? 'bg-green-500/90 border-green-400 text-white'
            : 'bg-red-500/90 border-red-400 text-white'
        }`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckIcon className="w-6 h-6" /> : <AlertCircleIcon className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <WalletIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Flujo de Caja</h1>
              <p className="text-indigo-100 mt-2 text-lg">Control de ingresos y egresos</p>
            </div>
          </div>
          <Can permission="contabilidad.add">
            <button
              onClick={() => { resetForm(); setShowModal(true) }}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Nuevo Movimiento</span>
            </button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Ingresos</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(resumen.total_ingresos)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUpIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Egresos</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(resumen.total_egresos)}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingDownIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Flujo Neto</p>
              <p className={`text-2xl font-bold mt-1 ${resumen.flujo_neto >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                {formatCurrency(resumen.flujo_neto)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${resumen.flujo_neto >= 0 ? 'bg-indigo-100' : 'bg-red-100'}`}>
              <WalletIcon className={`w-6 h-6 ${resumen.flujo_neto >= 0 ? 'text-indigo-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por concepto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>
          <div className="relative">
            <FilterIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
            >
              <option value="all">Todos</option>
              <option value="ingreso">Solo Ingresos</option>
              <option value="egreso">Solo Egresos</option>
            </select>
          </div>
          <div className="relative">
            <CalendarIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              title="Desde"
            />
          </div>
          <div className="relative">
            <CalendarIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              title="Hasta"
            />
          </div>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden border border-gray-200/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Fecha</th>
                <th className="px-6 py-4 text-left font-semibold">Tipo</th>
                <th className="px-6 py-4 text-left font-semibold">Concepto</th>
                <th className="px-6 py-4 text-right font-semibold">Valor</th>
                <th className="px-6 py-4 text-left font-semibold">Observaciones</th>
                <th className="px-6 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-3">
                      <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando movimientos...</span>
                    </div>
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <WalletIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No se encontraron movimientos</p>
                    <p className="text-sm mt-1">Registra tu primer ingreso o egreso</p>
                  </td>
                </tr>
              ) : (
                movimientos.map((mov, index) => (
                  <tr key={mov.id} className={`${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'} hover:bg-indigo-50 transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{formatDate(mov.fecha)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mov.tipo_movimiento === 'ingreso' ? (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          <ArrowUpCircleIcon className="w-3.5 h-3.5" />
                          <span>Ingreso</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          <ArrowDownCircleIcon className="w-3.5 h-3.5" />
                          <span>Egreso</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">{mov.concepto}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-bold ${mov.tipo_movimiento === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.tipo_movimiento === 'ingreso' ? '+' : '-'} {formatCurrency(mov.valor)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 truncate max-w-xs block">{mov.observaciones || '\u2014'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <Can permission="contabilidad.change">
                          <button onClick={() => handleEdit(mov)} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors" title="Editar">
                            <EditIcon className="w-4 h-4" />
                          </button>
                        </Can>
                        <Can permission="contabilidad.delete">
                          <button onClick={() => handleDelete(mov.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Eliminar">
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="movimientos"
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingFlujo ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-88px)]">
              {(errors.non_field_errors || errors.detail) && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                  <p className="font-semibold mb-2">No se pudo guardar el movimiento</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {Array.isArray(errors.non_field_errors) && errors.non_field_errors.map((err, idx) => <li key={idx}>{err}</li>)}
                    {errors.detail && <li>{errors.detail}</li>}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de Movimiento *</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_movimiento: 'ingreso' })}
                    className={`flex items-center justify-center space-x-3 p-4 rounded-xl border-2 font-semibold transition-all ${
                      formData.tipo_movimiento === 'ingreso'
                        ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-green-300'
                    }`}
                  >
                    <ArrowUpCircleIcon className="w-6 h-6" />
                    <span>Ingreso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_movimiento: 'egreso' })}
                    className={`flex items-center justify-center space-x-3 p-4 rounded-xl border-2 font-semibold transition-all ${
                      formData.tipo_movimiento === 'egreso'
                        ? 'border-red-500 bg-red-50 text-red-700 shadow-md'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-red-300'
                    }`}
                  >
                    <ArrowDownCircleIcon className="w-6 h-6" />
                    <span>Egreso</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha *</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-indigo-500 transition-all ${errors.fecha ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.fecha && <p className="text-red-500 text-sm mt-1">{errors.fecha}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-indigo-500 transition-all ${errors.valor ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.valor && <p className="text-red-500 text-sm mt-1">{errors.valor}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Concepto *</label>
                <input
                  type="text"
                  value={formData.concepto}
                  onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                  placeholder={formData.tipo_movimiento === 'ingreso' ? 'Ej: Pago de cliente, Anticipo proyecto...' : 'Ej: Compra materiales, Pago n\u00f3mina...'}
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-indigo-500 transition-all ${errors.concepto ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.concepto && <p className="text-red-500 text-sm mt-1">{errors.concepto}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={3}
                  placeholder="Notas o detalles adicionales..."
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition-all">
                  Cancelar
                </button>
                <button type="submit"
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg">
                  {editingFlujo ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContabilidadPage
