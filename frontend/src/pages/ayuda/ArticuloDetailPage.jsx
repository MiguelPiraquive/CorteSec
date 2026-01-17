import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Eye, 
  Clock, 
  User, 
  Tag, 
  ThumbsUp, 
  ThumbsDown,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
  Share2
} from 'lucide-react'
import ayudaService from '../../services/ayudaService'
import ReactMarkdown from 'react-markdown'

/**
 * ════════════════════════════════════════════════════════════
 * ARTÍCULO DE AYUDA - DETALLE
 * ════════════════════════════════════════════════════════════
 * 
 * Vista detallada de un artículo con:
 * - Contenido completo en Markdown
 * - Votación útil/no útil
 * - Recursos relacionados
 * - Artículos relacionados
 * 
 * @component
 */
const ArticuloDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [articulo, setArticulo] = useState(null)
  const [recursos, setRecursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [votando, setVotando] = useState(false)
  const [yaVoto, setYaVoto] = useState(false)

  useEffect(() => {
    cargarArticulo()
  }, [id])

  const cargarArticulo = async () => {
    try {
      setLoading(true)
      const data = await ayudaService.getArticulo(id)
      setArticulo(data)
      
      // Cargar recursos relacionados
      if (data.recursos && data.recursos.length > 0) {
        setRecursos(data.recursos)
      }
    } catch (error) {
      console.error('Error cargando artículo:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVotar = async (util) => {
    if (yaVoto || votando) return
    
    try {
      setVotando(true)
      await ayudaService.votarArticulo(id, util)
      setYaVoto(true)
      
      // Actualizar contador local
      setArticulo(prev => ({
        ...prev,
        util_si: util ? prev.util_si + 1 : prev.util_si,
        util_no: !util ? prev.util_no + 1 : prev.util_no
      }))
    } catch (error) {
      console.error('Error votando:', error)
    } finally {
      setVotando(false)
    }
  }

  const handleDescargarRecurso = async (recursoId) => {
    try {
      const data = await ayudaService.accederRecurso(recursoId)
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch (error) {
      console.error('Error accediendo al recurso:', error)
    }
  }

  const getIconoRecurso = (tipo) => {
    switch (tipo) {
      case 'archivo':
        return <FileText className="h-5 w-5" />
      case 'video':
        return <Video className="h-5 w-5" />
      case 'imagen':
        return <ImageIcon className="h-5 w-5" />
      case 'enlace':
        return <ExternalLink className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!articulo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Artículo no encontrado</h2>
        <Link to="/ayuda/articulos" className="text-blue-600 hover:text-blue-700">
          Volver a artículos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ═══════════ BREADCRUMB ═══════════ */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link to="/ayuda" className="hover:text-blue-600">Centro de Ayuda</Link>
        <span>/</span>
        <Link to="/ayuda/articulos" className="hover:text-blue-600">Artículos</Link>
        <span>/</span>
        <span className="text-gray-900">{articulo.titulo}</span>
      </div>

      {/* ═══════════ HEADER ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
        {articulo.categoria_nombre && (
          <span className="inline-block bg-blue-100 text-blue-600 text-sm font-semibold px-3 py-1 rounded-full mb-4">
            {articulo.categoria_nombre}
          </span>
        )}
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {articulo.titulo}
        </h1>
        
        {articulo.resumen && (
          <p className="text-xl text-gray-600 mb-6">
            {articulo.resumen}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 pb-6 border-b border-gray-200">
          {articulo.autor_nombre && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{articulo.autor_nombre}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatFecha(articulo.fecha_publicacion)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>{articulo.vistas} vistas</span>
          </div>
          <button className="flex items-center gap-2 hover:text-blue-600">
            <Share2 className="h-4 w-4" />
            <span>Compartir</span>
          </button>
        </div>

        {/* Tags */}
        {articulo.tags && articulo.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {articulo.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════ CONTENIDO ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown>{articulo.contenido}</ReactMarkdown>
        </div>
      </div>

      {/* ═══════════ RECURSOS ═══════════ */}
      {recursos.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recursos Relacionados</h2>
          <div className="space-y-3">
            {recursos.map((recurso) => (
              <div
                key={recurso.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    {getIconoRecurso(recurso.tipo)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{recurso.nombre}</h3>
                    {recurso.descripcion && (
                      <p className="text-sm text-gray-600">{recurso.descripcion}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDescargarRecurso(recurso.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {recurso.tipo === 'enlace' ? 'Abrir' : 'Descargar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ VOTACIÓN ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ¿Te resultó útil este artículo?
        </h2>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => handleVotar(true)}
            disabled={yaVoto || votando}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              yaVoto
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            <ThumbsUp className="h-5 w-5" />
            Sí ({articulo.util_si || 0})
          </button>
          <button
            onClick={() => handleVotar(false)}
            disabled={yaVoto || votando}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              yaVoto
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
          >
            <ThumbsDown className="h-5 w-5" />
            No ({articulo.util_no || 0})
          </button>
        </div>
        {yaVoto && (
          <p className="text-green-600 mt-4">¡Gracias por tu feedback!</p>
        )}
      </div>

      {/* ═══════════ FOOTER ═══════════ */}
      <div className="flex justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Volver
        </button>
        <Link
          to="/ayuda/soporte"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          ¿Necesitas más ayuda?
        </Link>
      </div>
    </div>
  )
}

export default ArticuloDetailPage
