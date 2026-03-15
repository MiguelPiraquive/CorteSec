import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider } from './context/AuthContext'
import { TenantProvider } from './context/TenantContext'
import { PermissionsProvider } from './context/PermissionsContext'
import { ConfiguracionProvider } from './context/ConfiguracionContext'
import { NotificationProvider } from './context/NotificationContext'
import { BillingProvider } from './context/BillingContext'
import { ActiveProjectProvider } from './context/ActiveProjectContext'

import PrivateRoute from './components/auth/PrivateRoute'
import PublicRoute from './components/auth/PublicRoute'
import DashboardLayout from './components/layout/DashboardLayout'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AcceptInvitationPage from './pages/auth/AcceptInvitationPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'

// Public Landing
import LandingPage from './pages/public/LandingPage'

// Dashboard Pages
import DashboardHomePage from './pages/DashboardHomePage'
import ProjectsPage from './pages/dashboard/ProjectsPage'
import ProjectKanbanPage from './pages/dashboard/ProjectKanbanPage'
import ProjectTimelinePage from './pages/dashboard/ProjectTimelinePage'
import ProjectReportsPage from './pages/dashboard/ProjectReportsPage'
import ProjectDetailPage from './pages/dashboard/ProjectDetailPage'
import ProjectAchievementsPage from './pages/dashboard/ProjectAchievementsPage'

// Recursos Humanos
import EmpleadosPage from './pages/recursos-humanos/EmpleadosPage'
import CargosPage from './pages/recursos-humanos/CargosPage'
import TiposContratoPage from './pages/recursos-humanos/TiposContratoPage'
import ContratosPage from './pages/recursos-humanos/ContratosPage'

// Ubicaciones
import DepartamentosPage from './pages/ubicaciones/DepartamentosPage'
import MunicipiosPage from './pages/ubicaciones/MunicipiosPage'

// Finanzas
import ItemsPage from './pages/finanzas/ItemsPage'
import PrestamosPage from './pages/finanzas/PrestamosPage'
import TiposPrestamoPage from './pages/finanzas/TiposPrestamoPage'
import ContabilidadPage from './pages/finanzas/ContabilidadPage'

// Control de Acceso RBAC
import RolesUnificadoPage from './pages/control-acceso/RolesUnificadoPage'
import PermisosUnificadoPage from './pages/permisos/PermisosUnificadoPage'

// Auditoría
import AuditoriaUnificadoPage from './pages/auditoria/AuditoriaUnificadoPage'

// Nómina
import NominaPage from './pages/nomina/NominaPage'
import ParametrosLegalesPage from './pages/nomina/ParametrosLegalesPage'
import ConceptosLaboralesPage from './pages/nomina/ConceptosLaboralesPage'

// Perfil
import PerfilPage from './pages/perfil/PerfilPage'

// Core
import OrganizacionesPage from './pages/core/OrganizacionesPage'
import NotificacionesPage from './pages/core/NotificacionesPage'
import SystemStatusPage from './pages/core/SystemStatusPage'

// Usuarios
import UsuariosPage from './pages/usuarios/UsuariosPage'

// Configuración
import ConfiguracionGeneralPage from './pages/configuracion/ConfiguracionGeneralPage'
import ParametrosSistemaPage from './pages/configuracion/ParametrosSistemaPage'
import ConfiguracionModulosPage from './pages/configuracion/ConfiguracionModulosPage'
import ConfiguracionSeguridadPage from './pages/configuracion/ConfiguracionSeguridadPage'
import ConfiguracionEmailPage from './pages/configuracion/ConfiguracionEmailPage'
import PlanesPage from './pages/configuracion/PlanesPage'

// Centro de Ayuda
import CentroAyudaPage from './pages/ayuda/CentroAyudaPage'
import ArticulosPage from './pages/ayuda/ArticulosPage'
import ArticuloDetailPage from './pages/ayuda/ArticuloDetailPage'
import FAQPage from './pages/ayuda/FAQPage'
import TutorialesPage from './pages/ayuda/TutorialesPage'
import TutorialDetailPage from './pages/ayuda/TutorialDetailPage'
import SoportePage from './pages/ayuda/SoportePage'
import MisSolicitudesPage from './pages/ayuda/MisSolicitudesPage'
import BusquedaAyudaPage from './pages/ayuda/BusquedaAyudaPage'
import ToursInteractivosPage from './pages/ayuda/ToursInteractivosPage'

// Global Search
import GlobalSearchPage from './pages/search/GlobalSearchPage'

// Billing
import BillingDashboardPage from './pages/billing/BillingDashboardPage'
import UpgradePage from './pages/billing/UpgradePage'
import CheckoutPage from './pages/billing/CheckoutPage'
import InvoicesPage from './pages/billing/InvoicesPage'
import PaymentMethodsPage from './pages/billing/PaymentMethodsPage'

// Nómina Electrónica - COMENTADO TEMPORALMENTE
// import { PayrollRoutes } from './routes/PayrollRoutes'

function App() {
  return (
    <Router>
      <TenantProvider>
        <AuthProvider>
          <PermissionsProvider>
          <ConfiguracionProvider>
          <NotificationProvider>
          <BillingProvider>
          <ActiveProjectProvider>
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

              <Route path="/invitacion/:token" element={
                <PublicRoute>
                  <AcceptInvitationPage />
                </PublicRoute>
              } />

              <Route path="/" element={<LandingPage />} />

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
                <Route path="tipos-contrato" element={<TiposContratoPage />} />
                <Route path="contratos" element={<ContratosPage />} />
                <Route path="items" element={<ItemsPage />} />
                <Route path="prestamos" element={<PrestamosPage />} />
                <Route path="tipos-prestamo" element={<TiposPrestamoPage />} />
                <Route path="contabilidad" element={<ContabilidadPage />} />
                
                {/* Control de Acceso RBAC */}
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="roles" element={<RolesUnificadoPage />} />
                <Route path="permisos" element={<PermisosUnificadoPage />} />
                <Route path="auditoria" element={<AuditoriaUnificadoPage />} />
                <Route path="departamentos" element={<DepartamentosPage />} />
                <Route path="municipios" element={<MunicipiosPage />} />
                <Route path="nomina" element={<NominaPage />} />
                <Route path="parametros-legales" element={<ParametrosLegalesPage />} />
                <Route path="conceptos-laborales" element={<ConceptosLaboralesPage />} />
                <Route path="perfil" element={<PerfilPage />} />
                <Route path="organizaciones" element={<OrganizacionesPage />} />
                <Route path="notificaciones" element={<NotificacionesPage />} />
                <Route path="system-status" element={<SystemStatusPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/kanban" element={<ProjectKanbanPage />} />
                <Route path="projects/timeline" element={<ProjectTimelinePage />} />
                <Route path="projects/reports" element={<ProjectReportsPage />} />
                <Route path="projects/achievements" element={<ProjectAchievementsPage />} />
                <Route path="projects/:id" element={<ProjectDetailPage />} />
                <Route path="configuracion" element={<ConfiguracionGeneralPage />} />
                <Route path="parametros" element={<ParametrosSistemaPage />} />
                <Route path="modulos" element={<ConfiguracionModulosPage />} />
                <Route path="planes" element={<PlanesPage />} />
                <Route path="seguridad" element={<ConfiguracionSeguridadPage />} />
                <Route path="email" element={<ConfiguracionEmailPage />} />
                
                {/* Centro de Ayuda */}
                <Route path="ayuda" element={<CentroAyudaPage />} />
                <Route path="ayuda/articulos" element={<ArticulosPage />} />
                <Route path="ayuda/articulos/:id" element={<ArticuloDetailPage />} />
                <Route path="ayuda/faqs" element={<FAQPage />} />
                <Route path="ayuda/tutoriales" element={<TutorialesPage />} />
                <Route path="ayuda/tutoriales/:id" element={<TutorialDetailPage />} />
                <Route path="ayuda/soporte" element={<SoportePage />} />
                <Route path="ayuda/soporte/:id" element={<MisSolicitudesPage />} />
               <Route path="ayuda/buscar" element={<BusquedaAyudaPage />} />
                <Route path="ayuda/tours" element={<ToursInteractivosPage />} />

                {/* Búsqueda Global */}
                <Route path="busqueda" element={<GlobalSearchPage />} />

                {/* Billing & Suscripción */}
                <Route path="billing" element={<BillingDashboardPage />} />
                <Route path="billing/planes" element={<UpgradePage />} />
                <Route path="billing/checkout" element={<CheckoutPage />} />
                <Route path="billing/facturas" element={<InvoicesPage />} />
                <Route path="billing/metodos-pago" element={<PaymentMethodsPage />} />
                
                {/* Nómina Electrónica - COMENTADO TEMPORALMENTE
                <Route path="nomina-electronica/*" element={<PayrollRoutes />} />
                */}
              </Route>

              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
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
          </ActiveProjectProvider>
          </BillingProvider>
          </NotificationProvider>
          </ConfiguracionProvider>
          </PermissionsProvider>
        </AuthProvider>
      </TenantProvider>
    </Router>
  )
}

export default App
