import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Webhook, Plus, Edit, Trash2, RefreshCw, Play, Eye } from 'lucide-react'
import { Button, Card, CardBody, Table, Modal, ModalFooter, FormField, SelectField, Badge } from '../../components/payroll'
import { webhooksAPI } from '../../services/payrollService'

const WebhooksPage = () => {
  const [webhooks, setWebhooks] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0 })
  const [showModal, setShowModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    nombre: '',
    url: '',
    eventos: [],
    activo: true,
    headers: {},
    retry_max: 3,
    timeout: 30
  })

  useEffect(() => {
    loadWebhooks()
  }, [pagination.page])

  const loadWebhooks = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.page_size
      }
      const response = await webhooksAPI.list(params)
      
      const data = response.data || response
      const webhooksData = data.results || (Array.isArray(data) ? data : [])
      
      setWebhooks(webhooksData)
      
      if (data.count !== undefined) {
        setPagination(prev => ({ ...prev, total: data.count }))
      }
    } catch (error) {
      toast.error('Error al cargar webhooks')
      console.error(error)
      setWebhooks([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedWebhook(null)
    setFormData({
      nombre: '',
      url: '',
      eventos: [],
      activo: true,
      headers: {},
      retry_max: 3,
      timeout: 30
    })
    setShowModal(true)
  }

  const handleEdit = (webhook) => {
    setIsEditing(true)
    setSelectedWebhook(webhook)
    setFormData({
      nombre: webhook.nombre,
      url: webhook.url,
      eventos: webhook.eventos || [],
      activo: webhook.activo,
      headers: webhook.headers || {},
      retry_max: webhook.retry_max || 3,
      timeout: webhook.timeout || 30
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este webhook?')) return

    try {
      await webhooksAPI.delete(id)
      toast.success('Webhook eliminado correctamente')
      loadWebhooks()
    } catch (error) {
      toast.error('Error al eliminar webhook')
      console.error(error)
    }
  }

  const handleTest = async (id) => {
    setLoading(true)
    try {
      const result = await webhooksAPI.probar(id)
      if (result.success) {
        toast.success(`✅ Webhook probado exitosamente: ${result.status_code}`)
      } else {
        toast.error(`❌ Error al probar webhook: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error al probar webhook')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewLogs = async (id) => {
    setLoading(true)
    try {
      const response = await webhooksAPI.logs(id)
      setLogs(response.results || response)
      setSelectedWebhook(id)
      setShowLogsModal(true)
    } catch (error) {
      toast.error('Error al cargar logs')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEditing) {
        await webhooksAPI.update(selectedWebhook.id, formData)
        toast.success('Webhook actualizado correctamente')
      } else {
        await webhooksAPI.create(formData)
        toast.success('Webhook creado correctamente')
      }
      setShowModal(false)
      loadWebhooks()
    } catch (error) {
      toast.error(isEditing ? 'Error al actualizar webhook' : 'Error al crear webhook')
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

  const handleEventosChange = (e) => {
    const options = Array.from(e.target.selectedOptions, option => option.value)
    setFormData(prev => ({ ...prev, eventos: options }))
  }

  const columns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (webhook) => (
        <div>
          <div className="font-semibold">{webhook.nombre}</div>
          <div className="text-xs text-gray-500 truncate max-w-xs">{webhook.url}</div>
        </div>
      )
    },
    {
      key: 'eventos',
      header: 'Eventos',
      render: (webhook) => (
        <div className="flex flex-wrap gap-1">
          {webhook.eventos?.map((evento, idx) => (
            <Badge key={idx} variant="info" size="sm">
              {evento}
            </Badge>
          ))}
        </div>
      )
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (webhook) => (
        <Badge variant={webhook.activo ? 'success' : 'error'}>
          {webhook.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    {
      key: 'ultimo_envio',
      header: 'Último Envío',
      render: (webhook) => webhook.ultimo_envio ? 
        new Date(webhook.ultimo_envio).toLocaleString('es-CO') : 
        'Nunca'
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (webhook) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Play className="w-4 h-4" />}
            onClick={() => handleTest(webhook.id)}
            title="Probar Webhook"
          />
          <Button
            size="sm"
            variant="outline"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => handleViewLogs(webhook.id)}
            title="Ver Logs"
          />
          <Button
            size="sm"
            variant="outline"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => handleEdit(webhook)}
          />
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => handleDelete(webhook.id)}
          />
        </div>
      )
    }
  ]

  const logColumns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (log) => new Date(log.fecha_envio).toLocaleString('es-CO')
    },
    {
      key: 'evento',
      header: 'Evento',
      render: (log) => <Badge variant="info">{log.evento}</Badge>
    },
    {
      key: 'status_code',
      header: 'Status',
      render: (log) => (
        <Badge variant={log.exitoso ? 'success' : 'error'}>
          {log.status_code}
        </Badge>
      )
    },
    {
      key: 'respuesta',
      header: 'Respuesta',
      render: (log) => (
        <div className="text-xs max-w-xs truncate">
          {log.respuesta_dian || 'N/A'}
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-gray-600 mt-1">Notificaciones automáticas de eventos</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={loadWebhooks}
          >
            Actualizar
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreate}
          >
            Nuevo Webhook
          </Button>
        </div>
      </div>

      <Card>
        <Table
          data={webhooks}
          columns={columns}
          loading={loading}
          emptyMessage="No hay webhooks configurados"
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
        title={isEditing ? 'Editar Webhook' : 'Nuevo Webhook'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField
              label="Nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              required
            />

            <FormField
              label="URL"
              name="url"
              type="url"
              value={formData.url}
              onChange={handleInputChange}
              required
              helper="URL completa del endpoint (https://...)"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Eventos <span className="text-red-500">*</span>
              </label>
              <select
                multiple
                name="eventos"
                value={formData.eventos}
                onChange={handleEventosChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                size="5"
                required
              >
                <option value="nomina_creada">Nómina Creada</option>
                <option value="nomina_aprobada">Nómina Aprobada</option>
                <option value="ne_generada">NE Generada</option>
                <option value="ne_firmada">NE Firmada</option>
                <option value="ne_enviada">NE Enviada</option>
                <option value="ne_aceptada">NE Aceptada</option>
                <option value="ne_rechazada">NE Rechazada</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Mantén presionado Ctrl/Cmd para seleccionar múltiples
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Reintentos Máximos"
                name="retry_max"
                type="number"
                min="1"
                max="10"
                value={formData.retry_max}
                onChange={handleInputChange}
                required
              />
              <FormField
                label="Timeout (segundos)"
                name="timeout"
                type="number"
                min="5"
                max="120"
                value={formData.timeout}
                onChange={handleInputChange}
                required
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
                Webhook activo
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

      {/* Modal Logs */}
      <Modal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        title="Historial de Envíos"
        size="xl"
      >
        <Table
          data={logs}
          columns={logColumns}
          loading={loading}
          emptyMessage="No hay logs disponibles"
        />
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowLogsModal(false)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default WebhooksPage
