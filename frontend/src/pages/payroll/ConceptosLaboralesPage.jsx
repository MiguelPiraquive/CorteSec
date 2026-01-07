import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Plus, Edit2, Trash2, Search, Filter, Power, PowerOff, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { Button, Card, CardHeader, CardBody, Table, Modal, ModalFooter, FormField, SelectField } from '../../components/payroll'
import conceptosLaboralesService from '../../services/conceptosLaboralesService'

const ConceptosLaboralesPage = () => {
  const [conceptos, setConceptos] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('') // 'DEV', 'DED', ''
  const [filtroActivo, setFiltroActivo] = useState('') // 'true', 'false', ''
  const [showModal, setShowModal] = useState(false)
  const [editingConcepto, setEditingConcepto] = useState(null)
  const [deletingConcepto, setDeletingConcepto] = useState(null)

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo_concepto: 'DEV',
    es_salarial: false,
    aplica_seguridad_social: true,
    codigo_dian: '',
    activo: true
  })

  useEffect(() => {
    loadConceptos()
  }, [filtroTipo, filtroActivo])

  const loadConceptos = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroTipo) params.tipo_concepto = filtroTipo
      if (filtroActivo) params.activo = filtroActivo === 'true'

      const response = await conceptosLaboralesService.getAll(params)
      const data = response.results || response
      setConceptos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error al cargar conceptos:', error)
      toast.error('Error al cargar conceptos laborales')
      setConceptos([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadConceptos()
      return
    }

    setLoading(true)
    try {
      const response = await conceptosLaboralesService.search(searchTerm)
      const data = response.results || response
      setConceptos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error en búsqueda:', error)
      toast.error('Error al buscar conceptos')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (concepto = null) => {
    if (concepto) {
      setEditingConcepto(concepto)
      setFormData({
        codigo: concepto.codigo,
        nombre: concepto.nombre,
        descripcion: concepto.descripcion || '',
        tipo_concepto: concepto.tipo_concepto,
        es_salarial: concepto.es_salarial,
        aplica_seguridad_social: concepto.aplica_seguridad_social,
        codigo_dian: concepto.codigo_dian || '',
        activo: concepto.activo
      })
    } else {
      setEditingConcepto(null)
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        tipo_concepto: 'DEV',
        es_salarial: false,
        aplica_seguridad_social: true,
        codigo_dian: '',
        activo: true
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingConcepto(null)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingConcepto) {
        await conceptosLaboralesService.update(editingConcepto.id, formData)
        toast.success('Concepto actualizado correctamente')
      } else {
        await conceptosLaboralesService.create(formData)
        toast.success('Concepto creado correctamente')
      }
      handleCloseModal()
      loadConceptos()
    } catch (error) {
      console.error('Error al guardar concepto:', error)
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.error ||
                       'Error al guardar concepto'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActivo = async (concepto) => {
    try {
      await conceptosLaboralesService.toggleActivo(concepto.id)
      toast.success(`Concepto ${concepto.activo ? 'desactivado' : 'activado'} correctamente`)
      loadConceptos()
    } catch (error) {
      console.error('Error al cambiar estado:', error)
      toast.error('Error al cambiar estado del concepto')
    }
  }

  const handleDelete = async () => {
    if (!deletingConcepto) return

    try {
      await conceptosLaboralesService.delete(deletingConcepto.id)
      toast.success('Concepto eliminado correctamente')
      setDeletingConcepto(null)
      loadConceptos()
    } catch (error) {
      console.error('Error al eliminar concepto:', error)
      toast.error('Error al eliminar concepto')
    }
  }

  const filteredConceptos = conceptos.filter(concepto =>
    concepto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    concepto.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTipoBadge = (tipo) => {
    const badges = {
      'DEV': { color: 'bg-green-100 text-green-800', icon: TrendingUp, text: 'Devengado' },
      'DED': { color: 'bg-red-100 text-red-800', icon: TrendingDown, text: 'Deducción' },
      'APO': { color: 'bg-blue-100 text-blue-800', icon: DollarSign, text: 'Aporte' }
    }
    const badge = badges[tipo] || badges['DEV']
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    )
  }

  const columns = [
    { 
      key: 'codigo', 
      label: 'Código',
      render: (concepto) => (
        <span className="font-mono font-medium text-gray-900">{concepto.codigo}</span>
      )
    },
    { 
      key: 'nombre', 
      label: 'Nombre',
      render: (concepto) => (
        <div>
          <div className="font-medium text-gray-900">{concepto.nombre}</div>
          {concepto.descripcion && (
            <div className="text-xs text-gray-500 mt-1">{concepto.descripcion}</div>
          )}
        </div>
      )
    },
    { 
      key: 'tipo_concepto', 
      label: 'Tipo',
      render: (concepto) => getTipoBadge(concepto.tipo_concepto)
    },
    {
      key: 'es_salarial',
      label: 'Salarial',
      render: (concepto) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          concepto.es_salarial 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {concepto.es_salarial ? 'Sí' : 'No'}
        </span>
      )
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (concepto) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          concepto.activo 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {concepto.activo ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (concepto) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            icon={concepto.activo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            onClick={() => handleToggleActivo(concepto)}
            title={concepto.activo ? 'Desactivar' : 'Activar'}
          />
          <Button
            size="sm"
            variant="outline"
            icon={<Edit2 className="w-4 h-4" />}
            onClick={() => handleOpenModal(concepto)}
          />
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => setDeletingConcepto(concepto)}
          />
        </div>
      )
    }
  ]

  // Estadísticas
  const stats = {
    total: conceptos.length,
    devengados: conceptos.filter(c => c.tipo_concepto === 'DEV').length,
    deducciones: conceptos.filter(c => c.tipo_concepto === 'DED').length,
    activos: conceptos.filter(c => c.activo).length
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conceptos Laborales</h1>
          <p className="text-gray-600 mt-1">
            Gestión de devengados, deducciones y aportes
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => handleOpenModal()}
        >
          Nuevo Concepto
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody padding="md">
            <div className="text-sm text-gray-600">Total Conceptos</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody padding="md">
            <div className="text-sm text-gray-600">Devengados</div>
            <div className="text-2xl font-bold text-green-600">{stats.devengados}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody padding="md">
            <div className="text-sm text-gray-600">Deducciones</div>
            <div className="text-2xl font-bold text-red-600">{stats.deducciones}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody padding="md">
            <div className="text-sm text-gray-600">Activos</div>
            <div className="text-2xl font-bold text-blue-600">{stats.activos}</div>
          </CardBody>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardBody padding="lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar por código o nombre..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <SelectField
              label=""
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              options={[
                { value: '', label: 'Todos los tipos' },
                { value: 'DEV', label: 'Devengados' },
                { value: 'DED', label: 'Deducciones' },
                { value: 'APO', label: 'Aportes' }
              ]}
            />
            <SelectField
              label=""
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value)}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'true', label: 'Solo activos' },
                { value: 'false', label: 'Solo inactivos' }
              ]}
            />
          </div>
        </CardBody>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader title="Lista de Conceptos" />
        <CardBody padding="none">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Cargando conceptos...
            </div>
          ) : filteredConceptos.length > 0 ? (
            <Table columns={columns} data={filteredConceptos} />
          ) : (
            <div className="p-8 text-center text-gray-500">
              No se encontraron conceptos
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingConcepto ? 'Editar Concepto' : 'Nuevo Concepto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Código"
              name="codigo"
              value={formData.codigo}
              onChange={handleInputChange}
              required
              placeholder="SAL_BASE"
            />

            <SelectField
              label="Tipo de Concepto"
              name="tipo_concepto"
              value={formData.tipo_concepto}
              onChange={handleInputChange}
              options={[
                { value: 'DEV', label: 'Devengado' },
                { value: 'DED', label: 'Deducción' },
                { value: 'APO', label: 'Aporte' }
              ]}
              required
            />
          </div>

          <FormField
            label="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            required
            placeholder="Salario Básico"
          />

          <FormField
            label="Descripción"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleInputChange}
            placeholder="Descripción opcional del concepto"
          />

          <FormField
            label="Código DIAN"
            name="codigo_dian"
            value={formData.codigo_dian}
            onChange={handleInputChange}
            placeholder="Código para nómina electrónica (opcional)"
          />

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="es_salarial"
                name="es_salarial"
                checked={formData.es_salarial}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="es_salarial" className="ml-2 block text-sm text-gray-900">
                Es salarial (cuenta para prestaciones sociales)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aplica_seguridad_social"
                name="aplica_seguridad_social"
                checked={formData.aplica_seguridad_social}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="aplica_seguridad_social" className="ml-2 block text-sm text-gray-900">
                Aplica para seguridad social
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="activo"
                name="activo"
                checked={formData.activo}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                Activo
              </label>
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
            >
              {editingConcepto ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        isOpen={!!deletingConcepto}
        onClose={() => setDeletingConcepto(null)}
        title="Confirmar Eliminación"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Está seguro que desea eliminar el concepto <strong>{deletingConcepto?.nombre}</strong>?
          </p>
          <p className="text-sm text-red-600">
            Esta acción no se puede deshacer.
          </p>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingConcepto(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  )
}

export default ConceptosLaboralesPage
