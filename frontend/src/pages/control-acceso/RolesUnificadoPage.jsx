/**
 * Página Unificada de Gestión de Roles
 * Incluye: Roles, Tipos de Rol, Asignaciones, Auditoría e Historial
 */

import React, { useState } from 'react';
import { Shield, Users, ClipboardList, History } from 'lucide-react';
import useAudit from '../../hooks/useAudit';
import { usePermissions } from '../../context/PermissionsContext';
import useProductTour from '../../hooks/useProductTour';
import { TOUR_CONFIGS } from '../../data/tourConfigs';

// Importar los componentes individuales
import RolesTab from './tabs/RolesTab';
import TiposRolTab from './tabs/TiposRolTab';
import AuditoriaRolesTab from './tabs/AuditoriaRolesTab';
import HistorialAsignacionesTab from './tabs/HistorialAsignacionesTab';

const RolesUnificadoPage = () => {
  const [activeTab, setActiveTab] = useState('roles');
  const audit = useAudit('Roles');
  const { hasPermission, initialized } = usePermissions();

  useProductTour('roles', TOUR_CONFIGS.roles.steps, {
    ready: initialized,
  });

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('roles.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  const tabs = [
    {
      id: 'roles',
      label: 'Roles',
      icon: Shield,
      description: 'Gestión de roles y jerarquías'
    },
    {
      id: 'tipos',
      label: 'Tipos de Rol',
      icon: Users,
      description: 'Categorías y tipos de roles'
    },
    {
      id: 'auditoria',
      label: 'Auditoría',
      icon: ClipboardList,
      description: 'Historial de cambios',
      permission: 'roles.view_auditoria'
    },
    {
      id: 'historial',
      label: 'Historial Asignaciones',
      icon: History,
      description: 'Historial de asignaciones',
      permission: 'roles.view_historial'
    }
  ];

  const visibleTabs = tabs.filter(t => !t.permission || hasPermission(t.permission));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'roles':
        return <RolesTab />;
      case 'tipos':
        return <TiposRolTab />;
      case 'auditoria':
        return <AuditoriaRolesTab />;
      case 'historial':
        return <HistorialAsignacionesTab />;
      default:
        return <RolesTab />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div id="tour-roles-header" className="backdrop-blur-xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="flex items-center space-x-4">
          <div className="bg-white/20 backdrop-blur-xl p-4 rounded-2xl">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Gestión de Roles
            </h1>
            <p className="text-purple-100 text-lg">
              Sistema completo de roles y auditoría
            </p>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div id="tour-roles-tabs" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-2 border border-gray-200/50">
        <div className="flex space-x-2 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  audit.tab(tab.id);
                }}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div id="tour-roles-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default RolesUnificadoPage;
