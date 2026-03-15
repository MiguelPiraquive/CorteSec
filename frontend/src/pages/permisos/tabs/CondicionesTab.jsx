import React, { useState, useCallback } from 'react';
import {
  GitBranch, Plus, Edit2, Trash2, Search,
  ArrowUpDown, Save, AlertCircle, Eye, Play
} from 'lucide-react';
import permisosService from '../../../services/permisosService';
import useServerPagination from '../../../hooks/useServerPagination';
import Pagination from '../../../components/Pagination';
import { usePermissions } from '../../../context/PermissionsContext';

const TIPO_CONDICION_CHOICES = [
  { value: 'python', label: 'Codigo Python' },
  { value: 'sql', label: 'Consulta SQL' },
  { value: 'json', label: 'Configuracion JSON' },
  { value: 'time', label: 'Restriccion Temporal' },
  { value: 'location', label: 'Restriccion por Ubicacion' },
  { value: 'custom', label: 'Personalizada' },
];

const CondicionesTab = () => {
  const { hasPermission, initialized } = usePermissions();
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [detailCondicion, setDetailCondicion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCondicion, setEditingCondicion] = useState(null);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', codigo: '', descripcion: '', tipo: 'python',
    configuracion: '{}', activa: true,
  });

  const fetchCondiciones = useCallback((params) => {
    return permisosService.getAllCondiciones(params);
  }, []);

  const {
    data: condiciones,
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
  } = useServerPagination(fetchCondiciones, { pageSize: 20 });

  const applyFilters = (tipo, estado, sort, dir) => {
    const f = {};
    if (tipo !== 'all') f.tipo = tipo;
    if (estado === 'active') f.activa = true;
    if (estado === 'inactive') f.activa = false;
    f.ordering = dir === 'desc' ? `-${sort}` : sort;
    setFilters(f);
  };

  const handleFilterTipo = (val) => { setFilterTipo(val); applyFilters(val, filterEstado, sortBy, sortDir); };
  const handleFilterEstado = (val) => { setFilterEstado(val); applyFilters(filterTipo, val, sortBy, sortDir); };
  const handleSortBy = (val) => { setSortBy(val); applyFilters(filterTipo, filterEstado, val, sortDir); };
  const handleSortDir = () => { const d = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(d); applyFilters(filterTipo, filterEstado, sortBy, d); };

  const handleCreate = () => {
    setEditingCondicion(null);
    setFormData({ nombre: '', codigo: '', descripcion: '', tipo: 'python', configuracion: '{}', activa: true });
    setError(''); setShowModal(true);
  };

  const handleEdit = (cond) => {
    setEditingCondicion(cond);
    setFormData({
      nombre: cond.nombre || '', codigo: cond.codigo || '', descripcion: cond.descripcion || '',
      tipo: cond.tipo || 'python',
      configuracion: typeof cond.configuracion === 'string' ? cond.configuracion : JSON.stringify(cond.configuracion || {}, null, 2),
      activa: cond.activa ?? true,
    });
    setError(''); setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta condicion?')) return;
    try { await permisosService.deleteCondicion(id); refresh(); } catch { alert('Error al eliminar'); }
  };

  const handleTest = async (id) => {
    try {
      const result = await permisosService.evaluarCondicion(id, {});
      setTestResult({ id, result });
      setTimeout(() => setTestResult(null), 5000);
    } catch (err) {
      setTestResult({ id, error: 'Error al evaluar' });
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!formData.nombre || !formData.codigo) { setError('Nombre y codigo son requeridos'); return; }
    let configuracion;
    try { configuracion = JSON.parse(formData.configuracion); } catch { setError('Configuracion debe ser JSON valido'); return; }
    const payload = { ...formData, configuracion };
    try {
      if (editingCondicion) { await permisosService.updateCondicion(editingCondicion.id, payload); }
      else { await permisosService.createCondicion(payload); }
      setShowModal(false); refresh();
    } catch (err) { setError(JSON.stringify(err.response?.data) || 'Error al guardar'); }
  };

  const tipoColor = (t) => ({ horario: 'bg-blue-50 text-blue-700', ip: 'bg-green-50 text-green-700', ubicacion: 'bg-teal-50 text-teal-700', dispositivo: 'bg-purple-50 text-purple-700', rol: 'bg-indigo-50 text-indigo-700', estado: 'bg-amber-50 text-amber-700', custom: 'bg-gray-100 text-gray-700' }[t] || 'bg-gray-50 text-gray-600');

  if (!initialized) return <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('permisos.manage_condiciones')) return <div className="p-6 text-center text-red-500 font-semibold">No tienes permisos para gestionar condiciones</div>

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Buscar condiciones..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <GitBranch className="h-4 w-4" /><span>{totalCount} Condiciones</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={filterTipo} onChange={e => handleFilterTipo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todos los Tipos</option>
            {TIPO_CONDICION_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filterEstado} onChange={e => handleFilterEstado(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">Todos los Estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
          </select>
          <div className="flex gap-2">
            <select value={sortBy} onChange={e => handleSortBy(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="nombre">Ordenar por nombre</option><option value="tipo">Por tipo</option>
            </select>
            <button onClick={handleSortDir} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"><ArrowUpDown className="h-4 w-4 text-gray-500" /></button>
          </div>
          {hasPermission('permisos.manage_condiciones') && (
            <button onClick={handleCreate} className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-md">
              <Plus className="h-5 w-5" /><span>Nueva Condicion</span>
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
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {condiciones.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{c.nombre}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{c.descripcion}</div>
                    </td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${tipoColor(c.tipo)}`}>{TIPO_CONDICION_CHOICES.find(t => t.value === c.tipo)?.label || c.tipo}</span></td>
                    <td className="px-6 py-4">{c.activa ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactivo</span>}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleTest(c.id)} className="text-gray-400 hover:text-green-600 p-1" title="Evaluar">
                        <Play className="h-4 w-4" />
                        {testResult?.id === c.id && <span className={`ml-1 text-xs ${testResult.error ? 'text-red-500' : 'text-green-600'}`}>{testResult.error || (testResult.result?.cumple ? 'OK' : 'No cumple')}</span>}
                      </button>
                      <button onClick={() => setDetailCondicion(c)} className="text-gray-400 hover:text-cyan-600 p-1"><Eye className="h-4 w-4" /></button>
                      {hasPermission('permisos.manage_condiciones') && <button onClick={() => handleEdit(c)} className="text-gray-400 hover:text-indigo-600 p-1"><Edit2 className="h-4 w-4" /></button>}
                      {hasPermission('permisos.manage_condiciones') && <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="h-4 w-4" /></button>}
                    </td>
                  </tr>
                ))}
                {condiciones.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No se encontraron condiciones</td></tr>}
              </tbody>
            </table>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setCurrentPage} itemLabel="condiciones" />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailCondicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-green-100">Detalle de condicion</div><h2 className="text-2xl font-bold text-white">{detailCondicion.nombre}</h2></div>
                <button onClick={() => setDetailCondicion(null)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium">Cerrar</button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div><div className="text-xs text-gray-500">Tipo</div><div className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${tipoColor(detailCondicion.tipo)}`}>{TIPO_CONDICION_CHOICES.find(t => t.value === detailCondicion.tipo)?.label || detailCondicion.tipo}</div></div>
              <div><div className="text-xs text-gray-500">Descripcion</div><div className="text-sm text-gray-700">{detailCondicion.descripcion || 'Sin descripcion.'}</div></div>
              <div><div className="text-xs text-gray-500">Configuracion</div><pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono overflow-auto max-h-40">{typeof detailCondicion.configuracion === 'string' ? detailCondicion.configuracion : JSON.stringify(detailCondicion.configuracion, null, 2)}</pre></div>
              <div><div className="text-xs text-gray-500">ID</div><div className="font-mono text-xs text-gray-500">{detailCondicion.id}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">{editingCondicion ? 'Editar Condicion' : 'Nueva Condicion'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                <input type="text" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Codigo *</label>
                <input type="text" required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20" placeholder="Ej: cond_horario_laboral" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Descripcion</label>
                <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20" rows="2" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Condicion</label>
                <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500">
                  {TIPO_CONDICION_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">Configuracion (JSON)</label>
                <textarea value={formData.configuracion} onChange={e => setFormData({ ...formData, configuracion: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-mono text-sm" rows="5" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.activa} onChange={e => setFormData({ ...formData, activa: e.target.checked })} className="rounded border-gray-300 text-green-600" /> Activo</label>
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg hover:from-green-700 hover:to-emerald-800 shadow-md font-medium flex items-center"><Save className="h-4 w-4 mr-2" />Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CondicionesTab;
