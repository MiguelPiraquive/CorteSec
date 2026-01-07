// Rutas de Nómina Electrónica
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NominaElectronicaPage from '../pages/payroll/NominaElectronicaPage';
import PortalEmpleadoPage from '../pages/payroll/PortalEmpleadoPage';
import AnalyticsDashboardPage from '../pages/payroll/AnalyticsDashboardPage';
import EmpleadosNominaPage from '../pages/payroll/EmpleadosNominaPage';
import ContratosPage from '../pages/payroll/ContratosPage';
import PeriodosPage from '../pages/payroll/PeriodosPage';
import ConfiguracionNominaElectronicaPage from '../pages/payroll/ConfiguracionNominaElectronicaPage';
import WebhooksPage from '../pages/payroll/WebhooksPage';
import ReportesPage from '../pages/payroll/ReportesPage';
import NominaFormPage from '../pages/payroll/NominaFormPage';
import ConceptosLaboralesPage from '../pages/payroll/ConceptosLaboralesPage';

export const PayrollRoutes = () => {
  return (
    <Routes>
      {/* Gestión de Nómina Electrónica */}
      <Route path="/nominas" element={<NominaElectronicaPage />} />
      <Route path="/nominas/crear" element={<NominaFormPage />} />
      <Route path="/nominas/:id/editar" element={<NominaFormPage />} />
      <Route path="/nominas/:id" element={<div className="p-6"><h1>Detalle Nómina Electrónica</h1></div>} />
      
      {/* Conceptos Laborales */}
      <Route path="/conceptos-laborales" element={<ConceptosLaboralesPage />} />
      
      {/* Portal del Empleado */}
      <Route path="/portal-empleado" element={<PortalEmpleadoPage />} />
      
      {/* Analytics */}
      <Route path="/analytics" element={<AnalyticsDashboardPage />} />
      
      {/* Empleados */}
      <Route path="/empleados" element={<EmpleadosNominaPage />} />
      
      {/* Contratos */}
      <Route path="/contratos" element={<ContratosPage />} />
      
      {/* Periodos */}
      <Route path="/periodos" element={<PeriodosPage />} />
      
      {/* Configuración */}
      <Route path="/configuracion" element={<ConfiguracionNominaElectronicaPage />} />
      
      {/* Webhooks */}
      <Route path="/webhooks" element={<WebhooksPage />} />
      
      {/* Reportes */}
      <Route path="/reportes" element={<ReportesPage />} />
    </Routes>
  );
};
