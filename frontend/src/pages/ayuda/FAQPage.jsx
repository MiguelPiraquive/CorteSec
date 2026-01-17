import { useState, useEffect } from 'react'
import { Search, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react'
import ayudaService from '../../services/ayudaService'

/**
 * ════════════════════════════════════════════════════════════
 * PREGUNTAS FRECUENTES (FAQs)
 * ════════════════════════════════════════════════════════════
 * 
 * Listado de FAQs organizadas por categorías con:
 * - Accordion para expandir/colapsar
 * - Búsqueda
 * - Votación útil/no útil
 * - Filtrado por categoría
 * 
 * @component
 */
const FAQPage = () => {
  const [faqs, setFaqs] = useState([])
  const [categorias, setCategorias] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [faqAbierta, setFaqAbierta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [votados, setVotados] = useState(new Set())

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (window.location.hash) {
      const faqId = window.location.hash.replace('#faq-', '')
      setTimeout(() => {
        setFaqAbierta(parseInt(faqId))
        document.getElementById(`faq-${faqId}`)?.scrollIntoView({ behavior: 'smooth' })
      }, 500)
    }
  }, [faqs])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [faqsData, categoriasData] = await Promise.all([
        ayudaService.getFAQs({ activo: true }),
        ayudaService.getCategoriasActivas()
      ])
      setFaqs(faqsData.results || faqsData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVotar = async (faqId, util) => {
    if (votados.has(faqId)) return
    
    try {
      await ayudaService.votarFAQ(faqId, util)
      setVotados(prev => new Set([...prev, faqId]))
      
      // Actualizar contadores locales
      setFaqs(prev => prev.map(faq => {
        if (faq.id === faqId) {
          return {
            ...faq,
            util_si: util ? faq.util_si + 1 : faq.util_si,
            util_no: !util ? faq.util_no + 1 : faq.util_no
          }
        }
        return faq
      }))
    } catch (error) {
      console.error('Error votando:', error)
    }
  }

  const faqsFiltradas = faqs.filter(faq => {
    const matchSearch = !searchQuery || 
      faq.pregunta.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.respuesta.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchCategoria = !categoriaSeleccionada || 
      faq.categoria === categoriaSeleccionada

    return matchSearch && matchCategoria
  })

  // Agrupar FAQs por categoría
  const faqsPorCategoria = faqsFiltradas.reduce((acc, faq) => {
    const cat = faq.categoria_nombre || 'Sin categoría'
    if (!acc[cat]) {
      acc[cat] = []
    }
    acc[cat].push(faq)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Preguntas Frecuentes</h1>
          <p className="text-gray-600 mt-2">
            Encuentra respuestas rápidas a las preguntas más comunes
          </p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <HelpCircle className="h-8 w-8 text-green-600" />
        </div>
      </div>

      {/* ═══════════ BÚSQUEDA Y FILTROS ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pregunta..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtros de Categorías */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCategoriaSeleccionada(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                categoriaSeleccionada === null
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                onClick={() => setCategoriaSeleccionada(categoria.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  categoriaSeleccionada === categoria.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {categoria.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ LISTADO DE FAQs ═══════════ */}
      {faqsFiltradas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
          <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No se encontraron preguntas
          </h3>
          <p className="text-gray-600">
            Intenta con otros términos de búsqueda
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(faqsPorCategoria).map(([categoria, faqsCategoria]) => (
            <div key={categoria} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                {categoria}
              </h2>
              <div className="space-y-3">
                {faqsCategoria.map((faq) => (
                  <div
                    key={faq.id}
                    id={`faq-${faq.id}`}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Pregunta */}
                    <button
                      onClick={() => setFaqAbierta(faqAbierta === faq.id ? null : faq.id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="font-semibold text-gray-900 pr-4">
                        {faq.pregunta}
                      </span>
                      {faqAbierta === faq.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      )}
                    </button>

                    {/* Respuesta */}
                    {faqAbierta === faq.id && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="prose max-w-none mb-4">
                          <p className="text-gray-700 whitespace-pre-wrap">{faq.respuesta}</p>
                        </div>

                        {/* Votación */}
                        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                          <span className="text-sm text-gray-600">¿Te resultó útil?</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleVotar(faq.id, true)}
                              disabled={votados.has(faq.id)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                votados.has(faq.id)
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-100 text-green-600 hover:bg-green-200'
                              }`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              {faq.util_si || 0}
                            </button>
                            <button
                              onClick={() => handleVotar(faq.id, false)}
                              disabled={votados.has(faq.id)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                votados.has(faq.id)
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                              }`}
                            >
                              <ThumbsDown className="h-4 w-4" />
                              {faq.util_no || 0}
                            </button>
                          </div>
                          {votados.has(faq.id) && (
                            <span className="text-sm text-green-600 ml-auto">
                              ¡Gracias por tu feedback!
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ BANNER DE SOPORTE ═══════════ */}
      <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-xl shadow-xl p-8 text-white">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">¿No encontraste tu respuesta?</h2>
          <p className="text-green-100 text-lg">
            Nuestro equipo de soporte está aquí para ayudarte
          </p>
          <a
            href="/ayuda/soporte"
            className="inline-block bg-white text-green-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
          >
            Contactar Soporte
          </a>
        </div>
      </div>
    </div>
  )
}

export default FAQPage
