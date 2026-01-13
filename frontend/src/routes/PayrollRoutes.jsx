// Rutas de Nómina Electrónica
import React from 'react';
import { Routes, Route } from 'react-router-dom';
// import NominaElectronicaPage from '../pages/payroll/NominaElectronicaPage';
// import PortalEmpleadoPage from '../pages/payroll/PortalEmpleadoPage';
// import AnalyticsDashboardPage from '../pages/payroll/AnalyticsDashboardPage';
// import EmpleadosNominaPage from '../pages/payroll/EmpleadosNominaPage';
// import ContratosPage from '../pages/payroll/ContratosPage';
// import PeriodosPage from '../pages/payroll/PeriodosPage';
// import ConfiguracionNominaElectronicaPage from '../pages/payroll/ConfiguracionNominaElectronicaPage';
// import WebhooksPage from '../pages/payroll/WebhooksPage';
// import ReportesPage from '../pages/payroll/ReportesPage';
// import NominaFormPage from '../pages/payroll/NominaFormPage';
// import ConceptosLaboralesPage from '../pages/payroll/ConceptosLaboralesPage';

export const PayrollRoutes = () => {
  return (
    <Routes>
      {/* TODO: Crear páginas de Nómina Electrónica */}
      <Route path="/*" element={
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Nómina Electrónica</h1>
          <p className="text-gray-600">Módulo en desarrollo - Próximamente disponible</p>
        </div>
      } />
      
      {/* Gestión de Nómina Electrónica - COMENTADO TEMPORALMENTE
      <Route path="/nominas" element={<NominaElectronicaPage />} />
      <Route path="/nominas/crear" element={<NominaFormPage />} />
      <Route path="/nominas/:id/editar" element={<NominaFormPage />} />
      <Route path="/nominas/:id" element={<div className="p-6"><h1>Detalle Nómina Electrónica</h1></div>} />
      
      <Route path="/conceptos-laborales" element={<ConceptosLaboralesPage />} />
      <Route path="/portal-empleado" element={<PortalEmpleadoPage />} />
      <Route path="/analytics" element={<AnalyticsDashboardPage />} />
      <Route path="/empleados" element={<EmpleadosNominaPage />} />
      <Route path="/contratos" element={<ContratosPage />} />
      <Route path="/periodos" element={<PeriodosPage />} />
      <Route path="/configuracion" element={<ConfiguracionNominaElectronicaPage />} />
      <Route path="/webhooks" element={<WebhooksPage />} />
      <Route path="/reportes" element={<ReportesPage />} />
      */}
    </Routes>
  );
};
