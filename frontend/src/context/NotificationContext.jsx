import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import notificationsService from '../services/notificationsService'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

const POLL_INTERVAL = 30000 // 30 segundos

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [stats, setStats] = useState({
    total: 0,
    no_leidas: 0,
    leidas: 0,
    urgentes: 0,
    por_categoria: {},
    por_prioridad: {},
  })
  const [recentNotifs, setRecentNotifs] = useState([])
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const prevUnreadRef = useRef(0)
  const mountedRef = useRef(true)

  // Cargar stats con polling
  const refreshStats = useCallback(async () => {
    try {
      const data = await notificationsService.stats()
      if (!mountedRef.current) return

      const newUnread = data?.no_leidas || 0

      // Si hay nuevas notificaciones, mostrar toast
      if (prevUnreadRef.current > 0 && newUnread > prevUnreadRef.current) {
        const diff = newUnread - prevUnreadRef.current
        toast.info(
          `${diff} nueva${diff > 1 ? 's' : ''} notificaci${diff > 1 ? 'ones' : 'ón'}`,
          {
            position: 'bottom-right',
            autoClose: 4000,
            icon: '🔔',
          }
        )
      }

      prevUnreadRef.current = newUnread
      setStats({
        total: data?.total || 0,
        no_leidas: newUnread,
        leidas: data?.leidas || 0,
        urgentes: data?.urgentes || 0,
        por_categoria: data?.por_categoria || {},
        por_prioridad: data?.por_prioridad || {},
      })
    } catch {
      // Silently fail
    }
  }, [])

  // Cargar recent notifs (para dropdown)
  const loadRecent = useCallback(async () => {
    setLoading(true)
    try {
      const data = await notificationsService.list({ ordering: '-fecha', page_size: 5 })
      if (!mountedRef.current) return
      const list = Array.isArray(data) ? data : (data.results || [])
      setRecentNotifs(list.slice(0, 5))
    } catch {
      if (mountedRef.current) setRecentNotifs([])
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // Marcar como leída
  const markRead = useCallback(async (id) => {
    try {
      await notificationsService.markRead(id)
      setRecentNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
      setStats(prev => ({
        ...prev,
        no_leidas: Math.max(0, prev.no_leidas - 1),
        leidas: prev.leidas + 1,
      }))
      prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1)
    } catch {}
  }, [])

  // Marcar como no leída
  const markUnread = useCallback(async (id) => {
    try {
      await notificationsService.markUnread(id)
      setRecentNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: false } : n))
      setStats(prev => ({
        ...prev,
        no_leidas: prev.no_leidas + 1,
        leidas: Math.max(0, prev.leidas - 1),
      }))
      prevUnreadRef.current = prevUnreadRef.current + 1
    } catch {}
  }, [])

  // Marcar todas como leídas
  const markAllRead = useCallback(async () => {
    try {
      await notificationsService.markAllRead()
      setRecentNotifs(prev => prev.map(n => ({ ...n, leida: true })))
      setStats(prev => ({
        ...prev,
        no_leidas: 0,
        leidas: prev.total,
      }))
      prevUnreadRef.current = 0
    } catch {}
  }, [])

  // Eliminar notificación
  const deleteNotif = useCallback(async (id) => {
    try {
      await notificationsService.delete(id)
      setRecentNotifs(prev => prev.filter(n => n.id !== id))
      // Re-sync stats desde el servidor para evitar drift
      await refreshStats()
    } catch {}
  }, [refreshStats])

  // Eliminar notificaciones leídas
  const deleteAllRead = useCallback(async () => {
    try {
      await notificationsService.deleteRead()
      setRecentNotifs(prev => prev.filter(n => !n.leida))
      setStats(prev => ({
        ...prev,
        total: prev.no_leidas,
        leidas: 0,
      }))
      await refreshStats()
    } catch {}
  }, [refreshStats])

  // Initial load + polling (solo si está autenticado)
  useEffect(() => {
    mountedRef.current = true

    if (!isAuthenticated) {
      // Reset stats cuando no está autenticado
      setStats({ total: 0, no_leidas: 0, leidas: 0, urgentes: 0, por_categoria: {}, por_prioridad: {} })
      setRecentNotifs([])
      prevUnreadRef.current = 0
      return
    }

    refreshStats()

    const interval = setInterval(refreshStats, POLL_INTERVAL)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [refreshStats, isAuthenticated])

  // Cuando se abre el dropdown, cargar recent
  useEffect(() => {
    if (dropdownOpen) {
      loadRecent()
    }
  }, [dropdownOpen, loadRecent])

  const value = {
    stats,
    recentNotifs,
    loading,
    dropdownOpen,
    setDropdownOpen,
    refreshStats,
    loadRecent,
    markRead,
    markUnread,
    markAllRead,
    deleteNotif,
    deleteAllRead,
    unreadCount: stats.no_leidas,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider')
  }
  return ctx
}

export default NotificationContext
