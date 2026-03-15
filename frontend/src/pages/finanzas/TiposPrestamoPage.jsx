import { useState, useCallback } from 'react';
import { Wallet, Plus, Edit2, Trash2, Search, Filter, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import useAudit from '../../hooks/useAudit';
import useServerPagination from '../../hooks/useServerPagination';
import Pagination from '../../components/Pagination';
import Can from '../../components/permissions/Can';
import { usePermissions } from '../../context/PermissionsContext';
import { useConfiguracion } from '../../context/ConfiguracionContext';
import tiposPrestamoService from '../../services/tiposPrestamoService';

export default function TiposPrestamoPage() {
  const audit = useAudit('TiposPrestamo');
  const { hasPermission, initialized } = usePermissions();
  const { formatCurrency: formatMoney } = useConfiguracion();

  // --- Notification state ---
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000);
  };

  const [showModal, setShowModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [filterActivo, setFilterActivo] = useState('all');

  const fetchTipos = useCallback((params) => tiposPrestamoService.getTiposPrestamo(params), []);
  const {
    data: tiposPrestamo,
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
  } = useServerPagination(fetchTipos, { pageSize: 15 });

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    monto_minimo: '',
    monto_maximo: '',
    tasa_interes_defecto: '',
    tasa_interes_minima: '',
    tasa_interes_maxima: '',
    plazo_minimo_meses: '1',
    plazo_maximo_meses: '60',
    requiere_garantia: false,
    requiere_aprobacion: true,
    permite_prepago: true,
    activo: true,
    orden: 0,
  });

  const [errors, setErrors] = useState({});

  const generateCodigo = (nombre) => {
    if (!nombre.trim()) return '';
    return nombre
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w.slice(0, 4))
      .join('_')
      .slice(0, 20);
  };

  const handleFilterActivo = (value) => {
    setFilterActivo(value);
    if (value === 'all') setFilters({});
    else if (value === 'active') setFilters({ activo: true });
    else setFilters({ activo: false });
  };

  const resetForm = () => {
    setFormData({
      codigo: '', nombre: '', descripcion: '',
      monto_minimo: '', monto_maximo: '',
      tasa_interes_defecto: '', tasa_interes_minima: '', tasa_interes_maxima: '',
      plazo_minimo_meses: '1', plazo_maximo_meses: '60',
      requiere_garantia: false, requiere_aprobacion: true, permite_prepago: true,
      activo: true, orden: 0,
    });
    setErrors({});
    setEditingTipo(null);
  };

  const handleEdit = (tipo) => {
    audit.modalOpen('editar_tipo_prestamo', { tipo_id: tipo.id, codigo: tipo.codigo });
    setEditingTipo(tipo);
    setFormData({
      codigo: tipo.codigo || '',
      nombre: tipo.nombre || '',
      descripcion: tipo.descripcion || '',
      monto_minimo: tipo.monto_minimo || '',
      monto_maximo: tipo.monto_maximo || '',
      tasa_interes_defecto: tipo.tasa_interes_defecto || '',
      tasa_interes_minima: tipo.tasa_interes_minima || '',
      tasa_interes_maxima: tipo.tasa_interes_maxima || '',
      plazo_minimo_meses: tipo.plazo_minimo_meses || '1',
      plazo_maximo_meses: tipo.plazo_maximo_meses || '60',
      requiere_garantia: tipo.requiere_garantia || false,
      requiere_aprobacion: tipo.requiere_aprobacion !== undefined ? tipo.requiere_aprobacion : true,
      permite_prepago: tipo.permite_prepago !== undefined ? tipo.permite_prepago : true,
      activo: tipo.activo !== undefined ? tipo.activo : true,
      orden: tipo.orden || 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este tipo de préstamo?')) {
      try {
        const tipo = tiposPrestamo.find(t => t.id === id);
        await tiposPrestamoService.deleteTipoPrestamo(id);
        audit.button('eliminar_tipo_prestamo', { tipo_id: id, codigo: tipo?.codigo });
        showNotification('success', 'Tipo de préstamo eliminado exitosamente');
        refresh();
      } catch (error) {
        showNotification('error', 'Error al eliminar: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleToggleActivo = async (tipo) => {
    try {
      await tiposPrestamoService.toggleActivo(tipo.id, !tipo.activo);
      audit.button('toggle_activo_tipo_prestamo', { tipo_id: tipo.id, codigo: tipo.codigo, nuevo_estado: !tipo.activo });
      showNotification('success', `Tipo de préstamo ${!tipo.activo ? 'activado' : 'desactivado'} exitosamente`);
      refresh();
    } catch (error) {
      showNotification('error', 'Error al cambiar estado: ' + (error.response?.data?.detail || error.message));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.monto_minimo || parseFloat(formData.monto_minimo) <= 0) newErrors.monto_minimo = 'El monto mínimo debe ser mayor a 0';
    if (!formData.monto_maximo || parseFloat(formData.monto_maximo) <= 0) newErrors.monto_maximo = 'El monto máximo debe ser mayor a 0';
    if (parseFloat(formData.monto_minimo) >= parseFloat(formData.monto_maximo)) newErrors.monto_maximo = 'El monto máximo debe ser mayor al mínimo';
    if (formData.tasa_interes_minima && formData.tasa_interes_maxima) {
      if (parseFloat(formData.tasa_interes_minima) > parseFloat(formData.tasa_interes_maxima)) newErrors.tasa_interes_maxima = 'La tasa máxima debe ser mayor o igual a la mínima';
    }
    if (formData.tasa_interes_defecto && formData.tasa_interes_minima && formData.tasa_interes_maxima) {
      const def = parseFloat(formData.tasa_interes_defecto);
      const min = parseFloat(formData.tasa_interes_minima);
      const max = parseFloat(formData.tasa_interes_maxima);
      if (def < min || def > max) newErrors.tasa_interes_defecto = 'Debe estar entre la mínima y máxima';
    }
    if (parseInt(formData.plazo_minimo_meses) >= parseInt(formData.plazo_maximo_meses)) newErrors.plazo_maximo_meses = 'El plazo máximo debe ser mayor al mínimo';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const codigo = editingTipo ? formData.codigo : generateCodigo(formData.nombre);
      const dataToSend = {
        ...formData,
        codigo,
        monto_minimo: parseFloat(formData.monto_minimo),
        monto_maximo: parseFloat(formData.monto_maximo),
        tasa_interes_defecto: parseFloat(formData.tasa_interes_defecto) || 0,
        tasa_interes_minima: parseFloat(formData.tasa_interes_minima) || 0,
        tasa_interes_maxima: parseFloat(formData.tasa_interes_maxima) || 50,
        plazo_minimo_meses: parseInt(formData.plazo_minimo_meses),
        plazo_maximo_meses: parseInt(formData.plazo_maximo_meses),
        orden: parseInt(formData.orden) || 0,
      };
      if (editingTipo) {
        await tiposPrestamoService.updateTipoPrestamo(editingTipo.id, dataToSend);
        showNotification('success', 'Tipo de préstamo actualizado exitosamente');
      } else {
        await tiposPrestamoService.createTipoPrestamo(dataToSend);
        showNotification('success', 'Tipo de préstamo creado exitosamente');
      }
      setShowModal(false);
      resetForm();
      refresh();
    } catch (error) {
      if (error.response?.data) {
        const serverErrors = {};
        Object.keys(error.response.data).forEach(key => {
          serverErrors[key] = Array.isArray(error.response.data[key]) ? error.response.data[key][0] : error.response.data[key];
        });
        setErrors(serverErrors);
      }
      showNotification('error', 'Error al guardar: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!hasPermission('tipos_prestamo.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>;

  return (
    <div className="space-y-6">
      {/* Notificación */}
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${
          notification.type === 'success'
            ? 'bg-green-500/90 border-green-400 text-white'
            : 'bg-red-500/90 border-red-400 text-white'
        }`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Wallet className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Tipos de Préstamo</h1>
              <p className="text-emerald-100 mt-2 text-lg">Gestión de tipos y configuraciones de préstamos</p>
            </div>
          </div>
          <Can permission="tipos_prestamo.add">
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Tipo</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Filtros */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterActivo}
              onChange={(e) => handleFilterActivo(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden border border-gray-200/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Código</th>
                <th className="px-6 py-4 text-left font-semibold">Nombre</th>
                <th className="px-6 py-4 text-left font-semibold">Montos</th>
                <th className="px-6 py-4 text-center font-semibold">Tasa Interés</th>
                <th className="px-6 py-4 text-center font-semibold">Plazo</th>
                <th className="px-6 py-4 text-left font-semibold">Requisitos</th>
                <th className="px-6 py-4 text-center font-semibold">Estado</th>
                <th className="px-6 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-3">
                      <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando tipos de préstamo...</span>
                    </div>
                  </td>
                </tr>
              ) : tiposPrestamo.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No se encontraron tipos de préstamo</p>
                    <p className="text-sm mt-1">Crea tu primer tipo de préstamo para comenzar</p>
                  </td>
                </tr>
              ) : (
                tiposPrestamo.map((tipo, index) => (
                  <tr key={tipo.id} className={`${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'} hover:bg-emerald-50 transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-semibold text-gray-900">{tipo.codigo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{tipo.nombre}</div>
                      {tipo.descripcion && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{tipo.descripcion}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-emerald-600 font-semibold">{formatMoney(tipo.monto_minimo)}</div>
                      <div className="text-xs text-gray-500">a {formatMoney(tipo.monto_maximo)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-semibold text-gray-900">{tipo.tasa_interes_defecto}%</div>
                      <div className="text-xs text-gray-500">({tipo.tasa_interes_minima}% - {tipo.tasa_interes_maxima}%)</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900">{tipo.plazo_minimo_meses || 1} - {tipo.plazo_maximo_meses || 60}m</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {tipo.requiere_garantia && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Garantía</span>
                        )}
                        {tipo.requiere_aprobacion && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Aprobación</span>
                        )}
                        {tipo.permite_prepago && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Prepago</span>
                        )}
                        {!tipo.requiere_garantia && !tipo.requiere_aprobacion && !tipo.permite_prepago && (
                          <span className="text-xs text-gray-400">Sin requisitos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleActivo(tipo)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          tipo.activo
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tipo.activo ? (
                          <span className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Activo</span>
                        ) : (
                          <span className="flex items-center"><XCircle className="h-3 w-3 mr-1" /> Inactivo</span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <Can permission="tipos_prestamo.change">
                          <button onClick={() => handleEdit(tipo)} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </Can>
                        <Can permission="tipos_prestamo.delete">
                          <button onClick={() => handleDelete(tipo.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="tipos de préstamo"
        />
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingTipo ? 'Editar Tipo de Préstamo' : 'Nuevo Tipo de Préstamo'}</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-88px)]">
              {(errors.non_field_errors || errors.detail) && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                  <p className="font-semibold mb-2">No se pudo guardar el tipo de préstamo</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {Array.isArray(errors.non_field_errors) && errors.non_field_errors.map((err, idx) => <li key={idx}>{err}</li>)}
                    {errors.detail && <li>{errors.detail}</li>}
                  </ul>
                </div>
              )}
              {/* Información Básica */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Información Básica</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editingTipo && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Código</label>
                      <div className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-mono text-gray-500">
                        {formData.codigo}
                      </div>
                    </div>
                  )}
                  <div className={editingTipo ? '' : 'md:col-span-2'}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                    <input
                      type="text" value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.nombre ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="Préstamo Personal"
                    />
                    {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
                    {errors.codigo && <p className="text-red-500 text-sm mt-1">{errors.codigo}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all resize-none"
                      placeholder="Descripción detallada del tipo de préstamo"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración Financiera */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Configuración Financiera</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Monto Mínimo *</label>
                    <input
                      type="number" step="0.01" value={formData.monto_minimo}
                      onChange={(e) => setFormData({ ...formData, monto_minimo: e.target.value })}
                      className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.monto_minimo ? 'border-red-500' : 'border-gray-200'}`}
                    />
                    {errors.monto_minimo && <p className="text-red-500 text-sm mt-1">{errors.monto_minimo}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Monto Máximo *</label>
                    <input
                      type="number" step="0.01" value={formData.monto_maximo}
                      onChange={(e) => setFormData({ ...formData, monto_maximo: e.target.value })}
                      className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.monto_maximo ? 'border-red-500' : 'border-gray-200'}`}
                    />
                    {errors.monto_maximo && <p className="text-red-500 text-sm mt-1">{errors.monto_maximo}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tasa Interés Mínima (%)</label>
                    <input
                      type="number" step="0.01" value={formData.tasa_interes_minima}
                      onChange={(e) => setFormData({ ...formData, tasa_interes_minima: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tasa Interés Máxima (%)</label>
                    <input
                      type="number" step="0.01" value={formData.tasa_interes_maxima}
                      onChange={(e) => setFormData({ ...formData, tasa_interes_maxima: e.target.value })}
                      className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.tasa_interes_maxima ? 'border-red-500' : 'border-gray-200'}`}
                    />
                    {errors.tasa_interes_maxima && <p className="text-red-500 text-sm mt-1">{errors.tasa_interes_maxima}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tasa Interés Por Defecto (%)</label>
                    <input
                      type="number" step="0.01" value={formData.tasa_interes_defecto}
                      onChange={(e) => setFormData({ ...formData, tasa_interes_defecto: e.target.value })}
                      className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.tasa_interes_defecto ? 'border-red-500' : 'border-gray-200'}`}
                    />
                    {errors.tasa_interes_defecto && <p className="text-red-500 text-sm mt-1">{errors.tasa_interes_defecto}</p>}
                  </div>
                </div>
              </div>

              {/* Configuración de Plazos */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Configuración de Plazos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Plazo Mínimo (meses) *</label>
                    <input
                      type="number" value={formData.plazo_minimo_meses}
                      onChange={(e) => setFormData({ ...formData, plazo_minimo_meses: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Plazo Máximo (meses) *</label>
                    <input
                      type="number" value={formData.plazo_maximo_meses}
                      onChange={(e) => setFormData({ ...formData, plazo_maximo_meses: e.target.value })}
                      className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${errors.plazo_maximo_meses ? 'border-red-500' : 'border-gray-200'}`}
                    />
                    {errors.plazo_maximo_meses && <p className="text-red-500 text-sm mt-1">{errors.plazo_maximo_meses}</p>}
                  </div>
                </div>
              </div>

              {/* Requisitos y Configuración */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Requisitos y Configuración</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox" checked={formData.requiere_garantia}
                      onChange={(e) => setFormData({ ...formData, requiere_garantia: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Garantía</span>
                  </label>
                  <label className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox" checked={formData.requiere_aprobacion}
                      onChange={(e) => setFormData({ ...formData, requiere_aprobacion: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Aprobación</span>
                  </label>
                  <label className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox" checked={formData.permite_prepago}
                      onChange={(e) => setFormData({ ...formData, permite_prepago: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Prepago</span>
                  </label>
                  <label className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox" checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Activo</span>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Orden</label>
                  <input
                    type="number" value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition-all">
                  Cancelar
                </button>
                <button type="submit"
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-lg">
                  {editingTipo ? 'Actualizar' : 'Crear Tipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
