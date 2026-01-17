import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Headphones, Plus, Search, Filter, AlertCircle, Clock, CheckCircle2, XCircle, Loader } from 'lucide-react'
import ayudaService from '../../services/ayudaService'

/**
 * ════════════════════════════════════════════════════════════
 * SOPORTE - TICKETS
 * ════════════════════════════════════════════════════════════
 * 
 * Página principal de soporte con:
 * - Formulario para crear nuevos tickets
 * - Listado de tickets recientes
 * - Filtrado por estado
 * 
 * @component
 */
const SoportePage = () => {
  const [categorias, setCategorias] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [estadoFiltro, setEstadoFiltro] = useState(null)

  const [formData, setFormData] = useState({
    asunto: '',
    descripcion: '',
    prioridad: 'media',
    categoria: ''
  })

  const [errores, setErrores] = useState({})

  useEffect(() => {
    cargarDatos()
  }, [estadoFiltro])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [categoriasData, ticketsData] = await Promise.all([
        ayudaService.getCategoriasActivas(),
        ayudaService.getSolicitudes({
          estado: estadoFiltro || undefined,
          ordering: '-creado_en'
        })
      ])
      setCategorias(categoriasData)
      setTickets(ticketsData.results || ticketsData)
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Limpiar error al escribir
    if (errores[name]) {
      setErrores(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validarFormulario = () => {
    const nuevosErrores = {}

    if (!formData.asunto.trim()) {
      nuevosErrores.asunto = 'El asunto es requerido'
    }

    if (!formData.descripcion.trim()) {
      nuevosErrores.descripcion = 'La descripción es requerida'
    } else if (formData.descripcion.trim().length < 20) {
      nuevosErrores.descripcion = 'La descripción debe tener al menos 20 caracteres'
    }

    if (!formData.categoria) {
      nuevosErrores.categoria = 'Selecciona una categoría'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validarFormulario()) {
      return
    }

    try {
      setEnviando(true)
      await ayudaService.createSolicitud(formData)
      
      // Resetear formulario
      setFormData({
        asunto: '',
        descripcion: '',
        prioridad: 'media',
        categoria: ''
      })
      setMostrarFormulario(false)
      
      // Recargar tickets
      cargarDatos()
      
      // Mostrar mensaje de éxito (puedes usar un toast aquí)
      alert('¡Ticket creado exitosamente! Te responderemos pronto.')
    } catch (error) {
      console.error('Error creando ticket:', error)
      alert('Hubo un error al crear el ticket. Por favor intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'critica':
        return 'bg-red-100 text-red-600'
      case 'alta':
        return 'bg-orange-100 text-orange-600'
      case 'media':
        return 'bg-yellow-100 text-yellow-600'
      case 'baja':
        return 'bg-green-100 text-green-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'abierta':
        return <AlertCircle className="h-5 w-5 text-blue-600" />
      case 'en_proceso':
        return <Loader className="h-5 w-5 text-yellow-600" />
      case 'esperando_usuario':
        return <Clock className="h-5 w-5 text-orange-600" />
      case 'resuelta':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'cerrada':
        return <XCircle className="h-5 w-5 text-gray-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getEstadoLabel = (estado) => {
    const labels = {
      'abierta': 'Abierta',
      'en_proceso': 'En Proceso',
      'esperando_usuario': 'Esperando Respuesta',
      'resuelta': 'Resuelta',
      'cerrada': 'Cerrada'
    }
    return labels[estado] || estado
  }

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Soporte Técnico</h1>
          <p className="text-gray-600 mt-2">
            Crea un ticket y nuestro equipo te ayudará
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/ayuda/soporte/mis-solicitudes"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Ver Mis Tickets
          </Link>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
          >
            <Plus className="h-5 w-5" />
            Nuevo Ticket
          </button>
        </div>
      </div>

      {/* ═══════════ FORMULARIO DE NUEVO TICKET ═══════════ */}
      {mostrarFormulario && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Headphones className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Crear Nuevo Ticket</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Asunto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Asunto *
              </label>
              <input
                type="text"
                name="asunto"
                value={formData.asunto}
                onChange={handleInputChange}
                placeholder="Describe brevemente tu problema"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errores.asunto ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errores.asunto && (
                <p className="mt-1 text-sm text-red-600">{errores.asunto}</p>
              )}
            </div>

            {/* Categoría y Prioridad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errores.categoria ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
                {errores.categoria && (
                  <p className="mt-1 text-sm text-red-600">{errores.categoria}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prioridad *
                </label>
                <select
                  name="prioridad"
                  value={formData.prioridad}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción del Problema *
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                rows="6"
                placeholder="Describe tu problema con el mayor detalle posible. Incluye pasos para reproducirlo si aplica."
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errores.descripcion ? 'border-red-500' : 'border-gray-300'
                }`}
              ></textarea>
              {errores.descripcion && (
                <p className="mt-1 text-sm text-red-600">{errores.descripcion}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.descripcion.length} caracteres (mínimo 20)
              </p>
            </div>

            {/* Botones */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={enviando}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {enviando ? 'Enviando...' : 'Crear Ticket'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(false)
                  setFormData({
                    asunto: '',
                    descripcion: '',
                    prioridad: 'media',
                    categoria: ''
                  })
                  setErrores({})
                }}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════ FILTROS ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Estado:</span>
          <button
            onClick={() => setEstadoFiltro(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              estadoFiltro === null
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {['abierta', 'en_proceso', 'esperando_usuario', 'resuelta'].map((estado) => (
            <button
              key={estado}
              onClick={() => setEstadoFiltro(estado)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                estadoFiltro === estado
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getEstadoLabel(estado)}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ LISTADO DE TICKETS ═══════════ */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
          <Headphones className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No hay tickets
          </h3>
          <p className="text-gray-600 mb-6">
            No se encontraron tickets con los filtros seleccionados
          </p>
          <button
            onClick={() => setMostrarFormulario(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Crear Primer Ticket
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Creado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          #{ticket.id} - {ticket.asunto}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {ticket.descripcion}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getPrioridadColor(ticket.prioridad)}`}>
                        {ticket.prioridad_display || ticket.prioridad}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getEstadoIcon(ticket.estado)}
                        <span className="text-sm font-medium text-gray-900">
                          {getEstadoLabel(ticket.estado)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatFecha(ticket.creado_en)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/ayuda/soporte/${ticket.id}`}
                        className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                      >
                        Ver Detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default SoportePage
