import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../../context/PermissionsContext'
import dashboardEntitiesService from '../../services/dashboardEntitiesService'
import {
  GanttChartIcon,
  ChevronLeftIcon,
  RefreshCwIcon,
  Loader2Icon,
  AlertCircleIcon,
  CalendarIcon,
  UsersIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon,
} from 'lucide-react'

const ESTADO_CONFIG = {
  planificacion: { label: 'Planificación', color: '#94a3b8', icon: ClockIcon },
  activo:        { label: 'Activo',        color: '#10b981', icon: PlayIcon },
  pausado:       { label: 'Pausado',       color: '#f59e0b', icon: PauseIcon },
  completado:    { label: 'Completado',    color: '#3b82f6', icon: CheckCircleIcon },
  cancelado:     { label: 'Cancelado',     color: '#ef4444', icon: XCircleIcon },
}

// Helper: parse date string to Date
const parseDate = (s) => {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

// Helper: format date
const fmtDate = (d) => {
  if (!d) return ''
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

// Helper: diff in days
const diffDays = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24))

// Helper: month names
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ─── Timeline bar for a project ────────────────────────────────
const TimelineBar = ({ project, timelineStart, dayWidth, todayOffset }) => {
  const start = parseDate(project.start_date)
  const end = parseDate(project.end_date) || parseDate(project.fecha_real_fin)
  const color = project.color || '#6366f1'
  const estadoCfg = ESTADO_CONFIG[project.estado] || ESTADO_CONFIG.planificacion

  if (!start) {
    return (
      <div className="flex items-center h-full text-xs text-gray-300 italic pl-4">
        Sin fecha de inicio
      </div>
    )
  }

  const startOffset = diffDays(timelineStart, start)
  const duration = end ? Math.max(diffDays(start, end), 1) : 30 // Default 30 days if no end
  const left = startOffset * dayWidth
  const width = Math.max(duration * dayWidth, 40)
  const progressWidth = (project.progreso / 100) * width

  return (
    <div className="relative h-full flex items-center" style={{ minWidth: `${(diffDays(timelineStart, new Date()) + 90) * dayWidth}px` }}>
      {/* Bar */}
      <div
        className="absolute h-7 rounded-lg shadow-sm border border-white/40 group cursor-pointer transition-all hover:h-8 hover:shadow-md"
        style={{ left: `${left}px`, width: `${width}px`, backgroundColor: `${color}20`, borderColor: `${color}40` }}
      >
        {/* Progress fill */}
        <div
          className="h-full rounded-lg transition-all"
          style={{ width: `${Math.min(progressWidth, width)}px`, backgroundColor: `${color}60` }}
        />
        {/* Label */}
        <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
          <span className="text-[10px] font-bold truncate" style={{ color }}>
            {project.progreso}%
          </span>
        </div>
        {/* Tooltip on hover */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-xl p-3 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap text-xs">
          <p className="font-bold mb-1">{project.name}</p>
          <div className="flex items-center gap-2 text-gray-300">
            <CalendarIcon className="w-3 h-3" />
            {fmtDate(start)} → {end ? fmtDate(end) : '—'}
          </div>
          <div className="flex items-center gap-2 text-gray-300 mt-0.5">
            <UsersIcon className="w-3 h-3" />
            {project.empleados_count || 0} miembros
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: estadoCfg.color }} />
            <span>{estadoCfg.label}</span>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-gray-900" />
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN TIMELINE PAGE
// ════════════════════════════════════════════════════════════════
const ProjectTimelinePage = () => {
  const navigate = useNavigate()
  const { hasPermission, initialized } = usePermissions()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dayWidth, setDayWidth] = useState(8) // pixels per day
  const [scrollLeft, setScrollLeft] = useState(0)

  const loadTimeline = useCallback(async () => {
    try {
      setLoading(true)
      const data = await dashboardEntitiesService.getProjectTimeline()
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading timeline:', err)
      setError('Error al cargar la línea temporal')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTimeline() }, [loadTimeline])

  // Calculate timeline boundaries
  const { timelineStart, timelineEnd, months, todayOffset } = useMemo(() => {
    const today = new Date()
    let earliest = new Date(today)
    earliest.setMonth(earliest.getMonth() - 2)
    let latest = new Date(today)
    latest.setMonth(latest.getMonth() + 6)

    projects.forEach(p => {
      const s = parseDate(p.start_date)
      const e = parseDate(p.end_date)
      if (s && s < earliest) earliest = new Date(s)
      if (e && e > latest) latest = new Date(e)
    })

    // Round to start of month
    earliest = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
    latest = new Date(latest.getFullYear(), latest.getMonth() + 1, 0)

    // Build month markers
    const monthList = []
    const cur = new Date(earliest)
    while (cur <= latest) {
      const daysInMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()
      const offset = diffDays(earliest, cur)
      monthList.push({
        label: `${MONTHS_ES[cur.getMonth()]} ${cur.getFullYear()}`,
        offset,
        days: daysInMonth,
      })
      cur.setMonth(cur.getMonth() + 1)
    }

    const todayOff = diffDays(earliest, today)

    return { timelineStart: earliest, timelineEnd: latest, months: monthList, todayOffset: todayOff }
  }, [projects])

  const totalDays = diffDays(timelineStart, timelineEnd) + 1
  const totalWidth = totalDays * dayWidth

  const handleZoomIn = () => setDayWidth(prev => Math.min(prev + 2, 24))
  const handleZoomOut = () => setDayWidth(prev => Math.max(prev - 2, 3))

  if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('proyectos.timeline')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para ver la línea temporal</div>

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-700 rounded-2xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden mb-6">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white rounded-full -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white rounded-full translate-y-1/3 -translate-x-1/4" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard/projects')} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <GanttChartIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Línea Temporal</h1>
              <p className="text-teal-200 text-sm mt-1">Vista Gantt de todos los proyectos con sus plazos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
              <span className="text-teal-200 text-xs font-medium">Proyectos</span>
              <p className="text-xl font-extrabold">{projects.length}</p>
            </div>
            <div className="flex items-center bg-white/10 rounded-xl border border-white/10">
              <button onClick={handleZoomOut} className="p-2 hover:bg-white/20 rounded-l-xl transition-colors" title="Alejar">
                <ZoomOutIcon className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-bold border-x border-white/10">{dayWidth}px</span>
              <button onClick={handleZoomIn} className="p-2 hover:bg-white/20 rounded-r-xl transition-colors" title="Acercar">
                <ZoomInIcon className="w-4 h-4" />
              </button>
            </div>
            <button onClick={loadTimeline} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors">
              <RefreshCwIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estados:</span>
          {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.color }} />
              <span className="text-xs font-medium text-gray-600">{cfg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-0.5 h-4 bg-red-500" />
            <span className="text-xs font-medium text-gray-600">Hoy</span>
          </div>
        </div>
      </div>

      {/* Main Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2Icon className="w-8 h-8 text-teal-500 animate-spin" />
          <span className="ml-3 text-gray-500 font-medium">Cargando línea temporal...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircleIcon className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{error}</p>
          <button onClick={loadTimeline} className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700">
            Reintentar
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24">
          <GanttChartIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-600 mb-2">No hay proyectos para mostrar</h3>
          <p className="text-gray-400">Crea proyectos con fechas para verlos en la línea temporal</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
          <div className="flex">
            {/* Left panel — project names */}
            <div className="w-64 shrink-0 bg-white z-10 border-r border-gray-200">
              {/* Month header spacer */}
              <div className="h-10 border-b border-gray-200 bg-gray-50 px-4 flex items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Proyecto</span>
              </div>
              {projects.map((p, idx) => {
                const estadoCfg = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG.planificacion
                return (
                  <div
                    key={p.id}
                    className={`h-12 flex items-center gap-2.5 px-4 border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50/50 transition-colors`}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: p.color || '#6366f1' }}
                    >
                      {p.name?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: estadoCfg.color }} />
                        <span className="text-[9px] text-gray-400">{estadoCfg.label}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right panel — scrollable timeline */}
            <div className="flex-1 overflow-x-auto" onScroll={(e) => setScrollLeft(e.target.scrollLeft)}>
              <div style={{ width: `${totalWidth}px` }}>
                {/* Month headers */}
                <div className="h-10 border-b border-gray-200 relative flex">
                  {months.map((m, i) => (
                    <div
                      key={i}
                      className="border-r border-gray-100 flex items-center justify-center bg-gray-50"
                      style={{ width: `${m.days * dayWidth}px`, left: `${m.offset * dayWidth}px` }}
                    >
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{m.label}</span>
                    </div>
                  ))}
                  {/* Today line in header */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: `${todayOffset * dayWidth}px` }}
                  />
                </div>

                {/* Project rows */}
                {projects.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`h-12 relative border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    <TimelineBar
                      project={p}
                      timelineStart={timelineStart}
                      dayWidth={dayWidth}
                      todayOffset={todayOffset}
                    />
                    {/* Today line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500/30 z-5"
                      style={{ left: `${todayOffset * dayWidth}px` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectTimelinePage
