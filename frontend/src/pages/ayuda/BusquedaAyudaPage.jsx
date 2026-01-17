import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, BookOpen, HelpCircle, GraduationCap, Eye, Clock } from 'lucide-react'
import ayudaService from '../../services/ayudaService'

/**
 * ════════════════════════════════════════════════════════════
 * BÚSQUEDA GLOBAL - CENTRO DE AYUDA
 * ════════════════════════════════════════════════════════════
 * 
 * Búsqueda unificada en:
 * - Artículos
 * - FAQs
 * - Tutoriales
 * 
 * @component
 */
const BusquedaAyudaPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [resultados, setResultados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tabActiva, setTabActiva] = useState('todos') // todos, articulos, faqs, tutoriales

  useEffect(() => {
    const queryParam = searchParams.get('q')
    if (queryParam) {
      setQuery(queryParam)
      buscar(queryParam)
    }
  }, [searchParams])

  const buscar = async (searchQuery) => {
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      const data = await ayudaService.busquedaGlobal(searchQuery)
      setResultados(data)
    } catch (error) {
      console.error('Error buscando:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      setSearchParams({ q: query })
    }
  }

  const getTotalResultados = () => {
    if (!resultados) return 0
    return (
      (resultados.articulos?.length || 0) +
      (resultados.faqs?.length || 0) +
      (resultados.tutoriales?.length || 0)
    )
  }

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const resultadosFiltrados = () => {
    if (!resultados) return { articulos: [], faqs: [], tutoriales: [] }

    switch (tabActiva) {
      case 'articulos':
        return { articulos: resultados.articulos || [], faqs: [], tutoriales: [] }
      case 'faqs':
        return { articulos: [], faqs: resultados.faqs || [], tutoriales: [] }
      case 'tutoriales':
        return { articulos: [], faqs: [], tutoriales: resultados.tutoriales || [] }
      default:
        return resultados
    }
  }

  const datos = resultadosFiltrados()

  return (
    <div className="space-y-6">
      {/* ═══════════ HEADER ═══════════ */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Búsqueda en Centro de Ayuda</h1>
        <p className="text-gray-600">
          Busca en artículos, FAQs y tutoriales
        </p>
      </div>

      {/* ═══════════ BUSCADOR ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="¿Qué estás buscando?"
            className="w-full pl-12 pr-32 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* ═══════════ TABS Y CONTADOR ═══════════ */}
      {resultados && (
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Se encontraron <span className="font-bold text-gray-900">{getTotalResultados()}</span> resultados para "<span className="font-semibold">{query}</span>"
            </p>
          </div>

          <div className="flex items-center gap-2 border-b border-gray-200">
            <button
              onClick={() => setTabActiva('todos')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                tabActiva === 'todos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos ({getTotalResultados()})
            </button>
            <button
              onClick={() => setTabActiva('articulos')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                tabActiva === 'articulos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Artículos ({resultados.articulos?.length || 0})
            </button>
            <button
              onClick={() => setTabActiva('faqs')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                tabActiva === 'faqs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              FAQs ({resultados.faqs?.length || 0})
            </button>
            <button
              onClick={() => setTabActiva('tutoriales')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                tabActiva === 'tutoriales'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Tutoriales ({resultados.tutoriales?.length || 0})
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ RESULTADOS ═══════════ */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : !resultados ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Comienza tu búsqueda
          </h3>
          <p className="text-gray-600">
            Escribe algo en el buscador para encontrar artículos, FAQs y tutoriales
          </p>
        </div>
      ) : getTotalResultados() === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No se encontraron resultados
          </h3>
          <p className="text-gray-600 mb-6">
            Intenta con otros términos de búsqueda o explora las categorías
          </p>
          <Link
            to="/ayuda"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al Centro de Ayuda
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Artículos */}
          {datos.articulos && datos.articulos.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Artículos ({datos.articulos.length})
                </h2>
              </div>
              <div className="space-y-4">
                {datos.articulos.map((articulo) => (
                  <Link
                    key={articulo.id}
                    to={`/ayuda/articulos/${articulo.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                        {articulo.titulo}
                      </h3>
                      {articulo.categoria_nombre && (
                        <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1 rounded">
                          {articulo.categoria_nombre}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {articulo.resumen}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {articulo.vistas} vistas
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatFecha(articulo.fecha_publicacion)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FAQs */}
          {datos.faqs && datos.faqs.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 p-2 rounded-lg">
                  <HelpCircle className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Preguntas Frecuentes ({datos.faqs.length})
                </h2>
              </div>
              <div className="space-y-4">
                {datos.faqs.map((faq) => (
                  <Link
                    key={faq.id}
                    to={`/ayuda/faqs#faq-${faq.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-green-600 mb-2">
                      {faq.pregunta}
                    </h3>
                    <p className="text-gray-600 line-clamp-2">
                      {faq.respuesta}
                    </p>
                    {faq.categoria_nombre && (
                      <span className="inline-block mt-3 bg-green-100 text-green-600 text-xs font-semibold px-2 py-1 rounded">
                        {faq.categoria_nombre}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tutoriales */}
          {datos.tutoriales && datos.tutoriales.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Tutoriales ({datos.tutoriales.length})
                </h2>
              </div>
              <div className="space-y-4">
                {datos.tutoriales.map((tutorial) => (
                  <Link
                    key={tutorial.id}
                    to={`/ayuda/tutoriales/${tutorial.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {tutorial.imagen_portada && (
                        <img
                          src={tutorial.imagen_portada}
                          alt={tutorial.titulo}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-purple-600 mb-2">
                          {tutorial.titulo}
                        </h3>
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {tutorial.descripcion}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            tutorial.dificultad === 'basico'
                              ? 'bg-green-100 text-green-600'
                              : tutorial.dificultad === 'intermedio'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {tutorial.dificultad}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {tutorial.tiempo_estimado} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BusquedaAyudaPage
