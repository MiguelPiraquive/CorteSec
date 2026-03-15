import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Edit2, Trash2, Search, Filter,
  CheckCircle, XCircle, AlertCircle, Save, X,
  LayoutGrid, List, Download, ArrowUpDown
} from 'lucide-react';
import tiposRolService from '../../../services/tiposRolService';
import useAudit from '../../../hooks/useAudit';
import Can from '../../../components/permissions/Can';
import { usePermissions } from '../../../context/PermissionsContext';
import useServerPagination from '../../../hooks/useServerPagination';
import Pagination from '../../../components/Pagination';

const TiposRolTab = () => {
  const { hasPermission, initialized } = usePermissions();
  const audit = useAudit('Tipos de Rol');

  // ============================================================================
  // SERVER-SIDE PAGINATION
  // ============================================================================

  const fetchTipos = useCallback((params) => {
    return tiposRolService.getAllTiposRol(params);
  }, []);

  const {
    data: tipos, loading, currentPage, totalPages, totalCount, pageSize,
    searchTerm, setSearchTerm, setCurrentPage, setFilters, refresh,
  } = useServerPagination(fetchTipos, { pageSize: 20 });

  // ============================================================================
  // UI STATE
  // ============================================================================

  const [filterEstado, setFilterEstado] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [displayMode, setDisplayMode] = useState('tabla');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailTipo, setDetailTipo] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activo: true
  });
  const [error, setError] = useState('');

  // ============================================================================
  // FILTERS (server-side)
  // ============================================================================

  const applyFilters = (estado, sort, dir) => {
    const f = {};
    if (estado === 'active') f.activo = true;
    if (estado === 'inactive') f.activo = false;
    f.ordering = dir === 'desc' ? `-${sort}` : sort;
    setFilters(f);
  };

  const handleFilterEstado = (val) => { setFilterEstado(val); applyFilters(val, sortBy, sortDir); };
  const handleSortBy = (val) => { setSortBy(val); applyFilters(filterEstado, val, sortDir); };
  const handleSortDir = () => { const nd = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(nd); applyFilters(filterEstado, sortBy, nd); };

  // ============================================================================
  // CRUD HANDLERS
  // ============================================================================

  const handleCreate = () => {
    setEditingTipo(null);
    setFormData({ nombre: '', descripcion: '', activo: true });
    setShowModal(true);
  };

  const handleEdit = (tipo) => {
    setEditingTipo(tipo);
    setFormData({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion,
      activo: tipo.activo
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estas seguro de eliminar este tipo de rol?')) return;
    try {
      await tiposRolService.deleteTipoRol(id);
      audit.log('Elimino tipo de rol', { id });
      refresh();
    } catch (err) {
      setError('Error al eliminar');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTipo) {
        await tiposRolService.updateTipoRol(editingTipo.id, formData);
        audit.log('Actualizo tipo de rol', { id: editingTipo.id, ...formData });
      } else {
        await tiposRolService.createTipoRol(formData);
        audit.log('Creo tipo de rol', formData);
      }
      setShowModal(false);
      refresh();
    } catch (err) {
      setError('Error al guardar');
    }
  };

  // ============================================================================
  // SELECTION & BULK
  // ============================================================================

  const allVisibleSelected = tipos.length > 0 && tipos.every((t) => selectedIds.has(t.id));

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        tipos.forEach((t) => next.delete(t.id));
      } else {
        tipos.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkToggle = async (activo) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => tiposRolService.patchTipoRol(id, { activo }))
      );
      clearSelection();
      refresh();
    } catch (err) {
      setError('Error al actualizar en lote');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Nombre', 'Descripcion', 'Activo', 'ID'];
    const rows = tipos.map((t) => ([
      t.nombre || '',
      (t.descripcion || '').replace(/\s+/g, ' ').trim(),
      t.activo ? 'Si' : 'No',
      t.id,
    ]));
    const escape = (value) => {
      const str = String(value ?? '');
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tipos_rol_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('roles.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta seccion</div>

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar tipos de rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{totalCount} Tipos</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setDisplayMode('cards')}
                className={`px-2.5 py-1.5 border rounded-lg text-xs ${displayMode === 'cards' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'border-gray-200 text-gray-600'}`}
                title="Vista cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('tabla')}
                className={`px-2.5 py-1.5 border rounded-lg text-xs ${displayMode === 'tabla' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'border-gray-200 text-gray-600'}`}
                title="Vista tabla"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                title="Exportar CSV"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={filterEstado}
            onChange={(e) => handleFilterEstado(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => handleSortBy(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="nombre">Ordenar por nombre</option>
              <option value="descripcion">Ordenar por descripcion</option>
            </select>
            <button
              type="button"
              onClick={handleSortDir}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
              title="Cambiar direccion"
            >
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <Can permission="roles.add">
            <button
              onClick={handleCreate}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>Nuevo Tipo</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Detail Modal */}
      {detailTipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-teal-100">Detalle de tipo de rol</div>
                  <h2 className="text-2xl font-bold text-white">{detailTipo.nombre}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailTipo(null)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 gap-4">
              <div>
                <div className="text-xs text-gray-500">Descripcion</div>
                <div className="text-sm text-gray-700">{detailTipo.descripcion || 'Sin descripcion disponible.'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Estado</div>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${detailTipo.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {detailTipo.activo ? 'Activo' : 'Inactivo'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ID</div>
                <div className="font-mono text-xs text-gray-500">{detailTipo.id}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-cyan-100">
          <div className="text-sm text-gray-600">
            Seleccionados: <span className="font-semibold">{selectedIds.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkToggle(true)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-200 text-emerald-700 rounded-lg text-sm hover:bg-emerald-50 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" /> Activar
            </button>
            <button
              type="button"
              onClick={() => handleBulkToggle(false)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-rose-200 text-rose-700 rounded-lg text-sm hover:bg-rose-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Desactivar
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Tabla / Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : displayMode === 'tabla' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripcion</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tipos.map((tipo) => (
                  <tr key={tipo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tipo.id)}
                        onChange={() => toggleSelect(tipo.id)}
                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{tipo.nombre}</td>
                    <td className="px-6 py-4 text-gray-600">{tipo.descripcion}</td>
                    <td className="px-6 py-4">
                      {tipo.activo ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setDetailTipo(tipo)}
                        className="text-gray-400 hover:text-cyan-600 transition-colors p-1"
                        title="Detalle"
                      >
                        <List className="h-4 w-4" />
                      </button>
                      <Can permission="roles.change">
                        <button
                          onClick={() => handleEdit(tipo)}
                          className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </Can>
                      <Can permission="roles.delete">
                        <button
                          onClick={() => handleDelete(tipo.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))}
                {tipos.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No se encontraron tipos de rol
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="tipos de rol"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {tipos.map((tipo) => (
                <div key={tipo.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">{tipo.nombre}</div>
                      <div className="text-xs text-gray-500">{tipo.descripcion || 'Sin descripcion'}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tipo.id)}
                      onChange={() => toggleSelect(tipo.id)}
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    {tipo.activo ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailTipo(tipo)}
                      className="text-xs text-cyan-700 hover:underline"
                    >
                      Ver detalle
                    </button>
                    <Can permission="roles.change">
                      <button
                        onClick={() => handleEdit(tipo)}
                        className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </Can>
                  </div>
                </div>
              ))}
              {tipos.length === 0 && (
                <div className="col-span-full px-6 py-8 text-center text-gray-500">No se encontraron tipos de rol</div>
              )}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="tipos de rol"
            />
          </>
        )}
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">
                {editingTipo ? 'Editar Tipo de Rol' : 'Nuevo Tipo de Rol'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  placeholder="Ej: Administrativo"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripcion</label>
                <textarea
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  rows="3"
                  placeholder="Descripcion breve..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={e => setFormData({...formData, activo: e.target.checked})}
                  className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                  Activo (Disponible para uso)
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-700 text-white rounded-lg hover:from-teal-700 hover:to-cyan-800 transition-colors shadow-md font-medium flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Tipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TiposRolTab;
