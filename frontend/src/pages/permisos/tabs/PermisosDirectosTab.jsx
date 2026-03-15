import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck, Plus, Trash2, Search, ArrowUpDown, Save, AlertCircle, Eye, XCircle
} from 'lucide-react';
import permisosService from '../../../services/permisosService';
import useServerPagination from '../../../hooks/useServerPagination';
import Pagination from '../../../components/Pagination';
import { usePermissions } from '../../../context/PermissionsContext';

const TIPO_CHOICES = [
  { value: 'grant', label: 'Conceder' },
  { value: 'deny', label: 'Denegar' },
];

const PermisosDirectosTab = () => {
  const { hasPermission, initialized } = usePermissions();
  const [permisos, setPermisos] = useState([]);
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [sortBy, setSortBy] = useState('usuario_email');
  const [sortDir, setSortDir] = useState('asc');
  const [detailDirecto, setDetailDirecto] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    usuario: '', permiso: '', tipo: 'grant', motivo: '',
    fecha_inicio: '', fecha_fin: '',
  });

  const fetchDirectos = useCallback((params) => {
    return permisosService.getAllPermisosDirectos(params);
  }, []);

  const {
    data: directos, loading, currentPage, totalPages, totalCount, pageSize,
    searchTerm, setSearchTerm, setCurrentPage, setFilters, refresh,
  } = useServerPagination(fetchDirectos, { pageSize: 20 });

  // Load permisos for dropdown separately
  useEffect(() => {
    const loadPermisos = async () => {
      try {
        const data = await permisosService.getAllPermisos({ activo: true, page_size: 2000 });
        setPermisos(Array.isArray(data) ? data : (data.results || []));
      } catch (err) {
        console.error('Error loading permisos:', err);
      }
    };
    loadPermisos();
  }, []);

  const applyFilters = (tipo, estado, sort, dir) => {
    const f = {};
    if (tipo !== 'all') f.tipo = tipo;
    if (estado === 'active') f.activo = true;
    if (estado === 'inactive') f.activo = false;
    f.ordering = dir === 'desc' ? `-${sort}` : sort;
    setFilters(f);
  };

  const handleFilterTipo = (val) => { setFilterTipo(val); applyFilters(val, filterEstado, sortBy, sortDir); };
  const handleFilterEstado = (val) => { setFilterEstado(val); applyFilters(filterTipo, val, sortBy, sortDir); };
  const handleSortBy = (val) => { setSortBy(val); applyFilters(filterTipo, filterEstado, val, sortDir); };
  const handleSortDir = () => { const nd = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(nd); applyFilters(filterTipo, filterEstado, sortBy, nd); };

  const handleCreate = () => {
    setFormData({ usuario: '', permiso: '', tipo: 'grant', motivo: '', fecha_inicio: '', fecha_fin: '' });
    setError(''); setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Revocar este permiso directo?')) return;
    try { await permisosService.deletePermisoDirecto(id); refresh(); } catch { alert('Error al revocar'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!formData.usuario || !formData.permiso) { setError('Usuario y permiso son requeridos'); return; }
    const payload = { ...formData };
    if (!payload.fecha_inicio) delete payload.fecha_inicio;
    if (!payload.fecha_fin) delete payload.fecha_fin;
    try {
      await permisosService.createPermisoDirecto(payload);
      setShowModal(false); refresh();
    } catch (err) { setError(JSON.stringify(err.response?.data) || 'Error al guardar'); }
  };

  if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('permisos.manage_directos')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para gestionar permisos directos</div>

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Buscar por usuario o permiso..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <UserCheck className="h-4 w-4" /><span>{totalCount} Permisos Directos</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={filterTipo} onChange={e => handleFilterTipo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todos los Tipos</option>
            {TIPO_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filterEstado} onChange={e => handleFilterEstado(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todos los Estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
          </select>
          <div className="flex gap-2">
            <select value={sortBy} onChange={e => handleSortBy(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="usuario_email">Por usuario</option><option value="permiso_nombre">Por permiso</option>
            </select>
            <button onClick={handleSortDir} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"><ArrowUpDown className="h-4 w-4 text-gray-500" /></button>
          </div>
          {hasPermission('permisos.manage_directos') && (
            <button onClick={handleCreate} className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 shadow-md">
              <Plus className="h-5 w-5" /><span>Asignar Permiso</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Cargando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Permiso</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Motivo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {directos.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><div className="font-medium text-gray-900">{d.usuario_info?.email || d.usuario_info?.full_name || `User #${d.usuario}`}</div></td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{d.permiso_info?.nombre || '-'}</div>
                      <code className="text-xs text-gray-500 font-mono">{d.permiso_info?.codigo || ''}</code>
                    </td>
                    <td className="px-6 py-4">
                      {d.tipo === 'grant' ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Conceder</span>
                        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Denegar</span>}
                    </td>
                    <td className="px-6 py-4">
                      {d.activo ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span>
                        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactivo</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{d.motivo || '-'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => setDetailDirecto(d)} className="text-gray-400 hover:text-cyan-600 p-1"><Eye className="h-4 w-4" /></button>
                      {hasPermission('permisos.manage_directos') && <button onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-red-600 p-1" title="Revocar"><Trash2 className="h-4 w-4" /></button>}
                    </td>
                  </tr>
                ))}
                {directos.length === 0 && <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No se encontraron permisos directos</td></tr>}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="permisos directos"
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailDirecto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-rose-100">Detalle de permiso directo</div><h2 className="text-2xl font-bold text-white">{detailDirecto.permiso_info?.nombre || 'Permiso Directo'}</h2></div>
                <button onClick={() => setDetailDirecto(null)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium">Cerrar</button>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div><div className="text-xs text-gray-500">Usuario</div><div className="text-sm font-medium">{detailDirecto.usuario_info?.email || detailDirecto.usuario_info?.full_name}</div></div>
              <div><div className="text-xs text-gray-500">Permiso</div><div className="text-sm">{detailDirecto.permiso_info?.nombre}</div></div>
              <div><div className="text-xs text-gray-500">Codigo</div><div className="font-mono text-sm">{detailDirecto.permiso_info?.codigo}</div></div>
              <div><div className="text-xs text-gray-500">Tipo</div>{detailDirecto.tipo === 'grant' ? <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Conceder</span> : <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Denegar</span>}</div>
              <div className="col-span-2"><div className="text-xs text-gray-500">Motivo</div><div className="text-sm text-gray-700">{detailDirecto.motivo || 'Sin motivo.'}</div></div>
              {detailDirecto.fecha_inicio && <div><div className="text-xs text-gray-500">Fecha Inicio</div><div className="text-sm">{new Date(detailDirecto.fecha_inicio).toLocaleString()}</div></div>}
              {detailDirecto.fecha_fin && <div><div className="text-xs text-gray-500">Fecha Fin</div><div className="text-sm">{new Date(detailDirecto.fecha_fin).toLocaleString()}</div></div>}
              <div className="col-span-2"><div className="text-xs text-gray-500">ID</div><div className="font-mono text-xs text-gray-500">{detailDirecto.id}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">Asignar Permiso Directo</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">ID de Usuario *</label>
                <input type="text" required value={formData.usuario} onChange={e => setFormData({ ...formData, usuario: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" placeholder="ID del usuario" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Permiso *</label>
                <select required value={formData.permiso} onChange={e => setFormData({ ...formData, permiso: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-rose-500">
                  <option value="">Seleccionar permiso...</option>
                  {permisos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>)}
                </select></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Tipo</label>
                <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-rose-500">
                  {TIPO_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Motivo</label>
                <textarea value={formData.motivo} onChange={e => setFormData({ ...formData, motivo: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" rows="2" placeholder="Razon de la asignacion..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Inicio</label>
                  <input type="datetime-local" value={formData.fecha_inicio} onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-rose-500" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Fin</label>
                  <input type="datetime-local" value={formData.fecha_fin} onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-rose-500" /></div>
              </div>
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 shadow-md font-medium flex items-center"><Save className="h-4 w-4 mr-2" />Asignar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermisosDirectosTab;
