import React, { useState, useEffect } from 'react'
import auditoriaService from '../../../services/auditoriaService'
import { Activity, Users, Database, Clock } from 'lucide-react'

const ActividadTab = () => {
  const [loading, setLoading] = useState(true)
  const [actividadUsuarios, setActividadUsuarios] = useState([])
  const [actividadModulos, setActividadModulos] = useState([])
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  useEffect(() => {
    loadData()
  }, [fechaInicio, fechaFin])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usuarios, modulos] = await Promise.all([
        auditoriaService.getActividadPorUsuario(fechaInicio, fechaFin),
        auditoriaService.getActividadPorModulo(fechaInicio, fechaFin)
      ])
      setActividadUsuarios(usuarios)
      setActividadModulos(modulos)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 mb-6">
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          className="px-4 py-2 border-2 rounded-xl focus:border-purple-500"
        />
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          className="px-4 py-2 border-2 rounded-xl focus:border-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Users className="w-6 h-6 text-purple-600" />
            <span>Actividad por Usuario</span>
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {actividadUsuarios.length > 0 ? (
              actividadUsuarios.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {item.usuario?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{item.usuario}</div>
                      <div className="text-xs text-gray-500">{item.total_acciones} acciones</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-bold">
                    {item.total_acciones}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">Sin actividad registrada</p>
            )}
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Database className="w-6 h-6 text-blue-600" />
            <span>Actividad por Módulo</span>
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {actividadModulos.length > 0 ? (
              actividadModulos.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all">
                  <div className="flex items-center space-x-3">
                    <Database className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="font-semibold">{item.modelo}</div>
                      <div className="text-xs text-gray-500">{item.total_eventos} eventos</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">
                    {item.total_eventos}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">Sin actividad registrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActividadTab
