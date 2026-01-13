import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import configuracionService from '../../services/configuracionService'
import {
  LayoutGridIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  Trash2Icon,
  SaveIcon,
  XIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  PackageIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PaletteIcon,
  CodeIcon
} from 'lucide-react'

const ConfiguracionModulosPage = () => {
  const audit = useAudit('Configuración de Módulos')
  const [loading, setLoading] = useState(true)
  const [modulos, setModulos] = useState([])
  const [filteredModulos, setFilteredModulos] = useState([])
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  
  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActivo, setFilterActivo] = useState('all')
  
  // Modal de crear/editar
  const [showModal, setShowModal] = useState(false)
  const [editingModulo, setEditingModulo] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    modulo: '',
    activo: true,
    version: '',
    configuracion_json: {},
    orden_menu: 0,
    icono: '',
    color: '#3B82F6'
  })

  useEffect(() => {
    loadModulos()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [modulos, searchTerm, filterActivo])

  const loadModulos = async () => {
    try {
      setLoading(true)
      const data = await configuracionService.getModulos()
      console.log('📦 Módulos cargados:', data)
      setModulos(data)
    } catch (error) {
      console.error('Error al cargar módulos:', error)
      showNotification('error', 'Error al cargar los módulos')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    if (!Array.isArray(modulos)) {
      setFilteredModulos([])
      return
    }

    let filtered = [...modulos]

    // Búsqueda por texto
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.modulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.version && m.version.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filtro por estado
    if (filterActivo === 'activo') {
      filtered = filtered.filter(m => m.activo === true)
    } else if (filterActivo === 'inactivo') {
      filtered = filtered.filter(m => m.activo === false)
    }

    setFilteredModulos(filtered)
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const openCreateModal = () => {
    setEditingModulo(null)
    setFormData({
      modulo: '',
      activo: true,
      version: '1.0.0',
      configuracion_json: {},
      orden_menu: modulos.length,
      icono: 'PackageIcon',
      color: '#3B82F6'
    })
    setShowModal(true)
    audit.button('abrir_crear_modulo')
  }

  const openEditModal = (modulo) => {
    setEditingModulo(modulo)
    setFormData({
      modulo: modulo.modulo,
      activo: modulo.activo,
      version: modulo.version || '',
      configuracion_json: modulo.configuracion_json || {},
      orden_menu: modulo.orden_menu,
      icono: modulo.icono || '',
      color: modulo.color || '#3B82F6'
    })
    setShowModal(true)
    audit.button('abrir_editar_modulo', { modulo_id: modulo.id })
  }

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.modulo.trim()) {
      showNotification('error', 'Por favor ingrese el nombre del módulo')
      return
    }

    try {
      setSaving(true)
      
      if (editingModulo) {
        await configuracionService.updateModulo(editingModulo.id, formData)
        audit.button('actualizar_modulo', { modulo_id: editingModulo.id })
        showNotification('success', 'Módulo actualizado exitosamente')
      } else {
        await configuracionService.createModulo(formData)
        audit.button('crear_modulo', { modulo: formData.modulo })
        showNotification('success', 'Módulo creado exitosamente')
      }
      
      setShowModal(false)
      await loadModulos()
    } catch (error) {
      console.error('Error al guardar:', error)
      showNotification('error', 'Error al guardar el módulo')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (modulo) => {
    if (!window.confirm(`¿Está seguro de eliminar el módulo "${modulo.modulo}"?`)) {
      return
    }

    try {
      await configuracionService.deleteModulo(modulo.id)
      audit.button('eliminar_modulo', { modulo_id: modulo.id })
      showNotification('success', 'Módulo eliminado exitosamente')
      await loadModulos()
    } catch (error) {
      console.error('Error al eliminar:', error)
      showNotification('error', 'Error al eliminar el módulo')
    }
  }

  const handleToggle = async (modulo) => {
    try {
      await configuracionService.toggleModulo(modulo.id)
      audit.button('toggle_modulo', { modulo_id: modulo.id, activo: !modulo.activo })
      showNotification('success', `Módulo ${!modulo.activo ? 'activado' : 'desactivado'}`)
      await loadModulos()
    } catch (error) {
      console.error('Error al cambiar estado:', error)
      showNotification('error', 'Error al cambiar el estado del módulo')
    }
  }

  const handleMoveUp = async (modulo, currentIndex) => {
    if (currentIndex === 0) return
    
    try {
      const prevModulo = filteredModulos[currentIndex - 1]
      
      // Intercambiar orden_menu
      await configuracionService.updateModulo(modulo.id, { orden_menu: prevModulo.orden_menu })
      await configuracionService.updateModulo(prevModulo.id, { orden_menu: modulo.orden_menu })
      
      audit.button('mover_modulo_arriba', { modulo_id: modulo.id })
      showNotification('success', 'Orden actualizado')
      await loadModulos()
    } catch (error) {
      console.error('Error al mover:', error)
      showNotification('error', 'Error al cambiar el orden')
    }
  }

  const handleMoveDown = async (modulo, currentIndex) => {
    if (currentIndex === filteredModulos.length - 1) return
    
    try {
      const nextModulo = filteredModulos[currentIndex + 1]
      
      // Intercambiar orden_menu
      await configuracionService.updateModulo(modulo.id, { orden_menu: nextModulo.orden_menu })
      await configuracionService.updateModulo(nextModulo.id, { orden_menu: modulo.orden_menu })
      
      audit.button('mover_modulo_abajo', { modulo_id: modulo.id })
      showNotification('success', 'Orden actualizado')
      await loadModulos()
    } catch (error) {
      console.error('Error al mover:', error)
      showNotification('error', 'Error al cambiar el orden')
    }
  }

  const iconos = [
    'PackageIcon', 'UsersIcon', 'FileTextIcon', 'DollarSignIcon', 'BarChartIcon',
    'SettingsIcon', 'ShieldIcon', 'ClipboardIcon', 'CalendarIcon', 'BriefcaseIcon',
    'HomeIcon', 'LayersIcon', 'DatabaseIcon', 'BoxIcon', 'TruckIcon'
  ]

  const colores = [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Morado', value: '#8B5CF6' },
    { name: 'Rojo', value: '#EF4444' },
    { name: 'Naranja', value: '#F59E0B' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Índigo', value: '#6366F1' },
    { name: 'Cyan', value: '#06B6D4' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center space-x-3">
          <Loader2Icon className="w-8 h-8 text-green-500 animate-spin" />
          <span className="text-gray-600">Cargando módulos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${
          notification.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
        }`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckCircleIcon className="w-6 h-6" /> : <AlertCircleIcon className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <LayoutGridIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Configuración de Módulos</h1>
              <p className="text-purple-100 mt-1">Gestiona los módulos activos del sistema</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-white text-purple-600 px-6 py-3 rounded-xl hover:bg-purple-50 transition-all font-semibold shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nuevo Módulo</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar módulos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {/* Filtro por estado */}
          <div>
            <select
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
            >
              <option value="all">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Mostrando <strong>{filteredModulos.length}</strong> de <strong>{modulos.length}</strong> módulos
        </div>
      </div>

      {/* Lista de módulos - Vista de tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModulos.length === 0 ? (
          <div className="col-span-full backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-12 border border-gray-200/50">
            <div className="flex flex-col items-center space-y-3 text-gray-500">
              <PackageIcon className="w-16 h-16 text-gray-300" />
              <p className="text-lg font-semibold">No se encontraron módulos</p>
              <p className="text-sm">Intenta con otros filtros o crea un nuevo módulo</p>
            </div>
          </div>
        ) : (
          filteredModulos.map((modulo, index) => (
            <div
              key={modulo.id}
              className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all"
            >
              {/* Header de la tarjeta */}
              <div className="p-6" style={{ backgroundColor: modulo.color || '#3B82F6' }}>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                      <PackageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{modulo.modulo}</h3>
                      {modulo.version && (
                        <p className="text-white/80 text-sm">v{modulo.version}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(modulo)}
                    className="focus:outline-none"
                    title={modulo.activo ? 'Desactivar' : 'Activar'}
                  >
                    {modulo.activo ? (
                      <ToggleRightIcon className="w-8 h-8 text-white hover:text-green-200" />
                    ) : (
                      <ToggleLeftIcon className="w-8 h-8 text-white/50 hover:text-white/70" />
                    )}
                  </button>
                </div>
              </div>

              {/* Body de la tarjeta */}
              <div className="p-6 space-y-4">
                {/* Estado */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Estado:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    modulo.activo 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-gray-100 text-gray-700 border border-gray-300'
                  }`}>
                    {modulo.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Orden */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Orden en menú:</span>
                  <span className="font-semibold text-gray-900">{modulo.orden_menu}</span>
                </div>

                {/* Icono */}
                {modulo.icono && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Icono:</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{modulo.icono}</span>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  {/* Controles de orden */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleMoveUp(modulo, index)}
                      disabled={index === 0}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Mover arriba"
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(modulo, index)}
                      disabled={index === filteredModulos.length - 1}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Mover abajo"
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Acciones CRUD */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(modulo)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Editar"
                    >
                      <EditIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(modulo)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Eliminar"
                    >
                      <Trash2Icon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">
                {editingModulo ? 'Editar Módulo' : 'Nuevo Módulo'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Módulo *</label>
                  <input
                    type="text"
                    value={formData.modulo}
                    onChange={(e) => handleInputChange('modulo', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    required
                    placeholder="Ej: Recursos Humanos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Versión</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => handleInputChange('version', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="1.0.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Orden en Menú *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.orden_menu}
                    onChange={(e) => handleInputChange('orden_menu', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Icono</label>
                  <select
                    value={formData.icono}
                    onChange={(e) => handleInputChange('icono', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="">Sin icono</option>
                    {iconos.map(icono => (
                      <option key={icono} value={icono}>{icono}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Color del Módulo</label>
                  <div className="grid grid-cols-4 gap-3">
                    {colores.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleInputChange('color', color.value)}
                        className={`p-4 rounded-xl border-4 transition-all ${
                          formData.color === color.value 
                            ? 'border-purple-600 scale-110' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {formData.color === color.value && (
                          <CheckCircleIcon className="w-6 h-6 text-white mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => handleInputChange('activo', e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Módulo activo</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Configuración JSON (opcional)
                  </label>
                  <textarea
                    value={JSON.stringify(formData.configuracion_json, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        handleInputChange('configuracion_json', parsed)
                      } catch (error) {
                        // Mantener el texto mientras se escribe
                      }
                    }}
                    rows="4"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all font-mono text-sm"
                    placeholder='{"key": "value"}'
                  />
                  <p className="text-xs text-gray-500 mt-1">Configuración adicional en formato JSON</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  <XIcon className="w-5 h-5 inline mr-2" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
                >
                  {saving ? (
                    <>
                      <Loader2Icon className="w-5 h-5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-5 h-5" />
                      <span>{editingModulo ? 'Actualizar' : 'Crear'} Módulo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConfiguracionModulosPage
