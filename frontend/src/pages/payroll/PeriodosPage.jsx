import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Calendar, Plus, Edit, Trash2, RefreshCw, Lock, Unlock } from 'lucide-react'
import { Button, Card, CardBody, Table, Modal, ModalFooter, FormField, SelectField, Badge } from '../../components/payroll'
import { periodosAPI } from '../../services/payrollService'

const PeriodosPage = () => {
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0 })
  const [showModal, setShowModal] = useState(false)
  const [selectedPeriodo, setSelectedPeriodo] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    tipo: 'MENSUAL',
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1
  })

  useEffect(() => {
    loadPeriodos()
  }, [pagination.page])

  const loadPeriodos = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.page_size
      }
      const response = await periodosAPI.list(params)
      
      const data = response.data || response
      const periodosData = data.results || (Array.isArray(data) ? data : [])
      
      setPeriodos(periodosData)
      
      if (data.count !== undefined) {
        setPagination(prev => ({ ...prev, total: data.count }))
      }
    } catch (error) {
      toast.error('Error al cargar periodos')
      console.error(error)
      setPeriodos([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedPeriodo(null)
    setFormData({
      nombre: '',
      fecha_inicio: '',
      fecha_fin: '',
      tipo: 'MENSUAL',
      anio: new Date().getFullYear(),
      mes: new Date().getMonth() + 1
    })
    setShowModal(true)
  }

  const handleEdit = (periodo) => {
    setIsEditing(true)
    setSelectedPeriodo(periodo)
    setFormData({
      nombre: periodo.nombre,
      fecha_inicio: periodo.fecha_inicio,
      fecha_fin: periodo.fecha_fin,
      tipo: periodo.tipo,
      anio: periodo.anio,
      mes: periodo.mes
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este periodo?')) return

    try {
      await periodosAPI.delete(id)
      toast.success('Periodo eliminado correctamente')
      loadPeriodos()
    } catch (error) {
      toast.error('Error al eliminar periodo')
      console.error(error)
    }
  }

  const handleCerrar = async (id) => {
    if (!window.confirm('¿Está seguro de cerrar este periodo? No se podrán realizar más cambios.')) return

    try {
      await periodosAPI.cerrar(id)
      toast.success('Periodo cerrado correctamente')
      loadPeriodos()
    } catch (error) {
      toast.error('Error al cerrar periodo')
      console.error(error)
    }
  }

  const handleAbrir = async (id) => {
    if (!window.confirm('¿Está seguro de reabrir este periodo?')) return

    try {
      await periodosAPI.abrir(id)
      toast.success('Periodo reabierto correctamente')
      loadPeriodos()
    } catch (error) {
      toast.error('Error al reabrir periodo')
      console.error(error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEditing) {
        await periodosAPI.update(selectedPeriodo.id, formData)
        toast.success('Periodo actualizado correctamente')
      } else {
        await periodosAPI.create(formData)
        toast.success('Periodo creado correctamente')
      }
      setShowModal(false)
      loadPeriodos()
    } catch (error) {
      toast.error(isEditing ? 'Error al actualizar periodo' : 'Error al crear periodo')
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

  const columns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (periodo) => (
        <div>
          <div className="font-semibold">{periodo.nombre}</div>
          <div className="text-xs text-gray-500">
            {periodo.tipo} - {periodo.anio}
          </div>
        </div>
      )
    },
    {
      key: 'fechas',
      header: 'Periodo',
      render: (periodo) => (
        <div>
          <div className="text-sm">
            {new Date(periodo.fecha_inicio).toLocaleDateString('es-CO')}
          </div>
          <div className="text-sm">
            {new Date(periodo.fecha_fin).toLocaleDateString('es-CO')}
          </div>
        </div>
      )
    },
    {
      key: 'mes',
      header: 'Mes',
      render: (periodo) => {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        return meses[periodo.mes - 1] || periodo.mes
      }
    },
    {
      key: 'cerrado',
      header: 'Estado',
      render: (periodo) => (
        <Badge variant={periodo.cerrado ? 'error' : 'success'}>
          {periodo.cerrado ? '🔒 Cerrado' : '🔓 Abierto'}
        </Badge>
      )
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (periodo) => (
        <div className="flex space-x-2">
          {!periodo.cerrado && (
            <>
              <Button
                size="sm"
                variant="outline"
                icon={<Edit className="w-4 h-4" />}
                onClick={() => handleEdit(periodo)}
              />
              <Button
                size="sm"
                variant="warning"
                icon={<Lock className="w-4 h-4" />}
                onClick={() => handleCerrar(periodo.id)}
              />
            </>
          )}
          {periodo.cerrado && (
            <Button
              size="sm"
              variant="success"
              icon={<Unlock className="w-4 h-4" />}
              onClick={() => handleAbrir(periodo.id)}
            />
          )}
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => handleDelete(periodo.id)}
          />
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Periodos de Nómina</h1>
          <p className="text-gray-600 mt-1">Gestión de periodos de liquidación</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={loadPeriodos}
          >
            Actualizar
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreate}
          >
            Nuevo Periodo
          </Button>
        </div>
      </div>

      <Card>
        <Table
          data={periodos}
          columns={columns}
          loading={loading}
          emptyMessage="No hay periodos registrados"
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
        title={isEditing ? 'Editar Periodo' : 'Nuevo Periodo'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField
              label="Nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              required
              helper="Ej: Nómina Enero 2024"
            />

            <SelectField
              label="Tipo"
              name="tipo"
              value={formData.tipo}
              onChange={handleInputChange}
              options={[
                { value: 'MENSUAL', label: 'Mensual' },
                { value: 'QUINCENAL', label: 'Quincenal' },
                { value: 'SEMANAL', label: 'Semanal' }
              ]}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Año"
                name="anio"
                type="number"
                value={formData.anio}
                onChange={handleInputChange}
                required
              />
              <FormField
                label="Mes"
                name="mes"
                type="number"
                min="1"
                max="12"
                value={formData.mes}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                required
              />
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

export default PeriodosPage
