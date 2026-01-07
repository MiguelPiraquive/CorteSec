import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Save, X, Plus, Trash2, Calculator, DollarSign } from 'lucide-react'
import { 
  Button, Card, CardHeader, CardBody, FormField, SelectField,
  ConceptoSelector, ItemSelector 
} from '../../components/payroll'
import { 
  nominasAPI, empleadosAPI, periodosAPI, 
  conceptosLaboralesAPI, itemsAPI 
} from '../../services/payrollService'

const NominaFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  
  const [loading, setLoading] = useState(false)
  const [empleados, setEmpleados] = useState([])
  const [periodos, setPeriodos] = useState([])

  const [formData, setFormData] = useState({
    empleado: '',
    periodo: '',
    periodo_inicio: '',
    periodo_fin: '',
    dias_trabajados: 30,
    salario_base_contrato: '',
    estado: 'BOR',
    observaciones: '',
    detalles_items: [],
    detalles_conceptos: []
  })

  // Estado para nuevo detalle de item
  const [nuevoDetalleItem, setNuevoDetalleItem] = useState({
    item: null,
    cantidad: '',
    valor_unitario: ''
  })

  // Estado para nuevo detalle de concepto
  const [nuevoDetalleConcepto, setNuevoDetalleConcepto] = useState({
    concepto: null,
    cantidad: '1',
    valor_unitario: ''
  })

  const [activeTab, setActiveTab] = useState('items') // 'items' o 'conceptos'

  useEffect(() => {
    loadEmpleados()
    loadPeriodos()
    if (isEditing) {
      loadNomina()
    }
  }, [id])

  const loadEmpleados = async () => {
    try {
      const response = await empleadosAPI.activos()
      const data = response.results || response
      setEmpleados(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error al cargar empleados:', error)
      setEmpleados([])
    }
  }

  const loadPeriodos = async () => {
    try {
      const response = await periodosAPI.abiertos()
      const data = response.results || response
      setPeriodos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error al cargar periodos:', error)
      setPeriodos([])
    }
  }

  const loadNomina = async () => {
    setLoading(true)
    try {
      const nomina = await nominasAPI.get(id)
      setFormData({
        empleado: nomina.empleado,
        periodo: nomina.periodo,
        periodo_inicio: nomina.periodo_inicio,
        periodo_fin: nomina.periodo_fin,
        dias_trabajados: nomina.dias_trabajados,
        salario_base_contrato: nomina.salario_base_contrato,
        estado: nomina.estado,
        observaciones: nomina.observaciones || '',
        detalles_items: nomina.detalles_items || [],
        detalles_conceptos: nomina.detalles_conceptos || []
      })
    } catch (error) {
      toast.error('Error al cargar nómina')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // ==================== ITEMS ====================
  const handleAgregarItem = () => {
    if (!nuevoDetalleItem.item || !nuevoDetalleItem.cantidad || !nuevoDetalleItem.valor_unitario) {
      toast.warning('Complete todos los campos del item')
      return
    }

    if (parseFloat(nuevoDetalleItem.cantidad) <= 0 || parseFloat(nuevoDetalleItem.valor_unitario) <= 0) {
      toast.warning('Cantidad y valor deben ser mayores a 0')
      return
    }

    setFormData(prev => ({
      ...prev,
      detalles_items: [...prev.detalles_items, { 
        ...nuevoDetalleItem, 
        id: `temp-${Date.now()}` 
      }]
    }))

    setNuevoDetalleItem({
      item: null,
      cantidad: '',
      valor_unitario: ''
    })

    toast.success('Item agregado')
  }

  const handleEliminarItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      detalles_items: prev.detalles_items.filter(d => d.id !== itemId)
    }))
    toast.success('Item eliminado')
  }

  // ==================== CONCEPTOS ====================
  const handleAgregarConcepto = () => {
    if (!nuevoDetalleConcepto.concepto || !nuevoDetalleConcepto.cantidad || !nuevoDetalleConcepto.valor_unitario) {
      toast.warning('Complete todos los campos del concepto')
      return
    }

    if (parseFloat(nuevoDetalleConcepto.cantidad) <= 0 || parseFloat(nuevoDetalleConcepto.valor_unitario) <= 0) {
      toast.warning('Cantidad y valor deben ser mayores a 0')
      return
    }

    setFormData(prev => ({
      ...prev,
      detalles_conceptos: [...prev.detalles_conceptos, { 
        ...nuevoDetalleConcepto, 
        id: `temp-${Date.now()}` 
      }]
    }))

    setNuevoDetalleConcepto({
      concepto: null,
      cantidad: '1',
      valor_unitario: ''
    })

    toast.success('Concepto agregado')
  }

  const handleEliminarConcepto = (conceptoId) => {
    setFormData(prev => ({
      ...prev,
      detalles_conceptos: prev.detalles_conceptos.filter(d => d.id !== conceptoId)
    }))
    toast.success('Concepto eliminado')
  }

  // ==================== SUBMIT ====================
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.empleado || !formData.periodo) {
      toast.error('Empleado y periodo son requeridos')
      return
    }

    if (!formData.salario_base_contrato || parseFloat(formData.salario_base_contrato) <= 0) {
      toast.error('Salario base del contrato es requerido')
      return
    }

    if (formData.detalles_items.length === 0 && formData.detalles_conceptos.length === 0) {
      toast.error('Debe agregar al menos un item o concepto')
      return
    }

    setLoading(true)

    try {
      // Preparar datos para envío
      const dataToSend = {
        empleado: parseInt(formData.empleado),
        periodo: parseInt(formData.periodo),
        periodo_inicio: formData.periodo_inicio,
        periodo_fin: formData.periodo_fin,
        dias_trabajados: parseInt(formData.dias_trabajados),
        salario_base_contrato: formData.salario_base_contrato,
        observaciones: formData.observaciones,
        detalles_items: formData.detalles_items.map(item => ({
          item: item.item,
          cantidad: item.cantidad,
          valor_unitario: item.valor_unitario
        })),
        detalles_conceptos: formData.detalles_conceptos.map(concepto => ({
          concepto: concepto.concepto,
          cantidad: concepto.cantidad,
          valor_unitario: concepto.valor_unitario
        }))
      }

      if (isEditing) {
        await nominasAPI.update(id, dataToSend)
        toast.success('Nómina actualizada correctamente')
      } else {
        await nominasAPI.create(dataToSend)
        toast.success('Nómina creada correctamente')
      }
      navigate('/dashboard/nomina')
    } catch (error) {
      console.error('Error al guardar nómina:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || 
                       (isEditing ? 'Error al actualizar nómina' : 'Error al crear nómina')
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // ==================== CÁLCULOS ====================
  const formatCurrency = (value) => {
    const numValue = parseFloat(value) || 0
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(numValue)
  }

  const calcularValorTotal = (cantidad, valorUnitario) => {
    return parseFloat(cantidad || 0) * parseFloat(valorUnitario || 0)
  }

  const totalItems = formData.detalles_items.reduce((sum, item) => 
    sum + calcularValorTotal(item.cantidad, item.valor_unitario), 0
  )

  const totalConceptos = formData.detalles_conceptos.reduce((sum, concepto) => 
    sum + calcularValorTotal(concepto.cantidad, concepto.valor_unitario), 0
  )

  const totalGeneral = totalItems + totalConceptos

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Nómina' : 'Nueva Nómina'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Modificar nómina existente' : 'Crear nueva nómina con items y conceptos'}
          </p>
        </div>
        <Button
          variant="outline"
          icon={<X className="w-4 h-4" />}
          onClick={() => navigate('/dashboard/nomina')}
        >
          Cancelar
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <Card>
          <CardHeader 
            title="Información Básica" 
            subtitle="Datos del empleado y periodo"
          />
          <CardBody padding="lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField
                label="Empleado"
                name="empleado"
                value={formData.empleado}
                onChange={handleInputChange}
                options={empleados.map(emp => ({
                  value: emp.id,
                  label: emp.nombre_completo || `${emp.primer_nombre} ${emp.primer_apellido}`
                }))}
                required
                disabled={isEditing}
              />

              <SelectField
                label="Periodo"
                name="periodo"
                value={formData.periodo}
                onChange={handleInputChange}
                options={periodos.map(per => ({
                  value: per.id,
                  label: per.nombre
                }))}
                required
                disabled={isEditing}
              />

              <FormField
                label="Días Trabajados"
                name="dias_trabajados"
                type="number"
                min="1"
                max="31"
                value={formData.dias_trabajados}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <FormField
                label="Fecha Inicio"
                name="periodo_inicio"
                type="date"
                value={formData.periodo_inicio}
                onChange={handleInputChange}
                required
              />

              <FormField
                label="Fecha Fin"
                name="periodo_fin"
                type="date"
                value={formData.periodo_fin}
                onChange={handleInputChange}
                required
              />

              <FormField
                label="Salario Base Contrato"
                name="salario_base_contrato"
                type="number"
                step="0.01"
                value={formData.salario_base_contrato}
                onChange={handleInputChange}
                required
                placeholder="2500000.00"
              />
            </div>

            <div className="mt-4">
              <FormField
                label="Observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                placeholder="Observaciones opcionales"
              />
            </div>
          </CardBody>
        </Card>

        {/* Tabs: Items y Conceptos */}
        <Card>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`${
                  activeTab === 'items'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Items de Construcción ({formData.detalles_items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('conceptos')}
                className={`${
                  activeTab === 'conceptos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Conceptos Laborales ({formData.detalles_conceptos.length})
              </button>
            </nav>
          </div>

          {/* Tab Content: ITEMS */}
          {activeTab === 'items' && (
            <CardBody padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Agregar Item de Construcción
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <ItemSelector
                  label="Item"
                  value={nuevoDetalleItem.item}
                  onChange={(itemId) => setNuevoDetalleItem(prev => ({ ...prev, item: itemId }))}
                  required
                />

                <FormField
                  label="Cantidad"
                  type="number"
                  step="0.01"
                  value={nuevoDetalleItem.cantidad}
                  onChange={(e) => setNuevoDetalleItem(prev => ({ ...prev, cantidad: e.target.value }))}
                  placeholder="0.00"
                  required
                />

                <FormField
                  label="Valor Unitario"
                  type="number"
                  step="0.01"
                  value={nuevoDetalleItem.valor_unitario}
                  onChange={(e) => setNuevoDetalleItem(prev => ({ ...prev, valor_unitario: e.target.value }))}
                  placeholder="0.00"
                  required
                />

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAgregarItem}
                    fullWidth
                  >
                    Agregar Item
                  </Button>
                </div>
              </div>

              {/* Lista de Items */}
              {formData.detalles_items.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Items Agregados</h4>
                  <div className="space-y-2">
                    {formData.detalles_items.map((detalle) => (
                      <div key={detalle.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            Item #{detalle.item}
                          </div>
                          <div className="text-sm text-gray-600">
                            Cantidad: {detalle.cantidad} × {formatCurrency(detalle.valor_unitario)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-lg font-bold text-blue-600">
                            {formatCurrency(calcularValorTotal(detalle.cantidad, detalle.valor_unitario))}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={() => handleEliminarItem(detalle.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-blue-100 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Total Items:</span>
                      <span className="text-xl font-bold text-blue-600">{formatCurrency(totalItems)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          )}

          {/* Tab Content: CONCEPTOS */}
          {activeTab === 'conceptos' && (
            <CardBody padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Agregar Concepto Laboral
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <ConceptoSelector
                  label="Concepto"
                  tipo={nuevoDetalleConcepto.tipo || 'DEV'}
                  value={nuevoDetalleConcepto.concepto}
                  onChange={(conceptoId) => setNuevoDetalleConcepto(prev => ({ ...prev, concepto: conceptoId }))}
                  required
                />

                <FormField
                  label="Cantidad"
                  type="number"
                  step="0.01"
                  value={nuevoDetalleConcepto.cantidad}
                  onChange={(e) => setNuevoDetalleConcepto(prev => ({ ...prev, cantidad: e.target.value }))}
                  placeholder="1.00"
                  required
                />

                <FormField
                  label="Valor Unitario"
                  type="number"
                  step="0.01"
                  value={nuevoDetalleConcepto.valor_unitario}
                  onChange={(e) => setNuevoDetalleConcepto(prev => ({ ...prev, valor_unitario: e.target.value }))}
                  placeholder="0.00"
                  required
                />

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAgregarConcepto}
                    fullWidth
                  >
                    Agregar Concepto
                  </Button>
                </div>
              </div>

              {/* Toggle tipo de concepto */}
              <div className="mt-4">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={nuevoDetalleConcepto.tipo === 'DEV' ? 'primary' : 'outline'}
                    onClick={() => setNuevoDetalleConcepto(prev => ({ ...prev, tipo: 'DEV', concepto: null }))}
                  >
                    Devengados
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={nuevoDetalleConcepto.tipo === 'DED' ? 'primary' : 'outline'}
                    onClick={() => setNuevoDetalleConcepto(prev => ({ ...prev, tipo: 'DED', concepto: null }))}
                  >
                    Deducciones
                  </Button>
                </div>
              </div>

              {/* Lista de Conceptos */}
              {formData.detalles_conceptos.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Conceptos Agregados</h4>
                  <div className="space-y-2">
                    {formData.detalles_conceptos.map((detalle) => (
                      <div key={detalle.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            Concepto #{detalle.concepto}
                          </div>
                          <div className="text-sm text-gray-600">
                            Cantidad: {detalle.cantidad} × {formatCurrency(detalle.valor_unitario)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(calcularValorTotal(detalle.cantidad, detalle.valor_unitario))}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={() => handleEliminarConcepto(detalle.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-green-100 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Total Conceptos:</span>
                      <span className="text-xl font-bold text-green-600">{formatCurrency(totalConceptos)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          )}
        </Card>

        {/* Resumen General */}
        <Card>
          <CardHeader title="Resumen de Nómina" />
          <CardBody padding="lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">Total Items (Producción)</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalItems)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formData.detalles_items.length} items
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600">Total Conceptos</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalConceptos)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formData.detalles_conceptos.length} conceptos
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600">Total General</div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(totalGeneral)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Antes de deducciones
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Nota:</strong> Los aportes a seguridad social, provisiones y deducciones se calcularán 
                automáticamente al crear la nómina usando el salario base del contrato: {formatCurrency(formData.salario_base_contrato || 0)}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/nomina')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            loading={loading}
            disabled={
              !formData.empleado || 
              !formData.periodo || 
              !formData.salario_base_contrato ||
              (formData.detalles_items.length === 0 && formData.detalles_conceptos.length === 0)
            }
          >
            {isEditing ? 'Actualizar Nómina' : 'Crear Nómina'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default NominaFormPage
