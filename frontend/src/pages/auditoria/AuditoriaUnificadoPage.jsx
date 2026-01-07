import React, { useState } from 'react'
import useAudit from '../../hooks/useAudit'
import {
  Shield,
  Activity,
  TrendingUp,
  AlertCircle,
  Users,
  FileText,
} from 'lucide-react'
import LogsTab from './tabs-auditoria/LogsTab'
import EstadisticasTab from './tabs-auditoria/EstadisticasTab'
import ActividadTab from './tabs-auditoria/ActividadTab'
import AnomaliasTab from './tabs-auditoria/AnomaliasTab'
import UsuariosTab from './tabs-auditoria/UsuariosTab'
import ReportesTab from './tabs-auditoria/ReportesTab'

const AuditoriaUnificadoPage = () => {
  const audit = useAudit('Auditoria')
  const [tabActivo, setTabActivo] = useState('logs')

  const tabs = [
    {
      id: 'logs',
      nombre: 'Logs de Auditoría',
      icono: FileText,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'estadisticas',
      nombre: 'Estadísticas',
      icono: TrendingUp,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'actividad',
      nombre: 'Actividad',
      icono: Activity,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'anomalias',
      nombre: 'Anomalías',
      icono: AlertCircle,
      color: 'from-red-500 to-red-600'
    },
    {
      id: 'usuarios',
      nombre: 'Por Usuario',
      icono: Users,
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      id: 'reportes',
      nombre: 'Reportes',
      icono: Shield,
      color: 'from-orange-500 to-orange-600'
    }
  ]

  const renderTabContent = () => {
    switch (tabActivo) {
      case 'logs':
        return <LogsTab />
      case 'estadisticas':
        return <EstadisticasTab />
      case 'actividad':
        return <ActividadTab />
      case 'anomalias':
        return <AnomaliasTab />
      case 'usuarios':
        return <UsuariosTab />
      case 'reportes':
        return <ReportesTab />
      default:
        return <LogsTab />
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl shadow-2xl p-8 text-white">
        <div className="flex items-center space-x-4">
          <div className="bg-white/20 backdrop-blur-xl p-4 rounded-2xl">
            <Shield className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Sistema de Auditoría</h1>
            <p className="text-blue-100 mt-2 text-lg">
              Monitoreo completo de actividades, análisis de seguridad y detección de anomalías
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-2 border border-gray-200/50">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icono
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setTabActivo(tab.id)
                  audit.tab(tab.id)
                }}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  tabActivo === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.nombre}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default AuditoriaUnificadoPage
