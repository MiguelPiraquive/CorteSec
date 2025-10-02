import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../components/css/DepartamentosStyles.css';
import Modal from '../../components/UI/Modal/Modal';
import Pagination from '../../components/UI/Navigation/Pagination';
import { Button, IconButton } from '../../components/UI/Button/Button';
import { PlusIcon, ListIcon, EyeIcon, EditIcon, TrashIcon } from '../../components/icons';
import { empleadosService } from '../../services/empleadosService';
import locationsService from '../../services/locationsService';
import cargoService from '../../services/cargoService';

const EmpleadosList = () => {
	const navigate = useNavigate();

	// Datos
	const [empleados, setEmpleados] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	// UI
	const [searchTerm, setSearchTerm] = useState('');
	const [sortBy, setSortBy] = useState('apellidos'); // apellidos|documento|cargo|fecha
	const [page, setPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	// Modales
	const [createOpen, setCreateOpen] = useState(false);
	const [editState, setEditState] = useState({ open: false, item: null });
	const [detailState, setDetailState] = useState({ open: false, item: null });
	const [deleteState, setDeleteState] = useState({ open: false, id: null, nombre: '' });

	// Form
	const [form, setForm] = useState({ 
		nombres: '', 
		apellidos: '', 
		documento: '', 
		correo: '', 
		telefono: '', 
		direccion: '', 
		fecha_nacimiento: '', 
		genero: 'M', 
		departamento: '', 
		municipio: '', 
		cargo: '', 
		foto: null 
	});

	// Estados para datos de referencia
	const [departamentos, setDepartamentos] = useState([]);
	const [municipios, setMunicipios] = useState([]);
	const [cargos, setCargos] = useState([]);
	const [estadisticas, setEstadisticas] = useState(null);

	// Fetch inicial
	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError('');
			try {
				// Cargar datos en paralelo
				const [empleadosData, departamentosData, cargosData, statsData] = await Promise.all([
					empleadosService.getEmpleados(),
					locationsService.getDepartamentos(),
					cargoService.getCargos(),
					empleadosService.getEstadisticas()
				]);
				
				if (!cancelled) {
					const items = Array.isArray(empleadosData) ? empleadosData : (empleadosData.results || []);
					setEmpleados(items);
					setDepartamentos(Array.isArray(departamentosData) ? departamentosData : (departamentosData.results || []));
					setCargos(Array.isArray(cargosData) ? cargosData : (cargosData.results || []));
					setEstadisticas(statsData);
				}
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
			const [empleadosData, statsData] = await Promise.all([
				empleadosService.getEmpleados(),
				empleadosService.getEstadisticas()
			]);
			setEmpleados(Array.isArray(empleadosData) ? empleadosData : (empleadosData.results || []));
			setEstadisticas(statsData);
			setNotice('Lista actualizada');
			setTimeout(() => setNotice(''), 1500);
		} catch (e) {
			setError(e.message || 'Error al actualizar.');
		} finally {
			setLoading(false);
		}
	};

	// Cargar municipios cuando cambia el departamento
	const loadMunicipios = async (departamentoId) => {
		if (!departamentoId) {
			setMunicipios([]);
			return;
		}
		
		try {
			const municipiosData = await locationsService.getMunicipiosByDepartamento(departamentoId);
			setMunicipios(Array.isArray(municipiosData) ? municipiosData : (municipiosData.results || []));
		} catch (error) {
			console.error('Error cargando municipios:', error);
		}
	};

	// Derivados
	const filtered = useMemo(() => {
		const q = searchTerm.trim().toLowerCase();
		if (!q) return empleados;
		return empleados.filter(e => (
			(e.nombres || '').toLowerCase().includes(q) ||
			(e.apellidos || '').toLowerCase().includes(q) ||
			(e.documento || '').toLowerCase().includes(q) ||
			(e.correo || '').toLowerCase().includes(q) ||
			(e.telefono || '').toLowerCase().includes(q) ||
			(e.cargo_nombre || '').toLowerCase().includes(q)
		));
	}, [empleados, searchTerm]);

	const sorted = useMemo(() => {
		const arr = [...filtered];
		switch (sortBy) {
			case 'documento':
				arr.sort((a, b) => (a.documento || '').localeCompare(b.documento || ''));
				break;
			case 'cargo':
				arr.sort((a, b) => (a.cargo_nombre || '').localeCompare(b.cargo_nombre || ''));
				break;
			case 'fecha':
				arr.sort((a, b) => new Date(b.creado_el || 0) - new Date(a.creado_el || 0));
				break;
			default:
				arr.sort((a, b) => (a.apellidos || '').localeCompare(b.apellidos || ''));
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
		activos: filtered.filter(e => e.activo).length,
		inactivos: filtered.filter(e => !e.activo).length,
		masculinos: filtered.filter(e => e.genero === 'M').length,
		femeninos: filtered.filter(e => e.genero === 'F').length,
		recientes: filtered.filter(e => {
			const dt = e.creado_el ? new Date(e.creado_el) : null;
			if (!dt) return false;
			return (Date.now() - dt.getTime()) < 7 * 24 * 60 * 60 * 1000;
		}).length,
	}), [filtered]);

	// CRUD
	const openCreate = () => { 
		setForm({ 
			nombres: '', 
			apellidos: '', 
			documento: '', 
			correo: '', 
			telefono: '', 
			direccion: '', 
			fecha_nacimiento: '', 
			genero: 'M', 
			departamento: '', 
			municipio: '', 
			cargo: '', 
			foto: null 
		}); 
		setMunicipios([]);
		setCreateOpen(true); 
	};
	
	const openEdit = (item) => { 
		setForm({ 
			nombres: item.nombres || '', 
			apellidos: item.apellidos || '', 
			documento: item.documento || '', 
			correo: item.correo || '', 
			telefono: item.telefono || '', 
			direccion: item.direccion || '', 
			fecha_nacimiento: item.fecha_nacimiento || '', 
			genero: item.genero || 'M', 
			departamento: item.departamento || '', 
			municipio: item.municipio || '', 
			cargo: item.cargo || '', 
			foto: null 
		}); 
		
		// Cargar municipios del departamento actual
		if (item.departamento) {
			loadMunicipios(item.departamento);
		} else {
			setMunicipios([]);
		}
		
		setEditState({ open: true, item }); 
	};
	
	const openDetail = (item) => { 
		setDetailState({ open: true, item }); 
	};
	
	const openDelete = (item) => { 
		setDeleteState({ open: true, id: item.id, nombre: item.nombre_completo || `${item.nombres} ${item.apellidos}` }); 
	};
	
	const closeAll = () => { 
		setCreateOpen(false); 
		setEditState({ open: false, item: null }); 
		setDetailState({ open: false, item: null }); 
		setDeleteState({ open: false, id: null, nombre: '' }); 
		setForm({ 
			nombres: '', 
			apellidos: '', 
			documento: '', 
			correo: '', 
			telefono: '', 
			direccion: '', 
			fecha_nacimiento: '', 
			genero: 'M', 
			departamento: '', 
			municipio: '', 
			cargo: '', 
			foto: null 
		}); 
		setMunicipios([]);
	};

	const submitCreate = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		try {
			const submitData = new FormData();
			Object.keys(form).forEach(key => {
				if (form[key] !== null && form[key] !== '') {
					submitData.append(key, form[key]);
				}
			});

			await empleadosService.createEmpleado(submitData);
			await refresh();
			closeAll();
			setNotice('Empleado creado');
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
			const submitData = new FormData();
			Object.keys(form).forEach(key => {
				if (form[key] !== null && form[key] !== '') {
					submitData.append(key, form[key]);
				}
			});

			await empleadosService.updateEmpleado(editState.item.id, submitData);
			await refresh();
			closeAll();
			setNotice('Empleado actualizado');
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
			await empleadosService.toggleActivo(deleteState.id);
			await refresh();
			closeAll();
			setNotice('Estado del empleado actualizado');
		} catch (e2) {
			setError(e2.message || 'Error al cambiar estado.');
		} finally {
			setLoading(false);
		}
	};

	const clearFilters = () => { 
		setSearchTerm(''); 
		setSortBy('apellidos'); 
		setPage(1); 
	};

	// Handlers para formulario
	const handleInputChange = (e) => {
		const { name, value, type, files } = e.target;
		
		if (type === 'file') {
			setForm(prev => ({
				...prev,
				[name]: files[0]
			}));
		} else {
			setForm(prev => ({
				...prev,
				[name]: value
			}));
		}

		// Cargar municipios cuando cambia el departamento
		if (name === 'departamento') {
			setForm(prev => ({
				...prev,
				municipio: '' // Reset municipio
			}));
			loadMunicipios(value);
		}
	};

	// Loading inicial
	if (loading && empleados.length === 0 && !error) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-gray-200 dark:border-zinc-700 p-8">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
						<p className="text-gray-600 dark:text-gray-400">Cargando empleados...</p>
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
						<div className="text-sm opacity-90 mb-1">Dashboard • Empleados</div>
						<h1 className="text-2xl md:text-3xl font-extrabold">Gestión de Empleados</h1>
						<p className="text-white/80 mt-1">Sistema de control de personal de la empresa</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="light" onClick={() => navigate('/payroll/nominas')}><ListIcon className="w-4 h-4" /> Ver Nóminas</Button>
						<Button onClick={openCreate}><PlusIcon className="w-4 h-4" /> Nuevo Empleado</Button>
					</div>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg></div><div><div className="text-xs text-gray-500">Total Empleados</div><div className="text-2xl font-semibold">{stats.total}</div></div></div></div>
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div><div className="text-xs text-gray-500">Activos</div><div className="text-2xl font-semibold">{stats.activos}</div></div></div></div>
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0021 17.24L13.73 4.76a2 2 0 00-3.46 0L3 17.24A2 2 0 005.07 19z"/></svg></div><div><div className="text-xs text-gray-500">Inactivos</div><div className="text-2xl font-semibold">{stats.inactivos}</div></div></div></div>
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3A9 9 0 113 12a9 9 0 0118 0z"/></svg></div><div><div className="text-xs text-gray-500">Recientes</div><div className="text-2xl font-semibold">{stats.recientes}</div></div></div></div>
			</div>

			{/* Navegación */}
			<div className="filter-section border-2 border-transparent">
				<div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl px-5 py-3">
					<div className="font-semibold">Navegación de Nómina</div>
					<div className="text-sm text-white/90">Accede a todas las secciones de gestión de personal</div>
				</div>
				<div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="nav-card rounded-xl p-4 border-indigo-100">
						<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg></div><div><div className="font-semibold">Empleados</div><div className="text-sm text-gray-500">Página actual</div></div></div>
					</div>
					<div className="nav-card rounded-xl p-4 border-indigo-100" role="button" onClick={() => navigate('/payroll/nominas')}>
						<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg></div><div><div className="font-semibold">Nóminas</div><div className="text-sm text-gray-500">Gestionar nóminas</div></div></div>
					</div>
					<div className="nav-card rounded-xl p-4 border-indigo-100" role="button" onClick={() => navigate('/cargos')}>
						<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6m8 0H8"/></svg></div><div><div className="font-semibold">Cargos</div><div className="text-sm text-gray-500">Gestionar cargos</div></div></div>
					</div>
				</div>
			</div>

			{/* Acciones */}
			<div className="filter-section p-4">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
					<div className="font-semibold text-gray-700">Acciones de Empleados</div>
					<div className="text-sm text-gray-500">Operaciones disponibles</div>
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<button className="departamento-actions" onClick={openCreate}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
						Nuevo Empleado
					</button>
					<button className="departamento-actions departamento-actions--light" onClick={refresh}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v6h6M20 20v-6h-6M20 4l-6 6M4 20l6-6"/></svg>
						Actualizar Lista
					</button>
					<button className="departamento-actions departamento-actions--light" onClick={() => navigate('/cargos')}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6m8 0H8"/></svg>
						Ver Cargos
					</button>
					<button className="departamento-actions departamento-actions--light" onClick={() => navigate('/payroll/nominas')}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
						Ver Nóminas
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
							<input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Nombres, apellidos, documento, email, teléfono..." className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
						</div>
					</div>
					<div>
						<label className="block text-sm text-gray-600 mb-2">Orden</label>
						<div className="relative">
							<select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-9 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
								<option value="apellidos">Por apellidos</option>
								<option value="documento">Por documento</option>
								<option value="cargo">Por cargo</option>
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
								<th className="col-nombre px-4 py-3 text-left text-xs font-semibold text-blue-700">Empleado</th>
								<th className="col-codigo px-4 py-3 text-left text-xs font-semibold text-blue-700">Documento</th>
								<th className="col-municipios px-4 py-3 text-left text-xs font-semibold text-blue-700">Cargo</th>
								<th className="col-fecha px-4 py-3 text-left text-xs font-semibold text-blue-700">Contacto</th>
								<th className="col-fecha px-4 py-3 text-left text-xs font-semibold text-blue-700">Estado</th>
								<th className="col-acciones px-4 py-3 text-center text-xs font-semibold text-blue-700">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-blue-50">
							{pageItems.length === 0 ? (
								<tr>
									<td colSpan={6} className="text-center py-8 text-gray-400">No hay empleados</td>
								</tr>
							) : (
								pageItems.map((e) => (
									<tr key={e.id ?? `${e.documento}-${e.nombres}`} className={`hover:bg-blue-50 ${!e.activo ? 'opacity-60' : ''}`}>
										<td className="px-4 py-3">
											<div className="flex items-center gap-3">
												<div className="employee-avatar">
													{e.foto ? (
														<img
															src={e.foto}
															alt={e.nombre_completo}
															className="avatar-image"
														/>
													) : (
														<div className="avatar-placeholder">
															{((e.nombres || '') + ' ' + (e.apellidos || '')).trim().charAt(0).toUpperCase()}
														</div>
													)}
												</div>
												<div>
													<div className="font-medium text-gray-800 truncate" title={e.nombre_completo || `${e.nombres} ${e.apellidos}`}>
														{e.nombre_completo || `${e.nombres} ${e.apellidos}`}
													</div>
													<div className="text-xs text-gray-500">
														{e.genero === 'M' ? 'Masculino' : 
														 e.genero === 'F' ? 'Femenino' : 'Otro'}
														{e.edad && ` • ${e.edad} años`}
													</div>
												</div>
											</div>
										</td>
										<td className="px-4 py-3">
											<span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-sm font-medium font-mono">{e.documento || '—'}</span>
										</td>
										<td className="px-4 py-3">
											<span className="cargo-badge">{e.cargo_nombre || 'Sin cargo'}</span>
										</td>
										<td className="px-4 py-3">
											<div className="text-sm">
												{e.correo && (
													<div className="contact-item mb-1">📧 {e.correo}</div>
												)}
												{e.telefono && (
													<div className="contact-item">📱 {e.telefono}</div>
												)}
												{!e.correo && !e.telefono && (
													<span className="text-gray-400">Sin contacto</span>
												)}
											</div>
										</td>
										<td className="px-4 py-3">
											{e.activo ? (
												<span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">✅ Activo</span>
											) : (
												<span className="px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">❌ Inactivo</span>
											)}
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center justify-center gap-2">
												<IconButton title="Ver" onClick={() => openDetail(e)} icon={EyeIcon} />
												<IconButton title="Editar" onClick={() => openEdit(e)} icon={EditIcon} />
												<IconButton title={e.activo ? "Desactivar" : "Activar"} onClick={() => openDelete(e)} icon={TrashIcon} />
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
					noun="empleados"
				/>
			</div>

			{/* Modales */}
			<Modal
				isOpen={createOpen}
				onClose={closeAll}
				title="Nuevo Empleado"
				tone="indigo"
				size="xl"
				footer={(
					<>
						<Button variant="light" type="button" onClick={closeAll}>Cancelar</Button>
						<Button type="submit" form="empleado-create-form">{loading ? 'Guardando...' : 'Guardar'}</Button>
					</>
				)}
			>
				<form id="empleado-create-form" onSubmit={submitCreate} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Nombres *</label>
							<input required value={form.nombres} onChange={handleInputChange} name="nombres" className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Nombres del empleado" />
						</div>
						<div>
							<label className="block text-sm mb-1">Apellidos *</label>
							<input required value={form.apellidos} onChange={handleInputChange} name="apellidos" className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Apellidos del empleado" />
						</div>
						<div>
							<label className="block text-sm mb-1">Documento *</label>
							<input required value={form.documento} onChange={handleInputChange} name="documento" className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Número de documento" />
						</div>
						<div>
							<label className="block text-sm mb-1">Género</label>
							<select value={form.genero} onChange={handleInputChange} name="genero" className="w-full rounded-lg border border-gray-300 px-3 py-2">
								<option value="M">Masculino</option>
								<option value="F">Femenino</option>
								<option value="O">Otro</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Correo Electrónico</label>
							<input type="email" value={form.correo} onChange={handleInputChange} name="correo" className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="correo@ejemplo.com" />
						</div>
						<div>
							<label className="block text-sm mb-1">Teléfono</label>
							<input type="tel" value={form.telefono} onChange={handleInputChange} name="telefono" className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Número de teléfono" />
						</div>
						<div>
							<label className="block text-sm mb-1">Fecha de Nacimiento</label>
							<input type="date" value={form.fecha_nacimiento} onChange={handleInputChange} name="fecha_nacimiento" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
						</div>
						<div>
							<label className="block text-sm mb-1">Cargo *</label>
							<select required value={form.cargo} onChange={handleInputChange} name="cargo" className="w-full rounded-lg border border-gray-300 px-3 py-2">
								<option value="">Seleccionar cargo...</option>
								{cargos.map(cargo => (
									<option key={cargo.id} value={cargo.id}>
										{cargo.nombre}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Departamento</label>
							<select value={form.departamento} onChange={handleInputChange} name="departamento" className="w-full rounded-lg border border-gray-300 px-3 py-2">
								<option value="">Seleccionar departamento...</option>
								{departamentos.map(dept => (
									<option key={dept.id} value={dept.id}>
										{dept.nombre}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Municipio</label>
							<select value={form.municipio} onChange={handleInputChange} name="municipio" className="w-full rounded-lg border border-gray-300 px-3 py-2" disabled={!form.departamento}>
								<option value="">Seleccionar municipio...</option>
								{municipios.map(mun => (
									<option key={mun.id} value={mun.id}>
										{mun.nombre}
									</option>
								))}
							</select>
						</div>
					</div>
					<div>
						<label className="block text-sm mb-1">Dirección</label>
						<textarea value={form.direccion} onChange={handleInputChange} name="direccion" className="w-full rounded-lg border border-gray-300 px-3 py-2" rows="3" placeholder="Dirección de residencia" />
					</div>
					<div>
						<label className="block text-sm mb-1">Foto</label>
						<input type="file" onChange={handleInputChange} name="foto" className="w-full rounded-lg border border-gray-300 px-3 py-2" accept="image/*" />
					</div>
				</form>
			</Modal>

			{/* Editar */}
			<Modal
				isOpen={!!editState.open && !!editState.item}
				onClose={closeAll}
				title="Editar Empleado"
				tone="amber"
				size="xl"
				footer={(
					<>
						<Button variant="light" type="button" onClick={closeAll}>Cancelar</Button>
						<Button type="submit" form="empleado-edit-form">{loading ? 'Actualizando...' : 'Actualizar'}</Button>
					</>
				)}
			>
				{editState.item && (
					<form id="empleado-edit-form" onSubmit={submitEdit} className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm mb-1">Nombres *</label>
								<input required value={form.nombres} onChange={handleInputChange} name="nombres" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							</div>
							<div>
								<label className="block text-sm mb-1">Apellidos *</label>
								<input required value={form.apellidos} onChange={handleInputChange} name="apellidos" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							</div>
							<div>
								<label className="block text-sm mb-1">Documento *</label>
								<input required value={form.documento} onChange={handleInputChange} name="documento" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							</div>
							<div>
								<label className="block text-sm mb-1">Género</label>
								<select value={form.genero} onChange={handleInputChange} name="genero" className="w-full rounded-lg border border-gray-300 px-3 py-2">
									<option value="M">Masculino</option>
									<option value="F">Femenino</option>
									<option value="O">Otro</option>
								</select>
							</div>
							<div>
								<label className="block text-sm mb-1">Correo Electrónico</label>
								<input type="email" value={form.correo} onChange={handleInputChange} name="correo" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							</div>
							<div>
								<label className="block text-sm mb-1">Teléfono</label>
								<input type="tel" value={form.telefono} onChange={handleInputChange} name="telefono" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							</div>
							<div>
								<label className="block text-sm mb-1">Fecha de Nacimiento</label>
								<input type="date" value={form.fecha_nacimiento} onChange={handleInputChange} name="fecha_nacimiento" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							</div>
							<div>
								<label className="block text-sm mb-1">Cargo *</label>
								<select required value={form.cargo} onChange={handleInputChange} name="cargo" className="w-full rounded-lg border border-gray-300 px-3 py-2">
									<option value="">Seleccionar cargo...</option>
									{cargos.map(cargo => (
										<option key={cargo.id} value={cargo.id}>
											{cargo.nombre}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm mb-1">Departamento</label>
								<select value={form.departamento} onChange={handleInputChange} name="departamento" className="w-full rounded-lg border border-gray-300 px-3 py-2">
									<option value="">Seleccionar departamento...</option>
									{departamentos.map(dept => (
										<option key={dept.id} value={dept.id}>
											{dept.nombre}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm mb-1">Municipio</label>
								<select value={form.municipio} onChange={handleInputChange} name="municipio" className="w-full rounded-lg border border-gray-300 px-3 py-2" disabled={!form.departamento}>
									<option value="">Seleccionar municipio...</option>
									{municipios.map(mun => (
										<option key={mun.id} value={mun.id}>
											{mun.nombre}
										</option>
									))}
								</select>
							</div>
						</div>
						<div>
							<label className="block text-sm mb-1">Dirección</label>
							<textarea value={form.direccion} onChange={handleInputChange} name="direccion" className="w-full rounded-lg border border-gray-300 px-3 py-2" rows="3" />
						</div>
						<div>
							<label className="block text-sm mb-1">Foto</label>
							<input type="file" onChange={handleInputChange} name="foto" className="w-full rounded-lg border border-gray-300 px-3 py-2" accept="image/*" />
							{editState.item.foto && (
								<div className="mt-2">
									<img src={editState.item.foto} alt="Foto actual" className="w-20 h-20 rounded-full object-cover" />
									<span className="text-sm text-gray-600">Foto actual</span>
								</div>
							)}
						</div>
					</form>
				)}
			</Modal>

			{/* Detalle */}
			<Modal
				isOpen={!!detailState.open && !!detailState.item}
				onClose={closeAll}
				title={detailState.item?.nombre_completo || `${detailState.item?.nombres} ${detailState.item?.apellidos}`}
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
							<div className="text-sm text-gray-600 mb-2 font-semibold">Información Personal</div>
							<div className="flex items-center gap-3 mb-4">
								<div className="employee-avatar large">
									{detailState.item.foto ? (
										<img
											src={detailState.item.foto}
											alt={detailState.item.nombre_completo}
											className="avatar-image large"
										/>
									) : (
										<div className="avatar-placeholder large">
											{((detailState.item.nombres || '') + ' ' + (detailState.item.apellidos || '')).trim().charAt(0).toUpperCase()}
										</div>
									)}
								</div>
								<div>
									<div className="font-bold text-lg">{detailState.item.nombre_completo || `${detailState.item.nombres} ${detailState.item.apellidos}`}</div>
									<div className="cargo-badge">{detailState.item.cargo_nombre}</div>
								</div>
							</div>
							<dl className="space-y-2">
								<div><dt className="text-xs text-gray-500">Documento:</dt><dd className="font-medium font-mono">{detailState.item.documento || '—'}</dd></div>
								<div><dt className="text-xs text-gray-500">Género:</dt><dd>{detailState.item.genero === 'M' ? 'Masculino' : detailState.item.genero === 'F' ? 'Femenino' : 'Otro'}</dd></div>
								<div><dt className="text-xs text-gray-500">Edad:</dt><dd>{detailState.item.edad ? `${detailState.item.edad} años` : '—'}</dd></div>
								<div><dt className="text-xs text-gray-500">Fecha de Nacimiento:</dt><dd>{detailState.item.fecha_nacimiento ? new Date(detailState.item.fecha_nacimiento).toLocaleDateString('es-ES') : '—'}</dd></div>
							</dl>
						</div>
						<div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4">
							<div className="text-sm text-gray-600 mb-2 font-semibold">Información de Contacto y Ubicación</div>
							<dl className="space-y-2">
								<div><dt className="text-xs text-gray-500">Correo:</dt><dd>{detailState.item.correo || '—'}</dd></div>
								<div><dt className="text-xs text-gray-500">Teléfono:</dt><dd>{detailState.item.telefono || '—'}</dd></div>
								<div><dt className="text-xs text-gray-500">Dirección:</dt><dd>{detailState.item.direccion || '—'}</dd></div>
								<div><dt className="text-xs text-gray-500">Departamento:</dt><dd>{detailState.item.departamento_nombre || '—'}</dd></div>
								<div><dt className="text-xs text-gray-500">Municipio:</dt><dd>{detailState.item.municipio_nombre || '—'}</dd></div>
								<div><dt className="text-xs text-gray-500">Estado:</dt><dd>{detailState.item.activo ? <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">✅ Activo</span> : <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">❌ Inactivo</span>}</dd></div>
							</dl>
							<div className="mt-4">
								<div className="text-xs text-gray-500 mb-1">Fecha de Registro:</div>
								<div className="text-sm">{detailState.item.creado_el ? new Date(detailState.item.creado_el).toLocaleDateString('es-ES', {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								}) : '—'}</div>
							</div>
						</div>
					</div>
				)}
			</Modal>

			{/* Eliminar/Activar */}
			<Modal
				isOpen={deleteState.open}
				onClose={closeAll}
				title={null}
				tone="red"
				size="md"
				footer={(
					<>
						<Button onClick={submitDelete}>{loading ? 'Procesando...' : 'Confirmar'}</Button>
						<Button variant="light" onClick={closeAll}>Cancelar</Button>
					</>
				)}
			>
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><TrashIcon className="w-5 h-5" /></div>
					<div>
						<div className="text-lg font-semibold">Cambiar estado del empleado</div>
						<div className="text-sm text-gray-600">¿Confirmas cambiar el estado de "{deleteState.nombre}"?</div>
					</div>
				</div>
			</Modal>
		</div>
	);
};
export default EmpleadosList;
