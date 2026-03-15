import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, Calendar, User, Shield } from 'lucide-react';
import rolesService from '../../../services/rolesService';
import { usePermissions } from '../../../context/PermissionsContext';

const AuditoriaRolesTab = () => {
  const { hasPermission, initialized } = usePermissions();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadAuditoria();
  }, []);

  const loadAuditoria = async () => {
    setLoading(true);
    try {
      const data = await rolesService.getAuditoriaRoles({ page_size: 100 });
      setLogs(Array.isArray(data) ? data : (data.results || []));
    } catch (e) {
      console.error('Error loading audit logs:', e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.accion?.toLowerCase().includes(filter.toLowerCase()) ||
    log.usuario_ejecutor_detalle?.email?.toLowerCase().includes(filter.toLowerCase()) ||
    log.rol_detalle?.nombre?.toLowerCase().includes(filter.toLowerCase()) ||
    log.justificacion?.toLowerCase().includes(filter.toLowerCase())
  );

  if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('roles.view_auditoria')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para ver auditoría de roles</div>

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center">
          <ClipboardList className="h-6 w-6 mr-3 text-indigo-500" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">Auditoría de Roles</h3>
            <p className="text-sm text-gray-500">Registro de cambios en roles y permisos</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar en auditoría..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Cargando auditoría...</span>
          </div>
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Acción</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {log.usuario_ejecutor_detalle?.email || log.usuario_ejecutor_detalle?.username || 'Sistema'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        <Shield className="h-3 w-3 mr-1" />
                        {log.accion || 'Cambio'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.rol_detalle?.nombre || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.justificacion || 'Sin justificación'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <ClipboardList className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay registros de auditoría
          </h3>
          <p className="text-gray-500 mb-6">
            Los cambios en roles y permisos aparecerán aquí
          </p>
        </div>
      )}
    </div>
  );
};

export default AuditoriaRolesTab;
