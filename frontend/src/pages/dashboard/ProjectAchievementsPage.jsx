import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../../context/PermissionsContext'
import dashboardEntitiesService from '../../services/dashboardEntitiesService'
import {
  ChevronLeftIcon,
  RefreshCwIcon,
  Loader2Icon,
  AlertCircleIcon,
  TrophyIcon,
  StarIcon,
  LockIcon,
  UnlockIcon,
  ZapIcon,
  TargetIcon,
} from 'lucide-react'

// ─── Category config ───────────────────────────────────────────
const CATEGORIAS = {
  inicio:     { label: 'Inicio', color: 'from-sky-500 to-blue-600', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  produccion: { label: 'Producción', color: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  logro:      { label: 'Logros', color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  equipo:     { label: 'Equipo', color: 'from-purple-500 to-fuchsia-600', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  finanzas:   { label: 'Finanzas', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  velocidad:  { label: 'Velocidad', color: 'from-cyan-500 to-teal-600', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  especial:   { label: 'Especiales', color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
}

// ─── XP Progress Bar ───────────────────────────────────────────
const XPBar = ({ current, nextLevel, max }) => {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold text-indigo-700">{current} XP</span>
        {nextLevel && <span className="text-gray-400">{max} XP para {nextLevel}</span>}
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Achievement Card ──────────────────────────────────────────
const AchievementCard = ({ logro }) => {
  const cat = CATEGORIAS[logro.categoria] || CATEGORIAS.inicio
  const unlocked = logro.desbloqueado

  return (
    <div className={`relative rounded-2xl border-2 p-5 transition-all duration-300 ${
      unlocked
        ? `${cat.border} ${cat.bg} shadow-md hover:shadow-lg hover:scale-[1.02]`
        : 'border-gray-200 bg-gray-50/50 opacity-60 hover:opacity-80'
    }`}>
      {/* Badge position */}
      {unlocked && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
          <StarIcon className="w-4 h-4 text-white fill-current" />
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className={`text-4xl ${unlocked ? '' : 'grayscale'}`}>
          {logro.icono}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold text-sm ${unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
              {logro.nombre}
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${unlocked ? `${cat.bg} ${cat.text}` : 'bg-gray-100 text-gray-400'}`}>
              {logro.xp} XP
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{logro.descripcion}</p>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-gray-400">{logro.progreso}/{logro.meta}</span>
              <span className={`font-bold ${unlocked ? cat.text : 'text-gray-400'}`}>{logro.porcentaje}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  unlocked ? `bg-gradient-to-r ${cat.color}` : 'bg-gray-300'
                }`}
                style={{ width: `${logro.porcentaje}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lock overlay */}
      {!unlocked && (
        <div className="absolute top-3 right-3">
          <LockIcon className="w-4 h-4 text-gray-300" />
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
const ProjectAchievementsPage = () => {
  const navigate = useNavigate()
  const { hasPermission, initialized } = usePermissions()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, unlocked, locked, category

  const loadLogros = useCallback(async () => {
    try {
      setLoading(true)
      const result = await dashboardEntitiesService.getLogros()
      setData(result)
    } catch (err) {
      console.error('Error loading logros:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLogros() }, [loadLogros])

  if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('proyectos.logros')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para ver logros de proyectos</div>

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2Icon className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="ml-3 text-gray-500 font-medium">Cargando logros...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center py-24">
        <AlertCircleIcon className="w-12 h-12 text-red-300 mx-auto mb-3" />
        <p className="text-gray-500">Error al cargar los logros</p>
        <button onClick={loadLogros} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Reintentar</button>
      </div>
    )
  }

  const { logros, nivel, nivel_siguiente, xp_total, resumen } = data

  // Filter logros
  const filteredLogros = logros.filter(l => {
    if (filter === 'unlocked') return l.desbloqueado
    if (filter === 'locked') return !l.desbloqueado
    if (filter !== 'all' && filter !== 'unlocked' && filter !== 'locked') return l.categoria === filter
    return true
  })

  // Group by category
  const categorias = Object.entries(CATEGORIAS)
  const allCategories = [...new Set(logros.map(l => l.categoria))]

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50/50 space-y-6">
      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-10 w-64 h-64 bg-white rounded-full -translate-y-1/3" />
          <div className="absolute bottom-0 left-10 w-48 h-48 bg-white rounded-full translate-y-1/3" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard/projects')} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <TrophyIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Logros y Gamificación</h1>
                <p className="text-purple-200 text-sm mt-1">Tu progreso y reconocimientos</p>
              </div>
            </div>
            <button onClick={loadLogros} className="p-3 hover:bg-white/20 rounded-xl transition-colors self-end md:self-auto">
              <RefreshCwIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Level Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 md:col-span-2">
              <div className="flex items-center gap-4 mb-3">
                <div className="text-5xl">{nivel.icono}</div>
                <div>
                  <h2 className="text-2xl font-extrabold">{nivel.nombre}</h2>
                  <p className="text-purple-200 text-xs">Nivel actual</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="flex items-center gap-1">
                    <ZapIcon className="w-5 h-5 text-amber-300 fill-current" />
                    <span className="text-3xl font-extrabold">{xp_total}</span>
                  </div>
                  <p className="text-purple-200 text-xs">XP Total</p>
                </div>
              </div>
              {nivel_siguiente && (
                <XPBar
                  current={xp_total}
                  nextLevel={nivel_siguiente.nombre}
                  max={nivel_siguiente.xp_requerido}
                />
              )}
              {nivel_siguiente && (
                <p className="text-purple-200 text-[11px] mt-2 flex items-center gap-1">
                  <TargetIcon className="w-3 h-3" />
                  {nivel_siguiente.xp_faltante} XP para {nivel_siguiente.icono} {nivel_siguiente.nombre}
                </p>
              )}
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 flex flex-col items-center justify-center">
              <div className="text-4xl font-extrabold">{resumen.desbloqueados}/{resumen.total_logros}</div>
              <p className="text-purple-200 text-sm mt-1">Logros Desbloqueados</p>
              <div className="w-full mt-3">
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                    style={{ width: `${resumen.porcentaje}%` }}
                  />
                </div>
                <p className="text-[10px] text-center mt-1 text-purple-200">{resumen.porcentaje}% completado</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: 'all', label: 'Todos', icon: '🏠' },
          { id: 'unlocked', label: 'Desbloqueados', icon: '🔓' },
          { id: 'locked', label: 'Bloqueados', icon: '🔒' },
          ...allCategories.map(c => ({ id: c, label: CATEGORIAS[c]?.label || c, icon: CATEGORIAS[c] ? '' : '📂' })),
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === f.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200'
            }`}
          >
            {f.icon && <span className="mr-1">{f.icon}</span>}
            {f.label}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLogros.map(logro => (
          <AchievementCard key={logro.id} logro={logro} />
        ))}
      </div>

      {filteredLogros.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <LockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay logros en esta categoría</p>
        </div>
      )}
    </div>
  )
}

export default ProjectAchievementsPage
