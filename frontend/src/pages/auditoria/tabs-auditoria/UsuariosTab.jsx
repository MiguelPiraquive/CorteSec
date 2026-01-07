import React, { useState, useEffect } from 'react'
import auditoriaService from '../../../services/auditoriaService'
import { Users, User, Activity, Clock, Eye } from 'lucide-react'

const UsuariosTab = () => {
  const [loading, setLoading] = useState(true)
  const [actividadUsuarios, setActividadUsuarios] = useState([])
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [logsUsuario, setLogsUsuario] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const usuarios = await auditoriaService.getActividadPorUsuario()
      setActividadUsuarios(usuarios)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerDetalle = async (usuario) => {
    setUsuarioSeleccionado(usuario)
    try {
      const logs = await auditoriaService.getAllLogs({ usuario: usuario.usuario_id })
      setLogsUsuario(Array.isArray(logs.results) ? logs.results : logs)
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-sm">Usuarios Activos</p>
              <p className="text-4xl font-bold">{actividadUsuarios.length}</p>
            </div>
            <Users className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Acciones</p>
              <p className="text-4xl font-bold">
                {actividadUsuarios.reduce((sum, u) => sum + (u.total_acciones || 0), 0)}
              </p>
            </div>
            <Activity className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Promedio</p>
              <p className="text-4xl font-bold">
                {actividadUsuarios.length > 0 
                  ? Math.round(actividadUsuarios.reduce((sum, u) => sum + (u.total_acciones || 0), 0) / actividadUsuarios.length)
                  : 0
                }
              </p>
            </div>
            <Clock className="w-16 h-16 text-white/30" />
          </div>
        </div>
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Usuario Top</p>
              <p className="text-2xl font-bold truncate">
                {actividadUsuarios[0]?.usuario || 'N/A'}
              </p>
            </div>
            <User className="w-16 h-16 text-white/30" />
          </div>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3">
          <Users className="w-8 h-8 text-cyan-600" />
          <span>Actividad por Usuario</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actividadUsuarios.map((usuario, i) => (
            <div
              key={i}
              className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border-2 border-cyan-200 hover:border-cyan-400 transition-all cursor-pointer"
              onClick={() => handleVerDetalle(usuario)}
            >
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {usuario.usuario?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg">{usuario.usuario}</div>
                  <div className="text-sm text-gray-600">{usuario.total_acciones} acciones</div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((usuario.total_acciones / Math.max(...actividadUsuarios.map(u => u.total_acciones))) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {usuarioSeleccionado && (
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
          <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Eye className="w-6 h-6 text-blue-600" />
            <span>Detalle de {usuarioSeleccionado.usuario}</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Fecha/Hora</th>
                  <th className="px-4 py-3 text-left font-semibold">Acción</th>
                  <th className="px-4 py-3 text-left font-semibold">Módulo</th>
                  <th className="px-4 py-3 text-left font-semibold">IP</th>
                </tr>
              </thead>
              <tbody>
                {logsUsuario.length > 0 ? (
                  logsUsuario.slice(0, 10).map((log, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-3 text-sm">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{log.accion}</span></td>
                      <td className="px-4 py-3 text-sm">{log.modelo}</td>
                      <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-2 py-1 rounded">{log.ip_address || 'N/A'}</code></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-500">Sin logs recientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsuariosTab
