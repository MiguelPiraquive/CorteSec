import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook para paginación del servidor.
 *
 * @param {Function} fetchFn - Función del servicio que acepta params y retorna { results, count, total_pages, current_page }
 * @param {Object} options
 * @param {number} options.pageSize - Tamaño de página (default: 20)
 * @param {number} options.debounceMs - Debounce para búsqueda (default: 400)
 * @param {boolean} options.autoFetch - Fetch automático al montar (default: true)
 * @param {Object} options.initialFilters - Filtros iniciales (default: {})
 *
 * @returns {{ data, loading, currentPage, totalPages, totalCount, pageSize, searchTerm, setSearchTerm, setCurrentPage, setFilters, refresh }}
 */
export default function useServerPagination(fetchFn, { pageSize = 20, debounceMs = 400, autoFetch = true, initialFilters = {} } = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState(initialFilters)
  const fetchFnRef = useRef(fetchFn)

  // Keep fetchFn ref updated
  useEffect(() => {
    fetchFnRef.current = fetchFn
  }, [fetchFn])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [searchTerm, debounceMs])

  // Fetch data
  const fetchData = useCallback(async (page, search, currentFilters) => {
    try {
      setLoading(true)
      const params = {
        page,
        page_size: pageSize,
        ...currentFilters,
      }
      if (search) params.search = search

      const response = await fetchFnRef.current(params)

      const results = response.results || response
      setData(Array.isArray(results) ? results : [])
      setTotalCount(response.count || 0)
      setTotalPages(response.total_pages || Math.ceil((response.count || 0) / pageSize) || 1)
    } catch (error) {
      console.error('Error fetching paginated data:', error)
      setData([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  // Re-fetch when page, search, or filters change
  useEffect(() => {
    if (autoFetch) {
      fetchData(currentPage, debouncedSearch, filters)
    }
  }, [currentPage, debouncedSearch, filters, fetchData, autoFetch])

  // Manual refresh (reloads current page)
  const refresh = useCallback(() => {
    fetchData(currentPage, debouncedSearch, filters)
  }, [fetchData, currentPage, debouncedSearch, filters])

  // Handle page change with bounds check
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [totalPages])

  return {
    data,
    loading,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    searchTerm,
    setSearchTerm,
    setCurrentPage: handlePageChange,
    setFilters,
    refresh,
  }
}
