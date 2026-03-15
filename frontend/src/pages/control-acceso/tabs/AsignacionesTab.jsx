import React, { useState, useEffect, useCallback } from 'react'
import asignacionesRolService from '../../../services/asignacionesRolService'
import rolesService from '../../../services/rolesService'
import usuariosService from '../../../services/usuariosService'
import {
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
    UserGroupIcon,
    Squares2X2Icon,
    TableCellsIcon,
    ArrowDownTrayIcon,
    ArrowsUpDownIcon
} from '@heroicons/react/24/outline'
import Can from '../../../components/permissions/Can'
import { usePermissions } from '../../../context/PermissionsContext'
import useServerPagination from '../../../hooks/useServerPagination'
import Pagination from '../../../components/Pagination'

const AsignacionesTab = () => {
  const { hasPermission, initialized } = usePermissions()

  // ============================================================================
  // SERVER-SIDE PAGINATION
  // ============================================================================

  const fetchAsignaciones = useCallback((params) => {
    return asignacionesRolService.getAllAsignaciones(params);
  }, []);

  const {
    data: asignaciones, loading, currentPage, totalPages, totalCount, pageSize,
    searchTerm, setSearchTerm, setCurrentPage, setFilters, refresh,
  } = useServerPagination(fetchAsignaciones, { pageSize: 20 });

  // ============================================================================
  // SUPPORT DATA (dropdowns)
  // ============================================================================

  const [roles, setRoles] = useState([])
  const [usuarios, setUsuarios] = useState([])

  // ============================================================================
  // UI STATE
  // ============================================================================

  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [filtroUsuario, setFiltroUsuario] = useState('todos')
  const [sortBy, setSortBy] = useState('fecha')
  const [sortDir, setSortDir] = useState('desc')
  const [displayMode, setDisplayMode] = useState('tabla')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [detailAsignacion, setDetailAsignacion] = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const [formData, setFormData] = useState({
    usuario: '',
    rol: '',
    justificacion: '',
    fecha_fin: '',
    observaciones: ''
  })

  // ============================================================================
  // LOAD SUPPORT DATA
  // ============================================================================

  const loadSupportData = useCallback(async () => {
    const fetchUsuarios = async () => {
      try {
        const data = await asignacionesRolService.getUsuariosDisponibles()
        const list = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
        if (list.length > 0) return list
      } catch (e) {
        // fallback below
      }
      try {
        const data = await usuariosService.getUsuarios({ page_size: 2000, is_active: true })
        return Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
      } catch (e) {
        return []
      }
    }

    const [rolesRes, usuariosRes] = await Promise.allSettled([
      rolesService.getAllRoles({ activo: true, page_size: 2000 }),
      fetchUsuarios(),
    ])

    const rolesData = rolesRes.status === 'fulfilled' ? rolesRes.value : []
    const usuariosData = usuariosRes.status === 'fulfilled' ? usuariosRes.value : []

    const rolesList = Array.isArray(rolesData?.results) ? rolesData.results : (Array.isArray(rolesData) ? rolesData : [])
    const usuariosList = Array.isArray(usuariosData?.results) ? usuariosData.results : (Array.isArray(usuariosData) ? usuariosData : [])

    setRoles(rolesList)
    setUsuarios(usuariosList)
  }, []);

  useEffect(() => { loadSupportData(); }, [loadSupportData]);

  // ============================================================================
  // FILTERS (server-side)
  // ============================================================================

  const applyFilters = (estado, rol, usuario, sort, dir) => {
    const f = {};
    if (estado !== 'todos') f.estado = estado.toUpperCase();
    if (rol !== 'todos') f.rol = rol;
    if (usuario !== 'todos') f.usuario = usuario;
    const sortField = sort === 'fecha' ? 'fecha_asignacion' : sort === 'usuario' ? 'usuario_nombre' : 'rol_nombre';
    f.ordering = dir === 'desc' ? `-${sortField}` : sortField;
    setFilters(f);
  };

  const handleFiltroEstado = (val) => { setFiltroEstado(val); applyFilters(val, filtroRol, filtroUsuario, sortBy, sortDir); };
  const handleFiltroRol = (val) => { setFiltroRol(val); applyFilters(filtroEstado, val, filtroUsuario, sortBy, sortDir); };
  const handleFiltroUsuario = (val) => { setFiltroUsuario(val); applyFilters(filtroEstado, filtroRol, val, sortBy, sortDir); };
  const handleSortBy = (val) => { setSortBy(val); applyFilters(filtroEstado, filtroRol, filtroUsuario, val, sortDir); };
  const handleSortDir = () => { const nd = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(nd); applyFilters(filtroEstado, filtroRol, filtroUsuario, sortBy, nd); };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getUsuarioLabel = (u) => {
    if (!u) return ''
    const fullName = u.nombre_completo || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || `${u.nombre || ''} ${u.apellido || ''}`.trim()
    const fallback = u.username || u.email || `Usuario ${u.id || ''}`
    return fullName || fallback
  }

  // ============================================================================
  // CRUD HANDLERS
  // ============================================================================

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.usuario || !formData.rol) {
      alert('Por favor selecciona usuario y rol')
      return
    }

    try {
      const data = {
        usuario: parseInt(formData.usuario),
        rol: parseInt(formData.rol),
        justificacion: formData.justificacion || '',
        fecha_fin: formData.fecha_fin || null,
        observaciones: formData.observaciones || ''
      }

      await asignacionesRolService.createAsignacion(data)

      alert('Asignacion creada exitosamente')
      setFormData({
         usuario: '',
         rol: '',
         justificacion: '',
         fecha_fin: '',
         observaciones: ''
      })
      setShowModal(false)
      refresh()
    } catch (error) {
       console.error(error)
       let msg = 'Error al asignar rol';
       if(error.response?.data?.detail) msg += ': ' + error.response.data.detail;
       else if (error.response?.data?.non_field_errors) msg += ': ' + error.response.data.non_field_errors[0];
       alert(msg);
    }
  }

  const handleAprobar = async (id) => {
      if(!confirm("Aprobar asignacion?")) return;
      try {
          await asignacionesRolService.aprobarAsignacion(id);
          refresh();
      } catch (e) {
          alert("Error al aprobar");
      }
  }

  const handleRevocar = async (id) => {
      if(!confirm("Revocar asignacion?")) return;
      try {
          await asignacionesRolService.revocarAsignacion(id, { motivo: 'Revocacion manual desde panel' });
          refresh();
      } catch (e) {
          alert("Error al revocar");
      }
  }

  // ============================================================================
  // SELECTION & BULK
  // ============================================================================

  const allVisibleSelected = asignaciones.length > 0 && asignaciones.every((a) => selectedIds.has(a.id))

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        asignaciones.forEach((a) => next.delete(a.id))
      } else {
        asignaciones.forEach((a) => next.add(a.id))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleBulkAprobar = async () => {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => asignacionesRolService.aprobarAsignacion(id))
      )
      clearSelection()
      refresh()
    } catch (e) {
      alert('Error al aprobar en lote')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkRevocar = async () => {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => asignacionesRolService.revocarAsignacion(id, { motivo: 'Revocacion masiva desde panel' }))
      )
      clearSelection()
      refresh()
    } catch (e) {
      alert('Error al revocar en lote')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleExportCsv = () => {
    const headers = ['Usuario', 'Rol', 'Estado', 'FechaAsignacion', 'FechaFin', 'Activo', 'ID']
    const rows = asignaciones.map((a) => ([
      a.usuario_nombre || '',
      a.rol_nombre || '',
      a.estado || (a.activa ? 'ACTIVA' : 'INACTIVA'),
      a.fecha_asignacion || a.created_at || '',
      a.fecha_fin || '',
      a.activa ? 'Si' : 'No',
      a.id,
    ]))

    const escape = (value) => {
      const str = String(value ?? '')
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `asignaciones_roles_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('roles.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta seccion</div>

  return (
    <div className="space-y-6 animate-fadeIn">
        {/* Actions */}
        <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Buscar asignaciones..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <UserGroupIcon className="h-4 w-4" />
                        <span>{totalCount} Asignaciones</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            type="button"
                            onClick={() => setDisplayMode('cards')}
                            className={`px-2.5 py-1.5 border rounded-lg text-xs ${displayMode === 'cards' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'border-gray-200 text-gray-600'}`}
                            title="Vista cards"
                        >
                            <Squares2X2Icon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setDisplayMode('tabla')}
                            className={`px-2.5 py-1.5 border rounded-lg text-xs ${displayMode === 'tabla' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'border-gray-200 text-gray-600'}`}
                            title="Vista tabla"
                        >
                            <TableCellsIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                            title="Exportar CSV"
                        >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select
                    value={filtroEstado}
                    onChange={(e) => handleFiltroEstado(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                    <option value="todos">Todos los Estados</option>
                    <option value="activa">Activas</option>
                    <option value="pendiente">Pendientes</option>
                </select>

                <select
                    value={filtroRol}
                    onChange={(e) => handleFiltroRol(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                    <option value="todos">Todos los Roles</option>
                    {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                </select>

                <select
                    value={filtroUsuario}
                    onChange={(e) => handleFiltroUsuario(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                    <option value="todos">Todos los Usuarios</option>
                    {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>{getUsuarioLabel(u)}</option>
                    ))}
                </select>

                <div className="flex gap-2">
                    <select
                        value={sortBy}
                        onChange={(e) => handleSortBy(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="fecha">Ordenar por fecha</option>
                        <option value="usuario">Ordenar por usuario</option>
                        <option value="rol">Ordenar por rol</option>
                    </select>
                    <button
                        type="button"
                        onClick={handleSortDir}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                        title="Cambiar direccion"
                    >
                        <ArrowsUpDownIcon className="h-4 w-4 text-gray-500" />
                    </button>
                </div>

                <Can permission="roles.add">
                  <button
                      onClick={() => setShowModal(true)}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 shadow-md"
                   >
                      <UserPlusIcon className="h-5 w-5" />
                      <span>Nueva Asignacion</span>
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
                onClick={handleBulkAprobar}
                disabled={bulkLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-200 text-emerald-700 rounded-lg text-sm hover:bg-emerald-50 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" /> Aprobar
              </button>
              <button
                type="button"
                onClick={handleBulkRevocar}
                disabled={bulkLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-rose-200 text-rose-700 rounded-lg text-sm hover:bg-rose-50 disabled:opacity-50"
              >
                <XMarkIcon className="h-4 w-4" /> Revocar
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

        {/* Table / Cards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : displayMode === 'tabla' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha Fin</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {asignaciones.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium">{a.usuario_nombre || a.usuario_name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                          {a.rol_nombre || a.rol_name || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {a.estado === 'ACTIVA' || a.activa ? (
                          <span className="text-green-600 flex items-center text-sm"><CheckIcon className="h-4 w-4 mr-1"/> Activa</span>
                        ) : a.estado === 'PENDIENTE' ? (
                          <span className="text-amber-600 flex items-center text-sm"><ClockIcon className="h-4 w-4 mr-1"/> Pendiente</span>
                        ) : (
                          <span className="text-red-500 text-sm">{a.estado}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {a.fecha_fin ? new Date(a.fecha_fin).toLocaleDateString() : 'Indefinido'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => setDetailAsignacion(a)} className="text-cyan-600 hover:text-cyan-800 text-sm font-medium">Detalle</button>
                        {a.estado === 'PENDIENTE' && (
                          <Can permission="roles.change">
                            <button onClick={() => handleAprobar(a.id)} className="text-green-600 hover:text-green-800 text-sm font-medium">Aprobar</button>
                          </Can>
                        )}
                        {(a.estado === 'ACTIVA' || a.activa) && (
                          <Can permission="roles.delete">
                            <button onClick={() => handleRevocar(a.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Revocar</button>
                          </Can>
                        )}
                      </td>
                    </tr>
                  ))}
                  {asignaciones.length === 0 && (
                    <tr><td colSpan="6" className="p-8 text-center text-gray-500">No hay asignaciones encontradas</td></tr>
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="asignaciones"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {asignaciones.map((a) => (
                  <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{a.usuario_nombre || a.usuario_name || '-'}</div>
                        <div className="text-xs text-gray-500">{a.rol_nombre || a.rol_name || '-'}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {a.estado === 'ACTIVA' || a.activa ? (
                        <span className="text-green-600 flex items-center text-sm"><CheckIcon className="h-4 w-4 mr-1"/> Activa</span>
                      ) : a.estado === 'PENDIENTE' ? (
                        <span className="text-amber-600 flex items-center text-sm"><ClockIcon className="h-4 w-4 mr-1"/> Pendiente</span>
                      ) : (
                        <span className="text-red-500 text-sm">{a.estado}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      Fecha fin: {a.fecha_fin ? new Date(a.fecha_fin).toLocaleDateString() : 'Indefinido'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailAsignacion(a)}
                        className="text-xs text-cyan-700 hover:underline"
                      >
                        Ver detalle
                      </button>
                      {a.estado === 'PENDIENTE' && (
                        <Can permission="roles.change">
                          <button onClick={() => handleAprobar(a.id)} className="text-green-600 hover:text-green-800 text-sm font-medium">Aprobar</button>
                        </Can>
                      )}
                      {(a.estado === 'ACTIVA' || a.activa) && (
                        <Can permission="roles.delete">
                          <button onClick={() => handleRevocar(a.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Revocar</button>
                        </Can>
                      )}
                    </div>
                  </div>
                ))}
                {asignaciones.length === 0 && (
                  <div className="col-span-full px-6 py-8 text-center text-gray-500">No hay asignaciones encontradas</div>
                )}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="asignaciones"
              />
            </>
          )}
        </div>

        {/* Detail Modal */}
        {detailAsignacion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100">
              <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-teal-100">Detalle de asignacion</div>
                    <h2 className="text-2xl font-bold text-white">{detailAsignacion.usuario_nombre || detailAsignacion.usuario_name || '-'}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailAsignacion(null)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Rol</div>
                  <div className="text-sm text-gray-900">{detailAsignacion.rol_nombre || detailAsignacion.rol_name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Estado</div>
                  <div className="text-sm text-gray-900">{detailAsignacion.estado || (detailAsignacion.activa ? 'ACTIVA' : 'INACTIVA')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Fecha asignacion</div>
                  <div className="text-sm text-gray-900">{detailAsignacion.fecha_asignacion || detailAsignacion.created_at || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Fecha fin</div>
                  <div className="text-sm text-gray-900">{detailAsignacion.fecha_fin || 'Indefinido'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-500">Justificacion</div>
                  <div className="text-sm text-gray-700">{detailAsignacion.justificacion || 'Sin justificacion'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-500">Observaciones</div>
                  <div className="text-sm text-gray-700">{detailAsignacion.observaciones || 'Sin observaciones'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-500">ID</div>
                  <div className="font-mono text-xs text-gray-500">{detailAsignacion.id}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn">
              <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-white">Nueva Asignacion</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario *</label>
                  <select
                    required
                    value={formData.usuario}
                    onChange={e => setFormData({...formData, usuario: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  >
                    <option value="">Seleccione usuario...</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{getUsuarioLabel(u)}{u.email ? ` (${u.email})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rol *</label>
                  <select
                    required
                    value={formData.rol}
                    onChange={e => setFormData({...formData, rol: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  >
                    <option value="">Seleccione rol...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Justificacion</label>
                  <textarea
                    value={formData.justificacion}
                    onChange={e => setFormData({...formData, justificacion: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                    rows="3"
                    placeholder="Motivo de la asignacion..."
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium">Cancelar</button>
                  <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-700 text-white rounded-lg hover:from-teal-700 hover:to-cyan-800 transition-colors shadow-md font-medium">Guardar Asignacion</button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  )
}

export default AsignacionesTab;
