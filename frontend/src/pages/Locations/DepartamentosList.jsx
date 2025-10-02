import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../components/css/DepartamentosStyles.css';
import Modal from '../../components/UI/Modal/Modal';
import Pagination from '../../components/UI/Navigation/Pagination';
import { Button, IconButton } from '../../components/UI/Button/Button';
import { PlusIcon, ListIcon, EyeIcon, EditIcon, TrashIcon } from '../../components/icons';
import { api } from '../../services/api';

const API_URL = '/api/locations/departamentos/';

// Util: CSRF para Django
function getCSRFToken() {
	const fromMeta = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
	const fromInput = document.querySelector('input[name="csrfmiddlewaretoken"]')?.value;
	return fromMeta || fromInput || '';
}

const DepartamentosList = () => {
	const navigate = useNavigate();

	// Datos
	const [departamentos, setDepartamentos] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	// UI
	const [searchTerm, setSearchTerm] = useState('');
	const [sortBy, setSortBy] = useState('nombre'); // nombre|codigo|municipios|fecha
	const [page, setPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	// Modales
	const [createOpen, setCreateOpen] = useState(false);
	const [editState, setEditState] = useState({ open: false, item: null });
	const [detailState, setDetailState] = useState({ open: false, item: null });
	const [deleteState, setDeleteState] = useState({ open: false, id: null, nombre: '' });

	// Form
	const [form, setForm] = useState({ nombre: '', codigo: '', capital: '', region: '' });

	// Fetch inicial
	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError('');
			try {
				const data = await api.get('/api/locations/departamentos/');
				const items = Array.isArray(data) ? data : (data.results || []);
				if (!cancelled) setDepartamentos(items);
			} catch (e) {
				if (!cancelled) setError(e.message || 'Error inesperado.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => { cancelled = true; };
	}, []);

	const refresh = async () => {
		setLoading(true);
		setError('');
		try {
			const data = await api.get('/api/locations/departamentos/');
			setDepartamentos(Array.isArray(data) ? data : (data.results || []));
			setNotice('Lista actualizada');
			setTimeout(() => setNotice(''), 1500);
		} catch (e) {
			setError(e.message || 'Error al actualizar.');
		} finally {
			setLoading(false);
		}
	};

	// Derivados
	const filtered = useMemo(() => {
		const q = searchTerm.trim().toLowerCase();
		if (!q) return departamentos;
		return departamentos.filter(d => (
			(d.nombre || '').toLowerCase().includes(q) ||
			(d.codigo || '').toLowerCase().includes(q) ||
			(d.capital || '').toLowerCase().includes(q) ||
			(d.region || '').toLowerCase().includes(q)
		));
	}, [departamentos, searchTerm]);

	const sorted = useMemo(() => {
		const arr = [...filtered];
		switch (sortBy) {
			case 'codigo':
				arr.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
				break;
			case 'municipios':
				arr.sort((a, b) => (b.municipios_count || 0) - (a.municipios_count || 0));
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

	const stats = useMemo(() => ({
		total: filtered.length,
		conMunicipios: filtered.filter(d => (d.municipios_count || 0) > 0).length,
		sinMunicipios: filtered.filter(d => (d.municipios_count || 0) === 0).length,
		recientes: filtered.filter(d => {
			const dt = d.created_at ? new Date(d.created_at) : null;
			if (!dt) return false;
			return (Date.now() - dt.getTime()) < 7 * 24 * 60 * 60 * 1000;
		}).length,
	}), [filtered]);

	// CRUD
	const openCreate = () => { setForm({ nombre: '', codigo: '', capital: '', region: '' }); setCreateOpen(true); };
	const openEdit = (item) => { setForm({ nombre: item.nombre || '', codigo: item.codigo || '', capital: item.capital || '', region: item.region || '' }); setEditState({ open: true, item }); };
	const openDetail = (item) => { setDetailState({ open: true, item }); };
	const openDelete = (item) => { setDeleteState({ open: true, id: item.id, nombre: item.nombre }); };
	const closeAll = () => { setCreateOpen(false); setEditState({ open: false, item: null }); setDetailState({ open: false, item: null }); setDeleteState({ open: false, id: null, nombre: '' }); setForm({ nombre: '', codigo: '', capital: '', region: '' }); };

	const submitCreate = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		try {
			await api.post('/api/locations/departamentos/', form);
			await refresh();
			closeAll();
			setNotice('Departamento creado');
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
			await api.put(`/api/locations/departamentos/${editState.item.id}/`, form);
			await refresh();
			closeAll();
			setNotice('Departamento actualizado');
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
			await api.delete(`/api/locations/departamentos/${deleteState.id}/`);
			await refresh();
			closeAll();
			setNotice('Departamento eliminado');
		} catch (e2) {
			setError(e2.message || 'Error al eliminar.');
		} finally {
			setLoading(false);
		}
	};

	const clearFilters = () => { setSearchTerm(''); setSortBy('nombre'); setPage(1); };



	// Loading inicial
	if (loading && departamentos.length === 0 && !error) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-gray-200 dark:border-zinc-700 p-8">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
						<p className="text-gray-600 dark:text-gray-400">Cargando departamentos...</p>
					</div>
				</div>
			</div>
		);
	}

		return (
			<div className="departamentos-view max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
			{/* Header */}
			<div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white rounded-2xl shadow-2xl p-6">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div>
						<div className="text-sm opacity-90 mb-1">Dashboard • Departamentos</div>
						<h1 className="text-2xl md:text-3xl font-extrabold">Gestión de Departamentos</h1>
						<p className="text-white/80 mt-1">Sistema de control de departamentos del país</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="light" onClick={() => navigate('/locations/municipios')}><ListIcon className="w-4 h-4" /> Ver Municipios</Button>
						<Button onClick={openCreate}><PlusIcon className="w-4 h-4" /> Nuevo Departamento</Button>
					</div>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg></div><div><div className="text-xs text-gray-500">Total Departamentos</div><div className="text-2xl font-semibold">{stats.total}</div></div></div></div>
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/></svg></div><div><div className="text-xs text-gray-500">Con Municipios</div><div className="text-2xl font-semibold">{stats.conMunicipios}</div></div></div></div>
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0021 17.24L13.73 4.76a2 2 0 00-3.46 0L3 17.24A2 2 0 005.07 19z"/></svg></div><div><div className="text-xs text-gray-500">Sin Municipios</div><div className="text-2xl font-semibold">{stats.sinMunicipios}</div></div></div></div>
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3A9 9 0 113 12a9 9 0 0118 0z"/></svg></div><div><div className="text-xs text-gray-500">Recientes</div><div className="text-2xl font-semibold">{stats.recientes}</div></div></div></div>
			</div>

			{/* Navegación */}
			<div className="filter-section border-2 border-transparent">
				<div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl px-5 py-3">
					<div className="font-semibold">Navegación de Ubicaciones</div>
					<div className="text-sm text-white/90">Accede a todas las secciones de gestión territorial</div>
				</div>
				<div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
					  <div className="nav-card rounded-xl p-4 border-indigo-100">
						<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg></div><div><div className="font-semibold">Departamentos</div><div className="text-sm text-gray-500">Página actual</div></div></div>
					</div>
					<div className="nav-card rounded-xl p-4 border-indigo-100" role="button" onClick={() => navigate('/locations/municipios')}>
						<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg></div><div><div className="font-semibold">Municipios</div><div className="text-sm text-gray-500">Gestionar municipios</div></div></div>
					</div>
					  <div className="nav-card rounded-xl p-4 border-indigo-100" role="button" onClick={() => navigate('/locations/importar-excel')}>
						<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg></div><div><div className="font-semibold">Importar Excel</div><div className="text-sm text-gray-500">Carga masiva</div></div></div>
					</div>
				</div>
			</div>

			{/* Acciones */}
			<div className="filter-section p-4">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
					<div className="font-semibold text-gray-700">Acciones de Departamentos</div>
					<div className="text-sm text-gray-500">Operaciones disponibles</div>
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<button className="departamento-actions" onClick={openCreate}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
						Nuevo Departamento
					</button>
					<button className="departamento-actions departamento-actions--light" onClick={refresh}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v6h6M20 20v-6h-6M20 4l-6 6M4 20l6-6"/></svg>
						Actualizar Lista
					</button>
					  <button className="departamento-actions departamento-actions--light" onClick={() => navigate('/locations/importar-excel')}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
						Importar Excel
					</button>
					<button className="departamento-actions departamento-actions--light" onClick={() => navigate('/locations/municipios')}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg>
						Ver Municipios
					</button>
				</div>
			</div>

			{/* Filtros */}
			<div className="filter-section p-5">
				<div className="flex items-center justify-between mb-4">
					<div className="font-semibold text-gray-700">Filtros de Búsqueda</div>
					<button onClick={clearFilters} className="text-indigo-600 text-sm hover:underline">Limpiar</button>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm text-gray-600 mb-2">Buscar</label>
						<div className="relative">
							<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/></svg>
							</span>
							<input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Nombre, código, capital, región..." className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
						</div>
					</div>
					<div>
						<label className="block text-sm text-gray-600 mb-2">Orden</label>
						<div className="relative">
							<select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-9 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
								<option value="nombre">Por nombre</option>
								<option value="codigo">Por código</option>
								<option value="municipios">Por municipios</option>
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
										<th className="col-nombre px-4 py-3 text-left text-xs font-semibold text-blue-700">Departamento</th>
										<th className="col-codigo px-4 py-3 text-left text-xs font-semibold text-blue-700">Código</th>
										<th className="col-municipios px-4 py-3 text-left text-xs font-semibold text-blue-700">Municipios</th>
										<th className="col-fecha px-4 py-3 text-left text-xs font-semibold text-blue-700">Fecha</th>
										<th className="col-acciones px-4 py-3 text-center text-xs font-semibold text-blue-700">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-blue-50">
							{pageItems.length === 0 ? (
								<tr>
									<td colSpan={5} className="text-center py-8 text-gray-400">No hay departamentos</td>
								</tr>
							) : (
								pageItems.map((d) => (
									<tr key={d.id ?? `${d.codigo}-${d.nombre}`} className="hover:bg-blue-50">
												<td className="px-4 py-3">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
													{(d.nombre || '?').charAt(0).toUpperCase()}
												</div>
														<span className="font-medium text-gray-800 truncate" title={d.nombre || '-'}>{d.nombre || '-'}</span>
											</div>
										</td>
										<td className="px-4 py-3">
											<span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-sm font-medium">{d.codigo || '—'}</span>
										</td>
										<td className="px-4 py-3">
											{(d.municipios_count || 0) > 0 ? (
												<span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">{d.municipios_count} municipios</span>
											) : (
												<span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">Sin municipios</span>
											)}
										</td>
										<td className="px-4 py-3 text-gray-600">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
															<td className="px-4 py-3">
											<div className="flex items-center justify-center gap-2">
												<IconButton title="Ver" onClick={() => openDetail(d)} icon={EyeIcon} />
												<IconButton title="Editar" onClick={() => openEdit(d)} icon={EditIcon} />
												<IconButton title="Eliminar" onClick={() => openDelete(d)} icon={TrashIcon} />
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
										noun="departamentos"
									/>
			</div>

			{/* Modales */}
			<Modal
				isOpen={createOpen}
				onClose={closeAll}
				title="Nuevo Departamento"
				tone="indigo"
				size="md"
				footer={(
					<>
						<Button variant="light" type="button" onClick={closeAll}>Cancelar</Button>
						<Button type="submit" form="depto-create-form">{loading ? 'Guardando...' : 'Guardar'}</Button>
					</>
				)}
			>
				<form id="depto-create-form" onSubmit={submitCreate} className="space-y-4">
					<div>
						<label className="block text-sm mb-1">Nombre *</label>
						<input required value={form.nombre} onChange={(e)=>setForm({...form, nombre:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Nombre del departamento" />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div>
							<label className="block text-sm mb-1">Código</label>
							<input value={form.codigo} onChange={(e)=>setForm({...form, codigo:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Código" />
						</div>
						<div>
							<label className="block text-sm mb-1">Capital</label>
							<input value={form.capital} onChange={(e)=>setForm({...form, capital:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Capital" />
						</div>
						<div>
							<label className="block text-sm mb-1">Región</label>
							<input value={form.region} onChange={(e)=>setForm({...form, region:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Región" />
						</div>
					</div>
				</form>
			</Modal>

			{/* Editar */}
			<Modal
				isOpen={!!editState.open && !!editState.item}
				onClose={closeAll}
				title="Editar Departamento"
				tone="amber"
				size="md"
				footer={(
					<>
						<Button variant="light" type="button" onClick={closeAll}>Cancelar</Button>
						<Button type="submit" form="depto-edit-form">{loading ? 'Actualizando...' : 'Actualizar'}</Button>
					</>
				)}
			>
				{editState.item && (
					<form id="depto-edit-form" onSubmit={submitEdit} className="space-y-4">
						<div>
							<label className="block text-sm mb-1">Nombre *</label>
							<input required value={form.nombre} onChange={(e)=>setForm({...form, nombre:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div>
								<label className="block text-sm mb-1">Código</label>
								<input value={form.codigo} onChange={(e)=>setForm({...form, codigo:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							</div>
							<div>
								<label className="block text-sm mb-1">Capital</label>
								<input value={form.capital} onChange={(e)=>setForm({...form, capital:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							</div>
							<div>
								<label className="block text-sm mb-1">Región</label>
								<input value={form.region} onChange={(e)=>setForm({...form, region:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							</div>
						</div>
					</form>
				)}
			</Modal>

			{/* Detalle */}
			<Modal
				isOpen={!!detailState.open && !!detailState.item}
				onClose={closeAll}
				title={detailState.item?.nombre}
				tone="blue"
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
								<div><dt className="text-xs text-gray-500">Capital:</dt><dd>{detailState.item.capital || '—'}</dd></div>
								<div><dt className="text-xs text-gray-500">Región:</dt><dd>{detailState.item.region || '—'}</dd></div>
							</dl>
						</div>
						<div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4">
							<div className="text-sm text-gray-600 mb-2 font-semibold">Estadísticas</div>
							<div className="text-center">
								<div className="w-16 h-16 bg-green-100 text-green-700 rounded-xl flex items-center justify-center mx-auto mb-2 text-2xl font-bold">{detailState.item.municipios_count || 0}</div>
								<p className="text-sm text-gray-600">Municipios registrados</p>
							</div>
						</div>
					</div>
				)}
			</Modal>

			{/* Eliminar */}
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
						<div className="text-sm text-gray-600">¿Eliminar el departamento "{deleteState.nombre}"? Esta acción no se puede deshacer.</div>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default DepartamentosList;

