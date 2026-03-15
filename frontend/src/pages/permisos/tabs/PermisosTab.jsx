import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Plus, Edit2, Trash2, Search, CheckCircle, XCircle,
  List, LayoutGrid, Download, ArrowUpDown, Save, X, AlertCircle, Eye
} from 'lucide-react';
import permisosService from '../../../services/permisosService';
import useServerPagination from '../../../hooks/useServerPagination';
import Pagination from '../../../components/Pagination';
import { usePermissions } from '../../../context/PermissionsContext';

const PermisosTab = () => {
  const { hasPermission, initialized } = usePermissions();
  const [modulos, setModulos] = useState([]);
  const [tiposPermiso, setTiposPermiso] = useState([]);
  const [filterModulo, setFilterModulo] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterAmbito, setFilterAmbito] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [displayMode, setDisplayMode] = useState('tabla');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailPermiso, setDetailPermiso] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPermiso, setEditingPermiso] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    modulo: '',
    tipo_permiso: '',
    ambito: 'modulo',
    es_heredable: true,
    es_revocable: true,
    prioridad: 0,
    vigencia_inicio: '',
    vigencia_fin: '',
    activo: true,
  });

  // Server-side pagination
  const fetchPermisos = useCallback((params) => {
    return permisosService.getAllPermisos(params);
  }, []);

  const {
    data: permisos, loading, currentPage, totalPages, totalCount, pageSize,
    searchTerm, setSearchTerm, setCurrentPage, setFilters, refresh,
  } = useServerPagination(fetchPermisos, { pageSize: 20 });

  // Load dropdown data separately
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [modulosData, tiposData] = await Promise.all([
          permisosService.getAllModulos({ page_size: 1000 }),
          permisosService.getAllTiposPermiso({ page_size: 1000 }),
        ]);
        setModulos(Array.isArray(modulosData) ? modulosData : (modulosData.results || []));
        setTiposPermiso(Array.isArray(tiposData) ? tiposData : (tiposData.results || []));
      } catch (err) {
        console.error('Error loading dropdowns:', err);
      }
    };
    loadDropdowns();
  }, []);

  const applyFilters = (mod, estado, ambito, sort, dir) => {
    const f = {};
    if (mod !== 'all') f.modulo = mod;
    if (estado === 'active') f.activo = true;
    if (estado === 'inactive') f.activo = false;
    if (ambito !== 'all') f.ambito = ambito;
    f.ordering = dir === 'desc' ? `-${sort}` : sort;
    setFilters(f);
  };

  const handleFilterModulo = (val) => { setFilterModulo(val); applyFilters(val, filterEstado, filterAmbito, sortBy, sortDir); };
  const handleFilterEstado = (val) => { setFilterEstado(val); applyFilters(filterModulo, val, filterAmbito, sortBy, sortDir); };
  const handleFilterAmbito = (val) => { setFilterAmbito(val); applyFilters(filterModulo, filterEstado, val, sortBy, sortDir); };
  const handleSortBy = (val) => { setSortBy(val); applyFilters(filterModulo, filterEstado, filterAmbito, val, sortDir); };
  const handleSortDir = () => { const nd = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(nd); applyFilters(filterModulo, filterEstado, filterAmbito, sortBy, nd); };

  const handleCreate = () => {
    setEditingPermiso(null);
    setFormData({
      nombre: '', codigo: '', descripcion: '', modulo: '', tipo_permiso: '',
      ambito: 'modulo', es_heredable: true, es_revocable: true, prioridad: 0,
      vigencia_inicio: '', vigencia_fin: '', activo: true,
    });
    setError('');
    setShowModal(true);
  };

  const handleEdit = async (permiso) => {
    setEditingPermiso(permiso);
    try {
      const full = await permisosService.getPermiso(permiso.id);
      setFormData({
        nombre: full.nombre || '',
        codigo: full.codigo || '',
        descripcion: full.descripcion || '',
        modulo: full.modulo || '',
        tipo_permiso: full.tipo_permiso || '',
        ambito: full.ambito || 'modulo',
        es_heredable: full.es_heredable ?? true,
        es_revocable: full.es_revocable ?? true,
        prioridad: full.prioridad || 0,
        vigencia_inicio: full.vigencia_inicio ? full.vigencia_inicio.slice(0, 16) : '',
        vigencia_fin: full.vigencia_fin ? full.vigencia_fin.slice(0, 16) : '',
        activo: full.activo ?? true,
      });
    } catch (err) {
      setFormData({
        nombre: permiso.nombre || '', codigo: permiso.codigo || '',
        descripcion: '', modulo: '', tipo_permiso: '', ambito: 'modulo',
        es_heredable: true, es_revocable: true, prioridad: 0,
        vigencia_inicio: '', vigencia_fin: '', activo: permiso.activo ?? true,
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este permiso?')) return;
    try {
      await permisosService.deletePermiso(id);
      refresh();
    } catch (err) {
      alert('Error al eliminar el permiso');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.nombre || !formData.codigo) {
      setError('Nombre y código son requeridos');
      return;
    }
    const payload = { ...formData };
    if (!payload.vigencia_inicio) delete payload.vigencia_inicio;
    if (!payload.vigencia_fin) delete payload.vigencia_fin;
    if (!payload.modulo) delete payload.modulo;
    if (!payload.tipo_permiso) delete payload.tipo_permiso;

    try {
      if (editingPermiso) {
        await permisosService.updatePermiso(editingPermiso.id, payload);
      } else {
        await permisosService.createPermiso(payload);
      }
      setShowModal(false);
      refresh();
    } catch (err) {
      const msg = err.response?.data;
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Error al guardar');
    }
  };

  const allSelected = permisos.length > 0 && permisos.every(p => selectedIds.has(p.id));
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelectedIds(prev => { const n = new Set(prev); allSelected ? permisos.forEach(p => n.delete(p.id)) : permisos.forEach(p => n.add(p.id)); return n; });

  const handleExportCsv = () => {
    const headers = ['Nombre', 'Codigo', 'Modulo', 'Tipo', 'Ambito', 'Activo'];
    const rows = permisos.map(p => [p.nombre, p.codigo, p.modulo_nombre || '', p.tipo_nombre || '', p.ambito || '', p.activo ? 'Si' : 'No']);
    const esc = v => { const s = String(v ?? ''); return s.includes('"') || s.includes(',') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `permisos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const ambitoLabels = { global: 'Global', modulo: 'Modulo', Organizacion: 'Organizacion', recurso: 'Recurso', usuario: 'Usuario' };

  if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('permisos.view')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para ver permisos</div>

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Actions Bar */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Buscar permisos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <Key className="h-4 w-4" />
            <span>{totalCount} Permisos</span>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => setDisplayMode('cards')} className={`px-2.5 py-1.5 border rounded-lg text-xs ${displayMode === 'cards' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'border-gray-200 text-gray-600'}`}><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setDisplayMode('tabla')} className={`px-2.5 py-1.5 border rounded-lg text-xs ${displayMode === 'tabla' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'border-gray-200 text-gray-600'}`}><List className="h-4 w-4" /></button>
              {hasPermission('permisos.view') && <button onClick={handleExportCsv} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50" title="Exportar CSV"><Download className="h-4 w-4" /></button>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={filterModulo} onChange={e => handleFilterModulo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todos los Modulos</option>
            {modulos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <select value={filterEstado} onChange={e => handleFilterEstado(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todos los Estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <select value={filterAmbito} onChange={e => handleFilterAmbito(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todos los Ambitos</option>
            {Object.entries(ambitoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex gap-2">
            <select value={sortBy} onChange={e => handleSortBy(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="nombre">Ordenar por nombre</option>
              <option value="codigo">Ordenar por codigo</option>
            </select>
            <button onClick={handleSortDir} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"><ArrowUpDown className="h-4 w-4 text-gray-500" /></button>
          </div>
          {hasPermission('permisos.add') && (
            <button onClick={handleCreate} className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-md">
              <Plus className="h-5 w-5" /><span>Nuevo Permiso</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : displayMode === 'tabla' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" /></th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Permiso</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Codigo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Modulo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Ambito</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {permisos.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="h-4 w-4 rounded border-gray-300 text-cyan-600" /></td>
                    <td className="px-6 py-4"><div className="font-medium text-gray-900">{p.nombre}</div></td>
                    <td className="px-6 py-4"><code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 font-mono">{p.codigo}</code></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.modulo_nombre || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.tipo_nombre || '-'}</td>
                    <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700">{ambitoLabels[p.ambito] || p.ambito}</span></td>
                    <td className="px-6 py-4">
                      {p.activo ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span>
                        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactivo</span>}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => setDetailPermiso(p)} className="text-gray-400 hover:text-cyan-600 p-1" title="Detalle"><Eye className="h-4 w-4" /></button>
                      {hasPermission('permisos.change') && <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-indigo-600 p-1" title="Editar"><Edit2 className="h-4 w-4" /></button>}
                      {hasPermission('permisos.delete') && <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600 p-1" title="Eliminar"><Trash2 className="h-4 w-4" /></button>}
                    </td>
                  </tr>
                ))}
                {permisos.length === 0 && <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No se encontraron permisos</td></tr>}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="permisos"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {permisos.map(p => (
                <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div><div className="font-semibold text-gray-900">{p.nombre}</div><code className="text-xs text-gray-500 font-mono">{p.codigo}</code></div>
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="h-4 w-4 rounded border-gray-300 text-cyan-600" />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{p.modulo_nombre || 'Sin modulo'}</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{ambitoLabels[p.ambito] || p.ambito}</span>
                    {p.activo ? <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Activo</span> : <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Inactivo</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                    <button onClick={() => setDetailPermiso(p)} className="text-xs text-cyan-700 hover:underline">Ver detalle</button>
                    {hasPermission('permisos.change') && <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-indigo-600 p-1"><Edit2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="permisos"
            />
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detailPermiso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-indigo-100">Detalle de permiso</div><h2 className="text-2xl font-bold text-white">{detailPermiso.nombre}</h2></div>
                <button onClick={() => setDetailPermiso(null)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium">Cerrar</button>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><div className="text-xs text-gray-500">Codigo</div><div className="font-mono text-sm text-gray-900">{detailPermiso.codigo}</div></div>
              <div><div className="text-xs text-gray-500">Modulo</div><div className="text-sm text-gray-900">{detailPermiso.modulo_nombre || '-'}</div></div>
              <div><div className="text-xs text-gray-500">Tipo</div><div className="text-sm text-gray-900">{detailPermiso.tipo_nombre || '-'}</div></div>
              <div><div className="text-xs text-gray-500">Ambito</div><div className="text-sm text-gray-900">{ambitoLabels[detailPermiso.ambito] || detailPermiso.ambito}</div></div>
              <div><div className="text-xs text-gray-500">Estado</div><div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${detailPermiso.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{detailPermiso.activo ? 'Activo' : 'Inactivo'}</div></div>
              <div><div className="text-xs text-gray-500">Heredable</div><div className="text-sm text-gray-900">{detailPermiso.es_heredable ? 'Si' : 'No'}</div></div>
              <div className="md:col-span-2"><div className="text-xs text-gray-500">ID</div><div className="font-mono text-xs text-gray-500">{detailPermiso.id}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">{editingPermiso ? 'Editar Permiso' : 'Nuevo Permiso'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                <input type="text" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="Ej: Ver Nomina" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Codigo *</label>
                <input type="text" required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="Ej: nomina.view" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descripcion</label>
                <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" rows="2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Modulo</label>
                  <select value={formData.modulo} onChange={e => setFormData({ ...formData, modulo: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500">
                    <option value="">Seleccionar...</option>
                    {modulos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Permiso</label>
                  <select value={formData.tipo_permiso} onChange={e => setFormData({ ...formData, tipo_permiso: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500">
                    <option value="">Seleccionar...</option>
                    {tiposPermiso.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ambito</label>
                  <select value={formData.ambito} onChange={e => setFormData({ ...formData, ambito: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500">
                    {Object.entries(ambitoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Prioridad</label>
                  <input type="number" min="0" value={formData.prioridad} onChange={e => setFormData({ ...formData, prioridad: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vigencia Inicio</label>
                  <input type="datetime-local" value={formData.vigencia_inicio} onChange={e => setFormData({ ...formData, vigencia_inicio: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vigencia Fin</label>
                  <input type="datetime-local" value={formData.vigencia_fin} onChange={e => setFormData({ ...formData, vigencia_fin: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.activo} onChange={e => setFormData({ ...formData, activo: e.target.checked })} className="rounded border-gray-300 text-indigo-600" /> Activo</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.es_heredable} onChange={e => setFormData({ ...formData, es_heredable: e.target.checked })} className="rounded border-gray-300 text-indigo-600" /> Heredable</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.es_revocable} onChange={e => setFormData({ ...formData, es_revocable: e.target.checked })} className="rounded border-gray-300 text-indigo-600" /> Revocable</label>
              </div>
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-lg hover:from-indigo-700 hover:to-purple-800 shadow-md font-medium flex items-center"><Save className="h-4 w-4 mr-2" />Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermisosTab;
