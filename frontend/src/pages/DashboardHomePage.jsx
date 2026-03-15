import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenant } from '../context/TenantContext'
import { usePermissions } from '../context/PermissionsContext'
import { useConfiguracion } from '../context/ConfiguracionContext'
import { useActiveProject } from '../context/ActiveProjectContext'
import dashboardService from '../services/dashboardService'
import organizationService from '../services/organizationService'
import useProductTour from '../hooks/useProductTour'
import { TOUR_CONFIGS } from '../data/tourConfigs'
import {
  UsersIcon,
  CreditCardIcon,
  TrendingUpIcon,
  ClockIcon,
  ActivityIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  DollarSignIcon,
  HandIcon,
  BarChart3Icon,
  ShieldCheckIcon,
  BuildingIcon,
  BriefcaseIcon,
  FileTextIcon,
  Loader2Icon,
} from 'lucide-react'

const DashboardHomePage = () => {
  const { user } = useAuth()
  const { tenant } = useTenant()
  const { hasPermission, initialized } = usePermissions()
  const { activeProject, mode, getProjectFilter } = useActiveProject()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState(null)
  const [recentActivities, setRecentActivities] = useState([])
  const [chartData, setChartData] = useState(null)
  const [organizationInfo, setOrganizationInfo] = useState(null)
  const [systemStats, setSystemStats] = useState(null)
  const [advancedMetrics, setAdvancedMetrics] = useState(null)
  const [projectAnalytics, setProjectAnalytics] = useState(null)
  const [financialAnalytics, setFinancialAnalytics] = useState(null)
  const [aiInsights, setAiInsights] = useState(null)
  const [realtimeData, setRealtimeData] = useState(null)

  useProductTour('dashboard', TOUR_CONFIGS.dashboard.steps, {
    ready: !loading && initialized,
  })

  // Cargar datos del dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const pf = getProjectFilter()
        
        // Cargar métricas, actividad reciente y datos de gráficas en paralelo
        const [
          metricsData,
          activityData,
          chartsData,
          orgData,
          statsData,
          advancedMetricsData,
          projectAnalyticsData,
          financialAnalyticsData,
          aiPerformance,
          aiSalary,
          aiPredictive,
        ] = await Promise.all([
          dashboardService.getMetrics(pf),
          dashboardService.getRecentActivity(10, pf),
          dashboardService.getCharts(pf),
          organizationService.getCurrentOrganization().catch(() => null),
          dashboardService.getStats(pf).catch(() => null),
          dashboardService.getAdvancedMetrics(pf).catch(() => null),
          dashboardService.getProjectAnalytics(pf).catch(() => null),
          dashboardService.getFinancialAnalytics(pf).catch(() => null),
          dashboardService.getAiPerformance(pf).catch(() => null),
          dashboardService.getAiSalaryIntelligence(pf).catch(() => null),
          dashboardService.getAiPredictive(pf).catch(() => null),
        ])

        setMetrics(metricsData)
        setRecentActivities(activityData.actividades || [])
        setChartData(chartsData)
        setOrganizationInfo(orgData)
        setSystemStats(statsData)
        setAdvancedMetrics(advancedMetricsData)
        setProjectAnalytics(projectAnalyticsData)
        setFinancialAnalytics(financialAnalyticsData)
        setAiInsights({
          performance: aiPerformance,
          salary: aiSalary,
          predictive: aiPredictive,
        })
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [activeProject, mode])

  useEffect(() => {
    let isMounted = true
    const pf = getProjectFilter()

    const loadRealtime = async () => {
      try {
        const data = await dashboardService.getRealtimeSnapshot(pf)
        if (isMounted) setRealtimeData(data)
      } catch (error) {
        if (isMounted) setRealtimeData(null)
      }
    }

    loadRealtime()
    const interval = setInterval(loadRealtime, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [activeProject, mode])

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) => date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDateLocal = (date) => date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const { formatCurrency, formatNumber: cfgFormatNumber, formatDate: cfgFormatDate } = useConfiguracion()

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0'
    return cfgFormatNumber(num)
  }

  const getMax = (values = []) => (values.length ? Math.max(...values) : 0)

  const trialStatus = useMemo(() => {
    if (!organizationInfo?.is_trial || !organizationInfo?.trial_ends_at) return null
    const end = new Date(organizationInfo.trial_ends_at)
    const diffMs = end.getTime() - Date.now()
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (Number.isNaN(daysLeft)) return null
    return { daysLeft, end }
  }, [organizationInfo])

  // Mapear iconos para las actividades
  const getActivityIcon = (tipo) => {
    if (tipo === 'success') return CheckCircleIcon
    if (tipo === 'warning') return AlertCircleIcon
    return ActivityIcon
  }

  // Construir stats desde las métricas reales
  const stats = metrics ? [
    { 
      title: 'Total Empleados', 
      value: formatNumber(metrics.empleados?.total || 0), 
      change: metrics.empleados?.cambio_porcentual ? `${metrics.empleados.cambio_porcentual > 0 ? '+' : ''}${metrics.empleados.cambio_porcentual.toFixed(1)}%` : '0%',
      changeType: (metrics.empleados?.cambio_porcentual || 0) >= 0 ? 'positive' : 'negative', 
      icon: UsersIcon, 
      bgColor: 'bg-blue-100', 
      iconColor: 'text-blue-600' 
    },
    { 
      title: 'Nómina del Mes', 
      value: formatCurrency(metrics.nominas?.total_pagado_mes || 0), 
      change: metrics.nominas?.cambio_porcentual ? `${metrics.nominas.cambio_porcentual > 0 ? '+' : ''}${metrics.nominas.cambio_porcentual.toFixed(1)}%` : '0%',
      changeType: (metrics.nominas?.cambio_porcentual || 0) >= 0 ? 'positive' : 'negative', 
      icon: DollarSignIcon, 
      bgColor: 'bg-green-100', 
      iconColor: 'text-green-600' 
    },
    { 
      title: 'Préstamos Activos', 
      value: formatNumber(metrics.prestamos?.activos || 0), 
      change: `${formatNumber(metrics.prestamos?.pendientes || 0)} pendientes`,
      changeType: 'neutral', 
      icon: CreditCardIcon, 
      bgColor: 'bg-orange-100', 
      iconColor: 'text-orange-600' 
    },
    { 
      title: 'Contratos Activos', 
      value: formatNumber(metrics.contratos?.activos || 0), 
      change: `${formatNumber(metrics.contratos?.por_vencer || 0)} por vencer`,
      changeType: (metrics.contratos?.por_vencer || 0) > 0 ? 'warning' : 'positive', 
      icon: FileTextIcon, 
      bgColor: 'bg-purple-100', 
      iconColor: 'text-purple-600' 
    },
  ] : []

  // Si está cargando, mostrar indicador
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
    )
  }
  if (!hasPermission('dashboard.view')) {
    return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder al dashboard</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2Icon className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div id="tour-dashboard-header" className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-primary-600 via-blue-600 to-purple-700 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl animate-bounce">
                <HandIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold">¡Bienvenido de nuevo!</h1>
            </div>
            <p className="text-xl text-white/90 font-medium">{user?.full_name || user?.username}</p>
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
              <p className="text-white/80 text-sm font-medium">{tenant?.name || tenant?.codigo || 'CorteSec Solutions'}</p>
            </div>
            {organizationInfo?.plan && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                  Plan {organizationInfo.plan}
                </span>
                <span className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                  {organizationInfo.max_users} usuarios
                </span>
                <span className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                  {organizationInfo.max_storage_mb} MB
                </span>
                {trialStatus && trialStatus.daysLeft <= 7 && (
                  <span className="bg-amber-400/30 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                    Trial {trialStatus.daysLeft} días
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="mt-6 md:mt-0 text-right backdrop-blur-sm bg-white/10 rounded-2xl p-4 border border-white/20 shadow-xl">
            <p className="text-3xl font-bold tracking-wider">{formatTime(currentTime)}</p>
            <p className="text-white/80 text-sm capitalize mt-1 font-medium">{formatDateLocal(currentTime)}</p>
          </div>
        </div>
      </div>

      {trialStatus && trialStatus.daysLeft <= 7 && (
        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="w-6 h-6 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Tu periodo de prueba está por finalizar</p>
              <p className="text-sm text-amber-700/80">
                Quedan {trialStatus.daysLeft} días. Actualiza el plan para evitar interrupciones.
              </p>
            </div>
          </div>
          <a
            href="/dashboard/planes"
            className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition"
          >
            Ver planes
          </a>
        </div>
      )}

      {/* Cards de estadísticas */}
      <div id="tour-dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="group relative overflow-hidden backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 border border-gray-200/50 hover:scale-105 hover:-translate-y-1 cursor-pointer">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.bgColor} p-3.5 rounded-xl shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <Icon className={`w-7 h-7 ${stat.iconColor}`} />
                  </div>
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-full shadow-md ${
                    stat.changeType === 'positive' 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' 
                      : stat.changeType === 'negative'
                      ? 'bg-gradient-to-r from-red-400 to-rose-500 text-white'
                      : stat.changeType === 'warning'
                      ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-gray-600 text-sm font-semibold mb-2">{stat.title}</h3>
                <p className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actividad reciente y acciones rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="tour-dashboard-recent-activity" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl p-7 border border-gray-200/50">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="bg-gradient-to-r from-primary-500 to-blue-600 p-2 rounded-xl mr-3 shadow-lg">
              <ActivityIcon className="w-6 h-6 text-white" />
            </div>
            Actividad Reciente
          </h2>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => {
                const Icon = getActivityIcon(activity.tipo)
                return (
                  <div key={activity.id} className="group flex items-start space-x-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-300 border border-transparent hover:border-gray-200/50 hover:shadow-md cursor-pointer">
                    <div className={`p-2.5 rounded-xl shadow-md transform group-hover:scale-110 transition-transform ${
                      activity.tipo === 'success' 
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                        : activity.tipo === 'warning' 
                        ? 'bg-gradient-to-br from-orange-400 to-amber-500' 
                        : 'bg-gradient-to-br from-blue-400 to-cyan-500'
                    }`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{activity.mensaje}</p>
                      {activity.detalle && (
                        <p className="text-xs text-gray-600 mt-1">{activity.detalle}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1.5">
                        <p className="text-xs text-gray-500 font-medium">{activity.tiempo}</p>
                        {activity.usuario && (
                          <>
                            <span className="text-gray-400">•</span>
                            <p className="text-xs text-gray-500 font-medium">{activity.usuario}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <ActivityIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No hay actividad reciente</p>
              </div>
            )}
          </div>
        </div>

        <div id="tour-dashboard-quick-actions" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl p-7 border border-gray-200/50">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 rounded-xl mr-3 shadow-lg">
              <CreditCardIcon className="w-6 h-6 text-white" />
            </div>
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => navigate('/dashboard/empleados')}
              className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-4 relative z-10">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <UsersIcon className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-white text-lg">Registrar Empleado</span>
              </div>
              <span className="text-white group-hover:translate-x-2 transition-transform text-2xl">→</span>
            </button>

            <button
              onClick={() => navigate('/dashboard/nomina')}
              className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-4 relative z-10">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <CreditCardIcon className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-white text-lg">Procesar Nómina</span>
              </div>
              <span className="text-white group-hover:translate-x-2 transition-transform text-2xl">→</span>
            </button>

            <button
              onClick={() => navigate('/dashboard/auditoria')}
              className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-4 relative z-10">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <ActivityIcon className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-white text-lg">Ver Auditoría</span>
              </div>
              <span className="text-white group-hover:translate-x-2 transition-transform text-2xl">→</span>
            </button>

            <button
              onClick={() => navigate('/dashboard/prestamos')}
              className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-4 relative z-10">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <ClockIcon className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-white text-lg">Ver Pendientes</span>
              </div>
              <span className="text-white group-hover:translate-x-2 transition-transform text-2xl">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas adicionales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3.5 rounded-xl shadow-lg">
                <BriefcaseIcon className="w-7 h-7 text-blue-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Cargos</h3>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.cargos?.total || 0)}</p>
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-semibold text-green-600">{formatNumber(metrics.cargos?.activos || 0)}</span> activos
            </p>
          </div>

          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3.5 rounded-xl shadow-lg">
                <FileTextIcon className="w-7 h-7 text-green-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Nóminas Procesadas</h3>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.nominas?.procesadas_mes || 0)}</p>
            <p className="text-sm text-gray-500 mt-2">Este mes</p>
          </div>

          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 p-3.5 rounded-xl shadow-lg">
                <DollarSignIcon className="w-7 h-7 text-orange-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Préstamos Totales</h3>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.prestamos?.total || 0)}</p>
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-semibold text-orange-600">{formatNumber(metrics.prestamos?.pendientes || 0)}</span> pendientes
            </p>
          </div>

          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3.5 rounded-xl shadow-lg">
                <ActivityIcon className="w-7 h-7 text-purple-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Actividad del Sistema</h3>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.actividad?.registros_hoy || 0)}</p>
            <p className="text-sm text-gray-500 mt-2">Registros hoy</p>
          </div>
        </div>
      )}

      {/* Gráficas avanzadas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl p-7 border border-gray-200/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <div className="bg-gradient-to-r from-primary-500 to-blue-600 p-2 rounded-xl mr-3 shadow-lg">
                <TrendingUpIcon className="w-6 h-6 text-white" />
              </div>
              Tendencias (6 meses)
            </h2>
            <span className="text-xs text-gray-500">Datos del backend</span>
          </div>

          {chartData?.tendencias ? (
            <div className="space-y-6">
              {['empleados', 'nominas', 'prestamos'].map((serie) => {
                const values = chartData.tendencias[serie] || []
                const maxValue = getMax(values) || 1
                return (
                  <div key={serie}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700 capitalize">{serie}</p>
                      <p className="text-xs text-gray-500">Máx: {formatNumber(maxValue)}</p>
                    </div>
                    <div className="grid grid-cols-6 gap-2 items-end h-24">
                      {values.map((value, idx) => (
                        <div key={`${serie}-${idx}`} className="flex flex-col items-center gap-2">
                          <div className="w-full bg-primary-100 rounded-xl overflow-hidden h-16 flex items-end">
                            <div
                              className="w-full bg-gradient-to-t from-primary-500 to-blue-500"
                              style={{ height: `${Math.max(8, (value / maxValue) * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] text-gray-500">
                            {chartData.tendencias.meses?.[idx] || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">No hay datos de tendencias disponibles.</div>
          )}
        </div>

        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl p-7 border border-gray-200/50">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-2 rounded-xl mr-3 shadow-lg">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            Cargos con más personal
          </h2>

          {chartData?.departamentos?.length ? (
            <div className="space-y-4">
              {chartData.departamentos.map((item) => {
                const maxDept = getMax(chartData.departamentos.map((d) => d.empleados)) || 1
                return (
                  <div key={item.nombre} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <span className="font-semibold">{item.nombre}</span>
                      <span>{formatNumber(item.empleados)}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        style={{ width: `${Math.max(8, (item.empleados / maxDept) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">Sin datos de cargos por ahora.</div>
          )}
        </div>
      </div>

      {/* Analítica avanzada */}
      {(advancedMetrics || projectAnalytics || financialAnalytics) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl p-7 border border-gray-200/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl mr-3 shadow-lg">
                <BarChart3Icon className="w-6 h-6 text-white" />
              </div>
              Analítica Avanzada
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-500">Proyectos</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(advancedMetrics?.projects?.total || 0)}
                </p>
                <p className="text-xs text-gray-500">Activos: {formatNumber(advancedMetrics?.projects?.active || 0)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-500">Rendimiento</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(advancedMetrics?.performance?.completion_rate || 0)}%
                </p>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl p-7 border border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights por Módulo</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="p-3 rounded-xl border border-gray-200">
                <p className="font-semibold text-gray-800">Proyectos</p>
                <p>Activos: {formatNumber(projectAnalytics?.categories?.by_status?.active || 0)}</p>
                <p>Completados: {formatNumber(projectAnalytics?.categories?.by_status?.completed || 0)}</p>
              </div>
              <div className="p-3 rounded-xl border border-gray-200">
                <p className="font-semibold text-gray-800">Finanzas</p>
                <p>Ingreso mensual: {formatCurrency(financialAnalytics?.cash_flow?.monthly_income || 0)}</p>
                <p>Utilidad: {formatCurrency((financialAnalytics?.cash_flow?.monthly_income || 0) - (financialAnalytics?.cash_flow?.monthly_expenses || 0))}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights AI */}
      {aiInsights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/90 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">AI Performance</h3>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(aiInsights.performance?.score || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">{aiInsights.performance?.insight || ''}</p>
          </div>
          <div className="bg-white/90 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Salary Intelligence</h3>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(aiInsights.salary?.average_payment || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">{aiInsights.salary?.recommendation || ''}</p>
          </div>
          <div className="bg-white/90 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Predictive 30 días</h3>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(aiInsights.predictive?.projection_next_30 || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">{aiInsights.predictive?.note || ''}</p>
          </div>
        </div>
      )}

      {/* Cards de información del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 rounded-2xl shadow-xl p-7 text-white border border-white/20 hover:scale-105 hover:shadow-2xl transition-all duration-500 cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl inline-block mb-4 transform group-hover:scale-110 transition-transform">
              <BarChart3Icon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Datos en Tiempo Real</h3>
            <p className="text-blue-100 text-sm leading-relaxed">Sistema sincronizado y actualizado automáticamente.</p>
            {realtimeData?.metrics && (
              <div className="mt-4 text-sm text-white/90 space-y-1">
                <p>Proyectos activos: <span className="font-semibold">{formatNumber(realtimeData.metrics.projects?.active || 0)}</span></p>
              </div>
            )}
            {systemStats?.stats && (
              <div className="mt-4 text-sm text-white/90 space-y-1">
                <p>Sesiones activas: <span className="font-semibold">{formatNumber(systemStats.stats.active_sessions || 0)}</span></p>
                <p>Usuarios activos: <span className="font-semibold">{formatNumber(systemStats.stats.active_users || 0)}</span></p>
              </div>
            )}
          </div>
        </div>

        <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl shadow-xl p-7 text-white border border-white/20 hover:scale-105 hover:shadow-2xl transition-all duration-500 cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl inline-block mb-4 transform group-hover:scale-110 transition-transform">
              <ShieldCheckIcon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Seguridad Garantizada</h3>
            <p className="text-green-100 text-sm leading-relaxed">Datos protegidos con encriptación de nivel empresarial.</p>
            {systemStats?.stats && (
              <div className="mt-4 text-sm text-white/90">
                <p>Notificaciones sin leer: <span className="font-semibold">{formatNumber(systemStats.stats.unread_notifications || 0)}</span></p>
                <p>Estado: <span className="font-semibold">{systemStats.stats.system_status || 'operational'}</span></p>
              </div>
            )}
          </div>
        </div>

        <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-purple-500 via-violet-600 to-fuchsia-600 rounded-2xl shadow-xl p-7 text-white border border-white/20 hover:scale-105 hover:shadow-2xl transition-all duration-500 cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl inline-block mb-4 transform group-hover:scale-110 transition-transform">
              <BuildingIcon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Multitenant</h3>
            <p className="text-purple-100 text-sm leading-relaxed">Aislamiento completo de datos por organización.</p>
            {systemStats?.stats && (
              <div className="mt-4 text-sm text-white/90">
                <p>Usuarios totales: <span className="font-semibold">{formatNumber(systemStats.stats.total_users || 0)}</span></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHomePage
