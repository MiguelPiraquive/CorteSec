import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  BarChart3,
  Trophy,
  Code,
  Image as ImageIcon,
  Video,
  Download,
  ExternalLink
} from 'lucide-react'
import ayudaService from '../../services/ayudaService'

/**
 * ════════════════════════════════════════════════════════════
 * TUTORIAL - DETALLE Y PLAYER
 * ════════════════════════════════════════════════════════════
 * 
 * Visor interactivo de tutorial con:
 * - Navegación paso a paso
 * - Barra de progreso visual
 * - Código de ejemplo
 * - Recursos por paso
 * - Tracking de progreso del usuario
 * 
 * @component
 */
const TutorialDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tutorial, setTutorial] = useState(null)
  const [pasos, setPasos] = useState([])
  const [pasoActual, setPasoActual] = useState(0)
  const [progreso, setProgreso] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completando, setCompletando] = useState(false)

  useEffect(() => {
    cargarTutorial()
  }, [id])

  const cargarTutorial = async () => {
    try {
      setLoading(true)
      const [tutorialData, progresoData] = await Promise.all([
        ayudaService.getTutorial(id),
        ayudaService.getProgresoTutorial(id).catch(() => null)
      ])
      
      setTutorial(tutorialData)
      setPasos(tutorialData.pasos || [])
      setProgreso(progresoData)
      
      // Si hay progreso, ir al último paso visto
      if (progresoData && progresoData.paso_actual > 0) {
        setPasoActual(progresoData.paso_actual - 1)
      }
    } catch (error) {
      console.error('Error cargando tutorial:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSiguientePaso = async () => {
    if (pasoActual < pasos.length - 1) {
      const nuevoPaso = pasoActual + 1
      setPasoActual(nuevoPaso)
      
      // Actualizar progreso en backend
      try {
        await ayudaService.actualizarProgresoTutorial(id, nuevoPaso + 1)
      } catch (error) {
        console.error('Error actualizando progreso:', error)
      }
    }
  }

  const handlePasoAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1)
    }
  }

  const handleCompletarTutorial = async () => {
    try {
      setCompletando(true)
      await ayudaService.completarTutorial(id)
      setProgreso({ ...progreso, completado: true })
    } catch (error) {
      console.error('Error completando tutorial:', error)
    } finally {
      setCompletando(false)
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
      case 'video':
        return <Video className="h-5 w-5" />
      case 'imagen':
        return <ImageIcon className="h-5 w-5" />
      case 'enlace':
        return <ExternalLink className="h-5 w-5" />
      default:
        return <Download className="h-5 w-5" />
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

  const formatTiempo = (minutos) => {
    if (minutos < 60) return `${minutos} min`
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!tutorial || pasos.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tutorial no encontrado</h2>
        <Link to="/ayuda/tutoriales" className="text-purple-600 hover:text-purple-700">
          Volver a tutoriales
        </Link>
      </div>
    )
  }

  const pasoActualData = pasos[pasoActual]
  const porcentajeProgreso = Math.round(((pasoActual + 1) / pasos.length) * 100)
  const yaCompletado = progreso?.completado || false

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${getDificultadColor(tutorial.dificultad)}`}>
                {tutorial.dificultad}
              </span>
              {yaCompletado && (
                <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-600 flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Completado
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{tutorial.titulo}</h1>
            <p className="text-gray-600 mb-4">{tutorial.descripcion}</p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTiempo(tutorial.tiempo_estimado)}
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                {pasos.length} pasos
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver
          </button>
        </div>

        {/* Barra de Progreso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">
              Paso {pasoActual + 1} de {pasos.length}
            </span>
            <span className="font-semibold text-purple-600">{porcentajeProgreso}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-purple-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${porcentajeProgreso}%` }}
            ></div>
          </div>
        </div>

        {/* Lista de Pasos (Stepper Horizontal) */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2">
          {pasos.map((paso, index) => (
            <button
              key={paso.id}
              onClick={() => setPasoActual(index)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                index === pasoActual
                  ? 'bg-purple-100 border-2 border-purple-600'
                  : index < pasoActual
                  ? 'bg-green-100 border-2 border-green-600'
                  : 'bg-gray-100 border-2 border-gray-300'
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                index === pasoActual
                  ? 'bg-purple-600 text-white'
                  : index < pasoActual
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {index < pasoActual ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>
              <span className="text-xs font-medium text-gray-700 max-w-[100px] truncate">
                {paso.titulo}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ CONTENIDO DEL PASO ACTUAL ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenido Principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {pasoActualData.titulo}
            </h2>
            
            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {pasoActualData.contenido}
              </p>
            </div>

            {/* Imagen del Paso */}
            {pasoActualData.imagen && (
              <div className="mb-6 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={pasoActualData.imagen}
                  alt={pasoActualData.titulo}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Video del Paso */}
            {pasoActualData.video_url && (
              <div className="mb-6">
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    src={pasoActualData.video_url}
                    controls
                    className="w-full h-full"
                  >
                    Tu navegador no soporta videos.
                  </video>
                </div>
              </div>
            )}

            {/* Código de Ejemplo */}
            {pasoActualData.codigo_ejemplo && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Código de Ejemplo</h3>
                </div>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <code>{pasoActualData.codigo_ejemplo}</code>
                </pre>
              </div>
            )}

            {/* Recursos del Paso */}
            {pasoActualData.recursos && pasoActualData.recursos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recursos Adicionales</h3>
                <div className="space-y-2">
                  {pasoActualData.recursos.map((recurso) => (
                    <button
                      key={recurso.id}
                      onClick={() => handleDescargarRecurso(recurso.id)}
                      className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-purple-600">
                          {getIconoRecurso(recurso.tipo)}
                        </div>
                        <span className="font-medium text-gray-900">{recurso.nombre}</span>
                      </div>
                      <Download className="h-5 w-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navegación */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePasoAnterior}
              disabled={pasoActual === 0}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Anterior
            </button>

            {pasoActual === pasos.length - 1 ? (
              <button
                onClick={handleCompletarTutorial}
                disabled={yaCompletado || completando}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  yaCompletado
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Trophy className="h-5 w-5" />
                {yaCompletado ? 'Completado' : 'Marcar como Completado'}
              </button>
            ) : (
              <button
                onClick={handleSiguientePaso}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Siguiente
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar - Lista de Todos los Pasos */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Todos los Pasos</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {pasos.map((paso, index) => (
                <button
                  key={paso.id}
                  onClick={() => setPasoActual(index)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    index === pasoActual
                      ? 'bg-purple-100 border-2 border-purple-600'
                      : index < pasoActual
                      ? 'bg-green-50 border border-green-300'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full ${
                      index === pasoActual
                        ? 'bg-purple-600 text-white'
                        : index < pasoActual
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {index < pasoActual ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {paso.titulo}
                      </h4>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TutorialDetailPage
