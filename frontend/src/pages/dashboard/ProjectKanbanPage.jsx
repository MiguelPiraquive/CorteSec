import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import dashboardEntitiesService from '../../services/dashboardEntitiesService'
import { useActiveProject } from '../../context/ActiveProjectContext'
import { usePermissions } from '../../context/PermissionsContext'
import {
  KanbanIcon,
  GripVerticalIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  CalendarIcon,
  ArrowRightIcon,
  Loader2Icon,
  RefreshCwIcon,
  AlertCircleIcon,
  PlusIcon,
  ChevronLeftIcon,
  TargetIcon,
} from 'lucide-react'

// ─── Column configs matching backend estados ───────────────────
const COLUMNS = [
  {
    key: 'planificacion',
    label: 'Planificación',
    icon: ClockIcon,
    gradient: 'from-slate-500 to-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    accent: 'text-slate-600',
  },
  {
    key: 'activo',
    label: 'Activo',
    icon: PlayIcon,
    gradient: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    accent: 'text-emerald-600',
  },
  {
    key: 'pausado',
    label: 'Pausado',
    icon: PauseIcon,
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    accent: 'text-amber-600',
  },
  {
    key: 'completado',
    label: 'Completado',
    icon: CheckCircleIcon,
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    accent: 'text-blue-600',
  },
  {
    key: 'cancelado',
    label: 'Cancelado',
    icon: XCircleIcon,
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
    accent: 'text-red-600',
  },
]

// ─── Kanban Card ───────────────────────────────────────────────
const KanbanCard = ({ project, onDragStart, onChangeEstado, columnKey, canChangeEstado = true }) => {
  const color = project.color || '#6366f1'

  return (
    <div
      draggable={canChangeEstado}
      onDragStart={canChangeEstado ? (e) => onDragStart(e, project, columnKey) : undefined}
      className={`group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-gray-200 ${canChangeEstado ? 'cursor-grab active:cursor-grabbing active:shadow-xl active:scale-[1.02]' : 'cursor-default'}`}
    >
      <div className="h-1 rounded-t-xl" style={{ backgroundColor: color }} />
      <div className="p-3.5">
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
            style={{ backgroundColor: color }}
          >
            {project.icono || project.name?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-sm truncate leading-tight">{project.name}</h4>
            <span className="text-[10px] text-gray-400 font-mono">{project.codigo_proyecto}</span>
          </div>
          <GripVerticalIcon className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
        </div>

        {/* Progress */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400 font-medium">Progreso</span>
            <span className="text-[10px] font-bold" style={{ color }}>{project.progreso || 0}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${project.progreso || 0}%`, backgroundColor: color }} />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          {project.empleados_count > 0 && (
            <span className="flex items-center gap-1">
              <UsersIcon className="w-3 h-3" />
              {project.empleados_count}
            </span>
          )}
          {project.start_date && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {project.start_date}
            </span>
          )}
        </div>

        {/* Quick action buttons — drag to move or click */}
        {canChangeEstado && (
        <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
          {COLUMNS.filter(c => c.key !== columnKey).map(col => {
            const Icon = col.icon
            return (
              <button
                key={col.key}
                onClick={(e) => { e.stopPropagation(); onChangeEstado(project.id, col.key) }}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[9px] font-semibold ${col.accent} ${col.bg} hover:opacity-80 transition-all`}
                title={`Mover a ${col.label}`}
              >
                <Icon className="w-2.5 h-2.5" />
              </button>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}

// ─── Kanban Column ─────────────────────────────────────────────
const KanbanColumn = ({ column, projects, onDragStart, onDragOver, onDrop, onChangeEstado, canChangeEstado }) => {
  const Icon = column.icon
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      className={`flex flex-col min-w-[280px] max-w-[320px] flex-1 rounded-2xl transition-all duration-200 ${
        isDragOver ? `ring-2 ring-offset-2 ${column.border} ring-current ${column.accent}` : ''
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); onDragOver(e) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDrop(e, column.key) }}
    >
      {/* Column header */}
      <div className={`bg-gradient-to-r ${column.gradient} rounded-t-2xl px-4 py-3 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="font-bold text-sm">{column.label}</span>
          </div>
          <span className="bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs font-bold">
            {projects.length}
          </span>
        </div>
      </div>

      {/* Cards area */}
      <div className={`flex-1 ${column.bg} rounded-b-2xl p-3 space-y-3 min-h-[200px] border-x border-b ${column.border}`}>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-300">
            <TargetIcon className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs font-medium">Sin proyectos</p>
            <p className="text-[10px] mt-0.5">Arrastra aquí para mover</p>
          </div>
        ) : (
          projects.map(project => (
            <KanbanCard
              key={project.id}
              project={project}
              columnKey={column.key}
              onDragStart={onDragStart}
              onChangeEstado={onChangeEstado}
              canChangeEstado={canChangeEstado}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN KANBAN PAGE
// ════════════════════════════════════════════════════════════════
const ProjectKanbanPage = () => {
  const navigate = useNavigate()
  const { refreshProjects } = useActiveProject()
  const { hasPermission } = usePermissions()
  const canChangeEstado = useMemo(() => hasPermission('proyectos.change_estado'), [hasPermission])
  const canCreate = useMemo(() => hasPermission('proyectos.create'), [hasPermission])
  const [kanbanData, setKanbanData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [draggedProject, setDraggedProject] = useState(null)
  const [sourceColumn, setSourceColumn] = useState(null)

  const loadKanban = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await dashboardEntitiesService.getProjectKanban()
      setKanbanData(data)
    } catch (err) {
      console.error('Error loading kanban:', err)
      setError('Error al cargar el tablero Kanban')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadKanban() }, [loadKanban])

  const showNotif = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // --- Drag handlers ---
  const handleDragStart = (e, project, fromColumn) => {
    setDraggedProject(project)
    setSourceColumn(fromColumn)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', project.id.toString())
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault()
    if (!draggedProject || sourceColumn === targetColumn) {
      setDraggedProject(null)
      setSourceColumn(null)
      return
    }

    // Optimistic UI update
    const prevData = { ...kanbanData }
    const newData = { ...kanbanData }

    // Remove from source
    if (newData[sourceColumn]) {
      newData[sourceColumn] = {
        ...newData[sourceColumn],
        count: newData[sourceColumn].count - 1,
        projects: newData[sourceColumn].projects.filter(p => p.id !== draggedProject.id),
      }
    }

    // Add to target with updated estado
    const movedProject = { ...draggedProject, estado: targetColumn }
    if (newData[targetColumn]) {
      newData[targetColumn] = {
        ...newData[targetColumn],
        count: newData[targetColumn].count + 1,
        projects: [...newData[targetColumn].projects, movedProject],
      }
    }

    setKanbanData(newData)
    setDraggedProject(null)
    setSourceColumn(null)

    try {
      await dashboardEntitiesService.changeProjectEstado(draggedProject.id, targetColumn)
      const col = COLUMNS.find(c => c.key === targetColumn)
      showNotif('success', `"${draggedProject.name}" movido a ${col?.label || targetColumn}`)
      refreshProjects()
    } catch (err) {
      console.error('Error changing estado:', err)
      setKanbanData(prevData) // Revert
      showNotif('error', 'Error al cambiar el estado del proyecto')
    }
  }

  const handleChangeEstado = async (projectId, nuevoEstado) => {
    const project = Object.values(kanbanData)
      .flatMap(col => col.projects || [])
      .find(p => p.id === projectId)
    if (!project) return

    const currentEstado = project.estado
    if (currentEstado === nuevoEstado) return

    // Optimistic update
    const prevData = { ...kanbanData }
    const newData = { ...kanbanData }

    if (newData[currentEstado]) {
      newData[currentEstado] = {
        ...newData[currentEstado],
        count: newData[currentEstado].count - 1,
        projects: newData[currentEstado].projects.filter(p => p.id !== projectId),
      }
    }

    const movedProject = { ...project, estado: nuevoEstado }
    if (newData[nuevoEstado]) {
      newData[nuevoEstado] = {
        ...newData[nuevoEstado],
        count: newData[nuevoEstado].count + 1,
        projects: [...newData[nuevoEstado].projects, movedProject],
      }
    }

    setKanbanData(newData)

    try {
      await dashboardEntitiesService.changeProjectEstado(projectId, nuevoEstado)
      const col = COLUMNS.find(c => c.key === nuevoEstado)
      showNotif('success', `"${project.name}" → ${col?.label || nuevoEstado}`)
      refreshProjects()
    } catch (err) {
      setKanbanData(prevData)
      showNotif('error', 'Error al cambiar estado')
    }
  }

  const totalProjects = Object.values(kanbanData).reduce((sum, col) => sum + (col?.count || 0), 0)

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 rounded-2xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden mb-6">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white rounded-full -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white rounded-full translate-y-1/3 -translate-x-1/4" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard/projects')} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="Volver a proyectos">
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <KanbanIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Tablero Kanban</h1>
              <p className="text-purple-200 text-sm mt-1">Arrastra proyectos entre columnas para cambiar su estado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
              <span className="text-purple-200 text-xs font-medium">Total</span>
              <p className="text-xl font-extrabold">{totalProjects}</p>
            </div>
            <button onClick={loadKanban} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors" title="Recargar">
              <RefreshCwIcon className="w-5 h-5" />
            </button>
            {canCreate && (
              <button onClick={() => navigate('/dashboard/projects')} className="bg-white text-purple-600 px-5 py-2.5 rounded-xl font-bold hover:bg-purple-50 transition-all flex items-center gap-2 shadow-lg">
                <PlusIcon className="h-5 w-5" />
                <span>Nuevo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2Icon className="w-8 h-8 text-purple-500 animate-spin" />
          <span className="ml-3 text-gray-500 font-medium">Cargando tablero...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircleIcon className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{error}</p>
          <button onClick={loadKanban} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory">
          {COLUMNS.map(column => (
            <KanbanColumn
              key={column.key}
              column={column}
              projects={kanbanData[column.key]?.projects || []}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onChangeEstado={handleChangeEstado}
              canChangeEstado={canChangeEstado}
            />
          ))}
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in-from-bottom ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <AlertCircleIcon className="w-5 h-5" />}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}
    </div>
  )
}

export default ProjectKanbanPage
