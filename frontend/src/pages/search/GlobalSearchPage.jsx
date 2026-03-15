import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  SearchIcon,
  FilterIcon,
  Loader2Icon,
  TrendingUpIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayersIcon,
  UsersIcon,
  BellIcon,
  ShieldIcon,
} from 'lucide-react'
import searchService from '../../services/searchService'

const moduleLabels = {
  all: { label: 'Todos', icon: LayersIcon },
  usuarios: { label: 'Usuarios', icon: UsersIcon },
  notificaciones: { label: 'Notificaciones', icon: BellIcon },
  logs: { label: 'Logs', icon: ShieldIcon },
}

const GlobalSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [moduleFilter, setModuleFilter] = useState(searchParams.get('module') || 'all')
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || 'all')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance')
  const [page, setPage] = useState(Number(searchParams.get('page') || 1))

  const [results, setResults] = useState([])
  const [meta, setMeta] = useState({ total: 0, totalPages: 0, execution: 0 })
  const [counts, setCounts] = useState(null)
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(false)
  const [modules, setModules] = useState([])

  const totalPages = meta.totalPages || 0

  const moduleOptions = useMemo(() => {
    if (modules.length > 0) return modules
    return [
      { id: 'all', name: 'Todos los módulos' },
      { id: 'usuarios', name: 'Usuarios' },
      { id: 'notificaciones', name: 'Notificaciones' },
      { id: 'logs', name: 'Logs del Sistema' },
    ]
  }, [modules])

  const moduleLabelMap = useMemo(() => {
    const map = {
      all: 'Todos',
      usuarios: 'Usuarios',
      notificaciones: 'Notificaciones',
      logs: 'Logs',
    }

    modules.forEach((item) => {
      if (item?.id && item?.name) {
        map[item.id] = item.name
      }
    })

    return map
  }, [modules])

  useEffect(() => {
    const loadModules = async () => {
      try {
        const data = await searchService.searchModules()
        setModules(data.modules || [])
      } catch (error) {
        setModules([])
      }
    }
    loadModules()
  }, [])

  useEffect(() => {
    setQuery(searchParams.get('q') || '')
    setModuleFilter(searchParams.get('module') || 'all')
    setDateFilter(searchParams.get('date') || 'all')
    setStatusFilter(searchParams.get('status') || 'all')
    setSortBy(searchParams.get('sort') || 'relevance')
    setPage(Number(searchParams.get('page') || 1))
  }, [searchParams])

  useEffect(() => {
    const loadRecentAndStats = async () => {
      try {
        const [recentData, statsData] = await Promise.all([
          searchService.searchRecentHistory(),
          searchService.searchStats(),
        ])
        setRecent(recentData.recent_searches || [])
        setStats(statsData.stats || null)
      } catch (error) {
        setRecent([])
        setStats(null)
      }
    }

    loadRecentAndStats()
  }, [])

  useEffect(() => {
    const runSearch = async () => {
      if (!query.trim()) {
        setResults([])
        setMeta({ total: 0, totalPages: 0, execution: 0 })
        setCounts(null)
        return
      }

      setLoading(true)
      try {
        const [searchData, countsData] = await Promise.all([
          searchService.searchGlobal({
            q: query.trim(),
            module: moduleFilter,
            date: dateFilter,
            status: statusFilter,
            sort: sortBy,
            page,
            per_page: 12,
          }),
          searchService.searchCounts(query.trim()),
        ])

        setResults(searchData.results || [])
        setMeta({
          total: searchData.total || 0,
          totalPages: searchData.total_pages || 0,
          execution: searchData.execution_time_ms || 0,
        })
        setCounts(countsData.counts || null)
      } catch (error) {
        setResults([])
        setMeta({ total: 0, totalPages: 0, execution: 0 })
        setCounts(null)
      } finally {
        setLoading(false)
      }
    }

    runSearch()
  }, [query, moduleFilter, dateFilter, statusFilter, sortBy, page])

  const updateParams = (updates) => {
    const params = {
      q: query,
      module: moduleFilter,
      date: dateFilter,
      status: statusFilter,
      sort: sortBy,
      page,
      ...updates,
    }

    if (!params.q) {
      delete params.q
    }

    setSearchParams(params)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    updateParams({ q: query.trim(), page: 1 })
  }

  const handleResultClick = async (result, index) => {
    try {
      await searchService.trackClick({
        query: query.trim(),
        result_id: result.id,
        result_type: result.type,
        module: result.module,
        position: index,
        url: result.url,
      })
    } catch (error) {
      // ignore
    }

    if (result.url && result.url.startsWith('/')) {
      window.location.href = result.url
    } else {
      console.warn('Blocked navigation to external URL')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Búsqueda Global</h1>
          <p className="text-gray-600">Resultados avanzados en todos los módulos del sistema</p>
        </div>
        {query && (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{meta.total} resultados</span>
            <span>·</span>
            <span>{meta.execution} ms</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca usuarios, notificaciones, logs..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={moduleFilter}
              onChange={(event) => {
                setModuleFilter(event.target.value)
                updateParams({ module: event.target.value, page: 1 })
              }}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white"
            >
              {moduleOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <select
            value={dateFilter}
            onChange={(event) => {
              setDateFilter(event.target.value)
              updateParams({ date: event.target.value, page: 1 })
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white"
          >
            <option value="all">Cualquier fecha</option>
            <option value="today">Hoy</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              updateParams({ status: event.target.value, page: 1 })
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white"
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="leida">Leídas</option>
            <option value="no_leida">No leídas</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value)
              updateParams({ sort: event.target.value, page: 1 })
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white"
          >
            <option value="relevance">Relevancia</option>
            <option value="date">Fecha</option>
            <option value="title">Título</option>
          </select>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 flex items-center justify-center">
              <Loader2Icon className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : results.length === 0 && query ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 text-center text-gray-500">
              No se encontraron resultados con esos filtros.
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 text-center text-gray-500">
              Ingresa una búsqueda para ver resultados avanzados.
            </div>
          ) : (
            results.map((result, index) => {
              const moduleInfo = moduleLabels[result.module] || moduleLabels.all
              const moduleLabel = moduleLabelMap[result.module] || moduleInfo.label
              const Icon = moduleInfo.icon
              return (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  onClick={() => handleResultClick(result, index)}
                  className="w-full text-left bg-white rounded-2xl shadow-md border border-gray-200 p-5 hover:border-primary-200 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{moduleLabel}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{result.subtitle || result.description}</p>
                      {result.description && result.subtitle && (
                        <p className="text-xs text-gray-400 mt-1">{result.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => updateParams({ page: Math.max(page - 1, 1) })}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 disabled:opacity-50 flex items-center gap-2"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Anterior
              </button>
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              <button
                onClick={() => updateParams({ page: Math.min(page + 1, totalPages) })}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 disabled:opacity-50 flex items-center gap-2"
              >
                Siguiente
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {counts && query && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Resultados por módulo</h3>
              <div className="space-y-2">
                {Object.entries(counts).map(([key, value]) => {
                  if (key === 'total') return null
                  const info = moduleLabels[key] || moduleLabels.all
                  const Icon = info.icon
                  return (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Icon className="w-4 h-4" />
                        {info.label}
                      </div>
                      <span className="font-semibold text-gray-900">{value}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {stats && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <TrendingUpIcon className="w-4 h-4" />
                Estadísticas personales
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Total búsquedas</span>
                  <span className="font-semibold text-gray-900">{stats.total_searches}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Promedio diario</span>
                  <span className="font-semibold text-gray-900">{stats.avg_searches_per_day}</span>
                </div>
              </div>
              {stats.most_searched_terms?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top términos</p>
                  <div className="space-y-2">
                    {stats.most_searched_terms.map((term) => (
                      <div key={term.term} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{term.term}</span>
                        <span className="font-semibold text-gray-900">{term.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {recent.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <ClockIcon className="w-4 h-4" />
                Búsquedas recientes
              </div>
              <div className="space-y-2">
                {recent.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateParams({ q: item.query, page: 1 })}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 hover:bg-primary-50 text-left"
                  >
                    <span className="text-sm font-medium text-gray-700">{item.query}</span>
                    <span className="text-xs text-gray-500">{item.results_count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GlobalSearchPage
