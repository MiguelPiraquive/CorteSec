import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SearchIcon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  Loader2Icon,
  UsersIcon,
  BellIcon,
  ShieldIcon,
  LayersIcon,
} from 'lucide-react'
import searchService from '../../services/searchService'

const moduleConfig = {
  usuarios: { label: 'Usuarios', icon: UsersIcon, color: 'text-indigo-600' },
  notificaciones: { label: 'Notificaciones', icon: BellIcon, color: 'text-amber-600' },
  logs: { label: 'Logs', icon: ShieldIcon, color: 'text-rose-600' },
}

const getModuleMeta = (module) => moduleConfig[module] || { label: 'General', icon: LayersIcon, color: 'text-gray-500' }

const GlobalSearchBar = () => {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const debounceRef = useRef(null)
  const lastQueryRef = useRef('')

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [recent, setRecent] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)

  const combinedSuggestions = useMemo(() => {
    const unique = new Map()
    suggestions.forEach((item) => {
      const key = `${item.text}-${item.type}`
      if (!unique.has(key)) unique.set(key, item)
    })
    return Array.from(unique.values()).slice(0, 6)
  }, [suggestions])

  const loadRecent = async () => {
    try {
      const data = await searchService.searchRecentHistory()
      setRecent(data.recent_searches || [])
    } catch (error) {
      setRecent([])
    }
  }

  useEffect(() => {
    loadRecent()
  }, [])

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query || query.trim().length < 2) {
      setResults([])
      setSuggestions([])
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const currentQuery = query.trim()
      lastQueryRef.current = currentQuery

      try {
        const [searchData, smartData] = await Promise.all([
          searchService.searchGlobal({ q: currentQuery, per_page: 6 }),
          searchService.searchSmartSuggestions(currentQuery),
        ])

        if (lastQueryRef.current !== currentQuery) return

        setResults(searchData.results || [])
        setSuggestions(smartData.suggestions || [])
      } catch (error) {
        if (lastQueryRef.current !== currentQuery) return
        setResults([])
        setSuggestions([])
      } finally {
        if (lastQueryRef.current === currentQuery) setLoading(false)
      }
    }, 350)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSearchSubmit = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return
    navigate(`/dashboard/busqueda?q=${encodeURIComponent(trimmed)}`)
    setOpen(false)
    setActiveIndex(-1)
  }

  const resolveNavigationUrl = (result) => {
    if (!result) return '/dashboard'
    if (result.url && result.url.startsWith('/dashboard')) return result.url
    if (result.module === 'usuarios') return '/dashboard/usuarios'
    if (result.module === 'notificaciones') return '/dashboard/notificaciones'
    if (result.module === 'logs') return '/dashboard/auditoria'
    // Only allow internal URLs (starting with '/')
    if (result.url && result.url.startsWith('/')) return result.url
    return '/dashboard'
  }

  const handleResultClick = async (result, index) => {
    const target = resolveNavigationUrl(result)

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

    if (target.startsWith('/')) {
      navigate(target)
    } else {
      console.warn('Blocked navigation to external URL')
    }
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (event) => {
    if (!open) return
    const itemsCount = results.length + combinedSuggestions.length + (query.trim().length > 0 ? 1 : 0)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % Math.max(itemsCount, 1))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + itemsCount) % Math.max(itemsCount, 1))
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex === -1) {
        handleSearchSubmit(query)
        return
      }
      const suggestionIndex = activeIndex - results.length
      if (activeIndex < results.length) {
        handleResultClick(results[activeIndex], activeIndex)
        return
      }
      if (suggestionIndex >= 0 && suggestionIndex < combinedSuggestions.length) {
        handleSearchSubmit(combinedSuggestions[suggestionIndex].text)
      } else {
        handleSearchSubmit(query)
      }
    }

    if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative w-full group">
        <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => {
            setOpen(true)
            loadRecent()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar en CorteSec..."
          className="w-full pl-12 pr-12 py-2.5 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white transition-all duration-300 shadow-sm hover:shadow-md"
        />
        {loading && (
          <Loader2Icon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/70 overflow-hidden z-50">
          <div className="max-h-[28rem] overflow-y-auto">
            {query.trim().length < 2 && recent.length > 0 && (
              <div className="p-4 border-b border-gray-200/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <ClockIcon className="w-4 h-4" />
                  Búsquedas recientes
                </div>
                <div className="space-y-2">
                  {recent.map((item, index) => (
                    <button
                      key={`${item.id}-${index}`}
                      onClick={() => handleSearchSubmit(item.query)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{item.query}</p>
                        <p className="text-xs text-gray-500">{item.results_count} resultados</p>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query.trim().length >= 2 && (
              <div className="p-4">
                {results.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resultados rápidos</div>
                    <div className="space-y-2">
                      {results.map((result, index) => {
                        const meta = getModuleMeta(result.module)
                        const Icon = meta.icon
                        const isActive = activeIndex === index
                        return (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleResultClick(result, index)}
                            className={`w-full flex items-start gap-3 px-3 py-2 rounded-xl border transition-all text-left ${
                              isActive ? 'border-primary-200 bg-primary-50 shadow-sm' : 'border-transparent hover:bg-gray-50'
                            }`}
                          >
                            <div className={`mt-0.5 ${meta.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{result.title}</p>
                              <p className="text-xs text-gray-500">{result.subtitle || result.description}</p>
                            </div>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{meta.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {combinedSuggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      <SparklesIcon className="w-4 h-4" />
                      Sugerencias inteligentes
                    </div>
                    <div className="space-y-2">
                      {combinedSuggestions.map((item, index) => {
                        const isActive = activeIndex === results.length + index
                        return (
                          <button
                            key={`${item.text}-${item.type}-${index}`}
                            onClick={() => handleSearchSubmit(item.text)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                              isActive ? 'bg-primary-50 text-primary-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-semibold">{item.text}</p>
                              <p className="text-xs text-gray-500">{item.type}</p>
                            </div>
                            <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {results.length === 0 && combinedSuggestions.length === 0 && !loading && (
                  <div className="py-6 text-center text-sm text-gray-500">Sin resultados rápidos</div>
                )}
              </div>
            )}
          </div>

          {query.trim().length >= 2 && (
            <button
              onClick={() => handleSearchSubmit(query)}
              className="w-full px-4 py-3 text-sm font-semibold text-primary-600 bg-primary-50/60 hover:bg-primary-100 transition-colors flex items-center justify-center gap-2"
            >
              Ver búsqueda avanzada
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default GlobalSearchBar
