import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Clock, BarChart3, Play, CheckCircle2, ChevronRight } from 'lucide-react'
import ayudaService from '../../services/ayudaService'

/**
 * ════════════════════════════════════════════════════════════
 * TUTORIALES - LISTADO
 * ════════════════════════════════════════════════════════════
 * 
 * Listado de tutoriales con:
 * - Filtrado por dificultad
 * - Indicador de progreso del usuario
 * - Vista en cards
 * 
 * @component
 */
const TutorialesPage = () => {
  const [tutoriales, setTutoriales] = useState([])
  const [dificultadSeleccionada, setDificultadSeleccionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progresos, setProgresos] = useState({})

  useEffect(() => {
    cargarTutoriales()
  }, [dificultadSeleccionada])

  const cargarTutoriales = async () => {
    try {
      setLoading(true)
      const params = {
        activo: true,
        dificultad: dificultadSeleccionada || undefined,
        ordering: '-destacado,-creado_en'
      }
      const data = await ayudaService.getTutoriales(params)
      setTutoriales(data.results || data)

      // Cargar progreso para cada tutorial
      const progresosPromises = (data.results || data).map(async (tutorial) => {
        try {
          const progreso = await ayudaService.getProgresoTutorial(tutorial.id)
          return { id: tutorial.id, progreso }
        } catch {
          return { id: tutorial.id, progreso: null }
        }
      })
      const progresosData = await Promise.all(progresosPromises)
      const progresosMap = progresosData.reduce((acc, { id, progreso }) => {
        acc[id] = progreso
        return acc
      }, {})
      setProgresos(progresosMap)
    } catch (error) {
      console.error('Error cargando tutoriales:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDificultadColor = (dificultad) => {
    switch (dificultad) {
      case 'basico':
        return 'bg-green-100 text-green-600'
      case 'intermedio':
        return 'bg-yellow-100 text-yellow-600'
      case 'avanzado':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getDificultadLabel = (dificultad) => {
    switch (dificultad) {
      case 'basico':
        return 'Básico'
      case 'intermedio':
        return 'Intermedio'
      case 'avanzado':
        return 'Avanzado'
      default:
        return dificultad
    }
  }

  const formatTiempo = (minutos) => {
    if (minutos < 60) {
      return `${minutos} min`
    }
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`
  }

  const calcularPorcentajeProgreso = (tutorial) => {
    const progreso = progresos[tutorial.id]
    if (!progreso || !progreso.paso_actual || !tutorial.total_pasos) return 0
    return Math.round((progreso.paso_actual / tutorial.total_pasos) * 100)
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Tutoriales</h1>
          <p className="text-gray-600 mt-2">
            Aprende paso a paso cómo usar el sistema
          </p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <GraduationCap className="h-8 w-8 text-purple-600" />
        </div>
      </div>

      {/* ═══════════ FILTROS ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-700">Dificultad:</span>
          <button
            onClick={() => setDificultadSeleccionada(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dificultadSeleccionada === null
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setDificultadSeleccionada('basico')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dificultadSeleccionada === 'basico'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            Básico
          </button>
          <button
            onClick={() => setDificultadSeleccionada('intermedio')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dificultadSeleccionada === 'intermedio'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
            }`}
          >
            Intermedio
          </button>
          <button
            onClick={() => setDificultadSeleccionada('avanzado')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dificultadSeleccionada === 'avanzado'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
          >
            Avanzado
          </button>
        </div>
      </div>

      {/* ═══════════ LISTADO DE TUTORIALES ═══════════ */}
      {tutoriales.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
          <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No hay tutoriales disponibles
          </h3>
          <p className="text-gray-600">
            Intenta con otros filtros
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutoriales.map((tutorial) => {
            const porcentaje = calcularPorcentajeProgreso(tutorial)
            const completado = progresos[tutorial.id]?.completado

            return (
              <Link
                key={tutorial.id}
                to={`/ayuda/tutoriales/${tutorial.id}`}
                className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all border border-gray-200 overflow-hidden"
              >
                {/* Imagen */}
                {tutorial.imagen_portada ? (
                  <div className="h-48 bg-gray-200 overflow-hidden">
                    <img
                      src={tutorial.imagen_portada}
                      alt={tutorial.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <GraduationCap className="h-16 w-16 text-white" />
                  </div>
                )}

                <div className="p-6">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${getDificultadColor(tutorial.dificultad)}`}>
                      {getDificultadLabel(tutorial.dificultad)}
                    </span>
                    {tutorial.destacado && (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-600">
                        Destacado
                      </span>
                    )}
                    {completado && (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completado
                      </span>
                    )}
                  </div>

                  {/* Título */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors line-clamp-2">
                    {tutorial.titulo}
                  </h3>

                  {/* Descripción */}
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {tutorial.descripcion}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTiempo(tutorial.tiempo_estimado)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      {tutorial.total_pasos} pasos
                    </span>
                  </div>

                  {/* Barra de Progreso */}
                  {porcentaje > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Tu progreso</span>
                        <span className="font-semibold text-purple-600">{porcentaje}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${porcentaje}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Botón */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-purple-600 font-semibold flex items-center gap-2">
                      <Play className="h-5 w-5" />
                      {porcentaje > 0 && porcentaje < 100 ? 'Continuar' : porcentaje === 100 ? 'Ver de nuevo' : 'Comenzar'}
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TutorialesPage
