import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Plus, Edit2, Trash2, Search, CheckCircle, XCircle,
  List, LayoutGrid, Download, ArrowUpDown, Save, AlertCircle, Eye,
  ChevronRight, ChevronDown, ToggleLeft, ToggleRight
} from 'lucide-react';
import permisosService from '../../../services/permisosService';
import useServerPagination from '../../../hooks/useServerPagination';
import Pagination from '../../../components/Pagination';
import { usePermissions } from '../../../context/PermissionsContext';

const ModulosTab = () => {
  const { hasPermission, initialized } = usePermissions();
  const [allModulos, setAllModulos] = useState([]); // For parent dropdown
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterNivel, setFilterNivel] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [detailModulo, setDetailModulo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingModulo, setEditingModulo] = useState(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('lista'); // 'lista' o 'arbol'
  const [treeData, setTreeData] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [formData, setFormData] = useState({
    nombre: '', codigo: '', descripcion: '', version: '1.0.0',
    icono: '', color: '#6366f1', orden: 0, url_base: '',
    padre: '', activo: true, es_sistema: false, requiere_licencia: false,
  });

  // Server-side pagination for list view
  const fetchModulos = useCallback((params) => {
    return permisosService.getAllModulos(params);
  }, []);

  const {
    data: modulos, loading, currentPage, totalPages, totalCount, pageSize,
    searchTerm, setSearchTerm, setCurrentPage, setFilters, refresh,
  } = useServerPagination(fetchModulos, { pageSize: 20 });

  // Load tree data and all modulos for parent dropdown separately
  useEffect(() => {
    const loadExtraData = async () => {
      try {
        const [treeDataRes, allModulosData] = await Promise.all([
          permisosService.getModulosTree().catch(() => []),
          permisosService.getAllModulos({ page_size: 1000 }),
        ]);
        setTreeData(Array.isArray(treeDataRes) ? treeDataRes : []);
        const list = Array.isArray(allModulosData) ? allModulosData : (allModulosData.results || []);
        setAllModulos(list);
      } catch (err) {
        console.error('Error loading extra data:', err);
      }
    };
    loadExtraData();
  }, []);

  const applyFilters = (estado, nivel, sort, dir) => {
    const f = {};
    if (estado === 'active') f.activo = true;
    if (estado === 'inactive') f.activo = false;
    if (nivel !== 'all') f.nivel = nivel;
    f.ordering = dir === 'desc' ? `-${sort}` : sort;
    setFilters(f);
  };

  const handleFilterEstado = (val) => { setFilterEstado(val); applyFilters(val, filterNivel, sortBy, sortDir); };
  const handleFilterNivel = (val) => { setFilterNivel(val); applyFilters(filterEstado, val, sortBy, sortDir); };
  const handleSortBy = (val) => { setSortBy(val); applyFilters(filterEstado, filterNivel, val, sortDir); };
  const handleSortDir = () => { const nd = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(nd); applyFilters(filterEstado, filterNivel, sortBy, nd); };

  const reloadAll = () => {
    refresh();
    // Also reload tree and allModulos
    const reloadExtra = async () => {
      try {
        const [treeDataRes, allModulosData] = await Promise.all([
          permisosService.getModulosTree().catch(() => []),
          permisosService.getAllModulos({ page_size: 1000 }),
        ]);
        setTreeData(Array.isArray(treeDataRes) ? treeDataRes : []);
        const list = Array.isArray(allModulosData) ? allModulosData : (allModulosData.results || []);
        setAllModulos(list);
      } catch (err) {
        console.error('Error reloading extra data:', err);
      }
    };
    reloadExtra();
  };

  const handleCreate = () => {
    setEditingModulo(null);
    setFormData({ nombre: '', codigo: '', descripcion: '', version: '1.0.0', icono: '', color: '#6366f1', orden: 0, url_base: '', padre: '', activo: true, es_sistema: false, requiere_licencia: false });
    setError(''); setShowModal(true);
  };

  const handleEdit = async (modulo) => {
    setEditingModulo(modulo);
    try {
      const full = await permisosService.getModulo(modulo.id);
      setFormData({
        nombre: full.nombre || '', codigo: full.codigo || '', descripcion: full.descripcion || '',
        version: full.version || '1.0.0', icono: full.icono || '', color: full.color || '#6366f1',
        orden: full.orden || 0, url_base: full.url_base || '', padre: full.padre || '',
        activo: full.activo ?? true, es_sistema: full.es_sistema ?? false, requiere_licencia: full.requiere_licencia ?? false,
      });
    } catch {
      setFormData({ nombre: modulo.nombre || '', codigo: modulo.codigo || '', descripcion: '', version: '1.0.0', icono: modulo.icono || '', color: modulo.color || '#6366f1', orden: 0, url_base: '', padre: '', activo: modulo.activo ?? true, es_sistema: false, requiere_licencia: false });
    }
    setError(''); setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este modulo?')) return;
    try { await permisosService.deleteModulo(id); reloadAll(); } catch { alert('Error al eliminar'); }
  };

  const handleToggleActive = async (id) => {
    try { await permisosService.toggleModuloActive(id); reloadAll(); } catch { alert('Error al cambiar estado'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!formData.nombre || !formData.codigo) { setError('Nombre y codigo son requeridos'); return; }
    const payload = { ...formData };
    if (!payload.padre) delete payload.padre;
    try {
      if (editingModulo) { await permisosService.updateModulo(editingModulo.id, payload); }
      else { await permisosService.createModulo(payload); }
      setShowModal(false); reloadAll();
    } catch (err) {
      const msg = err.response?.data;
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Error al guardar');
    }
  };

  const toggleNode = (id) => setExpandedNodes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const renderTreeNode = (node, depth = 0) => (
    <div key={node.id}>
      <div className={`flex items-center gap-2 py-2 px-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50`} style={{ paddingLeft: `${depth * 24 + 16}px` }}>
        {node.children?.length > 0 ? (
          <button onClick={() => toggleNode(node.id)} className="text-gray-400 hover:text-gray-600">
            {expandedNodes.has(node.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : <span className="w-4" />}
        <div className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: node.color || '#6366f1' }}>
          {node.nombre?.substring(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <span className="font-medium text-gray-900 text-sm">{node.nombre}</span>
          <span className="text-xs text-gray-400 ml-2">{node.codigo}</span>
        </div>
        <span className="text-xs text-gray-400">Nivel {node.nivel}</span>
        <div className="flex gap-1">
          <button onClick={() => handleEdit(node)} className="text-gray-400 hover:text-indigo-600 p-1"><Edit2 className="h-3.5 w-3.5" /></button>
          <button onClick={() => handleToggleActive(node.id)} className="text-gray-400 hover:text-amber-600 p-1">
            {node.activo ? <ToggleRight className="h-3.5 w-3.5 text-green-500" /> : <ToggleLeft className="h-3.5 w-3.5 text-gray-400" />}
          </button>
        </div>
      </div>
      {expandedNodes.has(node.id) && node.children?.map(child => renderTreeNode(child, depth + 1))}
    </div>
  );

  if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('permisos.manage_modulos')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para gestionar módulos</div>

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Buscar modulos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <Layers className="h-4 w-4" /><span>{totalCount} Modulos</span>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => setViewMode('arbol')} className={`px-2.5 py-1.5 border rounded-lg text-xs ${viewMode === 'arbol' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'border-gray-200 text-gray-600'}`} title="Vista arbol"><Layers className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('lista')} className={`px-2.5 py-1.5 border rounded-lg text-xs ${viewMode === 'lista' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'border-gray-200 text-gray-600'}`} title="Vista lista"><List className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={filterEstado} onChange={e => handleFilterEstado(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todos los Estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
          </select>
          <select value={filterNivel} onChange={e => handleFilterNivel(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todos los Niveles</option>{[0, 1, 2, 3].map(n => <option key={n} value={n}>Nivel {n}</option>)}
          </select>
          <div className="flex gap-2">
            <select value={sortBy} onChange={e => handleSortBy(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="nombre">Ordenar por nombre</option><option value="codigo">Ordenar por codigo</option><option value="orden">Ordenar por orden</option>
            </select>
            <button onClick={handleSortDir} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"><ArrowUpDown className="h-4 w-4 text-gray-500" /></button>
          </div>
          {hasPermission('permisos.manage_modulos') && (
            <button onClick={handleCreate} className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 shadow-md">
              <Plus className="h-5 w-5" /><span>Nuevo Modulo</span>
            </button>
          )}
        </div>
      </div>

      {/* Tree View */}
      {viewMode === 'arbol' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200"><h3 className="font-semibold text-gray-700">Jerarquia de Modulos</h3></div>
          {treeData.length === 0 ? <div className="p-8 text-center text-gray-500">No hay modulos con estructura jerarquica</div>
            : treeData.map(node => renderTreeNode(node))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'lista' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? <div className="p-8 text-center text-gray-500">Cargando...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Modulo</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Codigo</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Nivel</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Sistema</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {modulos.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: m.color || '#6366f1' }}>{m.nombre?.substring(0, 2).toUpperCase()}</div>
                          <div><div className="font-medium text-gray-900">{m.nombre}</div></div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 font-mono">{m.codigo}</code></td>
                      <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">Nivel {m.nivel}</span></td>
                      <td className="px-6 py-4">{m.activo ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactivo</span>}</td>
                      <td className="px-6 py-4">{m.es_sistema ? <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Sistema</span> : <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Custom</span>}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => setDetailModulo(m)} className="text-gray-400 hover:text-cyan-600 p-1"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => handleEdit(m)} className="text-gray-400 hover:text-indigo-600 p-1"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleToggleActive(m.id)} className="text-gray-400 hover:text-amber-600 p-1">{m.activo ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}</button>
                        {!m.es_sistema && <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="h-4 w-4" /></button>}
                      </td>
                    </tr>
                  ))}
                  {modulos.length === 0 && <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No se encontraron modulos</td></tr>}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="modulos"
              />
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailModulo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-teal-100">Detalle de modulo</div><h2 className="text-2xl font-bold text-white">{detailModulo.nombre}</h2></div>
                <button onClick={() => setDetailModulo(null)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium">Cerrar</button>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div><div className="text-xs text-gray-500">Codigo</div><div className="font-mono text-sm">{detailModulo.codigo}</div></div>
              <div><div className="text-xs text-gray-500">Version</div><div className="text-sm">{detailModulo.version || '1.0.0'}</div></div>
              <div><div className="text-xs text-gray-500">Nivel</div><div className="text-sm">Nivel {detailModulo.nivel}</div></div>
              <div><div className="text-xs text-gray-500">Orden</div><div className="text-sm">{detailModulo.orden}</div></div>
              <div><div className="text-xs text-gray-500">Estado</div><div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${detailModulo.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{detailModulo.activo ? 'Activo' : 'Inactivo'}</div></div>
              <div><div className="text-xs text-gray-500">Color</div><div className="flex items-center gap-2"><div className="h-5 w-5 rounded" style={{ backgroundColor: detailModulo.color }}></div><span className="text-sm">{detailModulo.color}</span></div></div>
              <div className="col-span-2"><div className="text-xs text-gray-500">ID</div><div className="font-mono text-xs text-gray-500">{detailModulo.id}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">{editingModulo ? 'Editar Modulo' : 'Nuevo Modulo'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                <input type="text" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Ej: Nomina" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Codigo *</label>
                <input type="text" required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Ej: nomina" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Descripcion</label>
                <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" rows="2" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Color</label>
                  <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-full h-10 rounded-xl border-2 border-gray-300 cursor-pointer" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Orden</label>
                  <input type="number" min="0" value={formData.orden} onChange={e => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500" /></div>
              </div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Modulo Padre</label>
                <select value={formData.padre} onChange={e => setFormData({ ...formData, padre: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500">
                  <option value="">Sin padre (raiz)</option>
                  {allModulos.filter(m => editingModulo ? m.id !== editingModulo.id : true).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">URL Base</label>
                <input type="text" value={formData.url_base} onChange={e => setFormData({ ...formData, url_base: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500" placeholder="/modulo/" /></div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.activo} onChange={e => setFormData({ ...formData, activo: e.target.checked })} className="rounded border-gray-300 text-teal-600" /> Activo</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.es_sistema} onChange={e => setFormData({ ...formData, es_sistema: e.target.checked })} className="rounded border-gray-300 text-teal-600" /> Modulo del sistema</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.requiere_licencia} onChange={e => setFormData({ ...formData, requiere_licencia: e.target.checked })} className="rounded border-gray-300 text-teal-600" /> Requiere licencia</label>
              </div>
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-700 text-white rounded-lg hover:from-teal-700 hover:to-cyan-800 shadow-md font-medium flex items-center"><Save className="h-4 w-4 mr-2" />Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModulosTab;
