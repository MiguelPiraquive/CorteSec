import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ConfiguracionDashboard from '../../components/Configuracion/ConfiguracionDashboard';
import ConfiguracionGeneral from '../../components/Configuracion/ConfiguracionGeneral';
import ParametrosList from '../../components/Configuracion/ParametrosList';
import ParametroForm from '../../components/Configuracion/ParametroForm';
import ModulosList from '../../components/Configuracion/ModulosList';

const ConfiguracionRoutes = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route index element={<ConfiguracionDashboard />} />
          <Route path="general" element={<ConfiguracionGeneral />} />
          <Route path="parametros" element={<ParametrosList />} />
          <Route path="parametros/nuevo" element={<ParametroForm />} />
          <Route path="parametros/:id" element={<ParametroForm />} />
          <Route path="parametros/:id/editar" element={<ParametroForm />} />
          <Route path="modulos" element={<ModulosList />} />
        </Routes>
      </div>
    </div>
  );
};

export default ConfiguracionRoutes;
