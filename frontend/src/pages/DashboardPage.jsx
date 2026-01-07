import { useAuth } from '../context/AuthContext'
import { useTenant } from '../context/TenantContext'
import { LogOut, User, Building2, Mail, Phone, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const DashboardPage = () => {
  const { user, logout } = useAuth()
  const { tenantCode } = useTenant()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Sesión cerrada correctamente')
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CorteSec</h1>
                {tenantCode && (
                  <p className="text-xs text-gray-500">Organización: {tenantCode}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl shadow-lg p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">
            ¡Bienvenido, {user?.full_name || user?.first_name || user?.username}!
          </h2>
          <p className="text-primary-100">
            Has iniciado sesión exitosamente en el sistema CorteSec
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-6 h-6 text-primary-600" />
            Información de tu Cuenta
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Username */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Nombre de Usuario</p>
                <p className="text-base font-semibold text-gray-900">{user?.username}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-base font-semibold text-gray-900">{user?.email}</p>
                {user?.email_verified ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-1">
                    <XCircle className="w-3 h-3" />
                    No verificado
                  </span>
                )}
              </div>
            </div>

            {/* Full Name */}
            {user?.full_name && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nombre Completo</p>
                  <p className="text-base font-semibold text-gray-900">{user.full_name}</p>
                </div>
              </div>
            )}

            {/* Phone */}
            {user?.phone && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="text-base font-semibold text-gray-900">{user.phone}</p>
                </div>
              </div>
            )}

            {/* Organization */}
            {user?.organization && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Organización</p>
                  <p className="text-base font-semibold text-gray-900">
                    {user.organization.name || user.organization.slug}
                  </p>
                </div>
              </div>
            )}

            {/* Role */}
            {user?.organization_role && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rol</p>
                  <p className="text-base font-semibold text-gray-900">{user.organization_role}</p>
                </div>
              </div>
            )}
          </div>

          {/* Account Status */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Estado de la Cuenta</h4>
            <div className="flex flex-wrap gap-2">
              {user?.is_active && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Cuenta Activa
                </span>
              )}
              {user?.is_staff && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Staff
                </span>
              )}
              {user?.is_superuser && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Superusuario
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Este es el dashboard principal. Aquí se mostrarán las funcionalidades del sistema una vez que estén implementadas.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2025 CorteSec. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default DashboardPage
