import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../components/css/DepartamentosStyles.css';
import Modal from '../../components/UI/Modal/Modal';
import Pagination from '../../components/UI/Navigation/Pagination';
import { Button } from '../../components/UI/Button/Button';
import { PlusIcon, ListIcon, EyeIcon, EditIcon, TrashIcon } from '../../components/icons';

const MunicipiosList = () => {
  const navigate = useNavigate();

  // Data
  const [municipios, setMunicipios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Filters/UI
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortBy, setSortBy] = useState('nombre'); // nombre|codigo|departamento|fecha
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals & form
  const [createOpen, setCreateOpen] = useState(false);
  const [editState, setEditState] = useState({ open: false, item: null });
  const [detailState, setDetailState] = useState({ open: false, item: null });
  const [deleteState, setDeleteState] = useState({ open: false, id: null, nombre: '' });
  const [form, setForm] = useState({ nombre: '', codigo: '', departamento: '' });

  // Load data
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [dataM, dataD] = await Promise.all([
          api.get('/api/locations/municipios/'),
          api.get('/api/locations/departamentos/'),
        ]);
        const itemsM = Array.isArray(dataM) ? dataM : (dataM.results || []);
        const itemsD = Array.isArray(dataD) ? dataD : (dataD.results || []);
        if (!cancelled) {
          setMunicipios(itemsM);
          setDepartamentos(itemsD);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Error al cargar datos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAll();
    return () => { cancelled = true; };
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/locations/municipios/');
      setMunicipios(Array.isArray(data) ? data : (data.results || []));
      setNotice('Lista actualizada');
      setTimeout(() => setNotice(''), 1500);
    } catch (e) {
      setError(e.message || 'Error al actualizar.');
    } finally {
      setLoading(false);
    }
  };

  // Derived
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return municipios.filter(m => {
      const nom = (m.nombre || '').toLowerCase();
      const cod = (m.codigo || '').toLowerCase();
      const depNom = (m.departamento?.nombre || m.departamento_nombre || '').toLowerCase();
      const matchesQ = !q || nom.includes(q) || cod.includes(q) || depNom.includes(q);
      const matchesDep = !departmentFilter || (String(m.departamento?.id || m.departamento_id || '') === String(departmentFilter));
      return matchesQ && matchesDep;
    });
  }, [municipios, searchTerm, departmentFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'codigo':
        arr.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
        break;
      case 'departamento':
        arr.sort((a, b) => ((a.departamento?.nombre || a.departamento_nombre || '')).localeCompare(b.departamento?.nombre || b.departamento_nombre || ''));
        break;
      case 'fecha':
        arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      default:
        arr.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    }
    return arr;
  }, [filtered, sortBy]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageItems = sorted.slice(startIndex, endIndex);

  const stats = useMemo(() => {
    const uniqueDeps = new Set(filtered.map(m => String(m.departamento?.id || m.departamento_id || m.departamento_nombre || '')));
    const recientes = filtered.filter(m => {
      const dt = m.created_at ? new Date(m.created_at) : null;
      return dt ? (Date.now() - dt.getTime()) < 7 * 24 * 60 * 60 * 1000 : false;
    }).length;
    const sinDep = filtered.filter(m => !(m.departamento?.id || m.departamento_id || m.departamento_nombre)).length;
    return { total: filtered.length, departamentos: uniqueDeps.size, sinDep, recientes };
  }, [filtered]);

  // Pagination helper
  const getPages = (current, total) => {
    const pages = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    const showLeftDots = current > 3;
    const showRightDots = current < total - 2;
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    pages.push(1);
    if (showLeftDots) pages.push('...l');
    for (let i = start; i <= end; i++) pages.push(i);
    if (showRightDots) pages.push('...r');
    pages.push(total);
    return pages;
  };

  // CRUD handlers
  const openCreate = () => { setForm({ nombre: '', codigo: '', departamento: '' }); setCreateOpen(true); };
  const openEdit = (item) => { 
    setForm({ 
      nombre: item.nombre || '', 
      codigo: item.codigo || '', 
      departamento: String(item.departamento || '') // departamento ya es el ID directamente
    }); 
    setEditState({ open: true, item }); 
  };
  const openDetail = (item) => { setDetailState({ open: true, item }); };
  const openDelete = (item) => { setDeleteState({ open: true, id: item.id, nombre: item.nombre }); };
  const closeAll = () => { setCreateOpen(false); setEditState({ open: false, item: null }); setDetailState({ open: false, item: null }); setDeleteState({ open: false, id: null, nombre: '' }); setForm({ nombre: '', codigo: '', departamento: '' }); };

  const submitCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Validar que se haya seleccionado un departamento
      if (!form.departamento) {
        setError('Por favor seleccione un departamento');
        return;
      }
      
      const payload = { nombre: form.nombre, codigo: form.codigo, departamento: form.departamento };
      await api.post('/api/locations/municipios/', payload);
      await refresh();
      closeAll();
      setNotice('Municipio creado');
    } catch (e2) {
      setError(e2.message || 'Error al crear.');
    } finally {
      setLoading(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editState.item?.id) return;
    setLoading(true);
    setError('');
    try {
      // Validar que se haya seleccionado un departamento
      if (!form.departamento) {
        setError('Por favor seleccione un departamento');
        return;
      }
      
      const payload = { nombre: form.nombre, codigo: form.codigo, departamento: form.departamento };
      await api.put(`/api/locations/municipios/${editState.item.id}/`, payload);
      await refresh();
      closeAll();
      setNotice('Municipio actualizado');
    } catch (e2) {
      setError(e2.message || 'Error al actualizar.');
    } finally {
      setLoading(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteState.id) return;
    setLoading(true);
    setError('');
    try {
      await api.delete(`/api/locations/municipios/${deleteState.id}/`);
      await refresh();
      closeAll();
      setNotice('Municipio eliminado');
    } catch (e2) {
      setError(e2.message || 'Error al eliminar.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => { setSearchTerm(''); setDepartmentFilter(''); setSortBy('nombre'); setPage(1); };

  if (loading && municipios.length === 0 && !error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-gray-200 dark:border-zinc-700 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Cargando municipios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 text-white rounded-2xl shadow-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm opacity-90 mb-1">Dashboard • Municipios</div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Gestión de Municipios</h1>
            <p className="text-white/80 mt-1">Sistema de control de municipios por departamento</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="light" onClick={() => navigate('/locations/departamentos')}><ListIcon className="w-4 h-4" /> Ver Departamentos</Button>
            <Button onClick={() => setCreateOpen(true)}><PlusIcon className="w-4 h-4" /> Nuevo Municipio</Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg></div><div><div className="text-xs text-gray-500">Total Municipios</div><div className="text-2xl font-semibold">{stats.total}</div></div></div></div>
        <div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/></svg></div><div><div className="text-xs text-gray-500">Departamentos</div><div className="text-2xl font-semibold">{stats.departamentos}</div></div></div></div>
        <div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0021 17.24L13.73 4.76a2 2 0 00-3.46 0L3 17.24A2 2 0 005.07 19z"/></svg></div><div><div className="text-xs text-gray-500">Sin Departamento</div><div className="text-2xl font-semibold">{stats.sinDep}</div></div></div></div>
        <div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3A9 9 0 113 12a9 9 0 0118 0z"/></svg></div><div><div className="text-xs text-gray-500">Recientes</div><div className="text-2xl font-semibold">{stats.recientes}</div></div></div></div>
      </div>

      {/* Navegación */}
      <div className="filter-section border-2 border-transparent">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-t-xl px-5 py-3">
          <div className="font-semibold">Navegación de Ubicaciones</div>
          <div className="text-sm text-white/90">Accede a todas las secciones de gestión territorial</div>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="nav-card rounded-xl p-4 border-teal-100">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg></div><div><div className="font-semibold">Municipios</div><div className="text-sm text-gray-500">Página actual</div></div></div>
          </div>
          <div className="nav-card rounded-xl p-4 border-teal-100" role="button" onClick={() => navigate('/locations/departamentos')}>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg></div><div><div className="font-semibold">Departamentos</div><div className="text-sm text-gray-500">Gestionar departamentos</div></div></div>
          </div>
          <div className="nav-card rounded-xl p-4 border-teal-100" role="button" onClick={() => navigate('/locations/importar-excel')}>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg></div><div><div className="font-semibold">Importar Excel</div><div className="text-sm text-gray-500">Carga masiva</div></div></div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="filter-section p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="font-semibold text-gray-700">Acciones de Municipios</div>
          <div className="text-sm text-gray-500">Operaciones disponibles</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="departamento-actions" onClick={openCreate}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            Nuevo Municipio
          </button>
          <button className="departamento-actions departamento-actions--light" onClick={refresh}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v6h6M20 20v-6h-6M20 4l-6 6M4 20l6-6"/></svg>
            Actualizar Lista
          </button>
          <button className="departamento-actions departamento-actions--light" onClick={() => navigate('/locations/importar-excel')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            Importar Excel
          </button>
          <button className="departamento-actions departamento-actions--light" onClick={() => navigate('/locations/departamentos')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg>
            Ver Departamentos
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filter-section p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-700">Filtros de Búsqueda</div>
          <button onClick={clearFilters} className="text-teal-600 text-sm hover:underline">Limpiar</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-2">Buscar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/></svg>
              </span>
              <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Nombre, código o departamento..." className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Departamento</label>
            <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
              <option value="">Todos</option>
              {departamentos.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Orden</label>
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-9 focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                <option value="nombre">Por nombre</option>
                <option value="codigo">Por código</option>
                <option value="departamento">Por departamento</option>
                <option value="fecha">Por fecha</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-zinc-800 shadow-lg rounded-xl border border-gray-100 dark:border-zinc-700 overflow-hidden">
        {error && (
          <div className="alert alert--error">{error}</div>
        )}
        {notice && (
          <div className="alert alert--success">{notice}</div>
        )}
        <div className="overflow-x-auto departamentos-table-wrap">
          <table className="min-w-full divide-y divide-blue-100 departamentos-table">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700">Municipio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700">Código</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700">Departamento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700">Fecha</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-blue-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">No hay municipios</td>
                </tr>
              ) : (
                pageItems.map((m) => (
                  <tr key={m.id ?? `${m.codigo}-${m.nombre}`} className="hover:bg-blue-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                          {(m.nombre || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 truncate" title={m.nombre || '-'}>{m.nombre || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-sm font-medium">{m.codigo || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">{m.departamento?.nombre || m.departamento_nombre || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button className="departamento-actions" title="Ver" onClick={() => openDetail(m)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button className="departamento-actions" title="Editar" onClick={() => openEdit(m)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button className="departamento-actions" title="Eliminar" onClick={() => openDelete(m)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={(pg)=>setPage(pg)}
          pageSize={itemsPerPage}
          onPageSizeChange={(n)=>{ setItemsPerPage(n); setPage(1); }}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          noun="municipios"
        />
      </div>

      {/* Modales */}
      <Modal
        isOpen={createOpen}
        onClose={closeAll}
        title="Nuevo Municipio"
        tone="teal"
        size="md"
        footer={(
          <>
            <Button variant="light" type="button" onClick={closeAll}>Cancelar</Button>
            <Button type="submit" form="municipio-create-form">{loading ? 'Guardando...' : 'Guardar'}</Button>
          </>
        )}
      >
        <form id="municipio-create-form" onSubmit={submitCreate} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Nombre *</label>
            <input required value={form.nombre} onChange={(e)=>setForm({...form, nombre:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Nombre del municipio" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-sm mb-1">Código</label>
              <input value={form.codigo} onChange={(e)=>setForm({...form, codigo:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Código" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Departamento</label>
              <select required value={form.departamento} onChange={(e)=>setForm({...form, departamento:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value="">Seleccione...</option>
                {departamentos.map(d => (<option key={d.id} value={d.id}>{d.nombre}</option>))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editState.open && !!editState.item}
        onClose={closeAll}
        title="Editar Municipio"
        tone="amber"
        size="md"
        footer={(
          <>
            <Button variant="light" type="button" onClick={closeAll}>Cancelar</Button>
            <Button type="submit" form="municipio-edit-form">{loading ? 'Actualizando...' : 'Actualizar'}</Button>
          </>
        )}
      >
        {editState.item && (
          <form id="municipio-edit-form" onSubmit={submitEdit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={(e)=>setForm({...form, nombre:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <label className="block text-sm mb-1">Código</label>
                <input value={form.codigo} onChange={(e)=>setForm({...form, codigo:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Departamento</label>
                <select required value={form.departamento} onChange={(e)=>setForm({...form, departamento:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                  <option value="">Seleccione...</option>
                  {departamentos.map(d => (<option key={d.id} value={d.id}>{d.nombre}</option>))}
                </select>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!detailState.open && !!detailState.item}
        onClose={closeAll}
        title={detailState.item?.nombre}
        tone="teal"
        size="xl"
        footer={(
          <>
            <Button onClick={() => { closeAll(); openEdit(detailState.item); }}>Editar</Button>
            <Button variant="light" onClick={closeAll}>Cerrar</Button>
          </>
        )}
      >
        {detailState.item && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-2 font-semibold">Información General</div>
              <dl className="space-y-2">
                <div><dt className="text-xs text-gray-500">Nombre:</dt><dd className="font-medium">{detailState.item.nombre || '—'}</dd></div>
                <div><dt className="text-xs text-gray-500">Código:</dt><dd>{detailState.item.codigo ? <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">{detailState.item.codigo}</span> : '—'}</dd></div>
                <div><dt className="text-xs text-gray-500">Departamento:</dt><dd>{detailState.item.departamento?.nombre || detailState.item.departamento_nombre || '—'}</dd></div>
              </dl>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-2 font-semibold">Estadísticas</div>
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center mx-auto mb-2 text-2xl font-bold">{(detailState.item.nombre || '?').charAt(0).toUpperCase()}</div>
                <p className="text-sm text-gray-600">Inicial del municipio</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={deleteState.open}
        onClose={closeAll}
        title={null}
        tone="red"
        size="md"
        footer={(
          <>
            <Button onClick={submitDelete}>{loading ? 'Eliminando...' : 'Eliminar'}</Button>
            <Button variant="light" onClick={closeAll}>Cancelar</Button>
          </>
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><TrashIcon className="w-5 h-5" /></div>
          <div>
            <div className="text-lg font-semibold">Confirmar eliminación</div>
            <div className="text-sm text-gray-600">¿Eliminar el municipio "{deleteState.nombre}"? Esta acción no se puede deshacer.</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MunicipiosList;
