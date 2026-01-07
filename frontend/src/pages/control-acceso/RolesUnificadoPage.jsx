/**
 * Página Unificada de Gestión de Roles
 * Incluye 3 tabs: Roles, Tipos de Rol, y Asignaciones
 */

import React, { useState } from 'react';
import { Shield, Users, UserPlus } from 'lucide-react';
import useAudit from '../../hooks/useAudit';

// Importar los componentes individuales
import RolesTab from './tabs/RolesTab';
import TiposRolTab from './tabs/TiposRolTab';
import AsignacionesTab from './tabs/AsignacionesTab';

const RolesUnificadoPage = () => {
  const [activeTab, setActiveTab] = useState('roles');
  const audit = useAudit('Roles'); // 🔥 AUDITORÍA AUTOMÁTICA

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
      id: 'asignaciones', 
      label: 'Asignaciones', 
      icon: UserPlus,
      description: 'Asignación y aprobación de roles'
    }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    audit.tab(tabId); // 🔥 REGISTRA CAMBIO DE TAB
  };

  return (
    <div className="space-y-6">
      {/* Header Unificado */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Shield className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Gestión de Roles</h1>
              <p className="text-cyan-100 mt-1">Sistema completo de roles, tipos y asignaciones</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-2 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-cyan-500 text-cyan-600 bg-cyan-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">{tab.label}</div>
                    <div className="text-xs text-gray-500">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'roles' && <RolesTab />}
          {activeTab === 'tipos' && <TiposRolTab />}
          {activeTab === 'asignaciones' && <AsignacionesTab />}
        </div>
      </div>
    </div>
  );
};

export default RolesUnificadoPage;
