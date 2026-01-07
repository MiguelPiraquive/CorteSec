import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider } from './context/AuthContext'
import { TenantProvider } from './context/TenantContext'

import PrivateRoute from './components/auth/PrivateRoute'
import PublicRoute from './components/auth/PublicRoute'
import DashboardLayout from './components/layout/DashboardLayout'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'

// Dashboard Pages
import DashboardHomePage from './pages/DashboardHomePage'

// Recursos Humanos
import EmpleadosPage from './pages/recursos-humanos/EmpleadosPage'
import CargosPage from './pages/recursos-humanos/CargosPage'

// Ubicaciones
import DepartamentosPage from './pages/ubicaciones/DepartamentosPage'
import MunicipiosPage from './pages/ubicaciones/MunicipiosPage'

// Finanzas
import ItemsPage from './pages/finanzas/ItemsPage'
import PrestamosPage from './pages/finanzas/PrestamosPage'
import TiposPrestamoPage from './pages/finanzas/TiposPrestamoPage'

// Control de Acceso
import TiposCantidadPage from './pages/control-acceso/TiposCantidadPage'
import RolesUnificadoPage from './pages/control-acceso/RolesUnificadoPage'
import PermisosUnificadoPage from './pages/control-acceso/PermisosUnificadoPage'

// Auditoría
import AuditoriaUnificadoPage from './pages/auditoria/AuditoriaUnificadoPage'

// Nómina
import NominaPage from './pages/nomina/NominaPage'

// Perfil
import PerfilPage from './pages/perfil/PerfilPage'

// Usuarios
import UsuariosPage from './pages/usuarios/UsuariosPage'

// Nómina Electrónica
import { PayrollRoutes } from './routes/PayrollRoutes'

function App() {
  return (
    <Router>
      <TenantProvider>
        <AuthProvider>
          <div className="min-h-screen">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } />
              
              <Route path="/register" element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              } />
              
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              } />
              
              <Route path="/reset-password/:uid/:token" element={
                <PublicRoute>
                  <ResetPasswordPage />
                </PublicRoute>
              } />
              
              <Route path="/verificar-email/:uid/:token" element={
                <PublicRoute>
                  <VerifyEmailPage />
                </PublicRoute>
              } />

              {/* Private Routes - Dashboard con Layout */}
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }>
                {/* Rutas anidadas dentro del layout */}
                <Route index element={<DashboardHomePage />} />
                <Route path="empleados" element={<EmpleadosPage />} />
                <Route path="cargos" element={<CargosPage />} />
                <Route path="items" element={<ItemsPage />} />
                <Route path="prestamos" element={<PrestamosPage />} />
                <Route path="tipos-prestamo" element={<TiposPrestamoPage />} />
                <Route path="tipos-cantidad" element={<TiposCantidadPage />} />
                <Route path="roles" element={<RolesUnificadoPage />} />
                <Route path="permisos" element={<PermisosUnificadoPage />} />
                <Route path="auditoria" element={<AuditoriaUnificadoPage />} />
                <Route path="departamentos" element={<DepartamentosPage />} />
                <Route path="municipios" element={<MunicipiosPage />} />
                <Route path="nomina" element={<NominaPage />} />
                <Route path="perfil" element={<PerfilPage />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                
                {/* Nómina Electrónica - Todas las rutas */}
                <Route path="nomina-electronica/*" element={<PayrollRoutes />} />
                
                <Route path="reportes" element={<div className="p-6"><h1 className="text-2xl font-bold">Módulo de Reportes</h1></div>} />
                <Route path="configuracion" element={<div className="p-6"><h1 className="text-2xl font-bold">Configuración</h1></div>} />
              </Route>

              {/* Default Route */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* 404 */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>

            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
        </AuthProvider>
      </TenantProvider>
    </Router>
  )
}

export default App
