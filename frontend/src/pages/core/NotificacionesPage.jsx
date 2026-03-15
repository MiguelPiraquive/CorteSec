import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import notificationsService from '../../services/notificationsService'
import { useNotifications } from '../../context/NotificationContext'
import {
  BellIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  InfoIcon,
  MailOpenIcon,
  MailIcon,
  Trash2Icon,
  FilterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  InboxIcon,
  CheckCheckIcon,
  SettingsIcon,
  BriefcaseIcon,
  WalletIcon,
  FileTextIcon,
  UsersIcon,
  FolderOpenIcon,
  ShieldIcon,
  BarChart3Icon,
  CpuIcon,
  AlertCircleIcon,
  XIcon,
  ArrowUpRightIcon,
} from 'lucide-react'

// --- Config maps ---

const categoriaConfig = {
  general:       { label: 'General',       icon: InboxIcon,        color: 'indigo' },
  nomina:        { label: 'Nómina',        icon: WalletIcon,       color: 'emerald' },
  prestamos:     { label: 'Préstamos',     icon: BriefcaseIcon,    color: 'blue' },
  contratos:     { label: 'Contratos',     icon: FileTextIcon,     color: 'violet' },
  empleados:     { label: 'Empleados',     icon: UsersIcon,        color: 'cyan' },
  contabilidad:  { label: 'Contabilidad',  icon: BarChart3Icon,    color: 'amber' },
  proyectos:     { label: 'Proyectos',     icon: FolderOpenIcon,   color: 'rose' },
  seguridad:     { label: 'Seguridad',     icon: ShieldIcon,       color: 'red' },
  sistema:       { label: 'Sistema',       icon: CpuIcon,          color: 'gray' },
}

const prioridadConfig = {
  baja:    { label: 'Baja',    bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  normal:  { label: 'Normal',  bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  alta:    { label: 'Alta',    bg: 'bg-orange-100',  text: 'text-orange-700', dot: 'bg-orange-500' },
  urgente: { label: 'Urgente', bg: 'bg-red-100',     text: 'text-red-700',    dot: 'bg-red-500' },
}

const tipoConfig = {
  info:    { icon: InfoIcon,          gradient: 'from-blue-400 to-cyan-500' },
  success: { icon: CheckCircleIcon,   gradient: 'from-green-400 to-emerald-500' },
  warning: { icon: AlertTriangleIcon, gradient: 'from-orange-400 to-amber-500' },
  error:   { icon: XCircleIcon,       gradient: 'from-red-400 to-rose-500' },
  system:  { icon: SettingsIcon,      gradient: 'from-gray-400 to-gray-500' },
}

const NotificacionesPage = () => {
  const navigate = useNavigate()
  const { refreshStats, markAllRead: ctxMarkAllRead, deleteAllRead: ctxDeleteAllRead } = useNotifications()

  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filtros
  const [categoria, setCategoria] = useState('')
  const [prioridad, setPrioridad] = useState('')
  const [leida, setLeida] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 15

  const loadStats = useCallback(async () => {
    try {
      const data = await notificationsService.stats()
      setStats(data)
    } catch {
      setStats(null)
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        ordering: '-fecha',
        page,
        page_size: pageSize,
      }
      if (categoria) params.categoria = categoria
      if (prioridad) params.prioridad = prioridad
      if (leida) params.leida = leida

      const data = await notificationsService.list(params)
      const list = Array.isArray(data) ? data : (data.results || [])
      setItems(list)
      setTotal(data.count || list.length)
    } catch {
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [categoria, prioridad, leida, page])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Handlers
  const handleMarkRead = async (id) => {
    try {
      await notificationsService.markRead(id)
      setItems(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
      refreshStats()
      loadStats()
    } catch { toast.error('Error al marcar como leída') }
  }

  const handleMarkUnread = async (id) => {
    try {
      await notificationsService.markUnread(id)
      setItems(prev => prev.map(n => n.id === id ? { ...n, leida: false } : n))
      refreshStats()
      loadStats()
    } catch { toast.error('Error al marcar como no leída') }
  }

  const handleMarkAll = async () => {
    try {
      await ctxMarkAllRead()
      setItems(prev => prev.map(n => ({ ...n, leida: true })))
      loadStats()
      toast.success('Todas marcadas como leídas')
    } catch { toast.error('Error') }
  }

  const handleDeleteAllRead = async () => {
    try {
      await ctxDeleteAllRead()
      await loadNotifications()
      loadStats()
      toast.success('Notificaciones leídas eliminadas')
    } catch { toast.error('Error al eliminar') }
  }

  const handleDelete = async (id) => {
    try {
      await notificationsService.delete(id)
      setItems(prev => prev.filter(n => n.id !== id))
      setTotal(prev => Math.max(0, prev - 1))
      refreshStats()
      loadStats()
      toast.success('Notificación eliminada')
    } catch { toast.error('Error al eliminar') }
  }

  const handleNotifClick = (notif) => {
    if (!notif.leida) handleMarkRead(notif.id)
    if (notif.url_accion) navigate(notif.url_accion)
  }

  // Stats helpers
  const urgentCount = stats?.urgentes || 0
  const unreadCount = stats?.no_leidas || 0
  const readCount = stats?.leidas || 0
  const porCategoria = stats?.por_categoria || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shadow-lg">
              <BellIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Notificaciones</h1>
              <p className="text-white/80 text-sm mt-1">
                {unreadCount > 0
                  ? `${unreadCount} sin leer${urgentCount > 0 ? ` · ${urgentCount} urgente${urgentCount > 1 ? 's' : ''}` : ''}`
                  : 'Todas al día'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteAllRead}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-300 font-semibold text-sm border border-white/20"
              title="Eliminar todas las leídas"
            >
              <Trash2Icon className="w-4 h-4" />
              <span className="hidden sm:inline">Limpiar leídas</span>
            </button>
            <button
              onClick={handleMarkAll}
              className="flex items-center space-x-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-300 font-semibold text-sm border border-white/20 shadow-lg hover:shadow-xl hover:scale-105 transform"
            >
              <CheckCheckIcon className="w-4 h-4" />
              <span>Marcar todas leídas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats?.total || 0, icon: InboxIcon, color: 'indigo' },
          { label: 'Sin leer', value: unreadCount, icon: BellIcon, color: 'amber' },
          { label: 'Leídas', value: readCount, icon: MailOpenIcon, color: 'green' },
          { label: 'Urgentes', value: urgentCount, icon: AlertCircleIcon, color: 'red' },
        ].map((card) => (
          <div key={card.label} className="group relative overflow-hidden backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-5 border border-gray-200/50 hover:shadow-xl transition-all duration-300">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-${card.color}-500/10 to-transparent rounded-full -mr-10 -mt-10`}></div>
            <div className="relative z-10">
              <div className={`bg-${card.color}-100 p-2.5 rounded-xl shadow-md w-fit mb-3`}>
                <card.icon className={`w-5 h-5 text-${card.color}-600`} />
              </div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{card.label}</p>
              <p className={`text-3xl font-bold text-${card.color}-600 mt-1`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs de categorías */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 p-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => { setCategoria(''); setPage(1) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              !categoria
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <InboxIcon className="w-4 h-4" />
            <span>Todas</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${!categoria ? 'bg-white/30' : 'bg-gray-200'}`}>
              {stats?.total || 0}
            </span>
          </button>
          {Object.entries(categoriaConfig).map(([key, cfg]) => {
            const count = porCategoria[key] || 0
            if (count === 0 && key !== categoria) return null
            const CatIcon = cfg.icon
            return (
              <button
                key={key}
                onClick={() => { setCategoria(key); setPage(1) }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  categoria === key
                    ? `bg-${cfg.color}-100 text-${cfg.color}-700 shadow-sm`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CatIcon className="w-4 h-4" />
                <span>{cfg.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    categoria === key ? `bg-${cfg.color}-200` : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filtros secundarios */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-4 border border-gray-200/50 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <FilterIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filtros:</span>
        </div>
        <select
          value={prioridad}
          onChange={(e) => { setPrioridad(e.target.value); setPage(1) }}
          className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          <option value="">Todas las prioridades</option>
          {Object.entries(prioridadConfig).map(([v, cfg]) => (
            <option key={v} value={v}>{cfg.label}</option>
          ))}
        </select>
        <select
          value={leida}
          onChange={(e) => { setLeida(e.target.value); setPage(1) }}
          className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          <option value="">Todas</option>
          <option value="false">No leídas</option>
          <option value="true">Leídas</option>
        </select>
        {(categoria || prioridad || leida) && (
          <button
            onClick={() => { setCategoria(''); setPrioridad(''); setLeida(''); setPage(1) }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-semibold"
          >
            <XIcon className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
        <div className="ml-auto text-xs text-gray-400 font-medium">
          {total} resultado{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2Icon className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Cargando notificaciones...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="bg-gray-100 p-5 rounded-2xl inline-block mb-4">
              <BellIcon className="w-12 h-12 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold text-lg">Sin notificaciones</p>
            <p className="text-gray-400 text-sm mt-1">No se encontraron notificaciones con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((notif) => {
              const tipo = tipoConfig[notif.tipo] || tipoConfig.info
              const TipoIcon = tipo.icon
              const catCfg = categoriaConfig[notif.categoria] || categoriaConfig.general
              const CatIcon = catCfg.icon
              const prioCfg = prioridadConfig[notif.prioridad] || prioridadConfig.normal
              const isClickable = !!notif.url_accion

              return (
                <div
                  key={notif.id}
                  className={`group p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300 ${
                    !notif.leida
                      ? 'bg-indigo-50/30 border-l-4 border-l-indigo-500'
                      : 'border-l-4 border-l-transparent hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-blue-50/30'
                  } ${isClickable ? 'cursor-pointer' : ''}`}
                  onClick={isClickable ? () => handleNotifClick(notif) : undefined}
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${tipo.gradient} shadow-md flex-shrink-0 transform group-hover:scale-110 transition-transform duration-300`}>
                      <TipoIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold bg-${catCfg.color}-100 text-${catCfg.color}-700`}>
                          <CatIcon className="w-3 h-3" />
                          {catCfg.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold ${prioCfg.bg} ${prioCfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${prioCfg.dot}`}></span>
                          {prioCfg.label}
                        </span>
                        {!notif.leida && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm">
                            Nueva
                          </span>
                        )}
                        {notif.esta_expirada && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-gray-200 text-gray-500">
                            Expirada
                          </span>
                        )}
                      </div>
                      <h3 className={`text-sm font-bold ${!notif.leida ? 'text-gray-900' : 'text-gray-700'}`}>{notif.titulo}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notif.mensaje}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-gray-400 font-medium">{notif.fecha_formatted || notif.fecha}</span>
                        {notif.url_accion && notif.texto_accion && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-semibold hover:text-indigo-700">
                            {notif.texto_accion}
                            <ArrowUpRightIcon className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!notif.leida ? (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="flex items-center space-x-1.5 px-3.5 py-2 text-xs rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-200 font-semibold hover:shadow-md"
                        title="Marcar como leída"
                      >
                        <MailOpenIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Leída</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkUnread(notif.id)}
                        className="flex items-center space-x-1.5 px-3.5 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 font-semibold hover:shadow-md"
                        title="Marcar como no leída"
                      >
                        <MailIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">No leída</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 text-xs rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all duration-200 font-semibold hover:shadow-md"
                      title="Eliminar"
                    >
                      <Trash2Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-4 border border-gray-200/50">
          <p className="text-sm text-gray-500 font-medium">
            Página <span className="font-bold text-gray-900">{page}</span> de <span className="font-bold text-gray-900">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="flex items-center space-x-1 px-4 py-2 text-sm rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span>Anterior</span>
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(prev => prev + 1)}
              className="flex items-center space-x-1 px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              <span>Siguiente</span>
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificacionesPage
