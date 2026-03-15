import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAudit from '../../hooks/useAudit'
import dashboardEntitiesService from '../../services/dashboardEntitiesService'
import empleadosService from '../../services/empleadosService'
import { useActiveProject } from '../../context/ActiveProjectContext'
import { usePermissions } from '../../context/PermissionsContext'
import {
  BriefcaseIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  CalendarIcon,
  UsersIcon,
  BarChart3Icon,
  DollarSignIcon,
  TargetIcon,
  LayoutGridIcon,
  ListIcon,
  EyeIcon,
  StarIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  UserPlusIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  FlagIcon,
  HashIcon,
  Loader2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
} from 'lucide-react'

import useProductTour from '../../hooks/useProductTour'
import { TOUR_CONFIGS } from '../../data/tourConfigs'

// ─── Estado & Prioridad configs ────────────────────────────────
const ESTADOS = [
  { value: 'planificacion', label: 'Planificación', color: 'bg-slate-100 text-slate-700 border-slate-300', icon: ClockIcon, dotColor: 'bg-slate-400' },
  { value: 'activo', label: 'Activo', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: PlayIcon, dotColor: 'bg-emerald-500' },
  { value: 'pausado', label: 'Pausado', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: PauseIcon, dotColor: 'bg-amber-500' },
  { value: 'completado', label: 'Completado', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: CheckCircleIcon, dotColor: 'bg-blue-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircleIcon, dotColor: 'bg-red-500' },
]

const PRIORIDADES = [
  { value: 'baja', label: 'Baja', color: 'bg-gray-100 text-gray-600', icon: '○' },
  { value: 'media', label: 'Media', color: 'bg-blue-100 text-blue-600', icon: '◐' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-600', icon: '◉' },
  { value: 'critica', label: 'Crítica', color: 'bg-red-100 text-red-700', icon: '⬤' },
]

const getEstado = (val) => ESTADOS.find(e => e.value === val) || ESTADOS[0]
const getPrioridad = (val) => PRIORIDADES.find(p => p.value === val) || PRIORIDADES[1]

// Currency formatter
const formatMoney = (amount, currency = 'COP') => {
  if (!amount && amount !== 0) return '-'
  const n = Number(amount)
  if (currency === 'COP') return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
  if (currency === 'USD') return `US$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  return `€${n.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`
}

// ─── Badge components ──────────────────────────────────────────
const EstadoBadge = ({ estado }) => {
  const cfg = getEstado(estado)
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

const PrioridadBadge = ({ prioridad }) => {
  const cfg = getPrioridad(prioridad)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <span className="text-[10px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

// ─── Progress bar ──────────────────────────────────────────────
const ProgressBar = ({ value = 0, color = '#6366f1' }) => (
  <div className="w-full">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-gray-500">Progreso</span>
      <span className="text-xs font-bold" style={{ color }}>{value}%</span>
    </div>
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  </div>
)

// ─── Project card ──────────────────────────────────────────────
const ProjectCard = ({ project, isActive, onEdit, onDelete, onSetActive, onViewTeam, onViewKPIs, onView, perms = {} }) => {
  const color = project.color || '#6366f1'

  return (
    <div className={`group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border-2 overflow-hidden ${
      isActive ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-100 hover:border-gray-200'
    }`}>
      <div className="h-1.5" style={{ backgroundColor: color }} />
      {isActive && (
        <div className="absolute top-3 right-3 z-10">
          <span className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wide shadow-lg">
            <StarIcon className="w-3 h-3 fill-current" />
            Activo
          </span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-md" style={{ backgroundColor: color }}>
            {project.icono || project.name?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(project)}>
            <h3 className="font-bold text-gray-900 text-base truncate hover:text-indigo-600 transition-colors">{project.name}</h3>
            <span className="text-xs text-gray-400 font-mono">{project.codigo_proyecto}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3 min-h-[2.5rem]">
          {project.description || 'Sin descripción'}
        </p>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <EstadoBadge estado={project.estado} />
          <PrioridadBadge prioridad={project.prioridad} />
        </div>
        <div className="mb-3">
          <ProgressBar value={project.progreso || 0} color={color} />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <UsersIcon className="w-3.5 h-3.5 mx-auto text-gray-400 mb-0.5" />
            <div className="text-xs font-bold text-gray-700">{project.empleados_count || 0}</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <DollarSignIcon className="w-3.5 h-3.5 mx-auto text-gray-400 mb-0.5" />
            <div className="text-xs font-bold text-gray-700 truncate" title={formatMoney(project.presupuesto_aprobado || project.presupuesto_estimado, project.moneda)}>
              {project.presupuesto_aprobado || project.presupuesto_estimado
                ? formatMoney(project.presupuesto_aprobado || project.presupuesto_estimado, project.moneda)
                : '-'}
            </div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <TargetIcon className="w-3.5 h-3.5 mx-auto text-gray-400 mb-0.5" />
            <div className="text-xs font-bold text-gray-700">{project.porcentaje_ejecucion || 0}%</div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
          <CalendarIcon className="w-3 h-3" />
          <span>{project.start_date || '—'}</span>
          <ArrowRightIcon className="w-3 h-3" />
          <span>{project.end_date || 'Sin fecha fin'}</span>
        </div>
        {project.responsable_detail && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
              {(project.responsable_detail.nombre || project.responsable_detail.email || '?').charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-500 truncate">{project.responsable_detail.nombre || project.responsable_detail.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {!isActive && perms.canActivate && (
            <button onClick={() => onSetActive(project.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors">
              <StarIcon className="w-3.5 h-3.5" />
              Activar
            </button>
          )}
          <button onClick={() => onView(project)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Ver detalle">
            <EyeIcon className="w-4 h-4" />
          </button>
          {perms.canViewTeam && (
            <button onClick={() => onViewTeam(project)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors" title="Equipo">
              <UsersIcon className="w-4 h-4" />
            </button>
          )}
          {perms.canViewKPIs && (
            <button onClick={() => onViewKPIs(project)} className="p-2 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition-colors" title="KPIs">
              <BarChart3Icon className="w-4 h-4" />
            </button>
          )}
          {perms.canEdit && (
            <button onClick={() => onEdit(project)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Editar">
              <EditIcon className="w-4 h-4" />
            </button>
          )}
          {perms.canDelete && (
            <button onClick={() => onDelete(project.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar">
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
const ProjectsPage = () => {
  const audit = useAudit('Proyectos')
  const navigate = useNavigate()
  const { activeProject, setActiveProject, clearActiveProject, isAllProjects, refreshProjects } = useActiveProject()
  const { hasPermission } = usePermissions()

  // ─── Permisos granulares ──────────────────────
  const perms = useMemo(() => ({
    canCreate:        hasPermission('proyectos.create'),
    canEdit:          hasPermission('proyectos.edit'),
    canDelete:        hasPermission('proyectos.delete'),
    canExportExcel:   hasPermission('proyectos.export_excel'),
    canActivate:      hasPermission('proyectos.active_project'),
    canViewKPIs:      hasPermission('proyectos.kpis'),
    canViewTeam:      hasPermission('proyectos.asignaciones_view'),
    canManageTeam:    hasPermission('proyectos.asignaciones_manage'),
    canViewPlantillas:hasPermission('proyectos.plantillas'),
  }), [hasPermission])

  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Product Tour
  useProductTour('proyectos', TOUR_CONFIGS.proyectos.steps, {
    ready: !loading,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterPrioridad, setFilterPrioridad] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12
  const [pagination, setPagination] = useState({ count: 0, total_pages: 1 })

  const [viewMode, setViewMode] = useState('grid')
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [plantillas, setPlantillas] = useState([])
  const [loadingPlantillas, setLoadingPlantillas] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [teamProject, setTeamProject] = useState(null)
  const [showKPIModal, setShowKPIModal] = useState(false)
  const [kpiProject, setKpiProject] = useState(null)
  const [kpiData, setKpiData] = useState(null)
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  const [asignaciones, setAsignaciones] = useState([])
  const [allEmpleados, setAllEmpleados] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [newAsignacion, setNewAsignacion] = useState({ empleado: '' })

  const [formData, setFormData] = useState({
    name: '', description: '', start_date: '', end_date: '',
    estado: 'planificacion', prioridad: 'media', progreso: 0,
    presupuesto_estimado: '', presupuesto_aprobado: '', moneda: 'COP',
    cliente: '', centro_costo: '', color: '#6366f1', icono: '', notas_internas: '',
    tags: '',
  })

  const showNotif = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const loadProjects = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = { page, page_size: pageSize }
      if (searchTerm) params.search = searchTerm
      if (filterEstado) params.estado = filterEstado
      if (filterPrioridad) params.prioridad = filterPrioridad

      const [data, statsData] = await Promise.all([
        dashboardEntitiesService.getProjects(params),
        dashboardEntitiesService.getProjectStats().catch(() => null),
      ])

      const results = data.results || data
      const count = data.count ?? results.length
      setProjects(results)
      setPagination({ count, total_pages: Math.max(1, Math.ceil(count / pageSize)) })
      setCurrentPage(page)
      if (statsData) setStats(statsData)
    } catch (error) {
      showNotif('error', 'Error al cargar proyectos')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filterEstado, filterPrioridad])

  useEffect(() => { loadProjects(1) }, [loadProjects])

  const resetForm = () => {
    setFormData({
      name: '', description: '', start_date: '', end_date: '',
      estado: 'planificacion', prioridad: 'media', progreso: 0,
      presupuesto_estimado: '', presupuesto_aprobado: '', moneda: 'COP',
      cliente: '', centro_costo: '', color: '#6366f1', icono: '', notas_internas: '',
      tags: '',
    })
    setEditingProject(null)
  }

  // ── Plantillas ──────────────────────────────────────────────────
  const openTemplatePicker = async () => {
    setLoadingPlantillas(true)
    setShowTemplates(true)
    try {
      const data = await dashboardEntitiesService.getPlantillas()
      setPlantillas(data)
    } catch { setPlantillas([]) }
    setLoadingPlantillas(false)
  }

  const handleSelectTemplate = (plantilla) => {
    const today = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + plantilla.duracion_dias * 86400000).toISOString().split('T')[0]
    setFormData({
      name: '', description: plantilla.description,
      start_date: today, end_date: endDate,
      estado: plantilla.estado, prioridad: plantilla.prioridad, progreso: 0,
      presupuesto_estimado: plantilla.presupuesto_sugerido || '', presupuesto_aprobado: '',
      moneda: plantilla.moneda || 'COP',
      cliente: '', color: plantilla.color || '#6366f1', icono: plantilla.icon || '',
      notas_internas: `Creado desde plantilla: ${plantilla.name}\nFases sugeridas: ${(plantilla.fases || []).join(', ')}`,
    })
    setEditingProject(null)
    setShowTemplates(false)
    setShowModal(true)
  }

  const handleCreateBlank = () => {
    resetForm()
    setShowTemplates(false)
    setShowModal(true)
  }

  // ── Exportar Excel ──────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      showNotif('success', 'Generando archivo Excel...')
      const response = await dashboardEntitiesService.exportExcel()
      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers['content-disposition']?.split('filename=')[1] || 'proyectos.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      showNotif('error', 'Error al exportar Excel')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const dataToSend = {
        ...formData,
        end_date: formData.end_date || null,
        presupuesto_estimado: formData.presupuesto_estimado || null,
        presupuesto_aprobado: formData.presupuesto_aprobado || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }
      if (editingProject) {
        await dashboardEntitiesService.updateProject(editingProject.id, dataToSend)
        audit.button('modificar_proyecto', { project_id: editingProject.id })
        showNotif('success', 'Proyecto actualizado exitosamente')
      } else {
        await dashboardEntitiesService.createProject(dataToSend)
        audit.button('crear_proyecto', { name: formData.name })
        showNotif('success', 'Proyecto creado exitosamente')
      }
      setShowModal(false)
      resetForm()
      loadProjects(currentPage)
      refreshProjects()
    } catch (error) {
      showNotif('error', error.response?.data?.detail || 'Error al guardar proyecto')
      console.error(error)
    }
  }

  const handleEdit = (project) => {
    setEditingProject(project)
    setFormData({
      name: project.name || '', description: project.description || '',
      start_date: project.start_date || '', end_date: project.end_date || '',
      estado: project.estado || 'planificacion', prioridad: project.prioridad || 'media',
      progreso: project.progreso || 0,
      presupuesto_estimado: project.presupuesto_estimado || '',
      presupuesto_aprobado: project.presupuesto_aprobado || '',
      moneda: project.moneda || 'COP', cliente: project.cliente || '',
      centro_costo: project.centro_costo || '',
      color: project.color || '#6366f1', icono: project.icono || '',
      notas_internas: project.notas_internas || '',
      tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este proyecto permanentemente?')) return
    try {
      await dashboardEntitiesService.deleteProject(id)
      audit.button('eliminar_proyecto', { project_id: id })
      showNotif('success', 'Proyecto eliminado')
      loadProjects(currentPage)
      refreshProjects()
    } catch (error) {
      showNotif('error', 'Error al eliminar proyecto')
      console.error(error)
    }
  }

  const handleSetActive = async (projectId) => {
    const ok = await setActiveProject(projectId)
    if (ok) {
      showNotif('success', 'Proyecto establecido como activo')
      loadProjects(currentPage)
    }
  }

  const handleClearActive = async () => {
    const ok = await clearActiveProject()
    if (ok) {
      showNotif('success', 'Mostrando todos los proyectos')
      loadProjects(currentPage)
    }
  }

  // Team modal
  const openTeamModal = async (project) => {
    setTeamProject(project)
    setShowTeamModal(true)
    setTeamLoading(true)
    try {
      const [asigData, empData] = await Promise.all([
        dashboardEntitiesService.getAsignaciones(project.id),
        empleadosService.getAllEmpleados(),
      ])
      setAsignaciones(Array.isArray(asigData) ? asigData : [])
      setAllEmpleados(Array.isArray(empData) ? empData : [])
    } catch (err) {
      console.error(err)
      showNotif('error', 'Error al cargar equipo')
    } finally {
      setTeamLoading(false)
    }
  }

  const handleAddAsignacion = async () => {
    if (!newAsignacion.empleado) return
    try {
      await dashboardEntitiesService.addAsignacion(teamProject.id, {
        empleado: newAsignacion.empleado,
      })
      showNotif('success', 'Empleado asignado al proyecto')
      setNewAsignacion({ empleado: '' })
      const asigData = await dashboardEntitiesService.getAsignaciones(teamProject.id)
      setAsignaciones(Array.isArray(asigData) ? asigData : [])
      loadProjects(currentPage)
    } catch (err) {
      showNotif('error', err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Error al asignar')
      console.error(err)
    }
  }

  const handleRemoveAsignacion = async (asignacionId) => {
    if (!window.confirm('¿Desasignar este empleado del proyecto?')) return
    try {
      await dashboardEntitiesService.removeAsignacion(teamProject.id, asignacionId)
      showNotif('success', 'Empleado desasignado')
      const asigData = await dashboardEntitiesService.getAsignaciones(teamProject.id)
      setAsignaciones(Array.isArray(asigData) ? asigData : [])
      loadProjects(currentPage)
    } catch (err) {
      showNotif('error', 'Error al desasignar')
      console.error(err)
    }
  }

  // KPI modal
  const openKPIModal = async (project) => {
    setKpiProject(project)
    setShowKPIModal(true)
    setKpiData(null)
    try {
      const data = await dashboardEntitiesService.getProjectKPIs(project.id)
      setKpiData(data)
    } catch (err) {
      console.error(err)
      showNotif('error', 'Error al cargar KPIs')
    }
  }

  const availableEmpleados = useMemo(() => {
    const assignedIds = new Set(asignaciones.map(a => a.empleado))
    return allEmpleados.filter(e => !assignedIds.has(e.id))
  }, [allEmpleados, asignaciones])

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-gray-50/50">

      {/* Hero Header */}
      <div id="tour-proyectos-header" className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <BriefcaseIcon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Proyectos</h1>
                <p className="text-indigo-200 text-sm mt-1">Gestión integral de proyectos y equipos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isAllProjects && (
                <button onClick={handleClearActive} className="bg-white/10 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20">
                  <EyeIcon className="h-4 w-4" />
                  <span>Ver Todos</span>
                </button>
              )}
              <button onClick={handleExportExcel} className={`bg-white/10 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20 ${!perms.canExportExcel ? 'hidden' : ''}`} title="Exportar Excel">
                <FileSpreadsheetIcon className="h-4 w-4" />
                <span className="hidden md:inline">Excel</span>
              </button>
              {perms.canCreate && (
                <button id="tour-proyectos-btn-nuevo" onClick={openTemplatePicker} className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg shadow-black/10">
                  <PlusIcon className="h-5 w-5" />
                  <span>Nuevo Proyecto</span>
                </button>
              )}
            </div>
          </div>
          <div id="tour-proyectos-stats" className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-indigo-200 text-xs font-medium mb-1">Total Proyectos</div>
              <div className="text-2xl font-extrabold">{stats?.total || pagination.count || 0}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-indigo-200 text-xs font-medium mb-1">Activos</div>
              <div className="text-2xl font-extrabold">{stats?.por_estado?.activo || 0}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-indigo-200 text-xs font-medium mb-1">Completados</div>
              <div className="text-2xl font-extrabold">{stats?.por_estado?.completado || 0}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-indigo-200 text-xs font-medium mb-1">Progreso Prom.</div>
              <div className="text-2xl font-extrabold">{stats?.progreso_promedio || 0}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active project indicator */}
      {!isAllProjects && activeProject && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: activeProject.color || '#6366f1' }}>
              {activeProject.name?.charAt(0) || 'P'}
            </div>
            <div>
              <span className="text-xs text-indigo-400 font-medium uppercase tracking-wide">Proyecto Activo</span>
              <p className="font-bold text-indigo-900">{activeProject.name}</p>
            </div>
          </div>
          <button onClick={handleClearActive} className="text-indigo-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-100 rounded-lg transition-colors" title="Ver todos los proyectos">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div id="tour-proyectos-filters" className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar proyectos..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-sm focus:border-indigo-300 focus:bg-white focus:ring-0 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="relative">
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="appearance-none pl-3 pr-8 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-sm focus:border-indigo-300 focus:bg-white cursor-pointer transition-all">
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterPrioridad} onChange={(e) => setFilterPrioridad(e.target.value)} className="appearance-none pl-3 pr-8 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-sm focus:border-indigo-300 focus:bg-white cursor-pointer transition-all">
              <option value="">Todas las prioridades</option>
              {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`} title="Vista grid">
              <LayoutGridIcon className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`} title="Vista lista">
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => loadProjects(currentPage)} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Recargar">
            <RefreshCwIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2Icon className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="ml-3 text-gray-500 font-medium">Cargando proyectos...</span>
        </div>
      ) : projects.length === 0 ? (
        /* ═══════ WELCOME WIZARD ═══════ */
        <div className="max-w-2xl mx-auto py-12">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200/60 overflow-hidden">
            {/* Wizard header */}
            <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-8 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
              </div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <BriefcaseIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-extrabold mb-2">¡Bienvenido a Proyectos!</h2>
                <p className="text-indigo-200 text-sm max-w-md mx-auto">
                  Organiza tu trabajo creando tu primer proyecto. Podrás asignar empleados, controlar presupuestos y hacer seguimiento al progreso.
                </p>
              </div>
            </div>
            {/* Feature cards */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                  <UsersIcon className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-indigo-700">Equipos</p>
                  <p className="text-[10px] text-indigo-400 mt-0.5">Asigna empleados a proyectos</p>
                </div>
                <div className="bg-violet-50 rounded-xl p-4 text-center">
                  <DollarSignIcon className="w-6 h-6 text-violet-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-violet-700">Presupuesto</p>
                  <p className="text-[10px] text-violet-400 mt-0.5">Controla gastos y ejecución</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <BarChart3Icon className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-purple-700">KPIs</p>
                  <p className="text-[10px] text-purple-400 mt-0.5">Métricas en tiempo real</p>
                </div>
              </div>
              <div className="pt-2">
                {perms.canCreate && (
                  <button onClick={openTemplatePicker} className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 text-base">
                    <PlusIcon className="w-6 h-6" />
                    Crear Mi Primer Proyecto
                  </button>
                )}
              </div>
              <p className="text-center text-[11px] text-gray-400">
                Podrás crear más proyectos después y verlos en vista Kanban, Timeline o Reportes.
              </p>
            </div>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div id="tour-proyectos-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} isActive={activeProject?.id === project.id} onEdit={handleEdit} onDelete={handleDelete} onSetActive={handleSetActive} onViewTeam={openTeamModal} onViewKPIs={openKPIModal} onView={(p) => navigate(`/dashboard/projects/${p.id}`)} perms={perms} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-600 to-violet-600">
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Proyecto</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Prioridad</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Progreso</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Equipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Presupuesto</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((project, idx) => (
                <tr key={project.id} className={`hover:bg-indigo-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${activeProject?.id === project.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: project.color || '#6366f1' }}>
                        {project.icono || project.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{project.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{project.codigo_proyecto}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><EstadoBadge estado={project.estado} /></td>
                  <td className="px-4 py-3"><PrioridadBadge prioridad={project.prioridad} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${project.progreso || 0}%`, backgroundColor: project.color || '#6366f1' }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600">{project.progreso || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <UsersIcon className="w-3.5 h-3.5" />{project.empleados_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatMoney(project.presupuesto_aprobado || project.presupuesto_estimado, project.moneda)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {activeProject?.id !== project.id && perms.canActivate && (
                        <button onClick={() => handleSetActive(project.id)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg" title="Activar"><StarIcon className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => navigate(`/dashboard/projects/${project.id}`)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg" title="Ver detalle"><EyeIcon className="w-4 h-4" /></button>
                      {perms.canViewTeam && (
                        <button onClick={() => openTeamModal(project)} className="p-1.5 text-purple-500 hover:bg-purple-100 rounded-lg" title="Equipo"><UsersIcon className="w-4 h-4" /></button>
                      )}
                      {perms.canViewKPIs && (
                        <button onClick={() => openKPIModal(project)} className="p-1.5 text-cyan-500 hover:bg-cyan-100 rounded-lg" title="KPIs"><BarChart3Icon className="w-4 h-4" /></button>
                      )}
                      {perms.canEdit && (
                        <button onClick={() => handleEdit(project)} className="p-1.5 text-amber-500 hover:bg-amber-100 rounded-lg" title="Editar"><EditIcon className="w-4 h-4" /></button>
                      )}
                      {perms.canDelete && (
                        <button onClick={() => handleDelete(project.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200/60 px-5 py-3">
          <span className="text-sm text-gray-500">{pagination.count} proyecto{pagination.count !== 1 ? 's' : ''} — Página {currentPage} de {pagination.total_pages}</span>
          <div className="flex gap-2">
            <button onClick={() => loadProjects(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-4 py-1.5 text-sm bg-gray-100 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors font-medium">Anterior</button>
            <button onClick={() => loadProjects(Math.min(pagination.total_pages, currentPage + 1))} disabled={currentPage === pagination.total_pages} className="px-4 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg disabled:opacity-40 hover:bg-indigo-200 transition-colors font-medium">Siguiente</button>
          </div>
        </div>
      )}

      {/* ═══════ CREATE / EDIT MODAL ═══════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  {editingProject ? <EditIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
                  <p className="text-indigo-200 text-sm">{editingProject ? `Editando: ${editingProject.name}` : 'Completa la información del proyecto'}</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><XIcon className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><BriefcaseIcon className="w-4 h-4" />Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre del proyecto *</label>
                    <input type="text" required className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" placeholder="Ej: Edificio Torre Norte" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción</label>
                    <textarea className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" rows="3" placeholder="Descripción del proyecto..." value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cliente</label>
                    <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" placeholder="Nombre del cliente" value={formData.cliente} onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Centro de Costo</label>
                    <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" placeholder="Ej: CC-001" value={formData.centro_costo} onChange={(e) => setFormData(prev => ({ ...prev, centro_costo: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Etiquetas</label>
                    <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" placeholder="construcción, urgente, fase-1 (separadas por coma)" value={formData.tags} onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))} />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer" value={formData.color} onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))} />
                        <input type="text" className="flex-1 px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-mono" value={formData.color} onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))} />
                      </div>
                    </div>
                    <div className="w-24">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Icono</label>
                      <input type="text" className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-center text-lg" placeholder="🏗️" maxLength={2} value={formData.icono} onChange={(e) => setFormData(prev => ({ ...prev, icono: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><FlagIcon className="w-4 h-4" />Estado y Prioridad</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado</label>
                    <select className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" value={formData.estado} onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}>
                      {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prioridad</label>
                    <select className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" value={formData.prioridad} onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value }))}>
                      {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Progreso: {formData.progreso}%</label>
                    <input type="range" min="0" max="100" step="5" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-3" value={formData.progreso} onChange={(e) => setFormData(prev => ({ ...prev, progreso: parseInt(e.target.value) }))} />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><CalendarIcon className="w-4 h-4" />Fechas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha de inicio *</label>
                    <input type="date" required className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" value={formData.start_date} onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha fin estimada</label>
                    <input type="date" className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" value={formData.end_date} onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSignIcon className="w-4 h-4" />Presupuesto</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Moneda</label>
                    <select className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" value={formData.moneda} onChange={(e) => setFormData(prev => ({ ...prev, moneda: e.target.value }))}>
                      <option value="COP">COP - Peso Colombiano</option>
                      <option value="USD">USD - Dólar</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Presupuesto estimado</label>
                    <input type="number" className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" placeholder="0" value={formData.presupuesto_estimado} onChange={(e) => setFormData(prev => ({ ...prev, presupuesto_estimado: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Presupuesto aprobado</label>
                    <input type="number" className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" placeholder="0" value={formData.presupuesto_aprobado} onChange={(e) => setFormData(prev => ({ ...prev, presupuesto_aprobado: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><HashIcon className="w-4 h-4" />Notas Internas</h3>
                <textarea className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:bg-white transition-all" rows="3" placeholder="Notas internas del proyecto..." value={formData.notas_internas} onChange={(e) => setFormData(prev => ({ ...prev, notas_internas: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200">{editingProject ? 'Actualizar Proyecto' : 'Crear Proyecto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ TEAM MODAL ═══════ */}
      {showTeamModal && teamProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><UsersIcon className="w-5 h-5" /></div>
                <div>
                  <h2 className="text-xl font-bold">Equipo del Proyecto</h2>
                  <p className="text-purple-200 text-sm">{teamProject.name}</p>
                </div>
              </div>
              <button onClick={() => setShowTeamModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><XIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-6">
              {perms.canManageTeam && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2"><UserPlusIcon className="w-4 h-4" />Asignar Empleado</h4>
                  <div className="flex gap-3">
                    <select className="flex-1 px-3 py-2.5 bg-white border-2 border-purple-200 rounded-xl text-sm focus:border-purple-400" value={newAsignacion.empleado} onChange={(e) => setNewAsignacion(prev => ({ ...prev, empleado: e.target.value }))}>
                      <option value="">Seleccionar empleado...</option>
                      {availableEmpleados.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.primer_nombre} {emp.primer_apellido} — {emp.numero_identificacion}</option>
                      ))}
                    </select>
                    <button onClick={handleAddAsignacion} disabled={!newAsignacion.empleado} className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-40 transition-all flex items-center gap-1.5">
                      <PlusIcon className="w-4 h-4" />Asignar
                    </button>
                  </div>
                </div>
              )}
              {teamLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2Icon className="w-6 h-6 text-purple-500 animate-spin" /><span className="ml-2 text-gray-500">Cargando equipo...</span>
                </div>
              ) : asignaciones.length === 0 ? (
                <div className="text-center py-10">
                  <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No hay empleados asignados a este proyecto</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {asignaciones.map(asig => (
                      <div key={asig.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                            {(asig.empleado_nombre || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{asig.empleado_nombre || `Empleado #${asig.empleado}`}</div>
                            <div className="text-xs text-gray-400">{asig.fecha_asignacion}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {perms.canManageTeam && (
                            <button onClick={() => handleRemoveAsignacion(asig.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Desasignar">
                              <XIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ KPI MODAL ═══════ */}
      {showKPIModal && kpiProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between bg-gradient-to-r from-cyan-600 to-teal-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><BarChart3Icon className="w-5 h-5" /></div>
                <div>
                  <h2 className="text-xl font-bold">KPIs del Proyecto</h2>
                  <p className="text-cyan-200 text-sm">{kpiProject.name}</p>
                </div>
              </div>
              <button onClick={() => setShowKPIModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><XIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
              {!kpiData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2Icon className="w-6 h-6 text-cyan-500 animate-spin" /><span className="ml-2 text-gray-500">Cargando KPIs...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-5 border border-indigo-100">
                    <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wide mb-1">Progreso</div>
                    <div className="text-3xl font-extrabold text-indigo-700">{kpiData.progreso || 0}%</div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
                    <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">Empleados</div>
                    <div className="text-3xl font-extrabold text-emerald-700">{kpiData.empleados_count || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
                    <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">Presupuesto</div>
                    <div className="text-xl font-extrabold text-amber-700">{formatMoney(kpiData.presupuesto_aprobado, kpiData.moneda)}</div>
                    <div className="text-xs text-amber-500 mt-1">Ejecución: {kpiData.porcentaje_ejecucion || 0}%</div>
                  </div>
                  <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-5 border border-rose-100">
                    <div className="text-xs text-rose-600 font-semibold uppercase tracking-wide mb-1">Gasto Acumulado</div>
                    <div className="text-xl font-extrabold text-rose-700">{formatMoney(kpiData.gasto_acumulado, kpiData.moneda)}</div>
                    <div className="text-xs text-rose-500 mt-1">Restante: {formatMoney(kpiData.presupuesto_restante, kpiData.moneda)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-5 border border-blue-100">
                    <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Total Nómina</div>
                    <div className="text-xl font-extrabold text-blue-700">{formatMoney(kpiData.total_nomina, kpiData.moneda)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-5 border border-purple-100">
                    <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-1">Préstamos Activos</div>
                    <div className="text-3xl font-extrabold text-purple-700">{kpiData.prestamos_activos || 0}</div>
                  </div>
                  {kpiData.duracion_dias != null && (
                    <div className="col-span-2 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Duración</div>
                          <div className="text-2xl font-extrabold text-gray-700">{kpiData.duracion_dias} días</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400 mb-1">{kpiData.start_date} → {kpiData.end_date || 'En curso'}</div>
                          <EstadoBadge estado={kpiData.estado} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TEMPLATE PICKER MODAL ═══════ */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
            <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">📋</div>
                <div>
                  <h2 className="text-xl font-bold">Crear Nuevo Proyecto</h2>
                  <p className="text-purple-200 text-sm">Elige una plantilla o empieza en blanco</p>
                </div>
              </div>
              <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><XIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
              {loadingPlantillas ? (
                <div className="flex justify-center py-12"><Loader2Icon className="w-8 h-8 animate-spin text-indigo-500" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                    {plantillas.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectTemplate(p)}
                        className="group text-left p-5 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all bg-white hover:bg-indigo-50/50"
                      >
                        <div className="text-3xl mb-3">{p.icon}</div>
                        <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors">{p.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-medium">{p.duracion_dias}d</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: p.color + '20', color: p.color }}>{p.prioridad}</span>
                          {p.presupuesto_sugerido > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full font-medium">${(p.presupuesto_sugerido / 1000000).toFixed(0)}M</span>
                          )}
                        </div>
                        {p.fases?.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-gray-100">
                            <div className="text-[10px] text-gray-400 font-medium mb-1">FASES:</div>
                            <div className="text-[10px] text-gray-500 line-clamp-1">{p.fases.join(' → ')}</div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-t pt-4 flex justify-between items-center">
                    <p className="text-xs text-gray-400">Las plantillas pre-llenan datos que puedes editar</p>
                    <button onClick={handleCreateBlank} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2">
                      <PlusIcon className="w-4 h-4" />
                      Proyecto en Blanco
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-20 right-6 z-[60] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {notification.type === 'success' ? <CheckIcon className="w-5 h-5" /> : <AlertCircleIcon className="w-5 h-5" />}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
