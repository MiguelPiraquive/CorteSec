import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ActivityIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  ServerIcon,
  DatabaseIcon,
  HardDriveIcon,
  CpuIcon,
  MailIcon,
  UsersIcon,
  BuildingIcon,
  GlobeIcon,
  WifiIcon,
  ClockIcon,
  ZapIcon,
  LayersIcon,
} from 'lucide-react'
import systemStatusService from '../../services/systemStatusService'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../context/PermissionsContext'

/* ─── Helpers ──────────────────────────────────────────────── */

const StatusBadge = ({ ok, label }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
      ok
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-red-100 text-red-700'
    }`}
  >
    {ok ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <XCircleIcon className="w-3.5 h-3.5" />}
    {label}
  </span>
)

const ProgressBar = ({ percent = 0, color = 'emerald' }) => {
  const colorMap = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  }
  const barColor =
    percent > 90 ? colorMap.red : percent > 70 ? colorMap.amber : colorMap[color] || colorMap.emerald
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
      <div
        className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

const StatCard = ({ icon: Icon, label, value, sub, iconBg = 'bg-blue-100', iconColor = 'text-blue-600' }) => (
  <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-5 border border-gray-200/50 flex items-start gap-4">
    <div className={`${iconBg} p-3 rounded-xl`}>
      <Icon className={`w-6 h-6 ${iconColor}`} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm text-gray-500 truncate">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
)

const SectionCard = ({ title, icon: Icon, children, status }) => (
  <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="bg-gray-100 p-2 rounded-xl">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      </div>
      {status !== undefined && (
        <StatusBadge ok={status} label={status ? 'Operativo' : 'Error'} />
      )}
    </div>
    <div className="p-6">{children}</div>
  </div>
)

const InfoRow = ({ label, value, mono = false }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
  </div>
)

/* ─── Auto-refresh hook ────────────────────────────────────── */

const AUTO_REFRESH_SECS = 30

/* ─── Main Component ───────────────────────────────────────── */

const SystemStatusPage = () => {
  const { user } = useAuth()
  const { hasPermission, initialized } = usePermissions()
  const [status, setStatus] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS)
  const timerRef = useRef(null)

  const isAdmin = user?.is_staff || user?.is_superuser || (initialized && hasPermission('core.view_system_status'))

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [statusData, healthData] = await Promise.all([
        systemStatusService.getSystemStatus(),
        systemStatusService.getHealthCheck(),
      ])
      setStatus(statusData)
      setHealth(healthData)
      setLastRefresh(new Date())
      setCountdown(AUTO_REFRESH_SECS)
    } catch (err) {
      setError('No se pudo obtener el estado del sistema.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    if (isAdmin) loadStatus()
    else setLoading(false)
  }, [isAdmin, loadStatus])

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || !isAdmin) return
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          loadStatus()
          return AUTO_REFRESH_SECS
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [autoRefresh, isAdmin, loadStatus])

  // Derived
  const healthOk = health?.status === 'healthy'
  const overall = status?.health || 'N/A'
  const sys = status?.system || {}
  const db = status?.database || {}
  const cacheData = status?.cache || {}
  const redis = status?.redis || {}
  const email = status?.email || {}
  const celery = status?.celery || {}
  const django = status?.django || {}
  const staticFiles = status?.static_files || {}
  const appStats = status?.app_stats || {}

  /* ─── Render ────────────────────────────────────────────── */

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <ServerIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Acceso restringido a administradores.</p>
        </div>
      </div>
    )
  }

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
          <p className="text-gray-500">Cargando estado del sistema...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 lg:p-8 space-y-8">
      {/* ── Toast de error ── */}
      {error && (
        <div className="fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border bg-red-500/90 text-white max-w-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* ── Gradient Header ── */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-teal-500 via-emerald-600 to-cyan-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <ActivityIcon className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Estado del Sistema</h1>
              <p className="text-white/80 mt-1">Monitoreo en tiempo real de servicios y recursos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                autoRefresh
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                {autoRefresh ? `Auto ${countdown}s` : 'Auto off'}
              </div>
            </button>

            <button
              onClick={() => { loadStatus(); setCountdown(AUTO_REFRESH_SECS); }}
              disabled={loading}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Mini stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3">
            <p className="text-white/60 text-xs">Salud general</p>
            <div className="flex items-center gap-2 mt-1">
              {overall === 'OK' ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-300" />
              ) : (
                <AlertTriangleIcon className="w-5 h-5 text-amber-300" />
              )}
              <span className="text-lg font-bold">{overall}</span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3">
            <p className="text-white/60 text-xs">Health Check</p>
            <div className="flex items-center gap-2 mt-1">
              {healthOk ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-300" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-300" />
              )}
              <span className="text-lg font-bold">{health?.status || 'N/A'}</span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3">
            <p className="text-white/60 text-xs">Versión</p>
            <p className="text-lg font-bold mt-1">{status?.version || '—'}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3">
            <p className="text-white/60 text-xs">Última actualización</p>
            <p className="text-sm font-bold mt-1">{lastRefresh ? lastRefresh.toLocaleTimeString() : '—'}</p>
          </div>
        </div>
      </div>

      {/* ── Overview Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CpuIcon}
          label="CPU"
          value={`${sys.cpu_percent ?? 0}%`}
          sub={`${sys.cpu_count ?? '—'} núcleos`}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          icon={HardDriveIcon}
          label="RAM"
          value={`${sys.memory?.percent ?? 0}%`}
          sub={`${sys.memory?.used_gb ?? '—'} / ${sys.memory?.total_gb ?? '—'} GB`}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={HardDriveIcon}
          label="Disco"
          value={`${sys.disk?.percent ?? 0}%`}
          sub={`${sys.disk?.used_gb ?? '—'} / ${sys.disk?.total_gb ?? '—'} GB`}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={UsersIcon}
          label="Usuarios activos"
          value={appStats.users_active ?? '—'}
          sub={`${appStats.users_total ?? '—'} total`}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
      </div>

      {/* ── Resource Bars ── */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-5">Uso de recursos</h2>
        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 font-medium">CPU</span>
              <span className="text-gray-900 font-semibold">{sys.cpu_percent ?? 0}%</span>
            </div>
            <ProgressBar percent={sys.cpu_percent ?? 0} color="purple" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 font-medium">Memoria RAM</span>
              <span className="text-gray-900 font-semibold">
                {sys.memory?.used_gb ?? '—'} / {sys.memory?.total_gb ?? '—'} GB ({sys.memory?.percent ?? 0}%)
              </span>
            </div>
            <ProgressBar percent={sys.memory?.percent ?? 0} color="blue" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 font-medium">Disco</span>
              <span className="text-gray-900 font-semibold">
                {sys.disk?.used_gb ?? '—'} / {sys.disk?.total_gb ?? '—'} GB ({sys.disk?.percent ?? 0}%)
              </span>
            </div>
            <ProgressBar percent={sys.disk?.percent ?? 0} color="amber" />
          </div>
        </div>
      </div>

      {/* ── Service Status Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database */}
        <SectionCard title="Base de Datos" icon={DatabaseIcon} status={db.status}>
          <div className="space-y-1">
            <InfoRow label="Conectada" value={db.connected ? 'Sí' : 'No'} />
            <InfoRow label="Motor" value={db.engine} mono />
            {db.error && <InfoRow label="Error" value={db.error} />}
          </div>
        </SectionCard>

        {/* Cache */}
        <SectionCard title="Cache" icon={LayersIcon} status={cacheData.status}>
          <div className="space-y-1">
            <InfoRow label="Disponible" value={cacheData.available ? 'Sí' : 'No'} />
            <InfoRow label="Funcionando" value={cacheData.working ? 'Sí' : 'No'} />
            <InfoRow label="Backend" value={cacheData.backend} mono />
            {cacheData.error && <InfoRow label="Error" value={cacheData.error} />}
          </div>
        </SectionCard>

        {/* Redis */}
        <SectionCard title="Redis" icon={ZapIcon} status={redis.status}>
          <div className="space-y-1">
            {redis.available ? (
              <>
                <InfoRow label="Disponible" value="Sí" />
                <InfoRow label="Ping" value={redis.ping ? 'OK' : 'Fallo'} />
              </>
            ) : (
              <InfoRow label="Estado" value={redis.reason || 'No disponible'} />
            )}
            {redis.error && <InfoRow label="Error" value={redis.error} />}
          </div>
        </SectionCard>

        {/* Email */}
        <SectionCard title="Email / SMTP" icon={MailIcon} status={email.status}>
          <div className="space-y-1">
            <InfoRow label="Backend" value={email.backend} mono />
            <InfoRow label="Host configurado" value={email.host_configured ? 'Sí' : 'No'} />
            <InfoRow label="Puerto" value={email.port} />
            <InfoRow label="TLS" value={email.use_tls ? 'Sí' : 'No'} />
            <InfoRow label="Conexión SMTP" value={email.smtp_connection === true ? '✅ OK' : email.smtp_connection === false ? '❌ Fallo' : '—'} />
            {email.error && <InfoRow label="Error" value={email.error} />}
          </div>
        </SectionCard>

        {/* Celery */}
        <SectionCard title="Celery Workers" icon={ZapIcon} status={celery.status}>
          <div className="space-y-1">
            {celery.configured === false ? (
              <InfoRow label="Estado" value={celery.reason || 'No configurado'} />
            ) : (
              <>
                <InfoRow label="Configurado" value="Sí" />
                <InfoRow label="Workers activos" value={celery.workers ?? 0} />
                {celery.worker_names?.length > 0 && (
                  <InfoRow label="Nombres" value={celery.worker_names.join(', ')} mono />
                )}
              </>
            )}
            {celery.error && <InfoRow label="Error" value={celery.error} />}
          </div>
        </SectionCard>

        {/* Django Config */}
        <SectionCard title="Django" icon={GlobeIcon} status={django.status}>
          <div className="space-y-1">
            <InfoRow label="Debug" value={django.debug ? '⚠️ Activado' : '✅ Desactivado'} />
            <InfoRow label="Python" value={django.python_version} mono />
            <InfoRow label="Versión App" value={django.app_version} mono />
            <InfoRow label="Zona horaria" value={django.time_zone} />
            <InfoRow label="Idioma" value={django.language_code} />
          </div>
        </SectionCard>

        {/* Static Files */}
        <SectionCard title="Archivos Estáticos" icon={HardDriveIcon} status={staticFiles.status}>
          <div className="space-y-1">
            <InfoRow label="Directorio existe" value={staticFiles.static_root_exists ? 'Sí' : 'No'} />
            <InfoRow label="URL" value={staticFiles.static_url} mono />
            {staticFiles.file_count !== undefined && (
              <InfoRow label="Archivos" value={staticFiles.file_count?.toLocaleString()} />
            )}
            {staticFiles.error && <InfoRow label="Error" value={staticFiles.error} />}
          </div>
        </SectionCard>

        {/* App Stats */}
        <SectionCard title="Estadísticas" icon={BuildingIcon} status={appStats.status}>
          <div className="space-y-1">
            <InfoRow label="Usuarios activos" value={appStats.users_active} />
            <InfoRow label="Usuarios totales" value={appStats.users_total} />
            <InfoRow label="Organizaciones activas" value={appStats.organizations_active} />
            <InfoRow label="Organizaciones totales" value={appStats.organizations_total} />
            {appStats.error && <InfoRow label="Error" value={appStats.error} />}
          </div>
        </SectionCard>
      </div>

      {/* ── System Info Footer ── */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Información del servidor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoRow label="Plataforma" value={sys.platform} />
          <InfoRow label="Python" value={sys.python_version} mono />
          <InfoRow label="CPU Núcleos" value={sys.cpu_count} />
          <InfoRow label="RAM Total" value={sys.memory?.total_gb ? `${sys.memory.total_gb} GB` : '—'} />
        </div>
      </div>
    </div>
  )
}

export default SystemStatusPage
