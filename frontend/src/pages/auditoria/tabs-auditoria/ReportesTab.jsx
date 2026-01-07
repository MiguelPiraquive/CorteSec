import React, { useState } from 'react'
import auditoriaService from '../../../services/auditoriaService'
import { Shield, Download, FileText, Calendar, Filter, CheckCircle, AlertCircle } from 'lucide-react'

const ReportesTab = () => {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('todos')
  const [filtroModelo, setFiltroModelo] = useState('todos')
  const [generando, setGenerando] = useState(false)
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const handleExportarCSV = async () => {
    setGenerando(true)
    try {
      const params = {}
      if (fechaInicio) params.fecha_inicio = fechaInicio
      if (fechaFin) params.fecha_fin = fechaFin
      if (filtroAccion !== 'todos') params.accion = filtroAccion
      if (filtroModelo !== 'todos') params.modelo = filtroModelo

      await auditoriaService.exportarCSV(params)
      showNotification('success', 'Reporte CSV generado exitosamente')
    } catch (error) {
      showNotification('error', 'Error al generar reporte CSV')
      console.error(error)
    } finally {
      setGenerando(false)
    }
  }

  const handleExportarExcel = async () => {
    setGenerando(true)
    try {
      const params = {}
      if (fechaInicio) params.fecha_inicio = fechaInicio
      if (fechaFin) params.fecha_fin = fechaFin
      if (filtroAccion !== 'todos') params.accion = filtroAccion
      if (filtroModelo !== 'todos') params.modelo = filtroModelo

      await auditoriaService.exportarExcel(params)
      showNotification('success', 'Reporte Excel generado exitosamente')
    } catch (error) {
      showNotification('error', 'Error al generar reporte Excel')
      console.error(error)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-6">
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border ${notification.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="backdrop-blur-xl bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center space-x-4">
          <Shield className="w-12 h-12" />
          <div>
            <h2 className="text-3xl font-bold">Generación de Reportes</h2>
            <p className="text-orange-100 mt-1">Exporta logs de auditoría en diferentes formatos</p>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <h3 className="text-xl font-bold mb-6 flex items-center space-x-2">
          <Filter className="w-6 h-6 text-orange-600" />
          <span>Filtros de Reporte</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Acción</label>
            <select
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none"
            >
              <option value="todos">Todas</option>
              <option value="crear">Crear</option>
              <option value="modificar">Modificar</option>
              <option value="eliminar">Eliminar</option>
              <option value="login">Login</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Módulo</label>
            <select
              value={filtroModelo}
              onChange={(e) => setFiltroModelo(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-orange-500 focus:outline-none"
            >
              <option value="todos">Todos</option>
              <option value="Rol">Roles</option>
              <option value="Permiso">Permisos</option>
              <option value="Usuario">Usuarios</option>
              <option value="Prestamo">Préstamos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-8 border border-gray-200/50 hover:border-orange-500 transition-all">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold">Exportar a CSV</h3>
            <p className="text-center text-gray-600">
              Genera un archivo CSV con los logs de auditoría filtrados
            </p>
            <button
              onClick={handleExportarCSV}
              disabled={generando}
              className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              <span>{generando ? 'Generando...' : 'Descargar CSV'}</span>
            </button>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Compatible con Excel y Google Sheets</span>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-8 border border-gray-200/50 hover:border-orange-500 transition-all">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold">Exportar a Excel</h3>
            <p className="text-center text-gray-600">
              Genera un archivo Excel (.xlsx) con formato profesional
            </p>
            <button
              onClick={handleExportarExcel}
              disabled={generando}
              className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              <span>{generando ? 'Generando...' : 'Descargar Excel'}</span>
            </button>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Formato con tablas y gráficos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-lg p-6 border-2 border-orange-200">
        <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
          <Shield className="w-6 h-6 text-orange-600" />
          <span>Información de Reportes</span>
        </h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-orange-600 font-bold">•</span>
            <span>Los reportes incluyen todos los campos de auditoría: usuario, acción, módulo, IP, timestamps</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-orange-600 font-bold">•</span>
            <span>Los filtros aplicados se reflejan en el nombre del archivo exportado</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-orange-600 font-bold">•</span>
            <span>El formato Excel incluye hojas separadas para diferentes tipos de eventos</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-orange-600 font-bold">•</span>
            <span>Los reportes se generan en tiempo real con los datos más actualizados</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default ReportesTab
