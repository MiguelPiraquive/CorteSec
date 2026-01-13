import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import configuracionService from '../../services/configuracionService'
import {
  SettingsIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  EditIcon,
  Trash2Icon,
  SaveIcon,
  XIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CodeIcon,
  Loader2Icon,
  ListIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  LockIcon
} from 'lucide-react'

const ParametrosSistemaPage = () => {
  const audit = useAudit('Parámetros del Sistema')
  const [loading, setLoading] = useState(true)
  const [parametros, setParametros] = useState([])
  const [filteredParametros, setFilteredParametros] = useState([])
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  
  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('all')
  const [filterActivo, setFilterActivo] = useState('all')
  
  // Modal de crear/editar
  const [showModal, setShowModal] = useState(false)
  const [editingParametro, setEditingParametro] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo_valor: 'string',
    valor: '',
    valor_defecto: '',
    es_sistema: false,
    activo: true
  })

  useEffect(() => {
    loadParametros()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [parametros, searchTerm, filterTipo, filterActivo])

  const loadParametros = async () => {
    try {
      setLoading(true)
      const data = await configuracionService.getParametros()
      console.log('📋 Parámetros cargados:', data)
      setParametros(data)
    } catch (error) {
      console.error('Error al cargar parámetros:', error)
      showNotification('error', 'Error al cargar los parámetros')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    if (!Array.isArray(parametros)) {
      setFilteredParametros([])
      return
    }

    let filtered = [...parametros]

    // Búsqueda por texto
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filtro por tipo
    if (filterTipo === 'sistema') {
      filtered = filtered.filter(p => p.es_sistema === true)
    } else if (filterTipo === 'usuario') {
      filtered = filtered.filter(p => p.es_sistema === false)
    }

    // Filtro por activo
    if (filterActivo === 'activo') {
      filtered = filtered.filter(p => p.activo === true)
    } else if (filterActivo === 'inactivo') {
      filtered = filtered.filter(p => p.activo === false)
    }

    setFilteredParametros(filtered)
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const openCreateModal = () => {
    setEditingParametro(null)
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      tipo_valor: 'string',
      valor: '',
      valor_defecto: '',
      es_sistema: false,
      activo: true
    })
    setShowModal(true)
    audit.button('abrir_crear_parametro')
  }

  const openEditModal = (parametro) => {
    setEditingParametro(parametro)
    setFormData({
      codigo: parametro.codigo,
      nombre: parametro.nombre,
      descripcion: parametro.descripcion || '',
      tipo_valor: parametro.tipo_valor,
      valor: parametro.valor,
      valor_defecto: parametro.valor_defecto || '',
      es_sistema: parametro.es_sistema,
      activo: parametro.activo
    })
    setShowModal(true)
    audit.button('abrir_editar_parametro', { parametro_id: parametro.id })
  }

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.codigo.trim() || !formData.nombre.trim() || !formData.valor.trim()) {
      showNotification('error', 'Por favor complete los campos obligatorios')
      return
    }

    try {
      setSaving(true)
      
      if (editingParametro) {
        await configuracionService.updateParametro(editingParametro.id, formData)
        audit.button('actualizar_parametro', { parametro_id: editingParametro.id })
        showNotification('success', 'Parámetro actualizado exitosamente')
      } else {
        await configuracionService.createParametro(formData)
        audit.button('crear_parametro', { codigo: formData.codigo })
        showNotification('success', 'Parámetro creado exitosamente')
      }
      
      setShowModal(false)
      await loadParametros()
    } catch (error) {
      console.error('Error al guardar:', error)
      showNotification('error', 'Error al guardar el parámetro')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (parametro) => {
    if (parametro.es_sistema) {
      showNotification('error', 'No se puede eliminar un parámetro del sistema')
      return
    }

    if (!window.confirm(`¿Está seguro de eliminar el parámetro "${parametro.nombre}"?`)) {
      return
    }

    try {
      await configuracionService.deleteParametro(parametro.id)
      audit.button('eliminar_parametro', { parametro_id: parametro.id })
      showNotification('success', 'Parámetro eliminado exitosamente')
      await loadParametros()
    } catch (error) {
      console.error('Error al eliminar:', error)
      showNotification('error', 'Error al eliminar el parámetro')
    }
  }

  const handleToggleActivo = async (parametro) => {
    try {
      await configuracionService.updateParametro(parametro.id, {
        ...parametro,
        activo: !parametro.activo
      })
      audit.button('toggle_parametro', { parametro_id: parametro.id, activo: !parametro.activo })
      showNotification('success', `Parámetro ${!parametro.activo ? 'activado' : 'desactivado'}`)
      await loadParametros()
    } catch (error) {
      console.error('Error al cambiar estado:', error)
      showNotification('error', 'Error al cambiar el estado del parámetro')
    }
  }

  const getTipoBadge = (tipo) => {
    const tipos = {
      string: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Texto' },
      integer: { color: 'bg-purple-100 text-purple-700 border-purple-300', label: 'Entero' },
      decimal: { color: 'bg-indigo-100 text-indigo-700 border-indigo-300', label: 'Decimal' },
      boolean: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Booleano' },
      date: { color: 'bg-orange-100 text-orange-700 border-orange-300', label: 'Fecha' },
      json: { color: 'bg-pink-100 text-pink-700 border-pink-300', label: 'JSON' }
    }
    const tipoInfo = tipos[tipo] || tipos.string
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${tipoInfo.color}`}>
        {tipoInfo.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center space-x-3">
          <Loader2Icon className="w-8 h-8 text-green-500 animate-spin" />
          <span className="text-gray-600">Cargando parámetros...</span>
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
      <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <CodeIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Parámetros del Sistema</h1>
              <p className="text-blue-100 mt-1">Gestiona los parámetros configurables del sistema</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-white text-purple-600 px-6 py-3 rounded-xl hover:bg-blue-50 transition-all font-semibold shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nuevo Parámetro</span>
          </button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar parámetros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {/* Filtro por tipo */}
          <div>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
            >
              <option value="all">Todos los tipos</option>
              <option value="sistema">Parámetros del sistema</option>
              <option value="usuario">Parámetros de usuario</option>
            </select>
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

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando <strong>{filteredParametros.length}</strong> de <strong>{parametros.length}</strong> parámetros
          </div>
        </div>
      </div>

      {/* Lista de parámetros */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Código</th>
                <th className="px-6 py-4 text-left font-semibold">Nombre</th>
                <th className="px-6 py-4 text-left font-semibold">Tipo</th>
                <th className="px-6 py-4 text-left font-semibold">Valor</th>
                <th className="px-6 py-4 text-center font-semibold">Sistema</th>
                <th className="px-6 py-4 text-center font-semibold">Estado</th>
                <th className="px-6 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredParametros.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-3">
                      <ListIcon className="w-12 h-12 text-gray-300" />
                      <p className="text-lg font-semibold">No se encontraron parámetros</p>
                      <p className="text-sm">Intenta con otros filtros o crea un nuevo parámetro</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredParametros.map((parametro, index) => (
                  <tr key={parametro.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <CodeIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm font-semibold text-gray-900">{parametro.codigo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-900">{parametro.nombre}</div>
                        {parametro.descripcion && (
                          <div className="text-xs text-gray-500 mt-1">{parametro.descripcion}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTipoBadge(parametro.tipo_valor)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <span className="text-sm text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                          {parametro.valor.length > 50 ? `${parametro.valor.substring(0, 50)}...` : parametro.valor}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {parametro.es_sistema ? (
                        <div className="flex justify-center">
                          <LockIcon className="w-5 h-5 text-yellow-500" title="Parámetro del sistema" />
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActivo(parametro)}
                        className="focus:outline-none"
                        title={parametro.activo ? 'Desactivar' : 'Activar'}
                      >
                        {parametro.activo ? (
                          <ToggleRightIcon className="w-8 h-8 text-green-500 hover:text-green-600" />
                        ) : (
                          <ToggleLeftIcon className="w-8 h-8 text-gray-400 hover:text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(parametro)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <EditIcon className="w-5 h-5" />
                        </button>
                        {!parametro.es_sistema && (
                          <button
                            onClick={() => handleDelete(parametro)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <Trash2Icon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">
                {editingParametro ? 'Editar Parámetro' : 'Nuevo Parámetro'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código *</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => handleInputChange('codigo', e.target.value.toUpperCase())}
                    disabled={editingParametro && editingParametro.es_sistema}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all font-mono disabled:opacity-50"
                    required
                    placeholder="PARAM_CODE"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Valor *</label>
                  <select
                    value={formData.tipo_valor}
                    onChange={(e) => handleInputChange('tipo_valor', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    required
                  >
                    <option value="string">Texto</option>
                    <option value="integer">Número entero</option>
                    <option value="decimal">Número decimal</option>
                    <option value="boolean">Verdadero/Falso</option>
                    <option value="date">Fecha</option>
                    <option value="json">JSON</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    required
                    placeholder="Nombre descriptivo del parámetro"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                    rows="3"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="Descripción detallada del parámetro"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Valor *</label>
                  {formData.tipo_valor === 'boolean' ? (
                    <select
                      value={formData.valor}
                      onChange={(e) => handleInputChange('valor', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                      required
                    >
                      <option value="true">Verdadero</option>
                      <option value="false">Falso</option>
                    </select>
                  ) : formData.tipo_valor === 'json' ? (
                    <textarea
                      value={formData.valor}
                      onChange={(e) => handleInputChange('valor', e.target.value)}
                      rows="4"
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all font-mono text-sm"
                      required
                      placeholder='{"key": "value"}'
                    />
                  ) : (
                    <input
                      type={formData.tipo_valor === 'integer' || formData.tipo_valor === 'decimal' ? 'number' : formData.tipo_valor === 'date' ? 'date' : 'text'}
                      step={formData.tipo_valor === 'decimal' ? '0.01' : undefined}
                      value={formData.valor}
                      onChange={(e) => handleInputChange('valor', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                      required
                      placeholder="Valor del parámetro"
                    />
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Valor por Defecto</label>
                  <input
                    type="text"
                    value={formData.valor_defecto}
                    onChange={(e) => handleInputChange('valor_defecto', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="Valor por defecto (opcional)"
                  />
                </div>

                {!editingParametro && (
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.es_sistema}
                        onChange={(e) => handleInputChange('es_sistema', e.target.checked)}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">
                        Es parámetro del sistema (no se podrá eliminar)
                      </span>
                    </label>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => handleInputChange('activo', e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Parámetro activo</span>
                  </label>
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
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
                >
                  {saving ? (
                    <>
                      <Loader2Icon className="w-5 h-5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-5 h-5" />
                      <span>{editingParametro ? 'Actualizar' : 'Crear'} Parámetro</span>
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

export default ParametrosSistemaPage
