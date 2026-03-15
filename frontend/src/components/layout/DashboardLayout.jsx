import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { usePermissions } from '../../context/PermissionsContext'
import { useNotifications } from '../../context/NotificationContext'
import { useBilling } from '../../context/BillingContext'
import organizationService from '../../services/organizationService'
import { getMiPerfil, actualizarMiPerfilParcial } from '../../services/perfilService'
import { useActiveProject } from '../../context/ActiveProjectContext'
import RouteGuard from '../permissions/RouteGuard'
import { SIDEBAR_CONFIG } from '../../config/routePermissions'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { TOUR_CONFIGS } from '../../data/tourConfigs'
import {
  MenuIcon,
  XIcon,
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  FileTextIcon,
  SettingsIcon,
  LogOutIcon,
  ChevronDownIcon,
  BellIcon,
  MapPinIcon,
  ChevronRightIcon,
  BriefcaseIcon,
  WalletIcon,
  BookOpenIcon,
  PackageIcon,
  ShieldIcon,
  BarChart3Icon,
  Building2Icon,
  DollarSignIcon,
  ScaleIcon,
  UserPlusIcon,
  FileCheckIcon,
  ReceiptIcon,
  FileSignatureIcon,
  ActivityIcon,
  SlidersHorizontalIcon,
  LockIcon,
  MailIcon,
  HelpCircle,
  MessageCircle,
  GraduationCap,
  Headphones,
  KeyRound,
  LayoutGridIcon,
  GanttChartIcon,
  TrophyIcon,
  Monitor,
} from 'lucide-react'
import GlobalSearchBar from '../search/GlobalSearchBar'
import TrialBanner from '../billing/TrialBanner'
import ProjectSelector from './ProjectSelector'
import { SearchIcon, CheckCircleIcon, AlertCircleIcon, InfoIcon, AlertTriangleIcon, XCircleIcon, PinIcon, PinOffIcon } from 'lucide-react'

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState({})
  const { user, logout, isAuthenticated } = useAuth()
  const { tenant } = useTenant()
  const { hasPermission, hasAnyPermission, initialized: permissionsReady } = usePermissions()
  const { hasFeature } = useBilling()
  const {
    unreadCount: notifCount,
    recentNotifs,
    loading: notifsLoading,
    dropdownOpen: notifMenuOpen,
    setDropdownOpen: setNotifMenuOpen,
    markRead: handleMarkNotifRead,
  } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [organizationInfo, setOrganizationInfo] = useState(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const userMenuRef = useRef(null)
  const notifMenuRef = useRef(null)
  // Modal de proyecto: se controla con la preferencia del perfil del usuario
  // projectModalDismissed solo dura esta sesión de navegación (se resetea al volver a entrar)
  const [projectModalDismissed, setProjectModalDismissed] = useState(false)
  const [showProjectModalPref, setShowProjectModalPref] = useState(true)
  const [proyectoFijo, setProyectoFijo] = useState(null)
  const [pinningProject, setPinningProject] = useState(false)

  // Active project context
  const { activeProject, projects: allProjects, loading: projectsLoading, setActiveProject: selectProject } = useActiveProject()

  // Cargar preferencia de modal de proyecto y proyecto fijo desde el perfil
  useEffect(() => {
    if (!isAuthenticated) return
    let isMounted = true
    const loadProjectModalPref = async () => {
      try {
        const perfil = await getMiPerfil()
        if (!isMounted) return
        const pref = perfil.mostrar_modal_proyecto ?? true
        const pinned = perfil.proyecto_fijo || null
        setShowProjectModalPref(pref)
        setProyectoFijo(pinned)
        // Si hay proyecto fijo, no mostrar modal
        if (pinned) {
          setProjectModalDismissed(true)
        } else if (!pref) {
          setProjectModalDismissed(true)
        }
      } catch {
        if (isMounted) setShowProjectModalPref(true)
      }
    }
    loadProjectModalPref()
    return () => { isMounted = false }
  }, [isAuthenticated])

  // Auto-seleccionar proyecto fijo cuando los proyectos están cargados
  useEffect(() => {
    if (!projectsLoading && proyectoFijo && !activeProject && allProjects.length > 0) {
      const pinnedExists = allProjects.find(p => p.id === proyectoFijo)
      if (pinnedExists) {
        selectProject(proyectoFijo)
      }
    }
  }, [projectsLoading, proyectoFijo, activeProject, allProjects])

  // Fijar/desfijar proyecto
  const handlePinProject = async (projectId, e) => {
    e?.stopPropagation()
    if (pinningProject) return
    setPinningProject(true)
    try {
      const newPin = proyectoFijo === projectId ? null : projectId
      await actualizarMiPerfilParcial({ proyecto_fijo: newPin })
      setProyectoFijo(newPin)
    } catch (err) {
      console.error('Error al fijar proyecto:', err)
    } finally {
      setPinningProject(false)
    }
  }

  // ─── Tour del Modal de Bienvenida ─────────────────────────────
  useEffect(() => {
    const pendingTour = sessionStorage.getItem('cortesec_pending_tour')
    const params = new URLSearchParams(location.search)
    const urlTour = params.get('tour')

    if (pendingTour !== 'bienvenida_proyecto' && urlTour !== 'bienvenida_proyecto') return

    // Limpiar
    sessionStorage.removeItem('cortesec_pending_tour')
    if (urlTour) window.history.replaceState({}, '', window.location.pathname)

    // Forzar que el modal sea visible
    setProjectModalDismissed(false)

    // Lanzar el tour cuando el modal este renderizado
    const launchModalTour = (retries = 10) => {
      const headerEl = document.querySelector('#tour-modal-proyecto-header')
      if (!headerEl && retries > 0) {
        setTimeout(() => launchModalTour(retries - 1), 400)
        return
      }

      const tourSteps = (TOUR_CONFIGS.bienvenida_proyecto?.steps || []).filter((step) => {
        if (!step.element) return true
        return document.querySelector(step.element)
      })

      if (tourSteps.length === 0) return

      const driverObj = driver({
        showProgress: true,
        animate: true,
        overlayColor: 'rgba(0, 0, 0, 0.4)',
        stagePadding: 10,
        stageRadius: 12,
        popoverClass: 'cortesec-tour-popover',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Finalizar',
        progressText: '{{current}} de {{total}}',
        steps: tourSteps,
        onDestroyed: () => {
          localStorage.setItem('cortesec_tour_bienvenida_proyecto_done', 'true')
        },
      })
      driverObj.drive()
    }

    setTimeout(() => launchModalTour(), 800)
  }, [location.search])

  useEffect(() => {
    let isMounted = true
    const loadOrganization = async () => {
      try {
        const data = await organizationService.getCurrentOrganization()
        if (isMounted) setOrganizationInfo(data)
      } catch (error) {
        if (isMounted) setOrganizationInfo(null)
      } finally {
        if (isMounted) setOrgLoading(false)
      }
    }

    if (user?.is_authenticated !== false) {
      loadOrganization()
    }

    return () => {
      isMounted = false
    }
  }, [user])

  const trialStatus = useMemo(() => {
    if (!organizationInfo?.is_trial || !organizationInfo?.trial_ends_at) return null
    const end = new Date(organizationInfo.trial_ends_at)
    const diffMs = end.getTime() - Date.now()
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (Number.isNaN(daysLeft)) return null
    return { daysLeft, end }
  }, [organizationInfo])

  // Click-outside listener para cerrar dropdown del usuario
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setNotifMenuOpen(false)
      }
    }
    if (userMenuOpen || notifMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen, notifMenuOpen])

  // Escape cierra dropdown y mobile search
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false)
        setMobileSearchOpen(false)
        setNotifMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Cerrar dropdown al cambiar de ruta
  useEffect(() => {
    setUserMenuOpen(false)
    setMobileSearchOpen(false)
    setNotifMenuOpen(false)
  }, [location.pathname])

  const getNotifIcon = (tipo) => {
    if (tipo === 'success') return CheckCircleIcon
    if (tipo === 'warning') return AlertTriangleIcon
    if (tipo === 'error') return XCircleIcon
    return InfoIcon
  }

  const getNotifColor = (tipo) => {
    if (tipo === 'success') return 'from-green-400 to-emerald-500'
    if (tipo === 'warning') return 'from-orange-400 to-amber-500'
    if (tipo === 'error') return 'from-red-400 to-rose-500'
    return 'from-blue-400 to-cyan-500'
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Error al cerrar sesion:', error)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleSubmenu = useCallback((menuName) => {
    setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }))
  }, [])

  const hasMenuAccess = useCallback((item) => {
    if (user?.is_superuser) return true
    if (item.public) return true
    if (item.adminOnly) {
      return user?.is_superuser || user?.is_staff
    }
    // Verificar feature del plan (si el módulo requiere un feature específico)
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
      return false
    }
    if (item.permission) {
      return hasPermission(item.permission)
    }
    if (item.permissions && Array.isArray(item.permissions)) {
      if (item.mode === 'all') {
        return item.permissions.every(p => hasPermission(p))
      }
      return hasAnyPermission(item.permissions)
    }
    return true
  }, [user, hasPermission, hasAnyPermission, hasFeature])

  const filteredMenuItems = useMemo(() => {
    if (!permissionsReady) return []

    const result = []
    let lastWasSeparator = true

    for (const item of SIDEBAR_CONFIG) {
      if (item.type === 'separator') {
        if (!lastWasSeparator) {
          result.push(item)
          lastWasSeparator = true
        }
        continue
      }

      if (!hasMenuAccess(item)) continue

      if (item.submenu) {
        const filteredSubmenu = item.submenu.filter(subItem => hasMenuAccess(subItem))
        if (filteredSubmenu.length === 0) continue
        result.push({ ...item, submenu: filteredSubmenu })
      } else {
        result.push(item)
      }
      lastWasSeparator = false
    }

    // Remover separador final si quedo al final
    while (result.length > 0 && result[result.length - 1].type === 'separator') {
      result.pop()
    }

    return result
  }, [permissionsReady, hasMenuAccess])

  const iconMap = {
    HomeIcon, UsersIcon, CreditCardIcon, FileTextIcon, SettingsIcon,
    LogOutIcon, ChevronDownIcon, BellIcon, MapPinIcon, ChevronRightIcon,
    BriefcaseIcon, WalletIcon, BookOpenIcon, PackageIcon, ShieldIcon,
    BarChart3Icon, Building2Icon, DollarSignIcon, ScaleIcon,
    UserPlusIcon, FileCheckIcon, ReceiptIcon, FileSignatureIcon,
    ActivityIcon, SlidersHorizontalIcon, LockIcon, MailIcon, HelpCircle,
    MessageCircle, GraduationCap, Headphones,
    KeyIcon: KeyRound,
    LayoutGridIcon, GanttChartIcon, TrophyIcon,
    Monitor,
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* HEADER */}
      <header className="backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-xl fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
              aria-expanded={sidebarOpen}
              className="p-2 rounded-xl hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 text-gray-700 hover:text-primary-600 transition-all duration-300 transform hover:scale-105"
            >
              {sidebarOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 md:w-11 md:h-11 bg-gradient-to-br from-primary-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 hover:rotate-3">
                <span className="text-xl md:text-2xl font-bold text-white">C</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">CorteSec</h1>
                {tenant && <p className="text-xs text-gray-500 font-medium">{tenant.name || tenant.codigo}</p>}
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-3">
              {!orgLoading && organizationInfo?.plan && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                  Plan {organizationInfo.plan}
                </span>
              )}
              {trialStatus && trialStatus.daysLeft <= 7 && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Trial {trialStatus.daysLeft} días
                </span>
              )}
            </div>
            {/* Project Selector */}
            <div className="hidden md:block">
              <ProjectSelector />
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <GlobalSearchBar />
          </div>

          <div className="flex items-center space-x-1 md:space-x-3">
            {/* Botón de búsqueda mobile */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label="Buscar"
              className="md:hidden relative p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 text-gray-600 hover:text-primary-600 transition-all duration-300"
            >
              <SearchIcon className="w-5 h-5" />
            </button>

            <div className="relative" ref={notifMenuRef}>
              <button
                onClick={() => { setNotifMenuOpen(!notifMenuOpen); setUserMenuOpen(false) }}
                aria-label={`Notificaciones${notifCount > 0 ? ` (${notifCount} sin leer)` : ''}`}
                aria-expanded={notifMenuOpen}
                aria-haspopup="true"
                className="relative p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 text-gray-600 hover:text-primary-600 transition-all duration-300 transform hover:scale-105"
              >
                <BellIcon className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] flex items-center justify-center shadow-lg animate-pulse">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </button>

              {/* Dropdown de notificaciones */}
              <div className={`absolute right-0 mt-3 w-80 md:w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 text-gray-800 transition-all duration-200 origin-top-right ${notifMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <div className="px-5 py-4 border-b border-gray-200/50 bg-gradient-to-r from-primary-50/50 to-blue-50/50 rounded-t-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-primary-500 to-blue-600 p-1.5 rounded-lg shadow-md">
                      <BellIcon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Notificaciones</h3>
                  </div>
                  {notifCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm">
                      {notifCount} sin leer
                    </span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifsLoading ? (
                    <div className="p-6 text-center">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-2">Cargando...</p>
                    </div>
                  ) : recentNotifs.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {recentNotifs.map((notif) => {
                        const NIcon = getNotifIcon(notif.tipo)
                        const prioridadBadge = notif.prioridad === 'urgente'
                          ? 'bg-red-100 text-red-700'
                          : notif.prioridad === 'alta'
                          ? 'bg-orange-100 text-orange-700'
                          : null
                        return (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (!notif.leida) handleMarkNotifRead(notif.id)
                              if (notif.url_accion) {
                                setNotifMenuOpen(false)
                                navigate(notif.url_accion)
                              }
                            }}
                            className={`px-4 py-3.5 flex items-start space-x-3 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200 cursor-pointer group ${!notif.leida ? 'bg-primary-50/30' : ''}`}
                          >
                            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${getNotifColor(notif.tipo)} shadow-sm flex-shrink-0 mt-0.5`}>
                              <NIcon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold truncate ${!notif.leida ? 'text-gray-900' : 'text-gray-600'}`}>{notif.titulo}</p>
                                {!notif.leida && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 animate-pulse"></div>}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.mensaje}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {notif.categoria && (
                                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md capitalize">{notif.categoria}</span>
                                )}
                                {prioridadBadge && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${prioridadBadge}`}>{notif.prioridad}</span>
                                )}
                                <span className="text-[10px] text-gray-400 font-medium">{notif.fecha_formatted || notif.fecha}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <BellIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 font-medium">Sin notificaciones</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200/50 p-3">
                  <button
                    onClick={() => { setNotifMenuOpen(false); navigate('/dashboard/notificaciones') }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-all duration-200"
                  >
                    Ver todas las notificaciones
                  </button>
                </div>
              </div>
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="Menú de usuario"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                className="flex items-center space-x-2 md:space-x-3 px-2 md:px-3 py-2 rounded-xl hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 transition-all duration-300 transform hover:scale-105 group"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <span className="text-sm font-bold text-white">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <span className="hidden md:block text-sm font-semibold text-gray-700 group-hover:text-primary-600 transition-colors max-w-[120px] truncate">{user?.full_name || user?.username || 'Usuario'}</span>
                <ChevronDownIcon className={`hidden sm:block w-4 h-4 text-gray-500 group-hover:text-primary-600 transition-all duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 py-2 text-gray-800 transition-all duration-200 origin-top-right ${userMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`} role="menu">
                <div className="px-4 py-3 border-b border-gray-200/50 bg-gradient-to-r from-primary-50/50 to-blue-50/50 rounded-t-2xl">
                  <p className="text-sm font-bold text-gray-900">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{user?.email}</p>
                  {organizationInfo?.plan && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-100 text-primary-700">
                      Plan {organizationInfo.plan}
                    </span>
                  )}
                </div>
                <button onClick={() => navigate('/dashboard/perfil')} role="menuitem" className="w-full text-left px-4 py-2.5 text-sm hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 transition-all font-medium text-gray-700 hover:text-primary-600">
                  Mi Perfil
                </button>
                <div className="border-t border-gray-200/50 my-1"></div>
                <button onClick={handleLogout} role="menuitem" className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 font-medium transition-all">
                  <LogOutIcon className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda móvil expandible */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileSearchOpen ? 'max-h-16 opacity-100 border-t border-gray-200/50' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-2">
            <GlobalSearchBar />
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        <aside className={`fixed left-0 top-16 bottom-0 backdrop-blur-xl bg-white/90 border-r border-gray-200/50 shadow-2xl transition-all duration-300 z-20 ${sidebarOpen ? 'w-72' : 'w-0'} overflow-hidden`}>
          <nav className="p-5 space-y-1 overflow-y-auto h-full pb-32">
            {filteredMenuItems.map((item, index) => {
              // Separador de seccion
              if (item.type === 'separator') {
                return (
                  <div key={`sep-${index}`} className="pt-5 pb-2 px-4">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</p>
                  </div>
                )
              }

              const Icon = typeof item.icon === 'string' ? iconMap[item.icon] : item.icon
              const isActive = location.pathname === item.path
              const hasSubmenu = item.submenu && item.submenu.length > 0
              const isSubmenuOpen = openMenus[item.name] || false

              if (hasSubmenu) {
                return (
                  <div key={index} className="space-y-1">
                    <button
                      onClick={() => toggleSubmenu(item.name)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 font-medium"
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${item.color}`} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <ChevronRightIcon className={`w-4 h-4 transition-transform duration-300 ${isSubmenuOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {isSubmenuOpen && (
                      <div className="ml-4 space-y-1 border-l-2 border-primary-200 pl-3 animate-fade-in">
                        {item.submenu.map((subItem) => {
                          const isSubActive = location.pathname === subItem.path
                          const SubIcon = typeof subItem.icon === 'string' ? iconMap[subItem.icon] : subItem.icon
                          return (
                            <button
                              key={subItem.path}
                              onClick={() => navigate(subItem.path)}
                              className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-300 ${
                                isSubActive
                                  ? 'bg-gradient-to-r from-primary-500 to-blue-500 text-white shadow-lg font-semibold'
                                  : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:text-primary-600 font-medium'
                              }`}
                            >
                              {SubIcon && <SubIcon className="w-4 h-4" />}
                              <span>{subItem.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <button key={item.path} onClick={() => navigate(item.path)} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive ? 'bg-gradient-to-r from-primary-500 to-blue-600 text-white shadow-lg shadow-primary-500/30 scale-105 font-semibold' : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:scale-102 font-medium'}`}>
                  {isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse"></div>}
                  <Icon className={`w-5 h-5 relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : item.color}`} />
                  <span className="text-sm relative z-10">{item.name}</span>
                  {!isActive && (
                    <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                    </div>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="absolute bottom-5 left-5 right-5">
            <div className="backdrop-blur-xl bg-gradient-to-br from-primary-500 via-blue-500 to-purple-600 rounded-2xl p-4 shadow-xl border border-white/20">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <p className="text-xs font-semibold text-white/80">Organizacion Activa</p>
              </div>
              <p className="text-base font-bold text-white">{tenant?.name || tenant?.codigo || 'Sin organizacion'}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                <p className="text-xs text-white/70">Codigo: <span className="font-mono font-bold text-white">{tenant?.codigo || 'N/A'}</span></p>
                {!orgLoading && organizationInfo?.plan && (
                  <div className="px-2 py-0.5 bg-white/20 rounded-full">
                    <p className="text-xs font-bold text-white">{organizationInfo.plan}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
          <div className="min-h-[calc(100vh-8rem)] p-8">
            <TrialBanner />
            <RouteGuard>
              <Outlet />
            </RouteGuard>
          </div>
        </main>
      </div>

      <footer className={`backdrop-blur-xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white border-t border-gray-700/50 py-5 transition-all duration-300 shadow-2xl ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
        <div className="px-8 flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
          <div className="text-sm">
            <p className="font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">2026 CorteSec Solutions</p>
            <p className="text-gray-400 text-xs mt-1 font-medium">Sistema de Gestión Empresarial</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 bg-gradient-to-r from-primary-500 to-blue-600 rounded-full">
              <p className="text-xs font-bold">v2.0.0</p>
            </div>
            <div className="text-xs font-mono text-gray-400">{tenant?.codigo || 'SYSTEM'}</div>
          </div>
        </div>
      </footer>

      {/* ═══════ PROJECT WELCOME MODAL ═══════ */}
      {!projectsLoading && !projectModalDismissed && !activeProject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)', animation: 'wm-backdrop-in 0.4s ease-out both' }}
          >
            <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden flex flex-col"
              style={{ maxHeight: '88vh', boxShadow: '0 40px 80px -20px rgba(79,70,229,0.25), 0 20px 40px -10px rgba(0,0,0,0.2)', animation: 'wm-modal-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both' }}
            >

              {/* ── Header — gradient + parallax shapes ── */}
              <div id="tour-modal-proyecto-header" className="relative overflow-hidden flex-shrink-0"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
                  const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
                  const shapes = e.currentTarget.getElementsByClassName('wm-shape')
                  for (let i = 0; i < shapes.length; i++) {
                    const speed = parseFloat(shapes[i].dataset.speed) || 1
                    shapes[i].style.transform = `translate(${x * 18 * speed}px, ${y * 14 * speed}px) rotate(${x * 6 * speed}deg)`
                  }
                }}
                onMouseLeave={(e) => {
                  const shapes = e.currentTarget.getElementsByClassName('wm-shape')
                  for (let i = 0; i < shapes.length; i++) {
                    shapes[i].style.transform = ''
                  }
                }}
              >
                {/* Static gradient base */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />

                {/* Decorative shapes (parallax-only, no infinite animations) */}
                <div className="wm-shape absolute top-4 right-[15%] w-10 h-10 rounded-full border-2 border-white/20 transition-transform duration-200 ease-out" data-speed="1.2" />
                <div className="wm-shape absolute bottom-6 left-[10%] w-6 h-6 rounded-full bg-white/10 transition-transform duration-200 ease-out" data-speed="0.8" />
                <div className="wm-shape absolute top-[20%] right-[8%] w-4 h-4 rounded-full bg-white/15 transition-transform duration-200 ease-out" data-speed="1.5" />
                <div className="wm-shape absolute top-[30%] left-[20%] w-8 h-8 rounded-lg border-2 border-white/15 transition-transform duration-200 ease-out" data-speed="1.0" />
                <div className="wm-shape absolute bottom-[25%] right-[25%] w-5 h-5 rounded-md bg-white/10 transition-transform duration-200 ease-out" data-speed="1.3" />
                <div className="wm-shape absolute top-[15%] left-[35%] transition-transform duration-200 ease-out" data-speed="0.9"
                  style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '14px solid rgba(255,255,255,0.12)' }}
                />

                {/* Subtle glow (no blur-3xl, uses opacity instead) */}
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-violet-400/[0.12] rounded-full" style={{ filter: 'blur(40px)' }} />
                <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-indigo-400/[0.08] rounded-full" style={{ filter: 'blur(40px)' }} />

                {/* Close button */}
                <button
                  onClick={() => { setProjectModalDismissed(true) }}
                  className="absolute top-5 right-5 z-20 text-white/40 hover:text-white transition-colors duration-200 p-2.5 rounded-xl hover:bg-white/15"
                >
                  <XIcon className="w-5 h-5" />
                </button>

                {/* Header content */}
                <div className="relative z-10 px-10 py-10 flex items-center gap-7">
                  <div className="relative shrink-0">
                    <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center border border-white/25"
                      style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                    >
                      <span className="text-4xl" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}>🚀</span>
                    </div>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <h2 className="text-3xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                      {user?.full_name ? `¡Hola, ${user.full_name.split(' ')[0]}!` : '¡Bienvenido a CorteSec!'}
                    </h2>
                    <p className="text-white/60 text-base mt-2 leading-relaxed">Selecciona un proyecto para comenzar a trabajar</p>
                    {organizationInfo?.nombre && (
                      <div className="inline-flex items-center gap-2 mt-3 border border-white/15 rounded-lg px-3.5 py-1.5"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                      >
                        <Building2Icon className="w-3.5 h-3.5 text-white/50" />
                        <span className="text-white/80 text-sm font-medium">{organizationInfo.nombre}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Project list / empty state ── */}
              <div className="p-8 overflow-y-auto flex-1" style={{ background: 'linear-gradient(180deg, #fafbff 0%, #ffffff 100%)' }}>
                {allProjects.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-gray-500 font-medium tracking-wide uppercase" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>Proyectos disponibles</p>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{allProjects.length}</span>
                    </div>
                    <div id="tour-modal-proyecto-lista" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {allProjects.map((p, idx) => {
                        const isPinned = proyectoFijo === p.id
                        return (
                        <div
                          key={p.id}
                          className="group relative cursor-pointer"
                          style={{ perspective: '800px', opacity: 0, animation: `wm-card-arrive 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${0.15 + idx * 0.08}s both` }}
                          onMouseMove={(e) => {
                            const card = e.currentTarget
                            const rect = card.getBoundingClientRect()
                            const x = (e.clientX - rect.left) / rect.width
                            const y = (e.clientY - rect.top) / rect.height
                            const rY = (x - 0.5) * 10
                            const rX = (0.5 - y) * 6
                            card.firstElementChild.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) scale(1.02)`
                            card.firstElementChild.style.boxShadow = `${-rY}px ${rX}px 24px rgba(99,102,241,0.12), 0 8px 24px -4px rgba(0,0,0,0.06)`
                          }}
                          onMouseLeave={(e) => {
                            const card = e.currentTarget
                            card.firstElementChild.style.transform = ''
                            card.firstElementChild.style.boxShadow = ''
                          }}
                        >
                          <div className="relative rounded-2xl border border-gray-200/80 bg-white p-5 transition-all duration-200 ease-out overflow-hidden"
                            style={{ transformStyle: 'preserve-3d' }}
                          >
                            <button
                              onClick={(e) => handlePinProject(p.id, e)}
                              disabled={pinningProject}
                              className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all duration-200 z-10 ${
                                isPinned
                                  ? 'text-amber-500 bg-amber-50 hover:bg-amber-100 shadow-sm'
                                  : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50 opacity-0 group-hover:opacity-100'
                              }`}
                              title={isPinned ? 'Quitar como proyecto fijo' : 'Fijar como proyecto de inicio'}
                            >
                              {isPinned ? <PinIcon className="w-4 h-4" /> : <PinOffIcon className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={async () => {
                                await selectProject(p.id)
                                setProjectModalDismissed(true)
                              }}
                              className="flex items-center gap-4 w-full text-left"
                            >
                              <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0 transition-transform duration-200 group-hover:scale-110"
                                style={{ backgroundColor: p.color || '#6366f1', boxShadow: `0 8px 20px -4px ${(p.color || '#6366f1')}50` }}
                              >
                                {p.name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-800 text-[15px] truncate group-hover:text-indigo-700 transition-colors duration-200">{p.name}</p>
                                  {isPinned && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200/60">FIJO</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-400">{p.codigo_proyecto || 'Sin codigo'}</span>
                                  {p.estado && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      p.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' :
                                      p.estado === 'planificacion' ? 'bg-blue-100 text-blue-700' :
                                      p.estado === 'pausado' ? 'bg-amber-100 text-amber-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>{p.estado}</span>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors duration-200">
                                  <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors duration-200" />
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      )})}
                    </div>
                    <div className="mt-5 px-1">
                      <p id="tour-modal-proyecto-pin" className="text-[11px] text-gray-400 flex items-center gap-1.5">
                        <PinIcon className="w-3 h-3" /> Fija un proyecto para entrar directamente sin este modal.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-14">
                    <div className="relative inline-block mb-6">
                      <div className="relative text-7xl" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.12))' }}>📋</div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Aún no tienes proyectos</h3>
                    <p className="text-base text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">Crea tu primer proyecto para organizar empleados, nóminas y finanzas.</p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => {
                          setProjectModalDismissed(true)
                          navigate('/dashboard/projects')
                        }}
                        className="py-3.5 px-8 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-bold text-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-lg"
                      >
                        🚀 Crear Primer Proyecto
                      </button>
                      <button
                        onClick={() => { setProjectModalDismissed(true) }}
                        className="py-3.5 px-8 text-gray-500 hover:text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors duration-200 border border-gray-200"
                      >
                        Omitir
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              {allProjects.length > 0 && (
                <div id="tour-modal-proyecto-acciones" className="px-8 py-5 border-t border-gray-100 bg-gray-50/60 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => {
                      setProjectModalDismissed(true)
                      navigate('/dashboard/projects')
                    }}
                    className="flex-1 py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
                  >
                    + Nuevo Proyecto
                  </button>
                  <button
                    onClick={() => { setProjectModalDismissed(true) }}
                    className="py-3.5 px-8 text-gray-500 hover:text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors duration-200 border border-gray-200"
                  >
                    Omitir
                  </button>
                </div>
              )}
            </div>
          </div>
      )}
    </div>
  )
}

export default DashboardLayout
