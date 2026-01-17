import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  BookOpen, 
  HelpCircle, 
  GraduationCap, 
  Headphones, 
  Search, 
  TrendingUp, 
  Clock, 
  Eye,
  ArrowRight,
  Sparkles,
  FileText
} from 'lucide-react'
import ayudaService from '../../services/ayudaService'

/**
 * ════════════════════════════════════════════════════════════
 * CENTRO DE AYUDA - PÁGINA PRINCIPAL
 * ════════════════════════════════════════════════════════════
 * 
 * Dashboard principal del centro de ayuda con:
 * - Búsqueda rápida
 * - Accesos directos a secciones
 * - Artículos populares y recientes
 * - FAQs destacadas
 * - Estadísticas generales
 * 
 * @component
 */
const CentroAyudaPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [estadisticas, setEstadisticas] = useState(null)
  const [articulosPopulares, setArticulosPopulares] = useState([])
  const [articulosRecientes, setArticulosRecientes] = useState([])
  const [faqsPopulares, setFaqsPopulares] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [stats, populares, recientes, faqs] = await Promise.all([
        ayudaService.getEstadisticas(),
        ayudaService.getArticulosPopulares(),
        ayudaService.getArticulosRecientes(),
        ayudaService.getFAQsPopulares()
      ])
      
      setEstadisticas(stats)
      setArticulosPopulares(populares.slice(0, 4))
      setArticulosRecientes(recientes.slice(0, 4))
      setFaqsPopulares(faqs.slice(0, 5))
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/ayuda/buscar?q=${encodeURIComponent(searchQuery)}`
    }
  }

  const categorias = [
    {
      titulo: 'Artículos de Ayuda',
      descripcion: 'Guías completas y documentación',
      icon: BookOpen,
      color: 'bg-blue-500',
      link: '/ayuda/articulos',
      cantidad: estadisticas?.total_articulos || 0
    },
    {
      titulo: 'Preguntas Frecuentes',
      descripcion: 'Respuestas rápidas a dudas comunes',
      icon: HelpCircle,
      color: 'bg-green-500',
      link: '/ayuda/faqs',
      cantidad: estadisticas?.total_faqs || 0
    },
    {
      titulo: 'Tutoriales',
      descripcion: 'Aprende paso a paso',
      icon: GraduationCap,
      color: 'bg-purple-500',
      link: '/ayuda/tutoriales',
      cantidad: estadisticas?.total_tutoriales || 0
    },
    {
      titulo: 'Soporte Técnico',
      descripcion: 'Crea un ticket de soporte',
      icon: Headphones,
      color: 'bg-orange-500',
      link: '/ayuda/soporte',
      cantidad: estadisticas?.solicitudes_abiertas || 0
    }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-full">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">Centro de Ayuda</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Encuentra respuestas, guías y tutoriales para aprovechar al máximo el sistema
        </p>
      </div>

      {/* ═══════════ BÚSQUEDA ═══════════ */}
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar artículos, tutoriales, FAQs..."
            className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* ═══════════ CATEGORÍAS ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categorias.map((categoria, index) => (
          <Link
            key={index}
            to={categoria.link}
            className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-gray-100"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${categoria.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                <categoria.icon className="h-6 w-6 text-white" />
              </div>
              {categoria.cantidad > 0 && (
                <span className="bg-gray-100 text-gray-700 text-sm font-semibold px-3 py-1 rounded-full">
                  {categoria.cantidad}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              {categoria.titulo}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {categoria.descripcion}
            </p>
            <div className="flex items-center text-blue-600 text-sm font-semibold group-hover:translate-x-2 transition-transform">
              Explorar
              <ArrowRight className="ml-2 h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>

      {/* ═══════════ ARTÍCULOS POPULARES ═══════════ */}
      {articulosPopulares.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Artículos Populares</h2>
            </div>
            <Link to="/ayuda/articulos" className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-2">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articulosPopulares.map((articulo) => (
              <Link
                key={articulo.id}
                to={`/ayuda/articulos/${articulo.id}`}
                className="group p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 line-clamp-2">
                  {articulo.titulo}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {articulo.resumen}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {articulo.vistas} vistas
                  </span>
                  {articulo.categoria_nombre && (
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {articulo.categoria_nombre}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══════════ ARTÍCULOS RECIENTES ═══════════ */}
        {articulosRecientes.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-100 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Recién Publicado</h2>
            </div>
            <div className="space-y-4">
              {articulosRecientes.map((articulo) => (
                <Link
                  key={articulo.id}
                  to={`/ayuda/articulos/${articulo.id}`}
                  className="group flex gap-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all"
                >
                  <div className="bg-green-100 p-2 rounded-lg h-fit">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-green-600 line-clamp-1">
                      {articulo.titulo}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {articulo.resumen}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ FAQs POPULARES ═══════════ */}
        {faqsPopulares.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 p-2 rounded-lg">
                <HelpCircle className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Preguntas Frecuentes</h2>
            </div>
            <div className="space-y-3">
              {faqsPopulares.map((faq) => (
                <Link
                  key={faq.id}
                  to={`/ayuda/faqs#faq-${faq.id}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                >
                  <h3 className="font-semibold text-gray-900 hover:text-purple-600 line-clamp-2">
                    {faq.pregunta}
                  </h3>
                </Link>
              ))}
            </div>
            <Link
              to="/ayuda/faqs"
              className="mt-4 block text-center text-purple-600 hover:text-purple-700 font-semibold text-sm"
            >
              Ver todas las preguntas →
            </Link>
          </div>
        )}
      </div>

      {/* ═══════════ BANNER DE SOPORTE ═══════════ */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl shadow-xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <h2 className="text-3xl font-bold">¿No encuentras lo que buscas?</h2>
            <p className="text-blue-100 text-lg">
              Nuestro equipo de soporte está listo para ayudarte. Crea un ticket y te responderemos pronto.
            </p>
          </div>
          <Link
            to="/ayuda/soporte"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Headphones className="h-5 w-5" />
            Contactar Soporte
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CentroAyudaPage
