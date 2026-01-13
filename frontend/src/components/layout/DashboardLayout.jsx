import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
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
  SearchIcon,
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
  RulerIcon,
  CheckCircleIcon,
  UserPlusIcon,
  FileCheckIcon,
  CalendarIcon,
  WebhookIcon,
  LineChartIcon,
  ReceiptIcon,
  FileSignatureIcon,
  ScaleIcon,
} from 'lucide-react'

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [ubicacionesOpen, setUbicacionesOpen] = useState(false)
  const [recursosHumanosOpen, setRecursosHumanosOpen] = useState(false)
  const [finanzasOpen, setFinanzasOpen] = useState(false)
  const [controlAccesoOpen, setControlAccesoOpen] = useState(false)
  const [nominaElectronicaOpen, setNominaElectronicaOpen] = useState(false)
  const { user, logout } = useAuth()
  const { tenant } = useTenant()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: HomeIcon, 
      path: '/dashboard', 
      color: 'text-blue-600' 
    },
    { 
      name: 'Recursos Humanos', 
      icon: UsersIcon, 
      color: 'text-green-600',
      submenu: [
        { name: 'Empleados', path: '/dashboard/empleados', icon: UsersIcon },
        { name: 'Cargos', path: '/dashboard/cargos', icon: BriefcaseIcon },
        { name: 'Tipos de Contrato', path: '/dashboard/tipos-contrato', icon: FileTextIcon },
        { name: 'Contratos', path: '/dashboard/contratos', icon: FileSignatureIcon },
        { name: 'Nómina', path: '/dashboard/nomina', icon: CreditCardIcon },
        { name: 'Conceptos Laborales', path: '/dashboard/conceptos-laborales', icon: DollarSignIcon },
        { name: 'Parámetros Legales', path: '/dashboard/parametros-legales', icon: ScaleIcon },
      ]
    },
    { 
      name: 'Ubicaciones', 
      icon: MapPinIcon, 
      color: 'text-teal-600',
      submenu: [
        { name: 'Departamentos', path: '/dashboard/departamentos', icon: Building2Icon },
        { name: 'Municipios', path: '/dashboard/municipios', icon: MapPinIcon },
      ]
    },
    { 
      name: 'Finanzas', 
      icon: WalletIcon, 
      color: 'text-emerald-600',
      submenu: [
        { name: 'Préstamos', path: '/dashboard/prestamos', icon: DollarSignIcon },
        { name: 'Tipos de Préstamo', path: '/dashboard/tipos-prestamo', icon: WalletIcon },
        { name: 'Contabilidad', path: '/dashboard/contabilidad', icon: BookOpenIcon },
      ]
    },
    { 
      name: 'Items', 
      icon: PackageIcon, 
      path: '/dashboard/items', 
      color: 'text-orange-600' 
    },
    /* COMENTADO TEMPORALMENTE - Nómina Electrónica
    { 
      name: 'Nómina Electrónica', 
      icon: FileCheckIcon, 
      color: 'text-indigo-600',
      submenu: [
        { name: 'Nóminas Electrónicas', path: '/dashboard/nomina-electronica/nominas', icon: FileCheckIcon },
        { name: 'Conceptos Laborales', path: '/dashboard/nomina-electronica/conceptos-laborales', icon: DollarSignIcon },
        { name: 'Portal Empleado', path: '/dashboard/nomina-electronica/portal-empleado', icon: UsersIcon },
        { name: 'Analytics', path: '/dashboard/nomina-electronica/analytics', icon: LineChartIcon },
        { name: 'Empleados', path: '/dashboard/nomina-electronica/empleados', icon: UsersIcon },
        { name: 'Contratos', path: '/dashboard/nomina-electronica/contratos', icon: FileTextIcon },
        { name: 'Periodos', path: '/dashboard/nomina-electronica/periodos', icon: CalendarIcon },
        { name: 'Configuración', path: '/dashboard/nomina-electronica/configuracion', icon: SettingsIcon },
        { name: 'Webhooks', path: '/dashboard/nomina-electronica/webhooks', icon: WebhookIcon },
        { name: 'Reportes', path: '/dashboard/nomina-electronica/reportes', icon: ReceiptIcon },
      ]
    },
    */
    { 
      name: 'Reportes', 
      icon: BarChart3Icon, 
      path: '/dashboard/reportes', 
      color: 'text-purple-600' 
    },
    { 
      name: 'Control de Acceso', 
      icon: ShieldIcon, 
      color: 'text-red-600',
      submenu: [
        { name: 'Usuarios', path: '/dashboard/usuarios', icon: UsersIcon },
        { name: 'Roles', path: '/dashboard/roles', icon: ShieldIcon },
        { name: 'Tipos de Cantidad', path: '/dashboard/tipos-cantidad', icon: RulerIcon },
        { name: 'Permisos', path: '/dashboard/permisos', icon: ShieldIcon },
        { name: 'Auditoría', path: '/dashboard/auditoria', icon: ShieldIcon },
      ]
    },
    { 
      name: 'Configuración', 
      icon: SettingsIcon, 
      path: '/dashboard/configuracion', 
      color: 'text-gray-600' 
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* HEADER */}
      <header className="backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-xl fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center space-x-4">
            <button onClick={toggleSidebar} className="p-2 rounded-xl hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 text-gray-700 hover:text-primary-600 transition-all duration-300 transform hover:scale-105">
              {sidebarOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-gradient-to-br from-primary-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 hover:rotate-3">
                <span className="text-2xl font-bold text-white">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">CorteSec</h1>
                {tenant && <p className="text-xs text-gray-500 font-medium">{tenant.name || tenant.codigo}</p>}
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full group">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              <input type="text" placeholder="Buscar en CorteSec..." className="w-full pl-12 pr-4 py-2.5 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white transition-all duration-300 shadow-sm hover:shadow-md" />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="relative p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 text-gray-600 hover:text-primary-600 transition-all duration-300 transform hover:scale-105">
              <BellIcon className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse shadow-lg"></span>
            </button>

            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 transition-all duration-300 transform hover:scale-105 group">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <span className="text-sm font-bold text-white">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <span className="hidden md:block text-sm font-semibold text-gray-700 group-hover:text-primary-600 transition-colors">{user?.full_name || user?.username || 'Usuario'}</span>
                <ChevronDownIcon className="w-4 h-4 text-gray-500 group-hover:text-primary-600 transition-all" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 py-2 text-gray-800">
                  <div className="px-4 py-3 border-b border-gray-200/50 bg-gradient-to-r from-primary-50/50 to-blue-50/50 rounded-t-2xl">
                    <p className="text-sm font-bold text-gray-900">{user?.full_name || user?.username}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{user?.email}</p>
                  </div>
                  <button onClick={() => navigate('/dashboard/perfil')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 transition-all font-medium text-gray-700 hover:text-primary-600">
                    👤 Mi Perfil
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 font-medium transition-all">
                    <LogOutIcon className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        <aside className={`fixed left-0 top-16 bottom-0 backdrop-blur-xl bg-white/90 border-r border-gray-200/50 shadow-2xl transition-all duration-300 z-20 ${sidebarOpen ? 'w-72' : 'w-0'} overflow-hidden`}>
          <nav className="p-5 space-y-1.5 overflow-y-auto h-full pb-32">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              const isActive = window.location.pathname === item.path
              const hasSubmenu = item.submenu && item.submenu.length > 0
              
              // Determinar qué submenú está abierto según el nombre del item
              let isSubmenuOpen = false
              let toggleSubmenu = () => {}
              
              if (item.name === 'Ubicaciones') {
                isSubmenuOpen = ubicacionesOpen
                toggleSubmenu = () => setUbicacionesOpen(!ubicacionesOpen)
              } else if (item.name === 'Recursos Humanos') {
                isSubmenuOpen = recursosHumanosOpen
                toggleSubmenu = () => setRecursosHumanosOpen(!recursosHumanosOpen)
              } else if (item.name === 'Finanzas') {
                isSubmenuOpen = finanzasOpen
                toggleSubmenu = () => setFinanzasOpen(!finanzasOpen)
              } else if (item.name === 'Control de Acceso') {
                isSubmenuOpen = controlAccesoOpen
                toggleSubmenu = () => setControlAccesoOpen(!controlAccesoOpen)
              } else if (item.name === 'Nómina Electrónica') {
                isSubmenuOpen = nominaElectronicaOpen
                toggleSubmenu = () => setNominaElectronicaOpen(!nominaElectronicaOpen)
              }
              
              if (hasSubmenu) {
                return (
                  <div key={index} className="space-y-1">
                    <button 
                      onClick={toggleSubmenu}
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
                          const isSubActive = window.location.pathname === subItem.path
                          const SubIcon = subItem.icon
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
                <p className="text-xs font-semibold text-white/80">Organización Activa</p>
              </div>
              <p className="text-base font-bold text-white">{tenant?.name || tenant?.codigo || 'Sin organización'}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                <p className="text-xs text-white/70">Código: <span className="font-mono font-bold text-white">{tenant?.codigo || 'N/A'}</span></p>
                <div className="px-2 py-0.5 bg-white/20 rounded-full">
                  <p className="text-xs font-bold text-white">PRO</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
          <div className="min-h-[calc(100vh-8rem)] p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <footer className={`backdrop-blur-xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white border-t border-gray-700/50 py-5 transition-all duration-300 shadow-2xl ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
        <div className="px-8 flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
          <div className="text-sm">
            <p className="font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">© 2025 CorteSec Solutions</p>
            <p className="text-gray-400 text-xs mt-1 font-medium">Sistema de Gestión Empresarial Multitenant</p>
          </div>
          <div className="flex space-x-6 text-sm">
            <button className="text-gray-400 hover:text-white transition-all duration-300 font-medium hover:scale-105 transform">📞 Soporte</button>
            <button className="text-gray-400 hover:text-white transition-all duration-300 font-medium hover:scale-105 transform">📚 Documentación</button>
            <button className="text-gray-400 hover:text-white transition-all duration-300 font-medium hover:scale-105 transform">🔒 Privacidad</button>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 bg-gradient-to-r from-primary-500 to-blue-600 rounded-full">
              <p className="text-xs font-bold">v2.0.0</p>
            </div>
            <div className="text-xs font-mono text-gray-400">{tenant?.codigo || 'SYSTEM'}</div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default DashboardLayout
