import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import Modal from '../../components/UI/Modal/Modal';
import Pagination from '../../components/UI/Navigation/Pagination';
import { Button, IconButton } from '../../components/UI/Button/Button';
import cargoService from '../../services/cargoService';
import '../../components/css/DepartamentosStyles.css';

const CargosList = () => {
	const navigate = useNavigate();

	// Estados principales
	const [cargos, setCargos] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	// Estados para modales
	const [createOpen, setCreateOpen] = useState(false);
	const [editState, setEditState] = useState({ open: false, item: null });
	const [detailState, setDetailState] = useState({ open: false, item: null });
	const [deleteState, setDeleteState] = useState({ open: false, id: null, nombre: '' });

	// Estados para formularios
	const [form, setForm] = useState({
		codigo: '',
		nombre: '',
		descripcion: '',
		activo: true,
		cargo_superior: '',
		nivel_jerarquico: 1,
		salario_base_min: '',
		salario_base_max: '',
		requiere_aprobacion: false,
		departamento: '',
		// Campos adicionales para el modal de editar
		nivel: '',
		area_trabajo: '',
		salario_base: '',
		horas_semanales: ''
	});

	// Estados para filtros
	const [searchTerm, setSearchTerm] = useState('');
	const [sortBy, setSortBy] = useState('nivel_jerarquico');

	// Estados para paginación
	const [page, setPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	// Opciones para los selects
	const nivelesOptions = [
		{ value: '1', label: 'Directivo' },
		{ value: '2', label: 'Gerencial' },
		{ value: '3', label: 'Jefe' },
		{ value: '4', label: 'Coordinador' },
		{ value: '5', label: 'Operativo' }
	];

	const areasOptions = [
		{ value: 'administracion', label: 'Administración' },
		{ value: 'recursos_humanos', label: 'Recursos Humanos' },
		{ value: 'operaciones', label: 'Operaciones' },
		{ value: 'ventas', label: 'Ventas' },
		{ value: 'marketing', label: 'Marketing' },
		{ value: 'tecnologia', label: 'Tecnología' },
		{ value: 'finanzas', label: 'Finanzas' },
		{ value: 'legal', label: 'Legal' }
	];

	const departamentosOptions = [
		{ value: 'contabilidad', label: 'Contabilidad' },
		{ value: 'nomina', label: 'Nómina' },
		{ value: 'compras', label: 'Compras' },
		{ value: 'logistica', label: 'Logística' },
		{ value: 'produccion', label: 'Producción' },
		{ value: 'calidad', label: 'Calidad' },
		{ value: 'seguridad', label: 'Seguridad' },
		{ value: 'mantenimiento', label: 'Mantenimiento' }
	];

	// Carga inicial
	useEffect(() => {
		refresh();
	}, []);

	const refresh = async () => {
		setLoading(true);
		setError('');
		try {
			console.log('🔄 Cargando cargos...'); // Debug
			const data = await cargoService.getCargos();
			console.log('📊 Datos recibidos:', data); // Debug
			
			// Asegurar que siempre tengamos un array
			const cargosList = Array.isArray(data) ? data : 
							  Array.isArray(data?.results) ? data.results :
							  Array.isArray(data?.data) ? data.data : [];
			
			setCargos(cargosList);
			console.log('✅ Cargos establecidos:', cargosList.length); // Debug
		} catch (err) {
			console.error('❌ Error cargando cargos:', err); // Debug
			setError(err.message || 'Error al cargar cargos');
			setCargos([]); // Asegurar que cargos sea un array vacío en caso de error
		} finally {
			setLoading(false);
		}
	};

	// Cerrar todos los modales
	const closeAll = () => {
		setCreateOpen(false);
		setEditState({ open: false, item: null });
		setDetailState({ open: false, item: null });
		setDeleteState({ open: false, id: null, nombre: '' });
		setForm({
			codigo: '',
			nombre: '',
			descripcion: '',
			activo: true,
			cargo_superior: '',
			nivel_jerarquico: 1,
			salario_base_min: '',
			salario_base_max: '',
			requiere_aprobacion: false,
			departamento: '',
			// Campos adicionales para el modal de editar
			nivel: '',
			area_trabajo: '',
			salario_base: '',
			horas_semanales: ''
		});
		setError('');
	};

	// Abrir modales
	const openCreate = () => {
		closeAll();
		setCreateOpen(true);
	};

	const openEdit = (item) => {
		closeAll();
		setForm({
			codigo: item.codigo || '',
			nombre: item.nombre || '',
			descripcion: item.descripcion || '',
			activo: item.activo ?? true,
			cargo_superior: item.cargo_superior || '',
			nivel_jerarquico: item.nivel_jerarquico || 1,
			salario_base_min: item.salario_base_min || '',
			salario_base_max: item.salario_base_max || '',
			requiere_aprobacion: item.requiere_aprobacion ?? false,
			departamento: item.departamento || '',
			// Campos adicionales para el modal de editar
			nivel: item.nivel || item.nivel_jerarquico || '',
			area_trabajo: item.area_trabajo || '',
			salario_base: item.salario_base || '',
			horas_semanales: item.horas_semanales || ''
		});
		setEditState({ open: true, item });
	};

	const openDetail = (item) => {
		closeAll();
		setDetailState({ open: true, item });
	};

	const openDelete = (item) => {
		closeAll();
		setDeleteState({ open: true, id: item.id, nombre: item.nombre || 'Sin nombre' });
	};

	// Filtrado y paginación
	const filtered = useMemo(() => {
		// Asegurar que cargos sea siempre un array
		const cargosList = Array.isArray(cargos) ? cargos : [];
		const q = searchTerm.trim().toLowerCase();
		if (!q) return cargosList;
		
		return cargosList.filter(c => (
			(c?.nombre || '').toLowerCase().includes(q) ||
			(c?.descripcion || '').toLowerCase().includes(q) ||
			(c?.departamento || '').toLowerCase().includes(q) ||
			(c?.cargo_superior_nombre || '').toLowerCase().includes(q)
		));
	}, [cargos, searchTerm]);

	const sorted = useMemo(() => {
		// Asegurar que filtered sea siempre un array
		const filteredList = Array.isArray(filtered) ? filtered : [];
		const arr = [...filteredList];
		
		switch (sortBy) {
			case 'nombre':
				arr.sort((a, b) => (a?.nombre || '').localeCompare(b?.nombre || ''));
				break;
			case 'salario':
				arr.sort((a, b) => (b?.salario_base || 0) - (a?.salario_base || 0));
				break;
			case 'fecha':
				arr.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
				break;
			default:
				arr.sort((a, b) => (a?.nivel_jerarquico || 0) - (b?.nivel_jerarquico || 0));
		}
		return arr;
	}, [filtered, sortBy]);

	const totalItems = sorted?.length || 0;
	const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
	const currentPage = Math.min(page, totalPages);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
	const pageItems = Array.isArray(sorted) ? sorted.slice(startIndex, endIndex) : [];

	const stats = useMemo(() => {
		// Asegurar que filtered sea un array
		const filteredList = Array.isArray(filtered) ? filtered : [];
		
		return {
			total: filteredList.length,
			activos: filteredList.filter(c => c?.activo).length,
			inactivos: filteredList.filter(c => !c?.activo).length,
			porNivel: filteredList.reduce((acc, c) => {
				const nivel = c?.nivel_jerarquico || 0;
				acc[nivel] = (acc[nivel] || 0) + 1;
				return acc;
			}, {}),
			recientes: filteredList.filter(c => {
				const dt = c?.created_at ? new Date(c.created_at) : null;
				if (!dt || isNaN(dt.getTime())) return false;
				return (Date.now() - dt.getTime()) < 7 * 24 * 60 * 60 * 1000;
			}).length,
		};
	}, [filtered]);

	// CRUD
	const openCreateModal = () => {
		setForm({
			codigo: '',
			nombre: '',
			descripcion: '',
			activo: true,
			cargo_superior: '',
			nivel_jerarquico: 1,
			salario_base_min: '',
			salario_base_max: '',
			requiere_aprobacion: false,
			departamento: '',
			// Campos adicionales para el modal de editar
			nivel: '',
			area_trabajo: '',
			salario_base: '',
			horas_semanales: ''
		});
		setCreateOpen(true);
	};

	const submitCreate = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		try {
			await cargoService.createCargo(form);
			await refresh();
			closeAll();
			setNotice('Cargo creado exitosamente');
		} catch (err) {
			setError(err.message || 'Error al crear cargo');
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
			await cargoService.updateCargo(editState.item.id, form);
			await refresh();
			closeAll();
			setNotice('Cargo actualizado exitosamente');
		} catch (err) {
			setError(err.message || 'Error al actualizar cargo');
		} finally {
			setLoading(false);
		}
	};

	const submitDelete = async () => {
		if (!deleteState.id) return;
		setLoading(true);
		setError('');
		try {
			await cargoService.toggleActivo(deleteState.id);
			await refresh();
			closeAll();
			setNotice('Estado del cargo actualizado');
		} catch (err) {
			setError(err.message || 'Error al cambiar estado');
		} finally {
			setLoading(false);
		}
	};

	const clearFilters = () => {
		setSearchTerm('');
		setSortBy('nivel_jerarquico');
		setPage(1);
	};

	// Handlers para formulario
	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setForm(prev => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value
		}));
	};

	// Utilidades
	const formatCurrency = (amount) => {
		if (!amount) return 'N/A';
		return new Intl.NumberFormat('es-CO', {
			style: 'currency',
			currency: 'COP',
			minimumFractionDigits: 0
		}).format(amount);
	};

	const getNivelColor = (nivel) => {
		const colors = {
			1: 'bg-red-100 text-red-800',
			2: 'bg-orange-100 text-orange-800',
			3: 'bg-blue-100 text-blue-800',
			4: 'bg-green-100 text-green-800',
			5: 'bg-purple-100 text-purple-800'
		};
		return colors[nivel] || 'bg-gray-100 text-gray-800';
	};

	const getNivelNombre = (nivel) => {
		const nombres = {
			1: 'Directivo',
			2: 'Gerencial',
			3: 'Jefe',
			4: 'Coordinador',
			5: 'Operativo'
		};
		return nombres[nivel] || 'Sin definir';
	};

	// Loading inicial
	if (loading && !Array.isArray(cargos) && !error) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-gray-200 dark:border-zinc-700 p-8">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
						<p className="text-gray-600 dark:text-gray-400">Cargando cargos...</p>
					</div>
				</div>
			</div>
		);
	}

	// Error state
	if (error && !Array.isArray(cargos)) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-red-200 dark:border-red-700 p-8">
					<div className="text-center">
						<div className="text-red-600 mb-4">
							<svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0021 17.24L13.73 4.76a2 2 0 00-3.46 0L3 17.24A2 2 0 005.07 19z" />
							</svg>
						</div>
						<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Error al cargar cargos</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
						<div className="flex justify-center gap-3">
							<Button onClick={refresh}>Reintentar</Button>
							<Button variant="secondary" onClick={() => setError('')}>Cerrar</Button>
						</div>
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
						<div className="text-sm opacity-90 mb-1">Dashboard • Cargos</div>
						<h1 className="text-2xl md:text-3xl font-extrabold">Gestión de Cargos</h1>
						<p className="text-white/80 mt-1">Sistema de control de estructura organizacional y jerarquía</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="light" onClick={() => navigate('/payroll/empleados')}><ListBulletIcon className="w-4 h-4" /> Ver Empleados</Button>
						<Button onClick={openCreate}><PlusIcon className="w-4 h-4" /> Nuevo Cargo</Button>
					</div>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6m8 0H8"/></svg></div><div><div className="text-xs text-gray-500">Total Cargos</div><div className="text-2xl font-semibold">{stats.total}</div></div></div></div>
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div><div className="text-xs text-gray-500">Activos</div><div className="text-2xl font-semibold">{stats.activos}</div></div></div></div>
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0021 17.24L13.73 4.76a2 2 0 00-3.46 0L3 17.24A2 2 0 005.07 19z"/></svg></div><div><div className="text-xs text-gray-500">Inactivos</div><div className="text-2xl font-semibold">{stats.inactivos}</div></div></div></div>
				<div className="stats-card p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3A9 9 0 113 12a9 9 0 0118 0z"/></svg></div><div><div className="text-xs text-gray-500">Recientes</div><div className="text-2xl font-semibold">{stats.recientes}</div></div></div></div>
			</div>

			{/* Navegación */}
			<div className="filter-section border-2 border-transparent">
				<div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl px-5 py-3">
					<div className="font-semibold">Navegación de Recursos Humanos</div>
					<div className="text-sm text-white/90">Accede a todas las secciones de gestión organizacional</div>
				</div>
				<div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="nav-card rounded-xl p-4 border-indigo-100">
						<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6m8 0H8"/></svg></div><div><div className="font-semibold">Cargos</div><div className="text-sm text-gray-500">Página actual</div></div></div>
					</div>
					<div className="nav-card rounded-xl p-4 border-indigo-100" role="button" onClick={() => navigate('/payroll/empleados')}>
						<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg></div><div><div className="font-semibold">Empleados</div><div className="text-sm text-gray-500">Gestionar personal</div></div></div>
					</div>
					<div className="nav-card rounded-xl p-4 border-indigo-100" role="button" onClick={() => navigate('/payroll/nominas')}>
						<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg></div><div><div className="font-semibold">Nóminas</div><div className="text-sm text-gray-500">Procesar pagos</div></div></div>
					</div>
				</div>
			</div>

			{/* Acciones */}
			<div className="filter-section p-4">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
					<div className="font-semibold text-gray-700">Acciones de Cargos</div>
					<div className="text-sm text-gray-500">Operaciones disponibles</div>
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<button className="departamento-actions" onClick={openCreate}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
						Nuevo Cargo
					</button>
					<button className="departamento-actions departamento-actions--light" onClick={refresh}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v6h6M20 20v-6h-6M20 4l-6 6M4 20l6-6"/></svg>
						Actualizar Lista
					</button>
					<button className="departamento-actions departamento-actions--light" onClick={() => navigate('/payroll/empleados')}>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
						Ver Empleados
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
							<input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Nombre, descripción, departamento..." className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
						</div>
					</div>
					<div>
						<label className="block text-sm text-gray-600 mb-2">Orden</label>
						<div className="relative">
							<select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-9 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
								<option value="nivel_jerarquico">Por nivel jerárquico</option>
								<option value="nombre">Por nombre</option>
								<option value="salario">Por salario</option>
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
								<th className="col-nombre px-4 py-3 text-left text-xs font-semibold text-blue-700">Cargo</th>
								<th className="col-codigo px-4 py-3 text-left text-xs font-semibold text-blue-700">Nivel</th>
								<th className="col-municipios px-4 py-3 text-left text-xs font-semibold text-blue-700">Salario Base</th>
								<th className="col-fecha px-4 py-3 text-left text-xs font-semibold text-blue-700">Superior</th>
								<th className="col-fecha px-4 py-3 text-left text-xs font-semibold text-blue-700">Estado</th>
								<th className="col-acciones px-4 py-3 text-center text-xs font-semibold text-blue-700">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-blue-50">
							{pageItems.length === 0 ? (
								<tr>
									<td colSpan={6} className="text-center py-8 text-gray-400">No hay cargos</td>
								</tr>
							) : (
								pageItems.map((c) => (
									<tr key={c.id ?? `${c.nombre}-${c.nivel_jerarquico}`} className={`hover:bg-blue-50 ${!c.activo ? 'opacity-60' : ''}`}>
										<td className="px-4 py-3">
											<div className="flex items-center gap-3">
												<div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${getNivelColor(c.nivel_jerarquico)}`}>
													{c.nivel_jerarquico || '?'}
												</div>
												<div>
													<div className="font-medium text-gray-800 truncate" title={c.nombre || '-'}>
														{c.nombre || '-'}
													</div>
													<div className="text-xs text-gray-500 truncate" title={c.descripcion}>
														{c.descripcion || 'Sin descripción'}
													</div>
												</div>
											</div>
										</td>
										<td className="px-4 py-3">
											<span className={`px-2 py-1 rounded-full text-xs font-semibold ${getNivelColor(c.nivel_jerarquico)}`}>
												{getNivelNombre(c.nivel_jerarquico)}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="font-medium text-gray-900">
												{formatCurrency(c.salario_base)}
											</div>
										</td>
										<td className="px-4 py-3">
											{c.cargo_superior_nombre ? (
												<div className="text-sm">
													<div className="font-medium text-gray-900">{c.cargo_superior_nombre}</div>
												</div>
											) : (
												<span className="text-gray-400 text-sm">Sin superior</span>
											)}
										</td>
										<td className="px-4 py-3">
											{c.activo ? (
												<span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">✅ Activo</span>
											) : (
												<span className="px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">❌ Inactivo</span>
											)}
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center justify-center gap-2">
												<IconButton title="Ver" onClick={() => openDetail(c)} icon={EyeIcon} />
												<IconButton title="Editar" onClick={() => openEdit(c)} icon={PencilIcon} />
												<IconButton title={c.activo ? "Desactivar" : "Activar"} onClick={() => openDelete(c)} icon={TrashIcon} />
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
					noun="cargos"
				/>
			</div>

			 {/* Modal Crear */}
			 <Modal isOpen={createOpen} onClose={closeAll} title="Nuevo Cargo" size="2xl">
				 <form onSubmit={submitCreate} className="space-y-6">
					 {/* Sección principal con 2 columnas */}
					 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						 {/* Información Básica - Columna Izquierda */}
						 <div className="rounded-xl border p-6 bg-blue-50">
							 <h3 className="text-lg font-semibold text-blue-800 mb-6">Información Básica</h3>
							 <div className="space-y-6">
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Código *</label>
									 <input type="text" name="codigo" value={form.codigo} onChange={handleInputChange} required placeholder="Código único del cargo" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
								 </div>
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del cargo *</label>
									 <input type="text" name="nombre" value={form.nombre} onChange={handleInputChange} required placeholder="Nombre del cargo" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
								 </div>
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
									 <textarea name="descripcion" value={form.descripcion} onChange={handleInputChange} rows={3} placeholder="Descripción detallada del cargo y sus responsabilidades" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
								 </div>
								 <div className="flex items-center">
									 <input type="checkbox" name="activo" id="activo-create" checked={form.activo} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
									 <label htmlFor="activo-create" className="ml-2 block text-sm text-gray-700">Activo</label>
								 </div>
							 </div>
						 </div>
						 {/* Jerarquía y Configuración - Columna Derecha */}
						 <div className="rounded-xl border p-6 bg-purple-50">
							 <h3 className="text-lg font-semibold text-purple-800 mb-6">Jerarquía y Configuración</h3>
							 <div className="space-y-6">
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Nivel *</label>
									 <select name="nivel_jerarquico" value={form.nivel_jerarquico} onChange={handleInputChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2">
										 <option value="">Seleccionar nivel jerárquico</option>
										 {nivelesOptions.map(option => (
											 <option key={option.value} value={option.value}>{option.label}</option>
										 ))}
									 </select>
								 </div>
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Salario base mínimo *</label>
									 <input type="number" name="salario_base_min" value={form.salario_base_min} onChange={handleInputChange} min={0} required placeholder="Monto en COP" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
								 </div>
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Salario base máximo</label>
									 <input type="number" name="salario_base_max" value={form.salario_base_max} onChange={handleInputChange} min={0} placeholder="Monto en COP" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
								 </div>
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
									 <select name="departamento" value={form.departamento} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2">
										 <option value="">Sin departamento específico</option>
										 {departamentosOptions.map(option => (
											 <option key={option.value} value={option.value}>{option.label}</option>
										 ))}
									 </select>
								 </div>
							 </div>
						 </div>
					 </div>
					 {/* Configuración Avanzada */}
					 <div className="rounded-xl border p-6 bg-green-50">
						 <h3 className="text-lg font-semibold text-green-800 mb-6">Configuración Avanzada</h3>
						 <div className="flex items-center">
							 <input type="checkbox" name="requiere_aprobacion" id="requiere-aprobacion-create" checked={form.requiere_aprobacion} onChange={handleInputChange} className="h-4 w-4 text-green-600 border-gray-300 rounded" />
							 <label htmlFor="requiere-aprobacion-create" className="ml-2 block text-sm text-gray-700">Requiere aprobación especial</label>
						 </div>
					 </div>
					 {/* Info importante */}
					 <div className="rounded-xl border p-4 bg-blue-100 text-blue-900 text-sm">
						 <div className="font-bold mb-2">Información importante sobre cargos</div>
						 <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 list-disc pl-5">
							 <li>El código debe ser único para cada cargo</li>
							 <li>El salario base puede ser modificado según el nivel salarial</li>
							 <li>Las funciones describen las responsabilidades del cargo</li>
							 <li>Solo los cargos activos aparecerán en los formularios de empleado</li>
						 </ul>
					 </div>
					 {error && (<div className="text-red-600 text-sm">{error}</div>)}
					 <div className="flex justify-end gap-3 mt-4">
						 <Button type="button" variant="secondary" onClick={closeAll}>Cancelar</Button>
						 <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear Cargo'}</Button>
					 </div>
				 </form>
			 </Modal>

			 {/* Modal Editar */}
			 <Modal isOpen={editState.open} onClose={closeAll} title="Editar Cargo" size="2xl">
				 <form onSubmit={submitEdit} className="space-y-6">
					 {/* Sección principal con 2 columnas */}
					 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						 {/* Información Básica - Columna Izquierda */}
						 <div className="rounded-xl border p-6 bg-blue-50">
							 <h3 className="text-lg font-semibold text-blue-800 mb-6">Información Básica</h3>
							 <div className="space-y-6">
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Código *</label>
									 <input type="text" name="codigo" value={form.codigo} onChange={handleInputChange} required placeholder="Código único del cargo" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
								 </div>
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del cargo *</label>
									 <input type="text" name="nombre" value={form.nombre} onChange={handleInputChange} required placeholder="Nombre del cargo" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
								 </div>
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
									 <textarea name="descripcion" value={form.descripcion} onChange={handleInputChange} rows={3} placeholder="Descripción detallada del cargo y sus responsabilidades" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
								 </div>
								 <div className="flex items-center">
									 <input type="checkbox" name="activo" id="activo-edit" checked={form.activo} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
									 <label htmlFor="activo-edit" className="ml-2 block text-sm text-gray-700">Activo</label>
								 </div>
							 </div>
						 </div>
						 {/* Jerarquía y Configuración - Columna Derecha */}
						 <div className="rounded-xl border p-6 bg-purple-50">
							 <h3 className="text-lg font-semibold text-purple-800 mb-6">Jerarquía y Configuración</h3>
							 <div className="space-y-6">
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Nivel *</label>
									 <select name="nivel" value={form.nivel} onChange={handleInputChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2">
										 <option value="">Seleccionar nivel jerárquico</option>
										 {nivelesOptions.map(option => (
											 <option key={option.value} value={option.value}>{option.label}</option>
										 ))}
									 </select>
								 </div>
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Área de trabajo *</label>
									 <select name="area_trabajo" value={form.area_trabajo} onChange={handleInputChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2">
										 <option value="">Seleccionar área</option>
										 {areasOptions.map(option => (
											 <option key={option.value} value={option.value}>{option.label}</option>
										 ))}
									 </select>
								 </div>
								 <div>
									 <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
									 <select name="departamento" value={form.departamento} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2">
										 <option value="">Sin departamento específico</option>
										 {departamentosOptions.map(option => (
											 <option key={option.value} value={option.value}>{option.label}</option>
										 ))}
									 </select>
								 </div>
							 </div>
						 </div>
					 </div>
					 {/* Configuración Avanzada */}
					 <div className="rounded-xl border p-6 bg-green-50">
						 <h3 className="text-lg font-semibold text-green-800 mb-6">Configuración Avanzada</h3>
						 <div className="space-y-6">
							 <div>
								 <label className="block text-sm font-medium text-gray-700 mb-2">Salario base *</label>
								 <input type="number" name="salario_base" value={form.salario_base} onChange={handleInputChange} required min={0} placeholder="Monto en COP" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							 </div>
							 <div>
								 <label className="block text-sm font-medium text-gray-700 mb-2">Horas semanales *</label>
								 <input type="number" name="horas_semanales" value={form.horas_semanales} onChange={handleInputChange} required min={1} max={168} placeholder="Ej: 40" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
							 </div>
							 <div className="flex items-center">
								 <input type="checkbox" name="requiere_aprobacion" id="requiere-aprobacion-edit" checked={form.requiere_aprobacion} onChange={handleInputChange} className="h-4 w-4 text-green-600 border-gray-300 rounded" />
								 <label htmlFor="requiere-aprobacion-edit" className="ml-2 block text-sm text-gray-700">Requiere aprobación especial</label>
							 </div>
						 </div>
					 </div>
					 {/* Info importante */}
					 <div className="rounded-xl border p-4 bg-blue-100 text-blue-900 text-sm">
						 <div className="font-bold mb-2">Información importante sobre cargos</div>
						 <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 list-disc pl-5">
							 <li>El código debe ser único para cada cargo</li>
							 <li>El salario base puede ser modificado según el nivel salarial</li>
							 <li>Las funciones describen las responsabilidades del cargo</li>
							 <li>Solo los cargos activos aparecerán en los formularios de empleado</li>
						 </ul>
					 </div>
					 {error && (<div className="text-red-600 text-sm">{error}</div>)}
					 <div className="flex justify-end gap-3 mt-4">
						 <Button type="button" variant="secondary" onClick={closeAll}>Cancelar</Button>
						 <Button type="submit" disabled={loading}>{loading ? 'Actualizando...' : 'Actualizar Cargo'}</Button>
					 </div>
				 </form>
			 </Modal>

			{/* Modal Detalle */}
			<Modal isOpen={detailState.open} onClose={closeAll} title="Detalles del Cargo">
				{detailState.item && (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700">Nombre</label>
							<p className="mt-1 text-sm text-gray-900">{detailState.item.nombre || 'N/A'}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Descripción</label>
							<p className="mt-1 text-sm text-gray-900">{detailState.item.descripcion || 'Sin descripción'}</p>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">Nivel Jerárquico</label>
								<p className="mt-1 text-sm text-gray-900">{getNivelNombre(detailState.item.nivel_jerarquico)}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">Salario Base</label>
								<p className="mt-1 text-sm text-gray-900">{formatCurrency(detailState.item.salario_base)}</p>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">Cargo Superior</label>
								<p className="mt-1 text-sm text-gray-900">{detailState.item.cargo_superior_nombre || 'Sin superior'}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">Estado</label>
								<p className="mt-1 text-sm">
									<span className={`px-2 py-1 rounded-full text-xs font-semibold ${
										detailState.item.activo 
											? 'bg-green-100 text-green-800' 
											: 'bg-red-100 text-red-800'
									}`}>
										{detailState.item.activo ? 'Activo' : 'Inactivo'}
									</span>
								</p>
							</div>
						</div>
						<div className="flex justify-end">
							<Button type="button" variant="secondary" onClick={closeAll}>
								Cerrar
							</Button>
						</div>
					</div>
				)}
			</Modal>

			{/* Modal Confirmar Eliminación */}
			<Modal isOpen={deleteState.open} onClose={closeAll} title="Cambiar Estado del Cargo">
				<div className="space-y-4">
					<p className="text-sm text-gray-600">
						¿Estás seguro de que deseas cambiar el estado del cargo <strong>{deleteState.nombre}</strong>?
					</p>
					{error && (
						<div className="text-red-600 text-sm">{error}</div>
					)}
					<div className="flex justify-end gap-3">
						<Button type="button" variant="secondary" onClick={closeAll}>
							Cancelar
						</Button>
						<Button type="button" onClick={submitDelete} disabled={loading}>
							{loading ? 'Procesando...' : 'Confirmar'}
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default CargosList;
