import React, { useState, useCallback } from 'react';
import { ClipboardList, Search, ArrowUpDown, Eye, RefreshCw } from 'lucide-react';
import permisosService from '../../../services/permisosService';
import useServerPagination from '../../../hooks/useServerPagination';
import Pagination from '../../../components/Pagination';
import { usePermissions } from '../../../context/PermissionsContext';

const ACCION_COLORS = {
  grant: 'bg-green-100 text-green-800',
  deny: 'bg-red-100 text-red-800',
  revoke: 'bg-amber-100 text-amber-800',
  create: 'bg-blue-100 text-blue-800',
  update: 'bg-indigo-100 text-indigo-800',
  delete: 'bg-rose-100 text-rose-800',
  login: 'bg-teal-100 text-teal-800',
  verificar: 'bg-purple-100 text-purple-800',
};

const ACCIONES_LIST = ['grant', 'deny', 'revoke', 'create', 'update', 'delete', 'login', 'verificar'];

const AuditoriaPermisosTab = () => {
  const { hasPermission, initialized } = usePermissions();
  const [filterAccion, setFilterAccion] = useState('all');
  const [sortDir, setSortDir] = useState('desc');
  const [detailRegistro, setDetailRegistro] = useState(null);

  const fetchAuditoria = useCallback((params) => {
    return permisosService.getAuditoria(params);
  }, []);

  const {
    data: registros,
    loading,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    searchTerm,
    setSearchTerm,
    setCurrentPage,
    setFilters,
    refresh,
  } = useServerPagination(fetchAuditoria, {
    pageSize: 20,
    initialFilters: { ordering: '-fecha' },
  });

  const applyFilters = (newAccion, newSortDir) => {
    const f = {};
    f.ordering = newSortDir === 'desc' ? '-fecha' : 'fecha';
    if (newAccion !== 'all') f.accion = newAccion;
    setFilters(f);
  };

  const handleFilterAccion = (val) => {
    setFilterAccion(val);
    applyFilters(val, sortDir);
  };

  const handleSortDir = () => {
    const newDir = sortDir === 'asc' ? 'desc' : 'asc';
    setSortDir(newDir);
    applyFilters(filterAccion, newDir);
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('permisos.view_auditoria')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para ver auditoría de permisos</div>

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Buscar en auditoria..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ClipboardList className="h-4 w-4" /><span>{totalCount} Registros</span>
            <button onClick={refresh} className="ml-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50" title="Recargar"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={filterAccion} onChange={e => handleFilterAccion(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todas las Acciones</option>
            {ACCIONES_LIST.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={handleSortDir} className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />{sortDir === 'desc' ? 'Mas recientes primero' : 'Mas antiguos primero'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Cargando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Accion</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Permiso</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Detalles</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Detalle</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {registros.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(r.fecha || r.created_at)}</td>
                    <td className="px-6 py-4"><div className="font-medium text-gray-900 text-sm">{r.usuario_info?.email || r.usuario_email || r.usuario_nombre || `User #${r.usuario}`}</div></td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACCION_COLORS[r.accion] || 'bg-gray-100 text-gray-700'}`}>{r.accion}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.permiso_info?.nombre || r.permiso_info?.codigo || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[250px] truncate">{typeof r.detalles === 'string' ? r.detalles : r.detalles ? JSON.stringify(r.detalles) : '-'}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => setDetailRegistro(r)} className="text-gray-400 hover:text-cyan-600 p-1"><Eye className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {registros.length === 0 && <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No se encontraron registros de auditoria</td></tr>}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="registros"
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailRegistro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl">
            <div className="bg-gradient-to-r from-slate-600 to-gray-700 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-slate-200">Registro de auditoria</div><h2 className="text-2xl font-bold text-white">{detailRegistro.accion}</h2></div>
                <button onClick={() => setDetailRegistro(null)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium">Cerrar</button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-xs text-gray-500">Fecha</div><div className="text-sm">{formatDate(detailRegistro.fecha)}</div></div>
                <div><div className="text-xs text-gray-500">Usuario</div><div className="text-sm font-medium">{detailRegistro.usuario_info?.email || detailRegistro.usuario_info?.full_name || `User #${detailRegistro.usuario}`}</div></div>
                <div><div className="text-xs text-gray-500">Accion</div><div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${ACCION_COLORS[detailRegistro.accion] || 'bg-gray-100 text-gray-700'}`}>{detailRegistro.accion}</div></div>
                <div><div className="text-xs text-gray-500">Permiso</div><div className="text-sm">{detailRegistro.permiso_info?.nombre || detailRegistro.permiso_info?.codigo || '-'}</div></div>
              </div>
              {detailRegistro.detalles && (
                <div><div className="text-xs text-gray-500">Detalles</div>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono overflow-auto max-h-40">{typeof detailRegistro.detalles === 'string' ? detailRegistro.detalles : JSON.stringify(detailRegistro.detalles, null, 2)}</pre>
                </div>
              )}
              <div><div className="text-xs text-gray-500">ID</div><div className="font-mono text-xs text-gray-500">{detailRegistro.id}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriaPermisosTab;
