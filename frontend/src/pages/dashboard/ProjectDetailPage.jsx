import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import dashboardEntitiesService from '../../services/dashboardEntitiesService'
import empleadosService from '../../services/empleadosService'
import { useActiveProject } from '../../context/ActiveProjectContext'
import { useConfiguracion } from '../../context/ConfiguracionContext'
import { usePermissions } from '../../context/PermissionsContext'
import {
  ChevronLeftIcon,
  RefreshCwIcon,
  Loader2Icon,
  AlertCircleIcon,
  TargetIcon,
  UsersIcon,
  DollarSignIcon,
  FileTextIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  EditIcon,
  UserPlusIcon,
  WalletIcon,
  ArrowRightIcon,
  BarChart3Icon,
  HashIcon,
  XIcon,
  DownloadIcon,
  FileTextIcon as FilePdfIcon,
} from 'lucide-react'

const ESTADO_CONFIG = {
  planificacion: { label: 'Planificación', color: 'bg-slate-100 text-slate-700', gradient: 'from-slate-500 to-slate-600', icon: ClockIcon },
  activo:        { label: 'Activo',        color: 'bg-emerald-100 text-emerald-700', gradient: 'from-emerald-500 to-emerald-600', icon: PlayIcon },
  pausado:       { label: 'Pausado',       color: 'bg-amber-100 text-amber-700', gradient: 'from-amber-500 to-amber-600', icon: PauseIcon },
  completado:    { label: 'Completado',    color: 'bg-blue-100 text-blue-700', gradient: 'from-blue-500 to-blue-600', icon: CheckCircleIcon },
  cancelado:     { label: 'Cancelado',     color: 'bg-red-100 text-red-700', gradient: 'from-red-500 to-red-600', icon: XCircleIcon },
}

// ─── KPI Ring (circular progress) ──────────────────────────────
const KPIRing = ({ value, max = 100, color, size = 80, strokeWidth = 6 }) => {
  const pct = max > 0 ? Math.min(value / max * 100, 100) : 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-1000"
      />
    </svg>
  )
}

// ─── Metric card ───────────────────────────────────────────────
const MetricCard = ({ icon: Icon, label, value, subtext, gradient, large }) => (
  <div className={`rounded-2xl p-5 text-white bg-gradient-to-br ${gradient} shadow-lg relative overflow-hidden`}>
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/4" />
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-white/20 rounded-lg"><Icon className="w-4 h-4" /></div>
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className={`font-extrabold ${large ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
      {subtext && <p className="text-xs opacity-70 mt-1">{subtext}</p>}
    </div>
  </div>
)

// ════════════════════════════════════════════════════════════════
// MAIN DETAIL PAGE
// ════════════════════════════════════════════════════════════════
const ProjectDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setActiveProject, activeProject } = useActiveProject()
  const { formatCurrency } = useConfiguracion()
  const { hasPermission } = usePermissions()

  // ─── Permisos granulares detail page ──────────
  const perms = useMemo(() => ({
    canEdit:          hasPermission('proyectos.edit'),
    canActivate:      hasPermission('proyectos.active_project'),
    canExportPDF:     hasPermission('proyectos.export_pdf'),
    canViewTeam:      hasPermission('proyectos.asignaciones_view'),
    canManageTeam:    hasPermission('proyectos.asignaciones_manage'),
    canPredicciones:  hasPermission('proyectos.predicciones'),
    canViewKPIs:      hasPermission('proyectos.kpis'),
  }), [hasPermission])
  const [project, setProject] = useState(null)
  const [kpis, setKpis] = useState(null)
  const [asignaciones, setAsignaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)

  // Team management
  const [allEmpleados, setAllEmpleados] = useState([])
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [newAsignacion, setNewAsignacion] = useState({ empleado: '' })

  // AI Predictions
  const [predicciones, setPredicciones] = useState(null)
  const [loadingPred, setLoadingPred] = useState(false)

  const fmtMoney = (v) => {
    const n = Number(v)
    if (isNaN(n) || n === 0) return '$0'
    return formatCurrency ? formatCurrency(n) : `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
  }

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const [projectData, kpiData, asigData] = await Promise.all([
        dashboardEntitiesService.getProject(id),
        dashboardEntitiesService.getProjectKPIs(id),
        dashboardEntitiesService.getAsignaciones(id),
      ])
      setProject(projectData)
      setKpis(kpiData)
      setAsignaciones(Array.isArray(asigData) ? asigData : [])
    } catch (err) {
      console.error('Error loading project detail:', err)
      setError('Error al cargar el proyecto')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  // Load predictions
  const loadPredicciones = useCallback(async () => {
    if (!id) return
    try {
      setLoadingPred(true)
      const data = await dashboardEntitiesService.getPredicciones(id)
      setPredicciones(data)
    } catch { setPredicciones(null) }
    setLoadingPred(false)
  }, [id])

  useEffect(() => { loadPredicciones() }, [loadPredicciones])

  // Export PDF
  const handleExportPDF = async () => {
    try {
      showNotif('success', 'Generando PDF...')
      const response = await dashboardEntitiesService.exportPDF(id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers['content-disposition']?.split('filename=')[1] || `proyecto_${id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      showNotif('error', 'Error al generar PDF')
    }
  }

  const showNotif = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3500)
  }

  const handleSetActive = async () => {
    const ok = await setActiveProject(Number(id))
    if (ok) showNotif('success', 'Proyecto establecido como activo')
  }

  const handleAddAsignacion = async () => {
    if (!newAsignacion.empleado) return
    try {
      await dashboardEntitiesService.addAsignacion(id, {
        empleado: newAsignacion.empleado,
      })
      showNotif('success', 'Empleado asignado')
      setNewAsignacion({ empleado: '' })
      setShowAddEmployee(false)
      const asigData = await dashboardEntitiesService.getAsignaciones(id)
      setAsignaciones(Array.isArray(asigData) ? asigData : [])
    } catch (err) {
      showNotif('error', err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Error al asignar')
    }
  }

  const handleRemoveAsignacion = async (asigId) => {
    if (!window.confirm('¿Desasignar este empleado del proyecto?')) return
    try {
      await dashboardEntitiesService.removeAsignacion(id, asigId)
      showNotif('success', 'Empleado desasignado')
      const asigData = await dashboardEntitiesService.getAsignaciones(id)
      setAsignaciones(Array.isArray(asigData) ? asigData : [])
    } catch (err) {
      showNotif('error', 'Error al desasignar')
    }
  }

  const loadEmpleados = async () => {
    if (allEmpleados.length > 0) { setShowAddEmployee(true); return }
    try {
      const data = await empleadosService.getAllEmpleados()
      setAllEmpleados(Array.isArray(data) ? data : [])
      setShowAddEmployee(true)
    } catch { setShowAddEmployee(true) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2Icon className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="ml-3 text-gray-500 font-medium">Cargando proyecto...</span>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-6 text-center py-24">
        <AlertCircleIcon className="w-12 h-12 text-red-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">{error || 'Proyecto no encontrado'}</p>
        <button onClick={() => navigate('/dashboard/projects')} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700">
          Volver a Proyectos
        </button>
      </div>
    )
  }

  const estadoCfg = ESTADO_CONFIG[project.estado] || ESTADO_CONFIG.planificacion
  const EstadoIcon = estadoCfg.icon
  const isActive = activeProject?.id === project.id
  const color = project.color || '#6366f1'

  const presupuesto = Number(project.presupuesto_aprobado || project.presupuesto_estimado || 0)
  const gasto = Number(kpis?.gasto_acumulado || 0)
  const restante = Number(kpis?.presupuesto_restante || 0)
  const ejecucion = kpis?.porcentaje_ejecucion || 0

  const assignedIds = new Set(asignaciones.map(a => a.empleado))
  const availableEmpleados = allEmpleados.filter(e => !assignedIds.has(e.id))

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50/50 space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc, ${color}99)` }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white rounded-full -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white rounded-full translate-y-1/3 -translate-x-1/4" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard/projects')} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl font-bold">
                {project.icono || project.name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{project.name}</h1>
                  {isActive && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                      <StarIcon className="w-3 h-3 fill-current" /> Activo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-white/70 text-xs font-mono">{project.codigo_proyecto}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20`}>
                    <EstadoIcon className="w-3 h-3" /> {estadoCfg.label}
                  </span>
                </div>
                {project.description && <p className="text-white/60 text-sm mt-2 max-w-xl">{project.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isActive && perms.canActivate && (
                <button onClick={handleSetActive} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 border border-white/20 transition-all">
                  <StarIcon className="w-4 h-4" /> Activar
                </button>
              )}
              {perms.canExportPDF && (
                <button onClick={handleExportPDF} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 border border-white/20 transition-all" title="Exportar PDF">
                  <DownloadIcon className="w-4 h-4" /> PDF
                </button>
              )}
              {perms.canEdit && (
                <button onClick={() => navigate(`/dashboard/projects`)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl border border-white/20 transition-all">
                  <EditIcon className="w-4 h-4" />
                </button>
              )}
              <button onClick={loadAll} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl border border-white/20 transition-all">
                <RefreshCwIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick info bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <span className="text-white/60 text-[10px] font-medium">Progreso</span>
              <p className="text-xl font-extrabold">{project.progreso || 0}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <span className="text-white/60 text-[10px] font-medium">Equipo</span>
              <p className="text-xl font-extrabold">{project.empleados_count || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <span className="text-white/60 text-[10px] font-medium">Presupuesto</span>
              <p className="text-lg font-extrabold truncate">{fmtMoney(presupuesto)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <span className="text-white/60 text-[10px] font-medium">Inicio</span>
              <p className="text-sm font-bold">{project.start_date || '—'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <span className="text-white/60 text-[10px] font-medium">Fin</span>
              <p className="text-sm font-bold">{project.end_date || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={TargetIcon} label="Progreso General" value={`${project.progreso || 0}%`} subtext={`de 100% completado`} gradient="from-indigo-500 to-violet-600" large />
        <MetricCard icon={UsersIcon} label="Empleados Asignados" value={kpis?.empleados_asignados || 0} subtext={`${kpis?.nominas_pagadas || 0} nóminas pagadas`} gradient="from-cyan-500 to-blue-600" />
        <MetricCard icon={DollarSignIcon} label="Presupuesto" value={fmtMoney(presupuesto)} subtext={`Restante: ${fmtMoney(restante)}`} gradient="from-emerald-500 to-green-600" />
        <MetricCard icon={FileTextIcon} label="Total Nómina" value={fmtMoney(kpis?.total_nomina || 0)} subtext={`${kpis?.prestamos_activos || 0} préstamos activos`} gradient="from-violet-500 to-purple-600" />
      </div>

      {/* Budget execution ring + detailed breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution ring */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Ejecución Presupuestal</h3>
          <div className="relative">
            <KPIRing value={ejecucion} max={100} color={ejecucion > 100 ? '#ef4444' : ejecucion > 80 ? '#f59e0b' : color} size={140} strokeWidth={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-gray-900">{ejecucion}%</span>
              <span className="text-[10px] text-gray-400 font-medium">ejecutado</span>
            </div>
          </div>
          <div className="w-full mt-6 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Presupuesto</span>
              <span className="font-bold text-gray-700">{fmtMoney(presupuesto)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Gastado</span>
              <span className="font-bold text-red-600">{fmtMoney(gasto)}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-gray-100 pt-2">
              <span className="text-gray-500">Disponible</span>
              <span className={`font-bold ${restante >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtMoney(restante)}</span>
            </div>
          </div>
        </div>

        {/* Progress ring */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Progreso del Proyecto</h3>
          <div className="relative">
            <KPIRing value={project.progreso || 0} max={100} color={color} size={140} strokeWidth={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-gray-900">{project.progreso || 0}%</span>
              <span className="text-[10px] text-gray-400 font-medium">progreso</span>
            </div>
          </div>
          <div className="w-full mt-6 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Duración</span>
              <span className="font-bold text-gray-700">{project.duration_days || '—'} días</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Inicio</span>
              <span className="font-bold text-gray-700">{project.start_date || '—'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Fin estimado</span>
              <span className="font-bold text-gray-700">{project.end_date || '—'}</span>
            </div>
            {project.fecha_real_fin && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-2">
                <span className="text-gray-500">Fin real</span>
                <span className="font-bold text-blue-600">{project.fecha_real_fin}</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Información del Proyecto</h3>
          <div className="space-y-3">
            {project.responsable_detail && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
                  {(project.responsable_detail.nombre || project.responsable_detail.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{project.responsable_detail.nombre || project.responsable_detail.email}</p>
                  <p className="text-[10px] text-gray-400">Responsable</p>
                </div>
              </div>
            )}
            {project.cliente && (
              <div className="flex justify-between text-xs p-2">
                <span className="text-gray-500">Cliente</span>
                <span className="font-bold text-gray-700">{project.cliente}</span>
              </div>
            )}
            {project.centro_costo && (
              <div className="flex justify-between text-xs p-2">
                <span className="text-gray-500">Centro de Costo</span>
                <span className="font-bold text-gray-700">{project.centro_costo}</span>
              </div>
            )}
            <div className="flex justify-between text-xs p-2">
              <span className="text-gray-500">Moneda</span>
              <span className="font-bold text-gray-700">{project.moneda || 'COP'}</span>
            </div>
            <div className="flex justify-between text-xs p-2">
              <span className="text-gray-500">Creado</span>
              <span className="font-bold text-gray-700">{project.created_at ? new Date(project.created_at).toLocaleDateString('es-CO') : '—'}</span>
            </div>
            {project.notas_internas && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-[10px] font-bold text-amber-600 mb-1">Notas internas</p>
                <p className="text-xs text-amber-800">{project.notas_internas}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ AI Predictions Section ═══════ */}
      {perms.canPredicciones && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg"><span className="text-lg">🤖</span></div>
            <div>
              <h3 className="text-sm font-bold text-gray-700">Análisis Predictivo IA</h3>
              <p className="text-[11px] text-gray-400">Predicciones basadas en datos históricos</p>
            </div>
          </div>
          <button onClick={loadPredicciones} className="p-2 hover:bg-violet-100 rounded-lg transition-colors">
            <RefreshCwIcon className={`w-4 h-4 text-violet-600 ${loadingPred ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="p-6">
          {loadingPred ? (
            <div className="flex justify-center py-8"><Loader2Icon className="w-6 h-6 animate-spin text-violet-500" /></div>
          ) : !predicciones ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay datos suficientes para predicciones</p>
          ) : (
            <div className="space-y-6">
              {/* Health & Risk */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border-2 border-gray-100 text-center">
                  <div className="text-3xl mb-2">
                    {predicciones.salud_nivel === 'excelente' ? '💚' : predicciones.salud_nivel === 'bueno' ? '💛' : predicciones.salud_nivel === 'regular' ? '🟠' : '🔴'}
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900">{predicciones.salud_score}/100</div>
                  <div className="text-xs text-gray-500 mt-1">Salud del Proyecto</div>
                  <div className={`mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${
                    predicciones.salud_nivel === 'excelente' ? 'bg-emerald-100 text-emerald-700'
                    : predicciones.salud_nivel === 'bueno' ? 'bg-blue-100 text-blue-700'
                    : predicciones.salud_nivel === 'regular' ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                  }`}>{predicciones.salud_nivel}</div>
                </div>
                <div className="p-4 rounded-xl border-2 border-gray-100 text-center">
                  <div className="text-3xl mb-2">
                    {predicciones.riesgo_nivel === 'bajo' ? '🟢' : predicciones.riesgo_nivel === 'moderado' ? '🟡' : predicciones.riesgo_nivel === 'alto' ? '🟠' : '🔴'}
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900">{predicciones.riesgo_score}/100</div>
                  <div className="text-xs text-gray-500 mt-1">Riesgo de Retraso</div>
                  <div className={`mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${
                    predicciones.riesgo_nivel === 'bajo' ? 'bg-emerald-100 text-emerald-700'
                    : predicciones.riesgo_nivel === 'moderado' ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                  }`}>{predicciones.riesgo_nivel}</div>
                </div>
                <div className="p-4 rounded-xl border-2 border-gray-100 text-center">
                  <div className="text-3xl mb-2">📈</div>
                  <div className="text-2xl font-extrabold text-gray-900">{predicciones.velocidad_semanal}%</div>
                  <div className="text-xs text-gray-500 mt-1">Velocidad Semanal</div>
                  <div className="text-[10px] text-gray-400 mt-2">{predicciones.velocidad_diaria}%/día</div>
                </div>
              </div>

              {/* Timeline & Budget predictions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <h4 className="text-xs font-bold text-indigo-700 mb-3">📅 Predicción Temporal</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Progreso esperado</span>
                      <span className={`font-bold ${predicciones.desviacion_progreso > 10 ? 'text-red-600' : 'text-emerald-600'}`}>{predicciones.progreso_esperado}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Desviación</span>
                      <span className={`font-bold ${predicciones.desviacion_progreso > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {predicciones.desviacion_progreso > 0 ? '+' : ''}{predicciones.desviacion_progreso}%
                      </span>
                    </div>
                    {predicciones.fecha_estimada_fin && (
                      <div className="flex justify-between text-xs border-t border-indigo-100 pt-2">
                        <span className="text-gray-500">Fin estimado real</span>
                        <span className="font-bold text-indigo-700">{predicciones.fecha_estimada_fin}</span>
                      </div>
                    )}
                    {predicciones.dias_retraso > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Días de retraso</span>
                        <span className="font-bold text-red-600">+{predicciones.dias_retraso} días</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                  <h4 className="text-xs font-bold text-amber-700 mb-3">💰 Predicción Financiera</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Gasto al 100%</span>
                      <span className="font-bold text-gray-700">{fmtMoney(predicciones.gasto_proyectado_100)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Presupuesto</span>
                      <span className="font-bold text-gray-700">{fmtMoney(predicciones.presupuesto)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-amber-100 pt-2">
                      <span className="text-gray-500">Desviación</span>
                      <span className={`font-bold ${predicciones.desviacion_presupuesto > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {predicciones.desviacion_presupuesto > 0 ? '+' : ''}{predicciones.desviacion_presupuesto}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {predicciones.recomendaciones?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">Recomendaciones</h4>
                  <div className="space-y-2">
                    {predicciones.recomendaciones.map((rec, i) => (
                      <div key={i} className={`p-3 rounded-xl border flex items-start gap-3 ${
                        rec.tipo === 'alerta' ? 'bg-red-50 border-red-200' :
                        rec.tipo === 'warning' ? 'bg-amber-50 border-amber-200' :
                        rec.tipo === 'success' ? 'bg-emerald-50 border-emerald-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <span className="text-xl shrink-0">{rec.icono}</span>
                        <div>
                          <p className="text-xs font-bold text-gray-800">{rec.titulo}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{rec.detalle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Team section */}
      {perms.canViewTeam && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UsersIcon className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-700">Equipo del Proyecto</h3>
              <p className="text-[11px] text-gray-400">{asignaciones.length} miembro{asignaciones.length !== 1 ? 's' : ''} asignado{asignaciones.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {perms.canManageTeam && (
            <button
              onClick={loadEmpleados}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold text-xs hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <UserPlusIcon className="w-4 h-4" />
              Agregar
            </button>
          )}
        </div>

        {/* Add employee form */}
        {showAddEmployee && (
          <div className="px-6 py-4 bg-purple-50 border-b border-purple-100">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Empleado</label>
                <select
                  value={newAsignacion.empleado}
                  onChange={(e) => setNewAsignacion(prev => ({ ...prev, empleado: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border-2 border-purple-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Seleccionar empleado...</option>
                  {availableEmpleados.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre_completo || `${e.nombres} ${e.apellidos}`}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddAsignacion} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700">
                  Asignar
                </button>
                <button onClick={() => setShowAddEmployee(false)} className="px-3 py-2 bg-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-300">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team list */}
        {asignaciones.length === 0 ? (
          <div className="p-8 text-center">
            <UsersIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No hay miembros asignados aún</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {asignaciones.map(asig => (
                <div key={asig.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors group">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
                    {(asig.empleado_nombre || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{asig.empleado_nombre}</p>
                    <p className="text-[10px] text-gray-400">Desde {asig.fecha_asignacion ? new Date(asig.fecha_asignacion).toLocaleDateString('es-CO') : '—'}</p>
                  </div>
                  {perms.canManageTeam && (
                    <button
                      onClick={() => handleRemoveAsignacion(asig.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Desasignar"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <AlertCircleIcon className="w-5 h-5" />}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}
    </div>
  )
}

export default ProjectDetailPage
