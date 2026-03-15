import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Monitor,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  BarChart3,
  Search,
  Home,
  Users,
  UserCheck,
  Receipt,
  DollarSign,
  Shield,
  Briefcase,
  FileSignature,
  Settings,
  Package,
  UserCircle,
  Activity,
  FolderKanban,
  Rocket,
} from 'lucide-react'
import { usePermissions } from '../../context/PermissionsContext'
import { getAllTours, getToursByModule } from '../../data/tourConfigs'
import { isTourCompleted, resetAllTours, scheduleTour } from '../../hooks/useProductTour'

const ICON_MAP = {
  Home,
  Users,
  UserCheck,
  Receipt,
  DollarSign,
  Shield,
  Briefcase,
  FileSignature,
  Settings,
  Package,
  UserCircle,
  Activity,
  FolderKanban,
  Rocket,
}

const DIFFICULTY_CONFIG = {
  basico: { label: 'Basico', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  intermedio: { label: 'Intermedio', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  avanzado: { label: 'Avanzado', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const ToursInteractivosPage = () => {
  const { hasPermission, initialized } = usePermissions()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterModule, setFilterModule] = useState('Todos')
  const [filterDifficulty, setFilterDifficulty] = useState('Todos')
  const [refreshKey, setRefreshKey] = useState(0)

  const allTours = useMemo(() => getAllTours(), [])
  const toursByModule = useMemo(() => getToursByModule(), [])
  const modules = useMemo(() => ['Todos', ...Object.keys(toursByModule)], [toursByModule])

  // Filtrar tours
  const filteredTours = useMemo(() => {
    return allTours.filter((tour) => {
      const matchesSearch =
        !searchQuery ||
        tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tour.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tour.module.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesModule = filterModule === 'Todos' || tour.module === filterModule
      const matchesDifficulty = filterDifficulty === 'Todos' || tour.difficulty === filterDifficulty

      return matchesSearch && matchesModule && matchesDifficulty
    })
  }, [allTours, searchQuery, filterModule, filterDifficulty])

  // Estadisticas
  const stats = useMemo(() => {
    const total = allTours.length
    // eslint-disable-next-line no-unused-vars
    const _refresh = refreshKey
    const completed = allTours.filter((t) => isTourCompleted(t.key)).length
    return {
      total,
      completed,
      pending: total - completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [allTours, refreshKey])

  const handleLaunchTour = (tour) => {
    // Senalar el tour pendiente via sessionStorage y navegar
    localStorage.removeItem(`cortesec_tour_${tour.key}_done`)
    scheduleTour(tour.key)
    navigate(`${tour.route}?tour=${tour.key}`)
  }

  const handleResetTour = (tourKey) => {
    localStorage.removeItem(`cortesec_tour_${tourKey}_done`)
    setRefreshKey((k) => k + 1)
  }

  const handleResetAll = () => {
    if (window.confirm('Esto reiniciara todos los tours interactivos. Volveras a ver cada tutorial la proxima vez que visites su pagina.')) {
      resetAllTours()
      setRefreshKey((k) => k + 1)
    }
  }

  if (!initialized) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!hasPermission('ayuda.view')) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold">
        No tienes permisos para acceder a esta seccion
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 rounded-3xl shadow-2xl p-8 text-white border border-white/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full -ml-14 -mb-14 pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-5">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Tours Interactivos</h1>
              <p className="text-blue-100 mt-1">
                Recorridos guiados por cada modulo del sistema. Aprende haciendo.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAll}
            className="bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white px-5 py-3 rounded-xl transition-all flex items-center gap-2 font-medium border border-white/20"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Todos
          </button>
        </div>

        {/* Stats dentro del header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-blue-100 text-sm">Total Tours</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-green-100 text-sm">Completados</p>
            <p className="text-3xl font-bold">{stats.completed}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-amber-100 text-sm">Pendientes</p>
            <p className="text-3xl font-bold">{stats.pending}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-blue-100 text-sm">Progreso</p>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-bold">{stats.percentage}%</p>
              <div className="flex-1 bg-white/20 rounded-full h-2.5">
                <div
                  className="bg-white h-2.5 rounded-full transition-all"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar tours por nombre, descripcion o modulo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
          >
            {modules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
          >
            <option value="Todos">Todas las dificultades</option>
            <option value="basico">Basico</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
      </div>

      {/* Grid de Tours */}
      {filteredTours.length === 0 ? (
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 p-12 text-center">
          <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No se encontraron tours con esos filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTours.map((tour) => {
            const completed = isTourCompleted(tour.key)
            const IconComponent = ICON_MAP[tour.icon] || Monitor
            const diffConfig = DIFFICULTY_CONFIG[tour.difficulty] || DIFFICULTY_CONFIG.basico

            return (
              <div
                key={tour.key}
                className={`group backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border transition-all hover:shadow-xl ${
                  completed ? 'border-green-200/50' : 'border-gray-200/50'
                }`}
              >
                {/* Gradient top */}
                <div className={`h-2 rounded-t-2xl bg-gradient-to-r ${tour.color}`} />

                <div className="p-6">
                  {/* Icon + badges */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`bg-gradient-to-br ${tour.color} p-3 rounded-xl`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${diffConfig.color}`}>
                        {diffConfig.label}
                      </span>
                      {completed && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Visto
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {tour.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {tour.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {tour.estimatedTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      {tour.steps.length} pasos
                    </span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">
                      {tour.module}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleLaunchTour(tour)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        completed
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg'
                      }`}
                    >
                      <Play className="w-4 h-4" />
                      {completed ? 'Ver de Nuevo' : 'Iniciar Tour'}
                    </button>
                    {completed && (
                      <button
                        onClick={() => handleResetTour(tour.key)}
                        className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 hover:text-gray-700 transition-all"
                        title="Reiniciar tour"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info banner */}
      <div className="backdrop-blur-xl bg-blue-50/80 rounded-2xl p-6 border border-blue-200/50">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 p-2 rounded-lg mt-0.5">
            <Monitor className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 mb-1">Como funcionan los tours</h3>
            <p className="text-blue-700 text-sm leading-relaxed">
              Cada tour te guia visualmente por los elementos mas importantes de una pagina.
              Al hacer clic en <strong>"Iniciar Tour"</strong>, seras redirigido a la pagina correspondiente
              y el recorrido comenzara automaticamente. Los tours se muestran solo una vez por defecto,
              pero puedes reiniciarlos en cualquier momento desde esta pagina.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ToursInteractivosPage
