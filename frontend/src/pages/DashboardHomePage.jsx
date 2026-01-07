import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTenant } from '../context/TenantContext'
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
} from 'lucide-react'

const DashboardHomePage = () => {
  const { user } = useAuth()
  const { tenant } = useTenant()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const stats = [
    { title: 'Total Empleados', value: '245', change: '+12%', changeType: 'positive', icon: UsersIcon, color: 'blue', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    { title: 'Nómina del Mes', value: '$125,430', change: '+8%', changeType: 'positive', icon: DollarSignIcon, color: 'green', bgColor: 'bg-green-100', iconColor: 'text-green-600' },
    { title: 'Pagos Pendientes', value: '12', change: '-5%', changeType: 'negative', icon: ClockIcon, color: 'orange', bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
    { title: 'Activos Hoy', value: '198', change: '+2%', changeType: 'positive', icon: ActivityIcon, color: 'purple', bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  ]

  const recentActivities = [
    { id: 1, type: 'success', message: 'Nómina procesada exitosamente', time: 'Hace 2 horas', icon: CheckCircleIcon },
    { id: 2, type: 'warning', message: 'Revisión de prestaciones pendiente', time: 'Hace 4 horas', icon: AlertCircleIcon },
    { id: 3, type: 'success', message: 'Nuevo empleado registrado: Juan Pérez', time: 'Hace 6 horas', icon: CheckCircleIcon },
    { id: 4, type: 'info', message: 'Reporte mensual generado', time: 'Ayer', icon: TrendingUpIcon },
  ]

  const formatTime = (date) => date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-primary-600 via-blue-600 to-purple-700 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
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
          </div>
          <div className="mt-6 md:mt-0 text-right backdrop-blur-sm bg-white/10 rounded-2xl p-4 border border-white/20 shadow-xl">
            <p className="text-3xl font-bold tracking-wider">{formatTime(currentTime)}</p>
            <p className="text-white/80 text-sm capitalize mt-1 font-medium">{formatDate(currentTime)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-full shadow-md ${stat.changeType === 'positive' ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' : 'bg-gradient-to-r from-red-400 to-rose-500 text-white'}`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl p-7 border border-gray-200/50">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="bg-gradient-to-r from-primary-500 to-blue-600 p-2 rounded-xl mr-3 shadow-lg">
              <ActivityIcon className="w-6 h-6 text-white" />
            </div>
            Actividad Reciente
          </h2>
          <div className="space-y-3">
            {recentActivities.map((activity) => {
              const Icon = activity.icon
              return (
                <div key={activity.id} className="group flex items-start space-x-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-300 border border-transparent hover:border-gray-200/50 hover:shadow-md cursor-pointer">
                  <div className={`p-2.5 rounded-xl shadow-md transform group-hover:scale-110 transition-transform ${activity.type === 'success' ? 'bg-gradient-to-br from-green-400 to-emerald-500' : activity.type === 'warning' ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-blue-400 to-cyan-500'}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1.5 font-medium">{activity.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl p-7 border border-gray-200/50">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 rounded-xl mr-3 shadow-lg">
              <CreditCardIcon className="w-6 h-6 text-white" />
            </div>
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <button className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-4 relative z-10">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <UsersIcon className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-white text-lg">Registrar Empleado</span>
              </div>
              <span className="text-white group-hover:translate-x-2 transition-transform text-2xl">→</span>
            </button>

            <button className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-4 relative z-10">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <CreditCardIcon className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-white text-lg">Procesar Nómina</span>
              </div>
              <span className="text-white group-hover:translate-x-2 transition-transform text-2xl">→</span>
            </button>

            <button className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-4 relative z-10">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUpIcon className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-white text-lg">Generar Reporte</span>
              </div>
              <span className="text-white group-hover:translate-x-2 transition-transform text-2xl">→</span>
            </button>

            <button className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform duration-300">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 rounded-2xl shadow-xl p-7 text-white border border-white/20 hover:scale-105 hover:shadow-2xl transition-all duration-500 cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl inline-block mb-4 transform group-hover:scale-110 transition-transform">
              <BarChart3Icon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Datos en Tiempo Real</h3>
            <p className="text-blue-100 text-sm leading-relaxed">Sistema sincronizado y actualizado automáticamente cada 30 segundos.</p>
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHomePage
