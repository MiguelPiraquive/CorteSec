import api from './api'

const searchService = {
  searchGlobal: async (params) => {
    const response = await api.get('/api/search/', { params })
    return response.data
  },

  searchCounts: async (query) => {
    const response = await api.get('/api/search/counts/', { params: { q: query } })
    return response.data
  },

  searchSuggestions: async (query) => {
    const response = await api.get('/api/search/suggestions/', { params: { q: query } })
    return response.data
  },

  searchAutocomplete: async (query) => {
    const response = await api.get('/api/search/autocomplete/', { params: { q: query } })
    return response.data
  },

  searchSmartSuggestions: async (query, context = 'general') => {
    const response = await api.get('/api/search/smart-suggestions/', { params: { q: query, context } })
    return response.data
  },

  searchRecentHistory: async () => {
    const response = await api.get('/api/search/recent-history/')
    return response.data
  },

  searchHistory: async (params) => {
    const response = await api.get('/api/search/history/', { params })
    return response.data
  },

  searchStats: async () => {
    const response = await api.get('/api/search/stats/')
    return response.data
  },

  searchModules: async () => {
    const response = await api.get('/api/search/modules/')
    return response.data
  },

  trackClick: async (payload) => {
    const response = await api.post('/api/search/track-click/', payload)
    return response.data
  },
}

export default searchService
