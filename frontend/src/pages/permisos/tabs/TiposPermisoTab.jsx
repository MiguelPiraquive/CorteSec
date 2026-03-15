import React, { useState, useCallback } from 'react';
import {
  Tag, Plus, Edit2, Trash2, Search,
  ArrowUpDown, Save, AlertCircle, Eye
} from 'lucide-react';
import permisosService from '../../../services/permisosService';
import useServerPagination from '../../../hooks/useServerPagination';
import Pagination from '../../../components/Pagination';
import { usePermissions } from '../../../context/PermissionsContext';

const CATEGORIAS = [
  { value: 'crud', label: 'CRUD' },
  { value: 'workflow', label: 'Flujo de trabajo' },
  { value: 'report', label: 'Reportes' },
  { value: 'admin', label: 'Administracion' },
  { value: 'custom', label: 'Personalizado' },
];

const TiposPermisoTab = () => {
  const { hasPermission, initialized } = usePermissions();
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [detailTipo, setDetailTipo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre: '', descripcion: '', codigo: '', categoria: 'crud',
    icono: '', color: '#6366f1', activo: true,
  });

  const fetchTipos = useCallback((params) => {
    return permisosService.getAllTiposPermiso(params);
  }, []);

  const {
    data: tipos,
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
  } = useServerPagination(fetchTipos, { pageSize: 20 });

  const applyFilters = (cat, estado, sort, dir) => {
    const f = {};
    if (cat !== 'all') f.categoria = cat;
    if (estado === 'active') f.activo = true;
    if (estado === 'inactive') f.activo = false;
    f.ordering = dir === 'desc' ? `-${sort}` : sort;
    setFilters(f);
  };

  const handleFilterCategoria = (val) => { setFilterCategoria(val); applyFilters(val, filterEstado, sortBy, sortDir); };
  const handleFilterEstado = (val) => { setFilterEstado(val); applyFilters(filterCategoria, val, sortBy, sortDir); };
  const handleSortBy = (val) => { setSortBy(val); applyFilters(filterCategoria, filterEstado, val, sortDir); };
  const handleSortDir = () => { const d = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(d); applyFilters(filterCategoria, filterEstado, sortBy, d); };

  const handleCreate = () => {
    setEditingTipo(null);
    setFormData({ nombre: '', descripcion: '', codigo: '', categoria: 'crud', icono: '', color: '#6366f1', activo: true });
    setError(''); setShowModal(true);
  };

  const handleEdit = (tipo) => {
    setEditingTipo(tipo);
    setFormData({
      nombre: tipo.nombre || '', descripcion: tipo.descripcion || '', codigo: tipo.codigo || '',
      categoria: tipo.categoria || 'crud', icono: tipo.icono || '', color: tipo.color || '#6366f1',
      activo: tipo.activo ?? true,
    });
    setError(''); setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este tipo de permiso?')) return;
    try { await permisosService.deleteTipoPermiso(id); refresh(); } catch { alert('Error al eliminar'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!formData.nombre || !formData.codigo) { setError('Nombre y codigo son requeridos'); return; }
    try {
      if (editingTipo) { await permisosService.updateTipoPermiso(editingTipo.id, formData); }
      else { await permisosService.createTipoPermiso(formData); }
      setShowModal(false); refresh();
    } catch (err) { setError(JSON.stringify(err.response?.data) || 'Error al guardar'); }
  };

  const categoriaLabel = (cat) => CATEGORIAS.find(c => c.value === cat)?.label || cat;
  const categoriaColor = (cat) => ({ crud: 'bg-blue-50 text-blue-700', workflow: 'bg-amber-50 text-amber-700', report: 'bg-teal-50 text-teal-700', admin: 'bg-purple-50 text-purple-700', custom: 'bg-gray-100 text-gray-700' }[cat] || 'bg-gray-50 text-gray-600');

  if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('permisos.view')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para ver tipos de permiso</div>

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Buscar tipos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Tag className="h-4 w-4" /><span>{totalCount} Tipos</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={filterCategoria} onChange={e => handleFilterCategoria(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todas las Categorias</option>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filterEstado} onChange={e => handleFilterEstado(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todos los Estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
          </select>
          <div className="flex gap-2">
            <select value={sortBy} onChange={e => handleSortBy(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="nombre">Ordenar por nombre</option><option value="codigo">Por codigo</option><option value="categoria">Por categoria</option>
            </select>
            <button onClick={handleSortDir} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"><ArrowUpDown className="h-4 w-4 text-gray-500" /></button>
          </div>
          {hasPermission('permisos.change') && (
            <button onClick={handleCreate} className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-md">
              <Plus className="h-5 w-5" /><span>Nuevo Tipo</span>
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
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Codigo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {tipos.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: t.color || '#6366f1' }}>{t.nombre?.substring(0, 2).toUpperCase()}</div>
                        <div><div className="font-medium text-gray-900">{t.nombre}</div><div className="text-xs text-gray-500 line-clamp-1">{t.descripcion}</div></div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 font-mono">{t.codigo}</code></td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${categoriaColor(t.categoria)}`}>{categoriaLabel(t.categoria)}</span></td>
                    <td className="px-6 py-4">{t.activo ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactivo</span>}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => setDetailTipo(t)} className="text-gray-400 hover:text-cyan-600 p-1"><Eye className="h-4 w-4" /></button>
                      {hasPermission('permisos.change') && <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-indigo-600 p-1"><Edit2 className="h-4 w-4" /></button>}
                      {hasPermission('permisos.delete') && <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="h-4 w-4" /></button>}
                    </td>
                  </tr>
                ))}
                {tipos.length === 0 && <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No se encontraron tipos de permiso</td></tr>}
              </tbody>
            </table>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setCurrentPage} itemLabel="tipos" />
          </div>
        )}
      </div>

      {/* Detail */}
      {detailTipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-amber-100">Detalle de tipo</div><h2 className="text-2xl font-bold text-white">{detailTipo.nombre}</h2></div>
                <button onClick={() => setDetailTipo(null)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium">Cerrar</button>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div><div className="text-xs text-gray-500">Codigo</div><div className="font-mono text-sm">{detailTipo.codigo}</div></div>
              <div><div className="text-xs text-gray-500">Categoria</div><div className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${categoriaColor(detailTipo.categoria)}`}>{categoriaLabel(detailTipo.categoria)}</div></div>
              <div><div className="text-xs text-gray-500">Estado</div><div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${detailTipo.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{detailTipo.activo ? 'Activo' : 'Inactivo'}</div></div>
              <div><div className="text-xs text-gray-500">Color</div><div className="flex items-center gap-2"><div className="h-5 w-5 rounded" style={{ backgroundColor: detailTipo.color }}></div><span className="text-sm">{detailTipo.color}</span></div></div>
              <div className="col-span-2"><div className="text-xs text-gray-500">Descripcion</div><div className="text-sm text-gray-700">{detailTipo.descripcion || 'Sin descripcion.'}</div></div>
              <div className="col-span-2"><div className="text-xs text-gray-500">ID</div><div className="font-mono text-xs text-gray-500">{detailTipo.id}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">{editingTipo ? 'Editar Tipo' : 'Nuevo Tipo de Permiso'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                <input type="text" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Codigo *</label>
                <input type="text" required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" placeholder="Ej: view" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Descripcion</label>
                <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" rows="2" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Categoria</label>
                  <select value={formData.categoria} onChange={e => setFormData({ ...formData, categoria: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-amber-500">
                    {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Color</label>
                  <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-full h-10 rounded-xl border-2 border-gray-300 cursor-pointer" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.activo} onChange={e => setFormData({ ...formData, activo: e.target.checked })} className="rounded border-gray-300 text-amber-600" /> Activo</label>
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 shadow-md font-medium flex items-center"><Save className="h-4 w-4 mr-2" />Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TiposPermisoTab;
