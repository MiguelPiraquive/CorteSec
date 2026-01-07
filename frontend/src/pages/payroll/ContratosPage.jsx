import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { FileText, Plus, Edit, Trash2, RefreshCw, Filter, Eye } from 'lucide-react'
import { Button, Card, CardHeader, CardBody, Table, Modal, ModalFooter, FormField, SelectField, Badge } from '../../components/payroll'
import { contratosAPI, empleadosAPI } from '../../services/payrollService'

const ContratosPage = () => {
  const [contratos, setContratos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0 })
  const [filters, setFilters] = useState({ empleado: '', solo_activos: true })
  const [showFilters, setShowFilters] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedContrato, setSelectedContrato] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    empleado: '',
    tipo_contrato: 'INDEFINIDO',
    fecha_inicio: '',
    fecha_fin: '',
    salario_base: '',
    cargo: '',
    descripcion: '',
    activo: true
  })

  useEffect(() => {
    loadContratos()
    loadEmpleados()
  }, [filters, pagination.page])

  const loadContratos = async () => {
    setLoading(true)
    try {
      const params = {
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size
      }
      const response = await contratosAPI.list(params)
      
      const data = response.data || response
      const contratosData = data.results || (Array.isArray(data) ? data : [])
      
      setContratos(contratosData)
      
      if (data.count !== undefined) {
        setPagination(prev => ({ ...prev, total: data.count }))
      }
    } catch (error) {
      toast.error('Error al cargar contratos')
      console.error(error)
      setContratos([])
    } finally {
      setLoading(false)
    }
  }

  const loadEmpleados = async () => {
    try {
      const response = await empleadosAPI.activos()
      
      const data = response.data || response
      const empleadosData = data.results || (Array.isArray(data) ? data : [])
      
      setEmpleados(empleadosData)
    } catch (error) {
      console.error('Error al cargar empleados:', error)
      setEmpleados([])
    }
  }

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedContrato(null)
    setFormData({
      empleado: '',
      tipo_contrato: 'INDEFINIDO',
      fecha_inicio: '',
      fecha_fin: '',
      salario_base: '',
      cargo: '',
      descripcion: '',
      activo: true
    })
    setShowModal(true)
  }

  const handleEdit = (contrato) => {
    setIsEditing(true)
    setSelectedContrato(contrato)
    setFormData({
      empleado: contrato.empleado,
      tipo_contrato: contrato.tipo_contrato,
      fecha_inicio: contrato.fecha_inicio,
      fecha_fin: contrato.fecha_fin || '',
      salario_base: contrato.salario_base,
      cargo: contrato.cargo || '',
      descripcion: contrato.descripcion || '',
      activo: contrato.activo
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este contrato?')) return

    try {
      await contratosAPI.delete(id)
      toast.success('Contrato eliminado correctamente')
      loadContratos()
    } catch (error) {
      toast.error('Error al eliminar contrato')
      console.error(error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEditing) {
        await contratosAPI.update(selectedContrato.id, formData)
        toast.success('Contrato actualizado correctamente')
      } else {
        await contratosAPI.create(formData)
        toast.success('Contrato creado correctamente')
      }
      setShowModal(false)
      loadContratos()
    } catch (error) {
      toast.error(isEditing ? 'Error al actualizar contrato' : 'Error al crear contrato')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const formatCurrency = (value) => {
    const numValue = parseFloat(value) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(numValue)
  }

  const columns = [
    {
      key: 'empleado',
      header: 'Empleado',
      render: (contrato) => (
        <div>
          <div className="font-medium">{contrato.empleado_detalle?.nombre_completo}</div>
          <div className="text-xs text-gray-500">{contrato.empleado_detalle?.numero_documento}</div>
        </div>
      )
    },
    {
      key: 'tipo_contrato',
      header: 'Tipo Contrato',
      render: (contrato) => (
        <Badge variant={contrato.tipo_contrato === 'INDEFINIDO' ? 'success' : 'info'}>
          {contrato.tipo_contrato_detalle?.nombre || contrato.tipo_contrato}
        </Badge>
      )
    },
    {
      key: 'fecha_inicio',
      header: 'Fecha Inicio',
      render: (contrato) => new Date(contrato.fecha_inicio).toLocaleDateString('es-CO')
    },
    {
      key: 'fecha_fin',
      header: 'Fecha Fin',
      render: (contrato) => contrato.fecha_fin ? new Date(contrato.fecha_fin).toLocaleDateString('es-CO') : 'Indefinido'
    },
    {
      key: 'salario_base',
      header: 'Salario',
      render: (contrato) => (
        <div className="font-semibold text-green-600">
          {formatCurrency(contrato.salario_base)}
        </div>
      )
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (contrato) => (
        <Badge variant={contrato.activo ? 'success' : 'error'}>
          {contrato.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (contrato) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => handleEdit(contrato)}
          />
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => handleDelete(contrato.id)}
          />
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-600 mt-1">Gestión de contratos laborales</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtros
          </Button>
          <Button
            variant="outline"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={loadContratos}
          >
            Actualizar
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreate}
          >
            Nuevo Contrato
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardBody padding="md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Empleado"
                name="empleado"
                value={filters.empleado}
                onChange={(e) => setFilters(prev => ({ ...prev, empleado: e.target.value }))}
                options={[
                  { value: '', label: 'Todos' },
                  ...empleados.map(emp => ({
                    value: emp.id,
                    label: emp.nombre_completo || `${emp.primer_nombre} ${emp.primer_apellido}`
                  }))
                ]}
              />
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="solo_activos"
                  checked={filters.solo_activos}
                  onChange={(e) => setFilters(prev => ({ ...prev, solo_activos: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="solo_activos" className="text-sm font-medium text-gray-700">
                  Solo contratos activos
                </label>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <Table
          data={contratos}
          columns={columns}
          loading={loading}
          emptyMessage="No hay contratos registrados"
          pagination={{
            currentPage: pagination.page,
            pageSize: pagination.page_size,
            totalPages: Math.ceil((pagination.total || 0) / pagination.page_size),
            totalItems: pagination.total || 0,
            onPageChange: (newPage) => setPagination(prev => ({ ...prev, page: newPage }))
          }}
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Editar Contrato' : 'Nuevo Contrato'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
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
            />

            <SelectField
              label="Tipo de Contrato"
              name="tipo_contrato"
              value={formData.tipo_contrato}
              onChange={handleInputChange}
              options={[
                { value: 'INDEFINIDO', label: 'Indefinido' },
                { value: 'FIJO', label: 'Término Fijo' },
                { value: 'OBRA', label: 'Obra o Labor' },
                { value: 'PRESTACION', label: 'Prestación de Servicios' }
              ]}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Fecha Inicio"
                name="fecha_inicio"
                type="date"
                value={formData.fecha_inicio}
                onChange={handleInputChange}
                required
              />
              <FormField
                label="Fecha Fin"
                name="fecha_fin"
                type="date"
                value={formData.fecha_fin}
                onChange={handleInputChange}
                helper="Dejar en blanco para contrato indefinido"
              />
            </div>

            <FormField
              label="Salario Base"
              name="salario_base"
              type="number"
              value={formData.salario_base}
              onChange={handleInputChange}
              required
              helper="Salario mensual en COP"
            />

            <FormField
              label="Cargo"
              name="cargo"
              value={formData.cargo}
              onChange={handleInputChange}
            />

            <FormField
              label="Descripción"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
            />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activo"
                name="activo"
                checked={formData.activo}
                onChange={handleInputChange}
                className="rounded border-gray-300"
              />
              <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                Contrato activo
              </label>
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}

export default ContratosPage
