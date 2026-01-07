import React, { useState, useEffect } from 'react'
import auditoriaService from '../../../services/auditoriaService'
import { TrendingUp, PieChart, BarChart3, Activity, Calendar } from 'lucide-react'

const EstadisticasTab = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  useEffect(() => {
    loadData()
  }, [fechaInicio, fechaFin])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await auditoriaService.getEstadisticas(fechaInicio, fechaFin)
      setStats(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span>Estadísticas de Auditoría</span>
          </h2>
          <div className="flex space-x-4">
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="px-4 py-2 border-2 rounded-xl focus:border-green-500"
            />
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="px-4 py-2 border-2 rounded-xl focus:border-green-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Eventos</p>
                <p className="text-4xl font-bold">{stats?.total_eventos || 0}</p>
              </div>
              <Activity className="w-16 h-16 text-white/30" />
            </div>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Usuarios Activos</p>
                <p className="text-4xl font-bold">{stats?.usuarios_activos || 0}</p>
              </div>
              <PieChart className="w-16 h-16 text-white/30" />
            </div>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Módulos Usados</p>
                <p className="text-4xl font-bold">{stats?.modulos_activos || 0}</p>
              </div>
              <BarChart3 className="w-16 h-16 text-white/30" />
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <span>Acciones Más Frecuentes</span>
            </h3>
            <div className="space-y-3">
              {stats?.acciones_frecuentes?.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-medium">{item.accion}</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">{item.count}</span>
                </div>
              )) || <p className="text-gray-500">Sin datos</p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Actividad por Día</span>
            </h3>
            <div className="space-y-3">
              {stats?.actividad_diaria?.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-medium">{new Date(item.fecha).toLocaleDateString()}</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">{item.eventos}</span>
                </div>
              )) || <p className="text-gray-500">Sin datos</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstadisticasTab
