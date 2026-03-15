/**
 * Tab de Gestión de Roles
 * Vista profesional con tabla, árbol jerárquico y modal multi-tab
 * Server-side pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, Edit2, Trash2, Copy, CheckCircle, XCircle,
  Search, Filter, Download, Upload, TreePine, List, Users,
  ChevronRight, ChevronDown, AlertCircle, Clock, Calendar, LayoutGrid, ArrowUpDown
} from 'lucide-react';
import rolesService from '../../../services/rolesService';
import tiposRolService from '../../../services/tiposRolService';
import permisosService from '../../../services/permisosService';
import RolModal from '../../../components/administracion/RolModal';
import Can from '../../../components/permissions/Can';
import { usePermissions } from '../../../context/PermissionsContext';
import useServerPagination from '../../../hooks/useServerPagination';
import Pagination from '../../../components/Pagination';

const RolesTab = () => {
  const { hasPermission, initialized } = usePermissions();

  // ============================================================================
  // SERVER-SIDE PAGINATION
  // ============================================================================

  const fetchRoles = useCallback((params) => {
    return rolesService.getAllRoles(params);
  }, []);

  const {
    data: roles, loading, currentPage, totalPages, totalCount, pageSize,
    searchTerm, setSearchTerm, setCurrentPage, setFilters, refresh,
  } = useServerPagination(fetchRoles, { pageSize: 20 });

  // ============================================================================
  // SUPPORT DATA (dropdowns, modal, stats, tree)
  // ============================================================================

  const [tiposRol, setTiposRol] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [permisosCatalogo, setPermisosCatalogo] = useState([]);
  const [stats, setStats] = useState({ total: 0, activos: 0, inactivos: 0, sistema: 0 });
  const [treeData, setTreeData] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // ============================================================================
  // UI STATE
  // ============================================================================

  const [showModal, setShowModal] = useState(false);
  const [editingRol, setEditingRol] = useState(null);
  const [activeTab, setActiveTab] = useState('basico');
  const [displayMode, setDisplayMode] = useState('tabla');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailRol, setDetailRol] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Filtros
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterNivel, setFilterNivel] = useState('all');
  const [filterSistema, setFilterSistema] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');

  // Formulario
  const [formData, setFormData] = useState({
    codigo: '', nombre: '', descripcion: '', tipo_rol: '', rol_padre: '',
    categoria: '', hereda_permisos: true, activo: true, es_publico: false,
    requiere_aprobacion: false, tiene_restriccion_horario: false,
    hora_inicio: '', hora_fin: '', dias_semana: '1234567',
    fecha_inicio_vigencia: '', fecha_fin_vigencia: '',
    prioridad: 0, peso: 1, color: '#4F46E5', icono: 'shield',
    metadatos: {}, configuracion: {}, permisos_asignados: []
  });
  const [errors, setErrors] = useState({});

  // ============================================================================
  // LOAD SUPPORT DATA
  // ============================================================================

  const loadSupportData = useCallback(async () => {
    try {
      const [tiposData, statsData, allRolesData] = await Promise.all([
        tiposRolService.getActiveTiposRol({ page_size: 1000 }),
        rolesService.getEstadisticas(),
        rolesService.getAllRoles({ page_size: 1000 }),
      ]);
      const tipos = tiposData.results || tiposData;
      setTiposRol(Array.isArray(tipos) ? tipos : []);
      setStats(statsData);
      const allRolesList = allRolesData.results || allRolesData;
      setAllRoles(Array.isArray(allRolesList) ? allRolesList : []);
    } catch (error) {
      console.error('Error loading support data:', error);
    }
    try {
      const permisosData = await permisosService.getAllPermisos({ activo: true, page_size: 2000 });
      const permisosList = permisosData.results || permisosData;
      setPermisosCatalogo(Array.isArray(permisosList) ? permisosList : []);
    } catch (permError) {
      console.error('Error loading permisos:', permError);
      setPermisosCatalogo([]);
    }
    try {
      const treeRes = await rolesService.getJerarquia();
      setTreeData(Array.isArray(treeRes) ? treeRes : []);
    } catch (e) {
      console.error('Error loading jerarquia:', e);
    }
  }, []);

  useEffect(() => { loadSupportData(); }, [loadSupportData]);

  // ============================================================================
  // FILTERS (server-side)
  // ============================================================================

  const applyFilters = (tipo, estado, nivel, sistema, sort, dir) => {
    const f = {};
    if (tipo !== 'all') f.tipo_rol = tipo;
    if (estado === 'active') f.activo = true;
    if (estado === 'inactive') f.activo = false;
    if (nivel !== 'all') f.nivel_jerarquico = nivel;
    if (sistema === 'system') f.es_sistema = true;
    if (sistema === 'custom') f.es_sistema = false;
    const sortField = sort === 'tipo' ? 'tipo_rol_nombre' : sort === 'nivel' ? 'nivel_jerarquico' : sort;
    f.ordering = dir === 'desc' ? `-${sortField}` : sortField;
    setFilters(f);
  };

  const handleFilterTipo = (val) => { setFilterTipo(val); applyFilters(val, filterEstado, filterNivel, filterSistema, sortBy, sortDir); };
  const handleFilterEstado = (val) => { setFilterEstado(val); applyFilters(filterTipo, val, filterNivel, filterSistema, sortBy, sortDir); };
  const handleFilterNivel = (val) => { setFilterNivel(val); applyFilters(filterTipo, filterEstado, val, filterSistema, sortBy, sortDir); };
  const handleFilterSistema = (val) => { setFilterSistema(val); applyFilters(filterTipo, filterEstado, filterNivel, val, sortBy, sortDir); };
  const handleSortBy = (val) => { setSortBy(val); applyFilters(filterTipo, filterEstado, filterNivel, filterSistema, val, sortDir); };
  const handleSortDir = () => { const nd = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(nd); applyFilters(filterTipo, filterEstado, filterNivel, filterSistema, sortBy, nd); };

  // ============================================================================
  // RELOAD ALL (after CRUD)
  // ============================================================================

  const reloadAll = () => {
    refresh();
    loadSupportData();
  };

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const resetForm = () => {
    setFormData({
      codigo: '', nombre: '', descripcion: '', tipo_rol: '', rol_padre: '',
      categoria: '', hereda_permisos: true, activo: true, es_publico: false,
      requiere_aprobacion: false, tiene_restriccion_horario: false,
      hora_inicio: '', hora_fin: '', dias_semana: '1234567',
      fecha_inicio_vigencia: '', fecha_fin_vigencia: '',
      prioridad: 0, peso: 1, color: '#4F46E5', icono: 'shield',
      metadatos: {}, configuracion: {}, permisos_asignados: []
    });
    setErrors({});
    setActiveTab('basico');
  };

  const handleOpenModal = (rol = null) => {
    if (rol) {
      setEditingRol(rol);
    } else {
      setEditingRol(null);
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.codigo) { setErrors({...errors, codigo: 'El codigo es requerido'}); return; }
    if (!formData.nombre) { setErrors({...errors, nombre: 'El nombre es requerido'}); return; }
    try {
      if (editingRol) {
        await rolesService.updateRol(editingRol.id, formData);
        if (formData.permisos_asignados?.length > 0) {
          await rolesService.asignarPermisos(editingRol.id, formData.permisos_asignados);
        }
      } else {
        const newRol = await rolesService.createRol(formData);
        if (formData.permisos_asignados?.length > 0) {
          await rolesService.asignarPermisos(newRol.id, formData.permisos_asignados);
        }
      }
      setShowModal(false);
      resetForm();
      reloadAll();
    } catch (error) {
      console.error('Error saving rol:', error);
      alert('Error al guardar el rol');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este rol?')) return;
    try {
      await rolesService.deleteRol(id);
      reloadAll();
    } catch (error) {
      console.error('Error deleting rol:', error);
      alert('Error al eliminar el rol');
    }
  };

  // ============================================================================
  // SELECTION & BULK
  // ============================================================================

  const allVisibleSelected = roles.length > 0 && roles.every((rol) => selectedIds.has(rol.id));

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        roles.forEach((rol) => next.delete(rol.id));
      } else {
        roles.forEach((rol) => next.add(rol.id));
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
        Array.from(selectedIds).map((id) => rolesService.patchRol(id, { activo }))
      );
      clearSelection();
      reloadAll();
    } catch (error) {
      console.error('Error bulk update roles:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Nombre', 'Codigo', 'Tipo', 'Nivel', 'Activo', 'Sistema', 'Descripcion', 'ID'];
    const rows = roles.map((rol) => ([
      rol.nombre || '', rol.codigo || '', rol.tipo_rol_nombre || '',
      rol.nivel_jerarquico ?? '', rol.activo ? 'Si' : 'No',
      rol.es_sistema ? 'Si' : 'No',
      (rol.descripcion || '').replace(/\s+/g, ' ').trim(), rol.id,
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
    link.download = `roles_${new Date().toISOString().slice(0, 10)}.csv`;
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
       {/* Actions Bar */}
       <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
             type="text"
             placeholder="Buscar roles..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
             <Users className="h-4 w-4" />
             <span>{totalCount} Roles</span>
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

         <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
           <select
             value={filterTipo}
             onChange={(e) => handleFilterTipo(e.target.value)}
             className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
           >
             <option value="all">Todos los Tipos</option>
             {tiposRol.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
             ))}
           </select>

           <select
             value={filterEstado}
             onChange={(e) => handleFilterEstado(e.target.value)}
             className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
           >
             <option value="all">Todos los Estados</option>
             <option value="active">Activos</option>
             <option value="inactive">Inactivos</option>
           </select>

           <select
             value={filterSistema}
             onChange={(e) => handleFilterSistema(e.target.value)}
             className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
           >
             <option value="all">Sistema y Custom</option>
             <option value="system">Solo Sistema</option>
             <option value="custom">Solo Custom</option>
           </select>

           <select
             value={filterNivel}
             onChange={(e) => handleFilterNivel(e.target.value)}
             className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
           >
             <option value="all">Todos los niveles</option>
             {[0, 1, 2, 3, 4, 5].map((nivel) => (
              <option key={nivel} value={nivel}>Nivel {nivel}</option>
             ))}
           </select>

           <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => handleSortBy(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="nombre">Ordenar por nombre</option>
              <option value="codigo">Ordenar por codigo</option>
              <option value="tipo">Ordenar por tipo</option>
              <option value="nivel">Ordenar por nivel</option>
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
               onClick={() => handleOpenModal(null)}
               className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-shadow shadow-md"
             >
               <Plus className="h-5 w-5" />
               <span className="whitespace-nowrap">Nuevo Rol</span>
             </button>
           </Can>
         </div>
       </div>

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

       {/* Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
             <div>
                <p className="text-gray-500 text-sm">Total Roles</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
             </div>
             <Shield className="h-8 w-8 text-indigo-100 bg-indigo-500 p-1.5 rounded-lg" />
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
             <div>
                <p className="text-gray-500 text-sm">Activos</p>
                <h3 className="text-2xl font-bold text-green-600">{stats.activos}</h3>
             </div>
             <CheckCircle className="h-8 w-8 text-green-100 bg-green-500 p-1.5 rounded-lg" />
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
             <div>
                <p className="text-gray-500 text-sm">Inactivos</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.inactivos}</h3>
             </div>
             <XCircle className="h-8 w-8 text-gray-100 bg-gray-400 p-1.5 rounded-lg" />
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
             <div>
                <p className="text-gray-500 text-sm">Sistema</p>
                <h3 className="text-2xl font-bold text-blue-600">{stats.sistema}</h3>
             </div>
             <Users className="h-8 w-8 text-blue-100 bg-blue-500 p-1.5 rounded-lg" />
          </div>
       </div>

       {/* Roles Table / Cards */}
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
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Codigo</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nivel</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sistema</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {roles.map((rol) => (
                          <tr key={rol.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(rol.id)}
                                  onChange={() => toggleSelect(rol.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                />
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center">
                                      <div
                                          className="h-8 w-8 rounded-lg flex items-center justify-center mr-3 text-white text-xs font-bold"
                                          style={{ backgroundColor: rol.color || '#6366f1' }}
                                      >
                                          {rol.nombre.substring(0,2).toUpperCase()}
                                      </div>
                                      <div>
                                          <div className="font-medium text-gray-900">{rol.nombre}</div>
                                          <div className="text-xs text-gray-500 line-clamp-1">{rol.descripcion}</div>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 font-mono">
                                      {rol.codigo}
                                  </code>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                  {rol.tipo_rol_nombre || 'General'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700">
                                      Nivel {rol.nivel_jerarquico}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                {rol.activo ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Activo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Inactivo
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {rol.es_sistema ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Sistema
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    Custom
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                  <button
                                      onClick={() => setDetailRol(rol)}
                                      className="text-gray-400 hover:text-cyan-600 transition-colors p-1"
                                      title="Detalle"
                                  >
                                      <List className="h-4 w-4" />
                                  </button>
                                  <Can permission="roles.change">
                                    <button
                                        onClick={() => handleOpenModal(rol)}
                                        className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                        title="Editar"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                  </Can>
                                  <Can permission="roles.delete">
                                    <button
                                        onClick={() => handleDelete(rol.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                        title="Eliminar"
                                        disabled={rol.es_sistema}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                  </Can>
                              </td>
                          </tr>
                      ))}
                      {roles.length === 0 && (
                        <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No se encontraron roles</td></tr>
                      )}
                  </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="roles"
              />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {roles.map((rol) => (
                <div key={rol.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: rol.color || '#6366f1' }}
                      >
                        {rol.nombre.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{rol.nombre}</div>
                        <div className="text-xs text-gray-500">{rol.tipo_rol_nombre || 'General'}</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(rol.id)}
                      onChange={() => toggleSelect(rol.id)}
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 font-mono">
                      {rol.codigo}
                    </code>
                    <span className="text-xs text-gray-500">Nivel {rol.nivel_jerarquico}</span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {rol.descripcion || 'Sin descripcion disponible.'}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      {rol.activo ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactivo
                        </span>
                      )}
                      {rol.es_sistema ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Sistema
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailRol(rol)}
                        className="text-xs text-cyan-700 hover:underline"
                      >
                        Ver detalle
                      </button>
                      <Can permission="roles.change">
                        <button
                          onClick={() => handleOpenModal(rol)}
                          className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </Can>
                    </div>
                  </div>
                </div>
              ))}
              {roles.length === 0 && (
                <div className="col-span-full px-6 py-8 text-center text-gray-500">No se encontraron roles</div>
              )}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="roles"
            />
          </>
        )}
       </div>

      {/* Detail Modal */}
      {detailRol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-teal-100">Detalle de rol</div>
                  <h2 className="text-2xl font-bold text-white">{detailRol.nombre}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailRol(null)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Codigo</div>
                <div className="font-mono text-sm text-gray-900">{detailRol.codigo}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Tipo</div>
                <div className="text-sm text-gray-900">{detailRol.tipo_rol_nombre || 'General'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Nivel</div>
                <div className="text-sm text-gray-900">Nivel {detailRol.nivel_jerarquico}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Estado</div>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${detailRol.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {detailRol.activo ? 'Activo' : 'Inactivo'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Sistema</div>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${detailRol.es_sistema ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                  {detailRol.es_sistema ? 'Sistema' : 'Custom'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Permisos</div>
                <div className="text-sm text-gray-900">{detailRol.permisos?.length ?? 0}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500">Descripcion</div>
                <div className="text-sm text-gray-700">{detailRol.descripcion || 'Sin descripcion disponible.'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500">ID</div>
                <div className="font-mono text-xs text-gray-500">{detailRol.id}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <RolModal
            show={showModal}
            onClose={() => setShowModal(false)}
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSubmit={handleSubmit}
            editingRol={editingRol}
            tiposRol={tiposRol}
            rolesDisponibles={allRoles}
            permisosCatalogo={permisosCatalogo}
        />
      )}
    </div>
  );
};

export default RolesTab;
