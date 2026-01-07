import React, { useState, useEffect } from 'react'
import auditoriaService from '../../../services/auditoriaService'
import { AlertCircle, AlertTriangle, ShieldAlert, Clock, MapPin } from 'lucide-react'

const AnomaliasTab = () => {
  const [loading, setLoading] = useState(true)
  const [anomalias, setAnomalias] = useState([])
  const [accesosFallidos, setAccesosFallidos] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [anomaliasData, fallidosData] = await Promise.all([
        auditoriaService.detectarAnomalias(),
        auditoriaService.getAccesosFallidos()
      ])
      setAnomalias(anomaliasData)
      setAccesosFallidos(fallidosData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Anomalías Detectadas</p>
              <p className="text-4xl font-bold">{anomalias?.length || 0}</p>
            </div>
            <AlertCircle className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Accesos Fallidos</p>
              <p className="text-4xl font-bold">{accesosFallidos?.length || 0}</p>
            </div>
            <ShieldAlert className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Alertas Críticas</p>
              <p className="text-4xl font-bold">{anomalias?.filter(a => a.nivel === 'critico')?.length || 0}</p>
            </div>
            <AlertTriangle className="w-16 h-16 text-white/30" />
          </div>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3">
          <AlertCircle className="w-8 h-8 text-red-600" />
          <span>Anomalías Detectadas</span>
        </h2>
        <div className="space-y-4">
          {anomalias?.length > 0 ? (
            anomalias.map((anomalia, i) => (
              <div key={i} className="p-4 border-l-4 border-red-500 bg-red-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-lg">{anomalia.tipo}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        anomalia.nivel === 'critico' ? 'bg-red-600 text-white' :
                        anomalia.nivel === 'alto' ? 'bg-orange-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {anomalia.nivel?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{anomalia.descripcion}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(anomalia.timestamp).toLocaleString()}</span>
                      </div>
                      {anomalia.ip_address && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{anomalia.ip_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-12">No se detectaron anomalías</p>
          )}
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3">
          <ShieldAlert className="w-8 h-8 text-orange-600" />
          <span>Accesos Fallidos</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Usuario</th>
                <th className="px-6 py-3 text-left font-semibold">IP</th>
                <th className="px-6 py-3 text-left font-semibold">Fecha/Hora</th>
                <th className="px-6 py-3 text-left font-semibold">Intentos</th>
              </tr>
            </thead>
            <tbody>
              {accesosFallidos?.length > 0 ? (
                accesosFallidos.map((acceso, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 transition-colors`}>
                    <td className="px-6 py-4 font-medium">{acceso.usuario}</td>
                    <td className="px-6 py-4"><code className="px-2 py-1 bg-gray-100 rounded text-sm">{acceso.ip_address}</code></td>
                    <td className="px-6 py-4">{new Date(acceso.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                        {acceso.intentos}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">No hay accesos fallidos registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AnomaliasTab
