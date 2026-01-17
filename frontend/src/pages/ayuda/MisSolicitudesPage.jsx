import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  Loader,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  User
} from 'lucide-react'
import ayudaService from '../../services/ayudaService'

/**
 * ════════════════════════════════════════════════════════════
 * MIS SOLICITUDES - DETALLE DE TICKET
 * ════════════════════════════════════════════════════════════
 * 
 * Vista detallada de un ticket con:
 * - Timeline de respuestas
 * - Formulario para responder
 * - Información completa del ticket
 * 
 * @component
 */
const MisSolicitudesDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [respuestas, setRespuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [nuevaRespuesta, setNuevaRespuesta] = useState('')

  useEffect(() => {
    cargarTicket()
  }, [id])

  const cargarTicket = async () => {
    try {
      setLoading(true)
      const data = await ayudaService.getSolicitud(id)
      setTicket(data)
      setRespuestas(data.respuestas || [])
    } catch (error) {
      console.error('Error cargando ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarRespuesta = async (e) => {
    e.preventDefault()

    if (!nuevaRespuesta.trim()) return

    try {
      setEnviando(true)
      await ayudaService.responderSolicitud(id, nuevaRespuesta, false)
      setNuevaRespuesta('')
      cargarTicket() // Recargar para ver la nueva respuesta
    } catch (error) {
      console.error('Error enviando respuesta:', error)
      alert('Hubo un error al enviar la respuesta')
    } finally {
      setEnviando(false)
    }
  }

  const handleCerrarTicket = async () => {
    if (!confirm('¿Estás seguro de cerrar este ticket?')) return

    try {
      await ayudaService.cerrarSolicitud(id)
      cargarTicket()
    } catch (error) {
      console.error('Error cerrando ticket:', error)
      alert('Hubo un error al cerrar el ticket')
    }
  }

  const handleReabrirTicket = async () => {
    try {
      await ayudaService.reabrirSolicitud(id)
      cargarTicket()
    } catch (error) {
      console.error('Error reabriendo ticket:', error)
      alert('Hubo un error al reabrir el ticket')
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
        return <AlertCircle className="h-6 w-6 text-blue-600" />
      case 'en_proceso':
        return <Loader className="h-6 w-6 text-yellow-600" />
      case 'esperando_usuario':
        return <Clock className="h-6 w-6 text-orange-600" />
      case 'resuelta':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />
      case 'cerrada':
        return <XCircle className="h-6 w-6 text-gray-600" />
      default:
        return <AlertCircle className="h-6 w-6 text-gray-600" />
    }
  }

  const getEstadoLabel = (estado) => {
    const labels = {
      'abierta': 'Abierta',
      'en_proceso': 'En Proceso',
      'esperando_usuario': 'Esperando tu Respuesta',
      'resuelta': 'Resuelta',
      'cerrada': 'Cerrada'
    }
    return labels[estado] || estado
  }

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ticket no encontrado</h2>
        <Link to="/ayuda/soporte" className="text-orange-600 hover:text-orange-700">
          Volver a soporte
        </Link>
      </div>
    )
  }

  const puedeResponder = ticket.estado !== 'cerrada' && ticket.estado !== 'resuelta'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Volver
        </button>

        <div className="flex items-center gap-3">
          {ticket.estado === 'cerrada' ? (
            <button
              onClick={handleReabrirTicket}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reabrir Ticket
            </button>
          ) : ticket.estado === 'resuelta' && (
            <button
              onClick={handleCerrarTicket}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar Ticket
            </button>
          )}
        </div>
      </div>

      {/* ═══════════ INFORMACIÓN DEL TICKET ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-gray-500">
                Ticket #{ticket.id}
              </span>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getPrioridadColor(ticket.prioridad)}`}>
                Prioridad: {ticket.prioridad_display || ticket.prioridad}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {ticket.asunto}
            </h1>
            <p className="text-gray-600 mb-4">
              Creado el {formatFecha(ticket.creado_en)}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 bg-gray-50 p-4 rounded-lg">
            {getEstadoIcon(ticket.estado)}
            <span className="text-sm font-semibold text-gray-900">
              {getEstadoLabel(ticket.estado)}
            </span>
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Descripción del Problema</h3>
          <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
            {ticket.descripcion}
          </p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ticket.categoria_nombre && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Categoría</p>
              <p className="text-gray-900">{ticket.categoria_nombre}</p>
            </div>
          )}
          {ticket.usuario_nombre && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Creado por</p>
              <p className="text-gray-900">{ticket.usuario_nombre}</p>
            </div>
          )}
          {ticket.asignado_a_nombre && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Asignado a</p>
              <p className="text-gray-900">{ticket.asignado_a_nombre}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ TIMELINE DE RESPUESTAS ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Conversación ({respuestas.length})
          </h2>
        </div>

        <div className="space-y-6">
          {respuestas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay respuestas aún. Sé el primero en responder.
            </div>
          ) : (
            respuestas.map((respuesta, index) => (
              <div
                key={respuesta.id}
                className={`relative pl-8 pb-6 ${
                  index !== respuestas.length - 1 ? 'border-l-2 border-gray-200' : ''
                }`}
              >
                {/* Punto en la línea del timeline */}
                <div className={`absolute left-0 top-0 -ml-2 w-4 h-4 rounded-full border-2 ${
                  respuesta.es_interna
                    ? 'bg-yellow-500 border-yellow-200'
                    : respuesta.usuario === ticket.usuario
                    ? 'bg-blue-500 border-blue-200'
                    : 'bg-green-500 border-green-200'
                }`}></div>

                {/* Contenido de la respuesta */}
                <div className={`rounded-lg p-6 ${
                  respuesta.es_interna
                    ? 'bg-yellow-50 border border-yellow-200'
                    : respuesta.usuario === ticket.usuario
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        respuesta.es_interna
                          ? 'bg-yellow-200 text-yellow-700'
                          : respuesta.usuario === ticket.usuario
                          ? 'bg-blue-200 text-blue-700'
                          : 'bg-green-200 text-green-700'
                      }`}>
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {respuesta.usuario_nombre || 'Usuario'}
                          {respuesta.es_interna && (
                            <span className="ml-2 text-xs bg-yellow-200 text-yellow-700 px-2 py-1 rounded">
                              Nota Interna
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatFecha(respuesta.creado_en)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {respuesta.contenido}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══════════ FORMULARIO DE RESPUESTA ═══════════ */}
      {puedeResponder && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Agregar Respuesta
          </h3>
          <form onSubmit={handleEnviarRespuesta} className="space-y-4">
            <textarea
              value={nuevaRespuesta}
              onChange={(e) => setNuevaRespuesta(e.target.value)}
              rows="5"
              placeholder="Escribe tu respuesta aquí..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            ></textarea>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={enviando || !nuevaRespuesta.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                <Send className="h-5 w-5" />
                {enviando ? 'Enviando...' : 'Enviar Respuesta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════ BANNER SI ESTÁ CERRADO ═══════════ */}
      {ticket.estado === 'cerrada' && (
        <div className="bg-gray-100 rounded-lg p-6 text-center border border-gray-300">
          <XCircle className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Este ticket está cerrado
          </h3>
          <p className="text-gray-600 mb-4">
            Si necesitas más ayuda, puedes reabrir este ticket o crear uno nuevo
          </p>
        </div>
      )}
    </div>
  )
}

export default MisSolicitudesDetailPage
