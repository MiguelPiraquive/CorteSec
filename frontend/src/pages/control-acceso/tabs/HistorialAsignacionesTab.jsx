import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Calendar, ArrowRight } from 'lucide-react';
import rolesService from '../../../services/rolesService';
import { usePermissions } from '../../../context/PermissionsContext';

const HistorialAsignacionesTab = () => {
    const { hasPermission, initialized } = usePermissions();
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            // Check if method exists, else mock or empty
            if (rolesService.getHistorialAsignaciones) {
                const data = await rolesService.getHistorialAsignaciones();
                setHistorial(Array.isArray(data) ? data : (data.results || []));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
    if (!hasPermission('roles.view_historial')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para ver historial de asignaciones</div>

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <History className="h-5 w-5 mr-2 text-indigo-500"/>
                    Historial de Asignaciones
                </h3>
            </div>
            
            {loading ? (
                 <div className="text-center py-8">Cargando historial...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {historial.length > 0 ? historial.map((h, i) => (
                                 <tr key={i}>
                                     <td className="px-6 py-4">{h.usuario_nombre}</td>
                                     <td className="px-6 py-4">{h.rol_nombre}</td>
                                     <td className="px-6 py-4">{h.estado}</td>
                                     <td className="px-6 py-4">{new Date(h.created_at).toLocaleDateString()}</td>
                                 </tr>
                             )) : (
                                 <tr>
                                     <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No hay historial disponible</td>
                                 </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default HistorialAsignacionesTab;
