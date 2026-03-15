import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import dashboardEntitiesService from '../services/dashboardEntitiesService'
import { useAuth } from './AuthContext'

const ActiveProjectContext = createContext(null)

export const useActiveProject = () => {
  const context = useContext(ActiveProjectContext)
  if (!context) {
    throw new Error('useActiveProject must be used within an ActiveProjectProvider')
  }
  return context
}

export const ActiveProjectProvider = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [activeProject, setActiveProjectState] = useState(null)
  const [mode, setMode] = useState('all') // 'all' | 'single'
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Load active project and project list
  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setProjects([])
      setActiveProjectState(null)
      setMode('all')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [activeRes, summaryRes] = await Promise.all([
        dashboardEntitiesService.getActiveProject().catch(() => null),
        dashboardEntitiesService.getProjectSummary().catch(() => []),
      ])

      // Set projects list
      const projectList = Array.isArray(summaryRes) ? summaryRes : (summaryRes?.results || [])
      setProjects(projectList)

      // Set active project state
      // activeRes can be an object (single record) or array — normalize
      const active = Array.isArray(activeRes)
        ? (activeRes.length > 0 ? activeRes[0] : null)
        : activeRes

      if (active && active.project && active.mode === 'single') {
        setActiveProjectState(active.project_detail || active.project)
        setMode('single')
      } else {
        setActiveProjectState(null)
        setMode('all')
      }
    } catch (err) {
      console.error('Error loading active project:', err)
      setActiveProjectState(null)
      setMode('all')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  // Re-fetch when auth state changes (login/logout)
  useEffect(() => {
    loadData()
  }, [loadData])

  // Set a specific project as active
  const setActiveProject = useCallback(async (projectId) => {
    try {
      await dashboardEntitiesService.setActiveProject(projectId)
      const project = projects.find(p => p.id === projectId) || { id: projectId }
      setActiveProjectState(project)
      setMode('single')
      return true
    } catch (err) {
      console.error('Error setting active project:', err)
      return false
    }
  }, [projects])

  // Clear active project (show all)
  const clearActiveProject = useCallback(async () => {
    try {
      await dashboardEntitiesService.clearActiveProject()
      setActiveProjectState(null)
      setMode('all')
      return true
    } catch (err) {
      console.error('Error clearing active project:', err)
      return false
    }
  }, [])

  // Refresh projects list
  const refreshProjects = useCallback(async () => {
    try {
      const summaryRes = await dashboardEntitiesService.getProjectSummary()
      const projectList = Array.isArray(summaryRes) ? summaryRes : (summaryRes?.results || [])
      setProjects(projectList)
    } catch (err) {
      console.error('Error refreshing projects:', err)
    }
  }, [])

  // Get filter params for API calls based on active project
  const getProjectFilter = useCallback(() => {
    if (mode === 'single' && activeProject) {
      return { proyecto: activeProject.id }
    }
    return {} // No filter = all projects
  }, [mode, activeProject])

  // Is showing all projects?
  const isAllProjects = mode === 'all'

  const value = {
    activeProject,
    mode,
    projects,
    loading,
    isAllProjects,
    setActiveProject,
    clearActiveProject,
    refreshProjects,
    getProjectFilter,
    reload: loadData,
  }

  return (
    <ActiveProjectContext.Provider value={value}>
      {children}
    </ActiveProjectContext.Provider>
  )
}
