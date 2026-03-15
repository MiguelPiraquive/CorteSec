/**
 * Pagina Unificada de Gestion de Permisos
 * Incluye: Permisos, Modulos, Tipos de Permiso, Condiciones, Permisos Directos, Auditoria
 */

import React, { useState } from 'react';
import { Key, Layers, Tag, GitBranch, UserCheck, ClipboardList } from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';

import PermisosTab from './tabs/PermisosTab';
import ModulosTab from './tabs/ModulosTab';
import TiposPermisoTab from './tabs/TiposPermisoTab';
import CondicionesTab from './tabs/CondicionesTab';
import PermisosDirectosTab from './tabs/PermisosDirectosTab';
import AuditoriaPermisosTab from './tabs/AuditoriaPermisosTab';

const PermisosUnificadoPage = () => {
  const [activeTab, setActiveTab] = useState('permisos');
  const { hasPermission, initialized } = usePermissions();

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('permisos.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  const tabs = [
    {
      id: 'permisos',
      label: 'Permisos',
      icon: Key,
      description: 'Gestion de permisos granulares'
    },
    {
      id: 'modulos',
      label: 'Modulos',
      icon: Layers,
      description: 'Modulos del sistema',
      permission: 'permisos.manage_modulos'
    },
    {
      id: 'tipos',
      label: 'Tipos de Permiso',
      icon: Tag,
      description: 'Categorias de permisos'
    },
    {
      id: 'condiciones',
      label: 'Condiciones',
      icon: GitBranch,
      description: 'Condiciones dinamicas',
      permission: 'permisos.manage_condiciones'
    },
    {
      id: 'directos',
      label: 'Permisos Directos',
      icon: UserCheck,
      description: 'Asignacion directa a usuarios',
      permission: 'permisos.manage_directos'
    },
    {
      id: 'auditoria',
      label: 'Auditoria',
      icon: ClipboardList,
      description: 'Historial de cambios',
      permission: 'permisos.view_auditoria'
    }
  ];

  const visibleTabs = tabs.filter(t => !t.permission || hasPermission(t.permission));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'permisos': return <PermisosTab />;
      case 'modulos': return <ModulosTab />;
      case 'tipos': return <TiposPermisoTab />;
      case 'condiciones': return <CondicionesTab />;
      case 'directos': return <PermisosDirectosTab />;
      case 'auditoria': return <AuditoriaPermisosTab />;
      default: return <PermisosTab />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="backdrop-blur-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="flex items-center space-x-4">
          <div className="bg-white/20 backdrop-blur-xl p-4 rounded-2xl">
            <Key className="w-12 h-12 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Gestion de Permisos
            </h1>
            <p className="text-indigo-100 text-lg">
              Sistema completo de permisos, modulos, condiciones y auditoria
            </p>
          </div>
        </div>
      </div>

      {/* Tabs de navegacion */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-2 border border-gray-200/50">
        <div className="flex space-x-2 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
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
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default PermisosUnificadoPage;
