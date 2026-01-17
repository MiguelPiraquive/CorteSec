import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, BookOpen, Eye, Clock, Tag, ChevronRight } from 'lucide-react'
import ayudaService from '../../services/ayudaService'

/**
 * ════════════════════════════════════════════════════════════
 * ARTÍCULOS DE AYUDA - LISTADO
 * ════════════════════════════════════════════════════════════
 * 
 * Listado completo de artículos con:
 * - Búsqueda y filtros
 * - Filtrado por categoría
 * - Vista en grid/lista
 * - Paginación
 * 
 * @component
 */
const ArticulosPage = () => {
  const [articulos, setArticulos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  useEffect(() => {
    cargarCategorias()
  }, [])

  useEffect(() => {
    cargarArticulos()
  }, [searchQuery, categoriaSeleccionada, pagina])

  const cargarCategorias = async () => {
    try {
      const data = await ayudaService.getCategoriasActivas()
      setCategorias(data)
    } catch (error) {
      console.error('Error cargando categorías:', error)
    }
  }

  const cargarArticulos = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagina,
        search: searchQuery || undefined,
        categoria: categoriaSeleccionada || undefined,
        publicado: true,
        ordering: '-fecha_publicacion'
      }
      
      const data = await ayudaService.getArticulos(params)
      setArticulos(data.results || data)
      setTotalPaginas(Math.ceil((data.count || data.length) / 20))
    } catch (error) {
      console.error('Error cargando artículos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPagina(1)
    cargarArticulos()
  }

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Artículos de Ayuda</h1>
          <p className="text-gray-600 mt-2">
            Guías completas y documentación del sistema
          </p>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg">
          <BookOpen className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      {/* ═══════════ BÚSQUEDA Y FILTROS ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar artículos..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Buscar
            </button>
          </div>

          {/* Filtros de Categorías */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-5 w-5 text-gray-500" />
            <button
              type="button"
              onClick={() => {
                setCategoriaSeleccionada(null)
                setPagina(1)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                categoriaSeleccionada === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                onClick={() => {
                  setCategoriaSeleccionada(categoria.id)
                  setPagina(1)
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  categoriaSeleccionada === categoria.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {categoria.nombre}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* ═══════════ LISTADO DE ARTÍCULOS ═══════════ */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : articulos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No se encontraron artículos
          </h3>
          <p className="text-gray-600">
            Intenta con otros términos de búsqueda o filtros
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articulos.map((articulo) => (
            <Link
              key={articulo.id}
              to={`/ayuda/articulos/${articulo.id}`}
              className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                {/* Categoría */}
                {articulo.categoria_nombre && (
                  <span className="inline-block bg-blue-100 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    {articulo.categoria_nombre}
                  </span>
                )}

                {/* Título */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {articulo.titulo}
                </h3>

                {/* Resumen */}
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {articulo.resumen}
                </p>

                {/* Tags */}
                {articulo.tags && articulo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {articulo.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {articulo.vistas}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatFecha(articulo.fecha_publicacion)}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ═══════════ PAGINACIÓN ═══════════ */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="px-4 py-2 text-gray-700">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}

export default ArticulosPage
