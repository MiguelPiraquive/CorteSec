import { useState, useEffect } from 'react';
import { Wallet, Plus, Edit2, Trash2, Search, Filter, AlertCircle, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import useAudit from '../../hooks/useAudit';
import tiposPrestamoService from '../../services/tiposPrestamoService';

export default function TiposPrestamoPage() {
  const audit = useAudit('TiposPrestamo');
  const [tiposPrestamo, setTiposPrestamo] = useState([]);
  const [filteredTipos, setFilteredTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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

  useEffect(() => {
    loadTiposPrestamo();
  }, []);

  useEffect(() => {
    filterTipos();
  }, [tiposPrestamo, searchTerm, filterActivo]);

  const loadTiposPrestamo = async () => {
    try {
      setLoading(true);
      const data = await tiposPrestamoService.getAllTiposPrestamo();
      console.log('📦 Tipos de préstamo recibidos:', data);
      console.log('🔍 Es array?', Array.isArray(data));
      
      const tiposArray = Array.isArray(data) ? data : [];
      console.log('🔍 Tipos de préstamo recibidos:', tiposArray);
      if (tiposArray.length > 0) {
        console.log('🔍 Primer tipo de préstamo:', tiposArray[0]);
        console.log('   - plazo_minimo_meses:', tiposArray[0].plazo_minimo_meses);
        console.log('   - plazo_maximo_meses:', tiposArray[0].plazo_maximo_meses);
        console.log('   - requiere_garantia:', tiposArray[0].requiere_garantia);
        console.log('   - requiere_aprobacion:', tiposArray[0].requiere_aprobacion);
        console.log('   - permite_prepago:', tiposArray[0].permite_prepago);
        console.log('   - activo:', tiposArray[0].activo);
      }
      setTiposPrestamo(tiposArray);
      setFilteredTipos(tiposArray);
    } catch (error) {
      console.error('Error loading tipos de prestamo:', error);
      alert('Error al cargar los tipos de préstamo: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filterTipos = () => {
    let filtered = [...tiposPrestamo];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(tipo =>
        tipo.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tipo.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tipo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by activo status
    if (filterActivo !== 'all') {
      filtered = filtered.filter(tipo => 
        filterActivo === 'active' ? tipo.activo : !tipo.activo
      );
    }

    setFilteredTipos(filtered);
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormData({
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
        await tiposPrestamoService.deleteTipoPrestamo(id);
        alert('Tipo de préstamo eliminado exitosamente');
        loadTiposPrestamo();
      } catch (error) {
        console.error('Error deleting tipo:', error);
        alert('Error al eliminar: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleToggleActivo = async (tipo) => {
    try {
      await tiposPrestamoService.toggleActivo(tipo.id, !tipo.activo);
      alert(`Tipo de préstamo ${!tipo.activo ? 'activado' : 'desactivado'} exitosamente`);
      loadTiposPrestamo();
    } catch (error) {
      console.error('Error toggling activo:', error);
      alert('Error al cambiar estado: ' + (error.response?.data?.detail || error.message));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código es requerido';
    } else if (!/^[A-Z0-9_]{2,20}$/.test(formData.codigo)) {
      newErrors.codigo = 'El código debe contener solo letras mayúsculas, números y guiones bajos (2-20 caracteres)';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.monto_minimo || parseFloat(formData.monto_minimo) <= 0) {
      newErrors.monto_minimo = 'El monto mínimo debe ser mayor a 0';
    }

    if (!formData.monto_maximo || parseFloat(formData.monto_maximo) <= 0) {
      newErrors.monto_maximo = 'El monto máximo debe ser mayor a 0';
    }

    if (parseFloat(formData.monto_minimo) >= parseFloat(formData.monto_maximo)) {
      newErrors.monto_maximo = 'El monto máximo debe ser mayor al mínimo';
    }

    if (formData.tasa_interes_minima && formData.tasa_interes_maxima) {
      if (parseFloat(formData.tasa_interes_minima) > parseFloat(formData.tasa_interes_maxima)) {
        newErrors.tasa_interes_maxima = 'La tasa máxima debe ser mayor o igual a la mínima';
      }
    }

    if (formData.tasa_interes_defecto && formData.tasa_interes_minima && formData.tasa_interes_maxima) {
      const def = parseFloat(formData.tasa_interes_defecto);
      const min = parseFloat(formData.tasa_interes_minima);
      const max = parseFloat(formData.tasa_interes_maxima);
      if (def < min || def > max) {
        newErrors.tasa_interes_defecto = 'La tasa por defecto debe estar entre la mínima y máxima';
      }
    }

    if (parseInt(formData.plazo_minimo_meses) >= parseInt(formData.plazo_maximo_meses)) {
      newErrors.plazo_maximo_meses = 'El plazo máximo debe ser mayor al mínimo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const dataToSend = {
        ...formData,
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
        alert('Tipo de préstamo actualizado exitosamente');
      } else {
        await tiposPrestamoService.createTipoPrestamo(dataToSend);
        alert('Tipo de préstamo creado exitosamente');
      }

      setShowModal(false);
      resetForm();
      loadTiposPrestamo();
    } catch (error) {
      console.error('Error saving tipo de prestamo:', error);
      if (error.response?.data) {
        const serverErrors = {};
        Object.keys(error.response.data).forEach(key => {
          serverErrors[key] = Array.isArray(error.response.data[key]) 
            ? error.response.data[key][0] 
            : error.response.data[key];
        });
        setErrors(serverErrors);
      }
      alert('Error al guardar: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTipos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTipos.length / itemsPerPage);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wallet className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Tipos de Préstamo</h1>
              <p className="text-emerald-100">Gestión de tipos y configuraciones de préstamos</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-semibold hover:bg-emerald-50 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo Tipo</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-emerald-100 text-sm">Total Tipos</div>
            <div className="text-2xl font-bold">{tiposPrestamo.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-emerald-100 text-sm">Activos</div>
            <div className="text-2xl font-bold">
              {tiposPrestamo.filter(t => t.activo).length}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-emerald-100 text-sm">Inactivos</div>
            <div className="text-2xl font-bold">
              {tiposPrestamo.filter(t => !t.activo).length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasa Interés
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plazo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requisitos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p>No se encontraron tipos de préstamo</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((tipo) => (
                  <tr key={tipo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{tipo.codigo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{tipo.nombre}</div>
                      {tipo.descripcion && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {tipo.descripcion}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatMoney(tipo.monto_minimo)} - {formatMoney(tipo.monto_maximo)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {tipo.tasa_interes_defecto}%
                      </div>
                      <div className="text-xs text-gray-500">
                        ({tipo.tasa_interes_minima}% - {tipo.tasa_interes_maxima}%)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {tipo.plazo_minimo_meses || 1} - {tipo.plazo_maximo_meses || 60} meses
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {tipo.requiere_garantia && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            🔒 Garantía
                          </span>
                        )}
                        {tipo.requiere_aprobacion && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            ✓ Aprobación
                          </span>
                        )}
                        {tipo.permite_prepago && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            💰 Prepago
                          </span>
                        )}
                        {!tipo.requiere_garantia && !tipo.requiere_aprobacion && !tipo.permite_prepago && (
                          <span className="text-xs text-gray-400">Sin requisitos especiales</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActivo(tipo)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tipo.activo
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {tipo.activo ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactivo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(tipo)}
                        className="text-emerald-600 hover:text-emerald-900 mr-3"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tipo.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredTipos.length)}
                  </span>{' '}
                  de <span className="font-medium">{filteredTipos.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === index + 1
                          ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTipo ? 'Editar Tipo de Préstamo' : 'Nuevo Tipo de Préstamo'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Información Básica</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Código *
                    </label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.codigo ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                      placeholder="PERS_001"
                    />
                    {errors.codigo && <p className="mt-1 text-sm text-red-600">{errors.codigo}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.nombre ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                      placeholder="Préstamo Personal"
                    />
                    {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows="2"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Descripción detallada del tipo de préstamo"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Configuration */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Configuración Financiera</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Monto Mínimo *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monto_minimo}
                      onChange={(e) => setFormData({ ...formData, monto_minimo: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.monto_minimo ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                    {errors.monto_minimo && <p className="mt-1 text-sm text-red-600">{errors.monto_minimo}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Monto Máximo *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monto_maximo}
                      onChange={(e) => setFormData({ ...formData, monto_maximo: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.monto_maximo ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                    {errors.monto_maximo && <p className="mt-1 text-sm text-red-600">{errors.monto_maximo}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tasa Interés Mínima (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tasa_interes_minima}
                      onChange={(e) => setFormData({ ...formData, tasa_interes_minima: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tasa Interés Máxima (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tasa_interes_maxima}
                      onChange={(e) => setFormData({ ...formData, tasa_interes_maxima: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.tasa_interes_maxima ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                    {errors.tasa_interes_maxima && <p className="mt-1 text-sm text-red-600">{errors.tasa_interes_maxima}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Tasa Interés Por Defecto (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tasa_interes_defecto}
                      onChange={(e) => setFormData({ ...formData, tasa_interes_defecto: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.tasa_interes_defecto ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                    {errors.tasa_interes_defecto && <p className="mt-1 text-sm text-red-600">{errors.tasa_interes_defecto}</p>}
                  </div>
                </div>
              </div>

              {/* Term Configuration */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Configuración de Plazos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Plazo Mínimo (meses) *
                    </label>
                    <input
                      type="number"
                      value={formData.plazo_minimo_meses}
                      onChange={(e) => setFormData({ ...formData, plazo_minimo_meses: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Plazo Máximo (meses) *
                    </label>
                    <input
                      type="number"
                      value={formData.plazo_maximo_meses}
                      onChange={(e) => setFormData({ ...formData, plazo_maximo_meses: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.plazo_maximo_meses ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                    {errors.plazo_maximo_meses && <p className="mt-1 text-sm text-red-600">{errors.plazo_maximo_meses}</p>}
                  </div>
                </div>
              </div>

              {/* Requirements & Settings */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Requisitos y Configuración</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requiere_garantia}
                      onChange={(e) => setFormData({ ...formData, requiere_garantia: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Requiere Garantía</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requiere_aprobacion}
                      onChange={(e) => setFormData({ ...formData, requiere_aprobacion: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Requiere Aprobación</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.permite_prepago}
                      onChange={(e) => setFormData({ ...formData, permite_prepago: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Permite Prepago</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Activo</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Orden
                    </label>
                    <input
                      type="number"
                      value={formData.orden}
                      onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  {editingTipo ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
