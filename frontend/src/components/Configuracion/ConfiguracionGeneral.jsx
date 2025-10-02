import React, { useState, useEffect } from 'react';

const ConfiguracionGeneral = () => {
  const [configData, setConfigData] = useState({
    nombre_empresa: '',
    nit: '',
    direccion: '',
    telefono: '',
    email: '',
    sitio_web: '',
    logo: null,
    moneda_defecto: 'COP',
    zona_horaria: 'America/Bogota',
    idioma_defecto: 'es',
    formato_fecha: 'DD/MM/YYYY',
    formato_hora: 'HH:mm',
    decimales_moneda: 2,
    iva_defecto: 19,
    retencion_defecto: 0,
    backup_automatico: true,
    frecuencia_backup: 'daily',
    notificaciones_email: true,
    notificaciones_sistema: true,
    mantenimiento_activo: false,
    mensaje_mantenimiento: '',
    debug_mode: false,
    log_level: 'INFO'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const fetchConfiguracion = async () => {
    try {
      const response = await fetch('/api/configuracion/general/', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setConfigData(data);
      }
    } catch (error) {
      console.error('Error fetching configuracion:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const formData = new FormData();
      
      // Agregar todos los campos al FormData
      Object.keys(configData).forEach(key => {
        if (configData[key] !== null && configData[key] !== undefined) {
          if (key === 'logo' && configData[key] instanceof File) {
            formData.append(key, configData[key]);
          } else if (typeof configData[key] === 'boolean') {
            formData.append(key, configData[key] ? 'true' : 'false');
          } else {
            formData.append(key, configData[key]);
          }
        }
      });

      const response = await fetch('/api/configuracion/general/', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        setSuccessMessage('Configuración guardada exitosamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setErrors(errorData);
      }
    } catch (error) {
      console.error('Error saving configuracion:', error);
      setErrors({ general: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setConfigData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'file' ? files[0] : 
              type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleTestEmail = async () => {
    try {
      const response = await fetch('/api/configuracion/test-email/', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        setSuccessMessage('Email de prueba enviado correctamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ email: 'Error al enviar email de prueba' });
      }
    } catch (error) {
      setErrors({ email: 'Error al enviar email de prueba' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold">Configuración General</h1>
        <p className="mt-2 opacity-90">Configuración principal del sistema CorteSec</p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información de la Empresa */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Información de la Empresa</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  name="nombre_empresa"
                  value={configData.nombre_empresa}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {errors.nombre_empresa && (
                  <p className="mt-1 text-sm text-red-600">{errors.nombre_empresa}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NIT *
                </label>
                <input
                  type="text"
                  name="nit"
                  value={configData.nit}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {errors.nit && (
                  <p className="mt-1 text-sm text-red-600">{errors.nit}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección *
                </label>
                <textarea
                  name="direccion"
                  value={configData.direccion}
                  onChange={handleChange}
                  rows={3}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {errors.direccion && (
                  <p className="mt-1 text-sm text-red-600">{errors.direccion}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={configData.telefono}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {errors.telefono && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    (Probar)
                  </button>
                </label>
                <input
                  type="email"
                  name="email"
                  value={configData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sitio Web
                </label>
                <input
                  type="url"
                  name="sitio_web"
                  value={configData.sitio_web}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {errors.sitio_web && (
                  <p className="mt-1 text-sm text-red-600">{errors.sitio_web}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo de la Empresa
                </label>
                <input
                  type="file"
                  name="logo"
                  onChange={handleChange}
                  accept="image/*"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {errors.logo && (
                  <p className="mt-1 text-sm text-red-600">{errors.logo}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Configuración Regional */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Configuración Regional</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda por Defecto
                </label>
                <select
                  name="moneda_defecto"
                  value={configData.moneda_defecto}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="COP">Peso Colombiano (COP)</option>
                  <option value="USD">Dólar Americano (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zona Horaria
                </label>
                <select
                  name="zona_horaria"
                  value={configData.zona_horaria}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="America/Bogota">América/Bogotá</option>
                  <option value="America/New_York">América/Nueva York</option>
                  <option value="Europe/Madrid">Europa/Madrid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma por Defecto
                </label>
                <select
                  name="idioma_defecto"
                  value={configData.idioma_defecto}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato de Fecha
                </label>
                <select
                  name="formato_fecha"
                  value={configData.formato_fecha}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato de Hora
                </label>
                <select
                  name="formato_hora"
                  value={configData.formato_hora}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="HH:mm">24 horas (HH:mm)</option>
                  <option value="hh:mm A">12 horas (hh:mm AM/PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decimales en Moneda
                </label>
                <input
                  type="number"
                  name="decimales_moneda"
                  value={configData.decimales_moneda}
                  onChange={handleChange}
                  min="0"
                  max="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configuración Financiera */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Configuración Financiera</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IVA por Defecto (%)
                </label>
                <input
                  type="number"
                  name="iva_defecto"
                  value={configData.iva_defecto}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retención por Defecto (%)
                </label>
                <input
                  type="number"
                  name="retencion_defecto"
                  value={configData.retencion_defecto}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configuración del Sistema */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Configuración del Sistema</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="backup_automatico"
                  id="backup_automatico"
                  checked={configData.backup_automatico}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="backup_automatico" className="ml-2 block text-sm text-gray-900">
                  Backup Automático
                </label>
              </div>

              {configData.backup_automatico && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frecuencia de Backup
                  </label>
                  <select
                    name="frecuencia_backup"
                    value={configData.frecuencia_backup}
                    onChange={handleChange}
                    className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="hourly">Cada hora</option>
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="notificaciones_email"
                  id="notificaciones_email"
                  checked={configData.notificaciones_email}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="notificaciones_email" className="ml-2 block text-sm text-gray-900">
                  Notificaciones por Email
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="notificaciones_sistema"
                  id="notificaciones_sistema"
                  checked={configData.notificaciones_sistema}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="notificaciones_sistema" className="ml-2 block text-sm text-gray-900">
                  Notificaciones del Sistema
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="mantenimiento_activo"
                  id="mantenimiento_activo"
                  checked={configData.mantenimiento_activo}
                  onChange={handleChange}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="mantenimiento_activo" className="ml-2 block text-sm text-gray-900">
                  Modo Mantenimiento
                </label>
              </div>

              {configData.mantenimiento_activo && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje de Mantenimiento
                  </label>
                  <textarea
                    name="mensaje_mantenimiento"
                    value={configData.mensaje_mantenimiento}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="El sistema se encuentra en mantenimiento..."
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="debug_mode"
                  id="debug_mode"
                  checked={configData.debug_mode}
                  onChange={handleChange}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <label htmlFor="debug_mode" className="ml-2 block text-sm text-gray-900">
                  Modo Debug (Solo para desarrollo)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de Logs
                </label>
                <select
                  name="log_level"
                  value={configData.log_level}
                  onChange={handleChange}
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="DEBUG">DEBUG</option>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="ERROR">ERROR</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de Guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConfiguracionGeneral;
