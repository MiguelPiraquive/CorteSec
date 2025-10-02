import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/index';
import MainLayout from './components/Layout/MainLayout';
import AuthLayout from './components/Layout/AuthLayout';
import { OrganizationProvider } from './contexts/OrganizationContext.jsx';

// Import CSS styles
import './styles/layout.css'

// Pages - Dashboard
import Dashboard from './pages/Dashboard';

// Pages - Locations
import DepartamentosList from './pages/Locations/DepartamentosList';
import ImportarExcel from './pages/Locations/ImportarExcel';
import MunicipiosList from './pages/Locations/MunicipiosList';

// Pages - Payroll
import EmpleadosList from './pages/Payroll/EmpleadosList';
import NominasList from './pages/Payroll/NominasList';

// Pages - Items
import ItemsList from './pages/Items/ItemsList';

// Pages - Cargos
import { CargosList, CargoDetail, CargoForm, Organigrama, Jerarquia } from './pages/Cargos';

// Pages - TiposCantidad
import TiposCantidadList from './pages/TiposCantidad/TiposCantidadList';

// Pages - Prestamos
import PrestamosList from './pages/Prestamos/PrestamosList';

// Pages - Contabilidad
import { ContabilidadList } from './pages/Contabilidad';

// Pages - Roles
import RolesList from './pages/Roles/RolesList';

// Pages - Permisos
import PermisosList from './pages/Permisos/PermisosList';

// Pages - Ayuda
import AyudaList from './pages/Ayuda/AyudaList';
import CentroAyuda from './pages/Ayuda/CentroAyuda';
import ArticuloDetalle from './pages/Ayuda/ArticuloDetalle';
import FAQ from './pages/Ayuda/FAQ';
import Tutoriales from './pages/Ayuda/Tutoriales';
import Videos from './pages/Ayuda/Videos';
import Busqueda from './pages/Ayuda/Busqueda';
import Contacto from './pages/Ayuda/Contacto';
import Tickets from './pages/Ayuda/Tickets';
import Feedback from './pages/Ayuda/Feedback';

// Pages - Configuracion
import ConfiguracionRoutes from './pages/Configuracion';

// Pages - Reportes
import ReportesList from './pages/Reportes/ReportesList';

// Pages - Documentacion
import DocumentacionList from './pages/Documentacion/DocumentacionList';

// Pages - Organizations
import OrganizationsRoutes from './pages/Organizations';

// Pages - Auth
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import PasswordResetDone from './pages/Auth/PasswordResetDone';
import ResetPassword from './pages/Auth/ResetPassword';
import PasswordResetComplete from './pages/Auth/PasswordResetComplete';
import EmailVerification from './pages/Auth/EmailVerification';
import EmailVerificationSent from './pages/Auth/EmailVerificationSent';

// Common components
import NotFound from './components/Common/NotFound';
import Unauthorized from './components/Common/Unauthorized';

// Import Bootstrap JS
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function App() {
  const { 
    theme, 
    initializeStore,
    user,
    isAuthenticated,
    loading
  } = useAppStore();

  // Initialize store on mount
  useEffect(() => {
    initializeStore();
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`app h-100 ${theme}`}>
      <Routes>
        {/* Main Routes */}
      {/* Ruta raíz - redirigir según autenticación */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/auth/login" replace />
          )
        } 
      />
      
      {/* Auth Routes - solo accesibles si NO está autenticado */}
      <Route path="/auth" element={
        isAuthenticated ? (
          <Navigate to="/dashboard" replace />
        ) : (
          <AuthLayout />
        )
      }>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="password-reset-done" element={<PasswordResetDone />} />
        <Route path="reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="reset-complete" element={<PasswordResetComplete />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Route>

      {/* Redirección directa para /login */}
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      
      {/* Email Verification Routes - públicas */}
      <Route path="/verificar-email/:uid/:token" element={<EmailVerification />} />
      <Route path="/email-verification-sent" element={<EmailVerificationSent />} />
      
      {/* Protected Routes - solo accesibles si está autenticado */}
      <Route path="/*" element={
        isAuthenticated ? (
          <MainLayout />
        ) : (
          <Navigate to="/auth/login" replace />
        )
      }>
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Ubicaciones */}
          <Route path="locations/departamentos" element={<DepartamentosList />} />
          <Route path="locations/importar-excel" element={<ImportarExcel />} />
          <Route path="locations/municipios" element={<MunicipiosList />} />
          
          {/* Recursos Humanos */}
          <Route path="payroll/empleados" element={<EmpleadosList />} />
          <Route path="payroll/nominas" element={<NominasList />} />
          
          {/* Cargos */}
          <Route path="cargos" element={<CargosList />} />
          <Route path="cargos/:id" element={<CargoDetail />} />
          <Route path="cargos/nuevo" element={<CargoForm />} />
          <Route path="cargos/:id/editar" element={<CargoForm />} />
          <Route path="cargos/organigrama" element={<Organigrama />} />
          <Route path="cargos/jerarquia" element={<Jerarquia />} />
          
          {/* Inventario */}
          <Route path="items" element={<ItemsList />} />
          <Route path="tipos-cantidad" element={<TiposCantidadList />} />
          
          {/* Finanzas */}
          <Route path="prestamos" element={<PrestamosList />} />
          <Route path="contabilidad" element={<ContabilidadList />} />
          
          {/* Administración */}
          <Route path="roles" element={<RolesList />} />
          <Route path="permisos" element={<PermisosList />} />
          
          {/* Sistema */}
          <Route path="configuracion/*" element={<ConfiguracionRoutes />} />
          <Route path="reportes" element={<ReportesList />} />
          <Route path="ayuda" element={<CentroAyuda />} />
          <Route path="ayuda/articulos" element={<AyudaList />} />
          <Route path="ayuda/articulo/:id" element={<ArticuloDetalle />} />
          <Route path="ayuda/faq" element={<FAQ />} />
          <Route path="ayuda/tutoriales" element={<Tutoriales />} />
          <Route path="ayuda/tutorial/:id" element={<ArticuloDetalle />} />
          <Route path="ayuda/videos" element={<Videos />} />
          <Route path="ayuda/busqueda" element={<Busqueda />} />
          <Route path="ayuda/contacto" element={<Contacto />} />
          <Route path="ayuda/tickets" element={<Tickets />} />
          <Route path="ayuda/feedback" element={<Feedback />} />
          <Route path="documentacion" element={<DocumentacionList />} />
          
          {/* Organizations Routes */}
          <Route path="organizations/*" element={<OrganizationsRoutes />} />
          
          {/* Páginas adicionales - próximamente */}
          <Route path="empresas" element={<div className="container mx-auto px-4 py-6"><h2 className="text-2xl font-bold">Empresas (Próximamente)</h2></div>} />
          <Route path="proyectos" element={<div className="container mx-auto px-4 py-6"><h2 className="text-2xl font-bold">Proyectos (Próximamente)</h2></div>} />
          <Route path="pagos" element={<div className="container mx-auto px-4 py-6"><h2 className="text-2xl font-bold">Pagos (Próximamente)</h2></div>} />
          
          {/* Common routes */}
          <Route path="unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
