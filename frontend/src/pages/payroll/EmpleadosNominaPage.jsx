import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react'
import { Button, Card, CardHeader, CardBody, Table, Modal, ModalFooter, FormField, SelectField, Badge } from '../../components/payroll'
import { empleadosAPI } from '../../services/payrollService'

const EmpleadosNominaPage = () => {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0 })
  const [filters, setFilters] = useState({ search: '', solo_activos: true })
  const [showFilters, setShowFilters] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedEmpleado, setSelectedEmpleado] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  
  const [formData, setFormData] = useState({
    tipo_documento: 'CC',
    numero_documento: '',
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    fecha_nacimiento: '',
    genero: 'M',
    direccion: '',
    telefono: '',
    email: '',
    ciudad: '',
    departamento: '',
    pais: 'CO',
    activo: true
  })

  useEffect(() => {
    loadEmpleados()
  }, [filters, pagination.page])

  const loadEmpleados = async () => {
    setLoading(true)
    try {
      const params = {
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size
      }
      const response = await empleadosAPI.list(params)
      
      // Manejar diferentes formatos de respuesta
      const data = response.data || response
      const empleadosData = data.results || (Array.isArray(data) ? data : [])
      
      setEmpleados(empleadosData)
      
      if (data.count !== undefined) {
        setPagination(prev => ({ ...prev, total: data.count }))
      }
    } catch (error) {
      toast.error('Error al cargar empleados')
      console.error(error)
      setEmpleados([]) // Asegurar que sea un array
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedEmpleado(null)
    setFormData({
      tipo_documento: 'CC',
      numero_documento: '',
      primer_nombre: '',
      segundo_nombre: '',
      primer_apellido: '',
      segundo_apellido: '',
      fecha_nacimiento: '',
      genero: 'M',
      direccion: '',
      telefono: '',
      email: '',
      ciudad: '',
      departamento: '',
      pais: 'CO',
      activo: true
    })
    setShowModal(true)
  }

  const handleEdit = (empleado) => {
    setIsEditing(true)
    setSelectedEmpleado(empleado)
    setFormData({
      tipo_documento: empleado.tipo_documento,
      numero_documento: empleado.numero_documento,
      primer_nombre: empleado.primer_nombre,
      segundo_nombre: empleado.segundo_nombre || '',
      primer_apellido: empleado.primer_apellido,
      segundo_apellido: empleado.segundo_apellido || '',
      fecha_nacimiento: empleado.fecha_nacimiento,
      genero: empleado.genero,
      direccion: empleado.direccion || '',
      telefono: empleado.telefono || '',
      email: empleado.email,
      ciudad: empleado.ciudad || '',
      departamento: empleado.departamento || '',
      pais: empleado.pais || 'CO',
      activo: empleado.activo
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este empleado?')) return
    
    try {
      await empleadosAPI.delete(id)
      toast.success('Empleado eliminado correctamente')
      loadEmpleados()
    } catch (error) {
      toast.error('Error al eliminar empleado')
      console.error(error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (isEditing) {
        await empleadosAPI.update(selectedEmpleado.id, formData)
        toast.success('Empleado actualizado correctamente')
      } else {
        await empleadosAPI.create(formData)
        toast.success('Empleado creado correctamente')
      }
      setShowModal(false)
      loadEmpleados()
    } catch (error) {
      toast.error(isEditing ? 'Error al actualizar empleado' : 'Error al crear empleado')
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

  const handleExportarExcel = async () => {
    try {
      // Implementar exportación
      toast.info('Función de exportación en desarrollo')
    } catch (error) {
      toast.error('Error al exportar')
    }
  }

  const columns = [
    {
      key: 'numero_documento',
      header: 'Documento',
      render: (empleado) => (
        <div>
          <div className="font-semibold">{empleado.numero_documento}</div>
          <div className="text-xs text-gray-500">{empleado.tipo_documento}</div>
        </div>
      )
    },
    {
      key: 'nombre_completo',
      header: 'Nombre Completo',
      render: (empleado) => (
        <div>
          <div className="font-medium">
            {empleado.nombre_completo || `${empleado.primer_nombre} ${empleado.primer_apellido}`}
          </div>
          <div className="text-xs text-gray-500">{empleado.email}</div>
        </div>
      )
    },
    {
      key: 'genero',
      header: 'Género',
      render: (empleado) => (
        <Badge variant={empleado.genero === 'M' ? 'info' : 'default'}>
          {empleado.genero === 'M' ? 'Masculino' : 'Femenino'}
        </Badge>
      )
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      render: (empleado) => empleado.telefono || 'N/A'
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (empleado) => (
        <Badge variant={empleado.activo ? 'success' : 'error'}>
          {empleado.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (empleado) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => handleEdit(empleado)}
          />
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => handleDelete(empleado.id)}
          />
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600 mt-1">Gestión de empleados para nómina electrónica</p>
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
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportarExcel}
          >
            Exportar
          </Button>
          <Button
            variant="outline"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={loadEmpleados}
          >
            Actualizar
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreate}
          >
            Nuevo Empleado
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardBody padding="md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="Buscar"
                name="search"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Documento, nombre, email..."
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
                  Solo activos
                </label>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <Table
          data={empleados}
          columns={columns}
          loading={loading}
          emptyMessage="No hay empleados registrados"
          pagination={{
            currentPage: pagination.page,
            pageSize: pagination.page_size,
            totalPages: Math.ceil((pagination.total || 0) / pagination.page_size),
            totalItems: pagination.total || 0,
            onPageChange: (newPage) => setPagination(prev => ({ ...prev, page: newPage }))
          }}
        />
      </Card>

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Tipo Documento"
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleInputChange}
                options={[
                  { value: 'CC', label: 'Cédula de Ciudadanía' },
                  { value: 'CE', label: 'Cédula de Extranjería' },
                  { value: 'TI', label: 'Tarjeta de Identidad' },
                  { value: 'PA', label: 'Pasaporte' }
                ]}
                required
              />
              <FormField
                label="Número Documento"
                name="numero_documento"
                value={formData.numero_documento}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Primer Nombre"
                name="primer_nombre"
                value={formData.primer_nombre}
                onChange={handleInputChange}
                required
              />
              <FormField
                label="Segundo Nombre"
                name="segundo_nombre"
                value={formData.segundo_nombre}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Primer Apellido"
                name="primer_apellido"
                value={formData.primer_apellido}
                onChange={handleInputChange}
                required
              />
              <FormField
                label="Segundo Apellido"
                name="segundo_apellido"
                value={formData.segundo_apellido}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Fecha Nacimiento"
                name="fecha_nacimiento"
                type="date"
                value={formData.fecha_nacimiento}
                onChange={handleInputChange}
                required
              />
              <SelectField
                label="Género"
                name="genero"
                value={formData.genero}
                onChange={handleInputChange}
                options={[
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Femenino' }
                ]}
                required
              />
            </div>

            <FormField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />

            <FormField
              label="Teléfono"
              name="telefono"
              value={formData.telefono}
              onChange={handleInputChange}
            />

            <FormField
              label="Dirección"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="Ciudad"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleInputChange}
              />
              <FormField
                label="Departamento"
                name="departamento"
                value={formData.departamento}
                onChange={handleInputChange}
              />
              <FormField
                label="País"
                name="pais"
                value={formData.pais}
                onChange={handleInputChange}
              />
            </div>

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
                Empleado activo
              </label>
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
            >
              {isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}

export default EmpleadosNominaPage
