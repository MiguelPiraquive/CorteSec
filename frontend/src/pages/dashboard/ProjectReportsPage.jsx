import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../../context/PermissionsContext'
import dashboardEntitiesService from '../../services/dashboardEntitiesService'
import { useConfiguracion } from '../../context/ConfiguracionContext'
import {
  BarChart3Icon,
  ChevronLeftIcon,
  RefreshCwIcon,
  Loader2Icon,
  AlertCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  UsersIcon,
  FileTextIcon,
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  FilterIcon,
  TargetIcon,
} from 'lucide-react'

// ─── Horizontal bar component ──────────────────────────────────
const HBar = ({ value, maxValue, color, label, displayValue }) => {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs font-medium text-gray-600 truncate text-right">{label}</div>
      <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
        <div
          className="h-full rounded-lg transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color || '#6366f1' }}
        />
        <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-gray-700">
          {displayValue}
        </span>
      </div>
    </div>
  )
}

// ─── Stat card ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, subtext, gradient }) => (
  <div className={`bg-gradient-to-br ${gradient} rounded-xl p-4 text-white`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 opacity-80" />
      <span className="text-xs font-medium opacity-80">{label}</span>
    </div>
    <p className="text-2xl font-extrabold">{value}</p>
    {subtext && <p className="text-xs opacity-70 mt-1">{subtext}</p>}
  </div>
)

// ─── Comparison table row ──────────────────────────────────────
const CompRow = ({ project, metric, formatFn, maxVal }) => {
  const val = Number(project[metric]) || 0
  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
  return (
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: project.color || '#6366f1' }} />
        </div>
        <span className="text-xs font-bold text-gray-700 w-20 text-right">{formatFn ? formatFn(val) : val}</span>
      </div>
    </td>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN REPORTS PAGE
// ════════════════════════════════════════════════════════════════
const ProjectReportsPage = () => {
  const navigate = useNavigate()
  const { hasPermission, initialized } = usePermissions()
  const { formatCurrency } = useConfiguracion()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('presupuesto_aprobado')
  const [sortDir, setSortDir] = useState('desc')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await dashboardEntitiesService.getProjectComparativa()
      setData(Array.isArray(result) ? result : [])
    } catch (err) {
      console.error('Error loading comparativa:', err)
      setError('Error al cargar reportes comparativos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const fmtMoney = (v) => {
    const n = Number(v)
    if (isNaN(n)) return '$0'
    return formatCurrency ? formatCurrency(n) : `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
  }

  // Sort data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const va = Number(a[sortBy]) || 0
      const vb = Number(b[sortBy]) || 0
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [data, sortBy, sortDir])

  // Aggregates
  const totals = useMemo(() => {
    return {
      presupuesto: data.reduce((s, p) => s + Number(p.presupuesto_aprobado || 0), 0),
      gasto: data.reduce((s, p) => s + Number(p.gasto_acumulado || 0), 0),
      nomina: data.reduce((s, p) => s + Number(p.total_nomina || 0), 0),
      prestamos: data.reduce((s, p) => s + Number(p.total_prestamos || 0), 0),
      empleados: data.reduce((s, p) => s + (p.empleados_count || 0), 0),
      ingresos: data.reduce((s, p) => s + Number(p.flujo_ingresos || 0), 0),
      egresos: data.reduce((s, p) => s + Number(p.flujo_egresos || 0), 0),
      flujoNeto: data.reduce((s, p) => s + Number(p.flujo_neto || 0), 0),
      progresoPromedio: data.length > 0 ? Math.round(data.reduce((s, p) => s + (p.progreso || 0), 0) / data.length) : 0,
    }
  }, [data])

  // Max values for bar charts
  const maxVals = useMemo(() => ({
    presupuesto_aprobado: Math.max(...data.map(p => Number(p.presupuesto_aprobado) || 0), 1),
    gasto_acumulado: Math.max(...data.map(p => Number(p.gasto_acumulado) || 0), 1),
    total_nomina: Math.max(...data.map(p => Number(p.total_nomina) || 0), 1),
    total_prestamos: Math.max(...data.map(p => Number(p.total_prestamos) || 0), 1),
    empleados_count: Math.max(...data.map(p => p.empleados_count || 0), 1),
    flujo_neto: Math.max(...data.map(p => Math.abs(Number(p.flujo_neto)) || 0), 1),
    progreso: 100,
  }), [data])

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <MinusIcon className="w-3 h-3 text-gray-300" />
    return sortDir === 'desc' ? <ArrowDownIcon className="w-3 h-3" /> : <ArrowUpIcon className="w-3 h-3" />
  }

  if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('proyectos.reports')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para ver reportes de proyectos</div>

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600 rounded-2xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden mb-6">
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
              <BarChart3Icon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Reportes Comparativos</h1>
              <p className="text-rose-200 text-sm mt-1">Comparación financiera y de rendimiento entre proyectos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors">
              <RefreshCwIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2Icon className="w-8 h-8 text-rose-500 animate-spin" />
          <span className="ml-3 text-gray-500 font-medium">Cargando reportes...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircleIcon className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{error}</p>
          <button onClick={loadData} className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700">
            Reintentar
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-24">
          <BarChart3Icon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-600 mb-2">No hay proyectos para comparar</h3>
          <p className="text-gray-400">Necesitas al menos un proyecto activo</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <StatCard icon={DollarSignIcon} label="Presupuesto Total" value={fmtMoney(totals.presupuesto)} gradient="from-blue-500 to-indigo-600" />
            <StatCard icon={TrendingDownIcon} label="Gasto Total" value={fmtMoney(totals.gasto)} gradient="from-red-500 to-rose-600" />
            <StatCard icon={FileTextIcon} label="Total Nómina" value={fmtMoney(totals.nomina)} gradient="from-violet-500 to-purple-600" />
            <StatCard icon={UsersIcon} label="Empleados" value={totals.empleados} gradient="from-cyan-500 to-blue-600" />
            <StatCard icon={TargetIcon} label="Progreso Prom." value={`${totals.progresoPromedio}%`} gradient="from-emerald-500 to-green-600" />
          </div>

          {/* Flujo de caja summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-green-100 rounded-lg"><TrendingUpIcon className="w-4 h-4 text-green-600" /></div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Ingresos Totales</p>
                  <p className="text-lg font-extrabold text-green-600">{fmtMoney(totals.ingresos)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-red-100 rounded-lg"><TrendingDownIcon className="w-4 h-4 text-red-600" /></div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Egresos Totales</p>
                  <p className="text-lg font-extrabold text-red-600">{fmtMoney(totals.egresos)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${totals.flujoNeto >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                  <WalletIcon className={`w-4 h-4 ${totals.flujoNeto >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Flujo Neto</p>
                  <p className={`text-lg font-extrabold ${totals.flujoNeto >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmtMoney(totals.flujoNeto)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual comparison — horizontal bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Presupuesto comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSignIcon className="w-4 h-4 text-indigo-500" />
                Presupuesto por Proyecto
              </h3>
              <div className="space-y-3">
                {sortedData.map(p => (
                  <HBar
                    key={p.id}
                    label={p.name}
                    value={Number(p.presupuesto_aprobado) || 0}
                    maxValue={maxVals.presupuesto_aprobado}
                    color={p.color}
                    displayValue={fmtMoney(p.presupuesto_aprobado)}
                  />
                ))}
              </div>
            </div>

            {/* Progreso comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <TargetIcon className="w-4 h-4 text-emerald-500" />
                Progreso por Proyecto
              </h3>
              <div className="space-y-3">
                {sortedData.map(p => (
                  <HBar
                    key={p.id}
                    label={p.name}
                    value={p.progreso || 0}
                    maxValue={100}
                    color={p.color}
                    displayValue={`${p.progreso || 0}%`}
                  />
                ))}
              </div>
            </div>

            {/* Nómina comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <FileTextIcon className="w-4 h-4 text-violet-500" />
                Nómina Pagada por Proyecto
              </h3>
              <div className="space-y-3">
                {sortedData.map(p => (
                  <HBar
                    key={p.id}
                    label={p.name}
                    value={Number(p.total_nomina) || 0}
                    maxValue={maxVals.total_nomina}
                    color={p.color}
                    displayValue={fmtMoney(p.total_nomina)}
                  />
                ))}
              </div>
            </div>

            {/* Empleados comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-cyan-500" />
                Equipo por Proyecto
              </h3>
              <div className="space-y-3">
                {sortedData.map(p => (
                  <HBar
                    key={p.id}
                    label={p.name}
                    value={p.empleados_count || 0}
                    maxValue={maxVals.empleados_count}
                    color={p.color}
                    displayValue={`${p.empleados_count || 0} personas`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Full comparison table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <FilterIcon className="w-4 h-4 text-gray-400" />
                Tabla Comparativa Detallada
              </h3>
              <p className="text-xs text-gray-400 mt-1">Haz click en los encabezados para ordenar</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-rose-500 to-pink-600 text-white">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider sticky left-0 bg-gradient-to-r from-rose-500 to-rose-600 z-10">Proyecto</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => handleSort('progreso')}>
                      <span className="flex items-center justify-center gap-1">Progreso <SortIcon field="progreso" /></span>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => handleSort('empleados_count')}>
                      <span className="flex items-center justify-center gap-1">Equipo <SortIcon field="empleados_count" /></span>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => handleSort('presupuesto_aprobado')}>
                      <span className="flex items-center justify-end gap-1">Presupuesto <SortIcon field="presupuesto_aprobado" /></span>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => handleSort('gasto_acumulado')}>
                      <span className="flex items-center justify-end gap-1">Gasto <SortIcon field="gasto_acumulado" /></span>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => handleSort('total_nomina')}>
                      <span className="flex items-center justify-end gap-1">Nómina <SortIcon field="total_nomina" /></span>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => handleSort('flujo_neto')}>
                      <span className="flex items-center justify-end gap-1">Flujo Neto <SortIcon field="flujo_neto" /></span>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Ejecución</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedData.map((p, idx) => (
                    <tr key={p.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50/30 transition-colors`}>
                      <td className="px-4 py-3 sticky left-0 bg-inherit z-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: p.color || '#6366f1' }}>
                            {p.name?.charAt(0)?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{p.name}</p>
                            <p className="text-[10px] text-gray-400">{p.responsable_nombre || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${p.progreso || 0}%`, backgroundColor: p.color || '#6366f1' }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700">{p.progreso || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-gray-700">{p.empleados_count || 0}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{fmtMoney(p.presupuesto_aprobado)}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-red-600">{fmtMoney(p.gasto_acumulado)}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-violet-600">{fmtMoney(p.total_nomina)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-bold ${Number(p.flujo_neto) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {fmtMoney(p.flujo_neto)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          p.porcentaje_ejecucion > 100 ? 'bg-red-100 text-red-700' :
                          p.porcentaje_ejecucion > 80 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {p.porcentaje_ejecucion || 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-3 text-xs text-gray-700 sticky left-0 bg-gray-100 z-5">TOTALES ({data.length} proyectos)</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-700">{totals.progresoPromedio}% prom.</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-700">{totals.empleados}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-700">{fmtMoney(totals.presupuesto)}</td>
                    <td className="px-4 py-3 text-right text-xs text-red-600">{fmtMoney(totals.gasto)}</td>
                    <td className="px-4 py-3 text-right text-xs text-violet-600">{fmtMoney(totals.nomina)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs ${totals.flujoNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtMoney(totals.flujoNeto)}</span>
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectReportsPage
