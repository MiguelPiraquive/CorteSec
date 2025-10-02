import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importLocationsExcel } from '../../services/locationsService';
import { debugAuthState } from '../../services/api';
import '../../components/css/DepartamentosStyles.css';

const ImportarExcel = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error'|'warning'|'info', text }

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    const sizeMb = f.size / 1024 / 1024;
    if (sizeMb > 5) {
      setMessage({ type: 'error', text: `El archivo es demasiado grande (${sizeMb.toFixed(2)}MB). Máximo 5MB.` });
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'warning', text: 'Selecciona un archivo Excel (.xlsx o .xls).' });
      return;
    }
    
    // DEBUG: Verificar estado de autenticación antes de enviar
    console.log('🔍 Debugging auth state before upload...');
    debugAuthState();
    
    setLoading(true);
    setMessage({ type: 'info', text: 'Procesando archivo, por favor espera...' });
    try {
      const res = await importLocationsExcel(file);
      setMessage({ type: 'success', text: 'Importación completada exitosamente.' });
      // Optional: show details if backend returns counts
      if (res && (res.created || res.updated || res.skipped)) {
        setMessage({ type: 'success', text: `Importado: ${res.created || 0} creados, ${res.updated || 0} actualizados, ${res.skipped || 0} omitidos.` });
      }
    } catch (err) {
      console.error('❌ Upload error:', err);
      setMessage({ type: 'error', text: err.message || 'Error al importar el archivo.' });
    } finally {
      setLoading(false);
    }
  };

  const msgClass = (t) => {
    switch (t) {
      case 'error': return 'alert alert--error';
      case 'success': return 'alert alert--success';
      case 'warning': return 'alert';
      default: return 'alert';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mr-4">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M19.5 6h-15A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h15a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0019.5 6zM6 8h12v2H6V8z"/></svg>
          </div>
          <div>
            <div className="text-sm opacity-90 mb-1">Ubicaciones</div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Importar desde Excel</h1>
            <p className="text-white/80 mt-1">Carga departamentos y municipios masivamente desde un archivo Excel</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 text-emerald-600 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3l4 4H8l4-4zM4 9h16v11H4z"/></svg>
                Seleccionar Archivo Excel
              </h2>

              {message && (
                <div className={`${msgClass(message.type)} mb-4`}>{message.text}</div>
              )}

              <form onSubmit={onSubmit} className="space-y-6" id="excel-import-form">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Archivo Excel (.xlsx, .xls)</label>
                  <input type="file" accept=".xlsx,.xls" onChange={onFileChange} required className="block w-full text-sm text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 dark:focus:border-emerald-400 transition-all duration-200 file:mr-4 file:py-3 file:px-6 file:rounded-l-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-900/50 file:text-emerald-700 dark:file:text-emerald-200 hover:file:bg-emerald-100 dark:hover:file:bg-emerald-900/70 file:transition-all file:duration-200 file:cursor-pointer file:shadow-sm hover:file:shadow-md" />
                </div>

                {loading && (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center">
                      <div className="relative mr-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 dark:border-blue-700"></div>
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 dark:border-blue-400 border-t-transparent absolute top-0 left-0"></div>
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-900 dark:text-blue-100">Procesando archivo...</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-200">Por favor espera mientras importamos los datos.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
                  <button type="button" onClick={() => navigate('/locations/departamentos')} className="departamento-actions departamento-actions--light">Cancelar</button>
                  <button type="submit" className="departamento-actions" disabled={loading}>{loading ? 'Procesando...' : 'Importar Datos'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Panel de información */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM7 11h10v2H7v-2z"/></svg>
                Formato Requerido
              </h3>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">Columnas obligatorias:</div>
                  <ul className="space-y-1">
                    <li><code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs">codigo_departamento</code></li>
                    <li><code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs">nombre_departamento</code></li>
                    <li><code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs">codigo_municipio</code></li>
                    <li><code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs">nombre_municipio</code></li>
                  </ul>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <div className="text-yellow-800 dark:text-yellow-200 font-medium">Importante</div>
                  <p className="mt-1">Los nombres de las columnas deben coincidir exactamente.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ejemplo */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                <svg className="w-5 h-5 text-emerald-600 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M3 6h18v2H3zM3 10h18v2H3zM3 14h18v2H3z"/></svg>
                Ejemplo de Datos
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Depto.</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mpio.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    <tr>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100"><div className="text-xs">05 - Antioquia</div></td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100"><div className="text-xs">001 - Medellín</div></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100"><div className="text-xs">11 - Bogotá D.C.</div></td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100"><div className="text-xs">001 - Bogotá</div></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100"><div className="text-xs">76 - Valle</div></td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100"><div className="text-xs">001 - Cali</div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportarExcel;
