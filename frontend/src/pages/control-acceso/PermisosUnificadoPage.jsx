/**
 * Página Unificada de Gestión de Permisos
 * Incluye 5 tabs: Módulos, Tipos de Permiso, Condiciones, Permisos, Permisos Directos
 */

import React, { useState } from 'react'
import { Shield, Layers, Filter, Key, UserCheck } from 'lucide-react'
import useAudit from '../../hooks/useAudit'

// Importar los componentes individuales
import ModulosTab from './tabs-permisos/ModulosTab'
import TiposPermisoTab from './tabs-permisos/TiposPermisoTab'
import CondicionesTab from './tabs-permisos/CondicionesTab'
import PermisosTab from './tabs-permisos/PermisosTab'
import PermisosDirectosTab from './tabs-permisos/PermisosDirectosTab'

const PermisosUnificadoPage = () => {
  const audit = useAudit('Permisos')
  const [activeTab, setActiveTab] = useState('modulos')

  const tabs = [
    { 
      id: 'modulos', 
      label: 'Módulos del Sistema', 
      icon: Layers,
      color: 'from-blue-500 to-blue-600'
    },
    { 
      id: 'tipos', 
      label: 'Tipos de Permiso', 
      icon: Filter,
      color: 'from-purple-500 to-purple-600'
    },
    { 
      id: 'condiciones', 
      label: 'Condiciones', 
      icon: Shield,
      color: 'from-green-500 to-green-600'
    },
    { 
      id: 'permisos', 
      label: 'Permisos', 
      icon: Key,
      color: 'from-orange-500 to-orange-600'
    },
    { 
      id: 'directos', 
      label: 'Permisos Directos', 
      icon: UserCheck,
      color: 'from-red-500 to-red-600'
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'modulos':
        return <ModulosTab />
      case 'tipos':
        return <TiposPermisoTab />
      case 'condiciones':
        return <CondicionesTab />
      case 'permisos':
        return <PermisosTab />
      case 'directos':
        return <PermisosDirectosTab />
      default:
        return <ModulosTab />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="backdrop-blur-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="flex items-center space-x-4">
          <div className="bg-white/20 backdrop-blur-xl p-4 rounded-2xl">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Sistema de Permisos
            </h1>
            <p className="text-blue-100 text-lg">
              Gestión completa de permisos, módulos y condiciones de acceso
            </p>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-2 border border-gray-200/50">
        <div className="flex space-x-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  audit.tab(tab.id)
                }}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg transform scale-105`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  )
}

export default PermisosUnificadoPage
