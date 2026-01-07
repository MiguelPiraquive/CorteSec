import { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit2, Trash2, Search, Filter, AlertCircle, CheckCircle, XCircle, Clock, FileText, TrendingUp, User } from 'lucide-react';
import useAudit from '../../hooks/useAudit';
import prestamosService from '../../services/prestamosService';
import tiposPrestamoService from '../../services/tiposPrestamoService';
import empleadosService from '../../services/empleadosService';

export default function PrestamosPage() {
  const audit = useAudit('Prestamos');
  const [prestamos, setPrestamos] = useState([]);
  const [filteredPrestamos, setFilteredPrestamos] = useState([]);
  const [tiposPrestamo, setTiposPrestamo] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPrestamo, setEditingPrestamo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    empleado: '',
    tipo_prestamo: '',
    monto_solicitado: '',
    tasa_interes: '',
    plazo_meses: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    tipo_garantia: 'ninguna',
    garantia_descripcion: '',
    observaciones: '',
    estado: 'solicitado',
  });

  const [errors, setErrors] = useState({});

  const ESTADOS = [
    { value: 'borrador', label: 'Borrador', color: 'bg-gray-100 text-gray-800' },
    { value: 'solicitado', label: 'Solicitado', color: 'bg-blue-100 text-blue-800' },
    { value: 'en_revision', label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'pendiente', label: 'Pendiente', color: 'bg-orange-100 text-orange-800' },
    { value: 'aprobado', label: 'Aprobado', color: 'bg-green-100 text-green-800' },
    { value: 'rechazado', label: 'Rechazado', color: 'bg-red-100 text-red-800' },
    { value: 'desembolsado', label: 'Desembolsado', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'activo', label: 'Activo', color: 'bg-cyan-100 text-cyan-800' },
    { value: 'completado', label: 'Completado', color: 'bg-green-100 text-green-800' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
    { value: 'en_mora', label: 'En Mora', color: 'bg-red-100 text-red-800' },
  ];

  const TIPOS_GARANTIA = [
    { value: 'ninguna', label: 'Sin Garantía' },
    { value: 'personal', label: 'Garantía Personal' },
    { value: 'hipotecaria', label: 'Garantía Hipotecaria' },
    { value: 'vehicular', label: 'Garantía Vehicular' },
    { value: 'prendaria', label: 'Garantía Prendaria' },
    { value: 'deposito', label: 'Depósito en Garantía' },
    { value: 'codeudor', label: 'Codeudor' },
    { value: 'otra', label: 'Otra' },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterPrestamos();
  }, [prestamos, searchTerm, filterEstado]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [prestamosData, tiposData, empleadosData] = await Promise.all([
        prestamosService.getAllPrestamos(),
        tiposPrestamoService.getActiveTiposPrestamo(),
        empleadosService.getAllEmpleados(),
      ]);

      console.log('📦 Préstamos recibidos:', prestamosData);
      console.log('📦 Tipos recibidos:', tiposData);
      console.log('📦 Empleados recibidos:', empleadosData);

      const prestamosArray = Array.isArray(prestamosData) ? prestamosData : [];
      const tiposArray = Array.isArray(tiposData) ? tiposData : [];
      const empleadosArray = Array.isArray(empleadosData) ? empleadosData : [];

      setPrestamos(prestamosArray);
      setFilteredPrestamos(prestamosArray);
      setTiposPrestamo(tiposArray);
      setEmpleados(empleadosArray);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar los datos: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filterPrestamos = () => {
    let filtered = [...prestamos];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(prestamo =>
        prestamo.numero_prestamo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prestamo.empleado_detail?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prestamo.empleado_detail?.numero_identificacion?.includes(searchTerm)
      );
    }

    // Filter by estado
    if (filterEstado !== 'all') {
      filtered = filtered.filter(prestamo => prestamo.estado === filterEstado);
    }

    setFilteredPrestamos(filtered);
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormData({
      empleado: '',
      tipo_prestamo: '',
      monto_solicitado: '',
      tasa_interes: '',
      plazo_meses: '',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      tipo_garantia: 'ninguna',
      garantia_descripcion: '',
      observaciones: '',
      estado: 'solicitado',
    });
    setErrors({});
    setEditingPrestamo(null);
  };

  const handleTipoPrestamoChange = (tipoId) => {
    const tipo = tiposPrestamo.find(t => t.id === tipoId);
    if (tipo) {
      setFormData(prev => ({
        ...prev,
        tipo_prestamo: tipoId,
        tasa_interes: tipo.tasa_interes_defecto || '',
        plazo_meses: tipo.plazo_minimo_meses || '',
      }));
    } else {
      setFormData(prev => ({ ...prev, tipo_prestamo: tipoId }));
    }
  };

  const handleEdit = (prestamo) => {
    console.log('📝 Editando préstamo:', prestamo);
    console.log('📝 Empleado ID:', prestamo.empleado);
    console.log('📝 Tipo Préstamo ID:', prestamo.tipo_prestamo);
    
    audit.modalOpen('editar_prestamo', { prestamo_id: prestamo.id, numero: prestamo.numero_prestamo });
    setEditingPrestamo(prestamo);
    setFormData({
      empleado: prestamo.empleado || '',
      tipo_prestamo: prestamo.tipo_prestamo || '',
      monto_solicitado: prestamo.monto_solicitado || '',
      tasa_interes: prestamo.tasa_interes || '',
      plazo_meses: prestamo.plazo_meses || '',
      fecha_solicitud: prestamo.fecha_solicitud || new Date().toISOString().split('T')[0],
      tipo_garantia: prestamo.tipo_garantia || 'ninguna',
      garantia_descripcion: prestamo.garantia_descripcion || '',
      observaciones: prestamo.observaciones || '',
      estado: prestamo.estado || 'solicitado',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este préstamo?')) {
      try {
        const prestamo = prestamos.find(p => p.id === id);
        await prestamosService.deletePrestamo(id);
        audit.button('eliminar_prestamo', { prestamo_id: id, numero: prestamo?.numero_prestamo });
        alert('Préstamo eliminado exitosamente');
        loadInitialData();
      } catch (error) {
        console.error('Error deleting prestamo:', error);
        alert('Error al eliminar: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleAprobar = async (prestamo) => {
    const montoAprobado = prompt(
      `Aprobar préstamo ${prestamo.numero_prestamo}\n\nMonto solicitado: ${formatMoney(prestamo.monto_solicitado)}\n\nIngrese el monto aprobado (puede ser diferente):`,
      prestamo.monto_solicitado
    );
    
    if (montoAprobado === null) return; // Usuario canceló
    
    const monto = parseFloat(montoAprobado);
    if (isNaN(monto) || monto <= 0) {
      alert('Monto inválido');
      return;
    }

    const observaciones = prompt('Observaciones de aprobación (opcional):') || '';

    try {
      await prestamosService.aprobarPrestamo(prestamo.id, {
        monto_aprobado: monto,
        observaciones: observaciones
      });
      audit.button('aprobar_prestamo', { prestamo_id: prestamo.id, numero: prestamo.numero_prestamo, monto_aprobado: monto });
      alert('Préstamo aprobado exitosamente');
      loadInitialData();
    } catch (error) {
      console.error('Error aprobando prestamo:', error);
      alert('Error al aprobar: ' + (error.response?.data?.error || error.response?.data?.detail || error.message));
    }
  };

  const handleRechazar = async (prestamo) => {
    const motivo = prompt(`Rechazar préstamo ${prestamo.numero_prestamo}\n\nIngrese el motivo del rechazo:`);
    
    if (!motivo || motivo.trim() === '') {
      alert('Debe ingresar un motivo de rechazo');
      return;
    }

    if (window.confirm(`¿Está seguro de rechazar este préstamo?\n\nMotivo: ${motivo}`)) {
      try {
        await prestamosService.rechazarPrestamo(prestamo.id, {
          motivo: motivo
        });
        audit.button('rechazar_prestamo', { prestamo_id: prestamo.id, numero: prestamo.numero_prestamo, motivo: motivo });
        alert('Préstamo rechazado');
        loadInitialData();
      } catch (error) {
        console.error('Error rechazando prestamo:', error);
        alert('Error al rechazar: ' + (error.response?.data?.error || error.response?.data?.detail || error.message));
      }
    }
  };

  const handleDesembolsar = async (prestamo) => {
    const montoFormateado = formatMoney(prestamo.monto_aprobado || prestamo.monto_solicitado);
    
    if (window.confirm(
      `¿Desembolsar préstamo ${prestamo.numero_prestamo}?\n\n` +
      `Monto: ${montoFormateado}\n\n` +
      `Se registrará la fecha de desembolso de HOY y el primer pago será en 1 mes.`
    )) {
      try {
        await prestamosService.desembolsarPrestamo(prestamo.id, {});
        audit.button('desembolsar_prestamo', { prestamo_id: prestamo.id, numero: prestamo.numero_prestamo, monto: prestamo.monto_aprobado });
        alert('Préstamo desembolsado exitosamente');
        loadInitialData();
      } catch (error) {
        console.error('Error desembolsando prestamo:', error);
        alert('Error al desembolsar: ' + (error.response?.data?.error || error.response?.data?.detail || error.message));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.empleado) {
      newErrors.empleado = 'El empleado es requerido';
    }

    if (!formData.tipo_prestamo) {
      newErrors.tipo_prestamo = 'El tipo de préstamo es requerido';
    }

    if (!formData.monto_solicitado || parseFloat(formData.monto_solicitado) <= 0) {
      newErrors.monto_solicitado = 'El monto debe ser mayor a 0';
    }

    // Validate against tipo limits
    const tipo = tiposPrestamo.find(t => t.id === formData.tipo_prestamo);
    if (tipo && formData.monto_solicitado) {
      const monto = parseFloat(formData.monto_solicitado);
      if (monto < parseFloat(tipo.monto_minimo)) {
        newErrors.monto_solicitado = `El monto mínimo para este tipo es ${formatMoney(tipo.monto_minimo)}`;
      }
      if (monto > parseFloat(tipo.monto_maximo)) {
        newErrors.monto_solicitado = `El monto máximo para este tipo es ${formatMoney(tipo.monto_maximo)}`;
      }
    }

    if (!formData.tasa_interes || parseFloat(formData.tasa_interes) < 0) {
      newErrors.tasa_interes = 'La tasa de interés es requerida';
    }

    if (!formData.plazo_meses || parseInt(formData.plazo_meses) <= 0) {
      newErrors.plazo_meses = 'El plazo debe ser mayor a 0';
    }

    // Validate against tipo limits
    if (tipo && formData.plazo_meses) {
      const plazo = parseInt(formData.plazo_meses);
      if (plazo < tipo.plazo_minimo_meses) {
        newErrors.plazo_meses = `El plazo mínimo para este tipo es ${tipo.plazo_minimo_meses} meses`;
      }
      if (plazo > tipo.plazo_maximo_meses) {
        newErrors.plazo_meses = `El plazo máximo para este tipo es ${tipo.plazo_maximo_meses} meses`;
      }
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
        empleado: formData.empleado,
        tipo_prestamo: formData.tipo_prestamo,
        monto_solicitado: parseFloat(formData.monto_solicitado),
        tasa_interes: parseFloat(formData.tasa_interes),
        plazo_meses: parseInt(formData.plazo_meses),
        fecha_solicitud: formData.fecha_solicitud,
        tipo_garantia: formData.tipo_garantia,
        garantia_descripcion: formData.garantia_descripcion,
        observaciones: formData.observaciones,
        estado: formData.estado,
      };

      console.log('📤 Datos a enviar:', dataToSend);

      if (editingPrestamo) {
        await prestamosService.updatePrestamo(editingPrestamo.id, dataToSend);
        audit.button('modificar_prestamo', { prestamo_id: editingPrestamo.id, numero: editingPrestamo.numero_prestamo });
        alert('Préstamo actualizado exitosamente');
      } else {
        const result = await prestamosService.createPrestamo(dataToSend);
        audit.button('crear_prestamo', { monto: dataToSend.monto_solicitado, empleado_id: dataToSend.empleado });
        alert('Préstamo creado exitosamente');
      }

      setShowModal(false);
      resetForm();
      loadInitialData();
    } catch (error) {
      console.error('Error saving prestamo:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      if (error.response?.data) {
        const serverErrors = {};
        Object.keys(error.response.data).forEach(key => {
          serverErrors[key] = Array.isArray(error.response.data[key]) 
            ? error.response.data[key][0] 
            : error.response.data[key];
        });
        setErrors(serverErrors);
        
        // Show detailed error message
        const errorMessages = Object.entries(error.response.data).map(([key, value]) => {
          const msg = Array.isArray(value) ? value[0] : value;
          return `${key}: ${msg}`;
        }).join('\n');
        alert('Error al guardar:\n' + errorMessages);
      } else {
        alert('Error al guardar: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPrestamos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPrestamos.length / itemsPerPage);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getEstadoColor = (estado) => {
    const estadoObj = ESTADOS.find(e => e.value === estado);
    return estadoObj ? estadoObj.color : 'bg-gray-100 text-gray-800';
  };

  const getEstadoLabel = (estado) => {
    const estadoObj = ESTADOS.find(e => e.value === estado);
    return estadoObj ? estadoObj.label : estado;
  };

  const getEmpleadoNombre = (prestamo) => {
    // If we have empleado_detail from full serializer
    if (prestamo.empleado_detail) {
      return prestamo.empleado_detail.nombre_completo || 
             `${prestamo.empleado_detail.nombres || ''} ${prestamo.empleado_detail.apellidos || ''}`.trim() || 
             'Sin nombre';
    }
    // If we have empleado_nombre from list serializer
    if (prestamo.empleado_nombre) {
      return prestamo.empleado_nombre;
    }
    return 'N/A';
  };

  const getTipoNombre = (prestamo) => {
    // If we have tipo_prestamo_detail from full serializer
    if (prestamo.tipo_prestamo_detail) {
      return prestamo.tipo_prestamo_detail.nombre || 'Sin nombre';
    }
    // If we have tipo_prestamo_nombre from list serializer
    if (prestamo.tipo_prestamo_nombre) {
      return prestamo.tipo_prestamo_nombre;
    }
    return 'N/A';
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
            <DollarSign className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Préstamos</h1>
              <p className="text-emerald-100">Gestión de préstamos a empleados</p>
            </div>
          </div>
          <button
            onClick={() => {
              audit.modalOpen('crear_prestamo');
              resetForm();
              setShowModal(true);
            }}
            className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-semibold hover:bg-emerald-50 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo Préstamo</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-emerald-100 text-sm">Total Préstamos</div>
            <div className="text-2xl font-bold">{prestamos.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-emerald-100 text-sm">Activos</div>
            <div className="text-2xl font-bold">
              {prestamos.filter(p => ['aprobado', 'desembolsado', 'activo'].includes(p.estado)).length}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-emerald-100 text-sm">Pendientes</div>
            <div className="text-2xl font-bold">
              {prestamos.filter(p => ['solicitado', 'en_revision', 'pendiente'].includes(p.estado)).length}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-emerald-100 text-sm">Completados</div>
            <div className="text-2xl font-bold">
              {prestamos.filter(p => p.estado === 'completado').length}
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
              placeholder="Buscar por número, empleado..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.length > 2) {
                  audit.search('prestamos', { termino: e.target.value });
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={filterEstado}
              onChange={(e) => {
                setFilterEstado(e.target.value);
                audit.filter('prestamos_estado', { estado: e.target.value });
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
            >
              <option value="all">Todos los estados</option>
              {ESTADOS.map(estado => (
                <option key={estado.value} value={estado.value}>{estado.label}</option>
              ))}
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
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Solicitado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plazo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
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
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p>No se encontraron préstamos</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((prestamo) => (
                  <tr key={prestamo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="font-medium text-gray-900">{prestamo.numero_prestamo}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getEmpleadoNombre(prestamo)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {getTipoNombre(prestamo)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatMoney(prestamo.monto_solicitado)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{prestamo.plazo_meses} meses</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{prestamo.tasa_interes}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{prestamo.fecha_solicitud}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(prestamo.estado)}`}>
                        {getEstadoLabel(prestamo.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {/* Botón Aprobar - solo para estados: solicitado, en_revision, pendiente */}
                        {['solicitado', 'en_revision', 'pendiente'].includes(prestamo.estado) && (
                          <button
                            onClick={() => handleAprobar(prestamo)}
                            className="text-green-600 hover:text-green-900"
                            title="Aprobar préstamo"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        )}
                        
                        {/* Botón Rechazar - solo para estados: solicitado, en_revision, pendiente */}
                        {['solicitado', 'en_revision', 'pendiente'].includes(prestamo.estado) && (
                          <button
                            onClick={() => handleRechazar(prestamo)}
                            className="text-red-600 hover:text-red-900"
                            title="Rechazar préstamo"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        )}
                        
                        {/* Botón Desembolsar - solo para estado: aprobado */}
                        {prestamo.estado === 'aprobado' && (
                          <button
                            onClick={() => handleDesembolsar(prestamo)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Desembolsar préstamo"
                          >
                            <TrendingUp className="h-5 w-5" />
                          </button>
                        )}
                        
                        {/* Botón Editar - siempre visible */}
                        <button
                          onClick={() => handleEdit(prestamo)}
                          className="text-emerald-600 hover:text-emerald-900"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        
                        {/* Botón Eliminar - solo si no está en estados finales */}
                        {!['completado', 'cancelado'].includes(prestamo.estado) && (
                          <button
                            onClick={() => handleDelete(prestamo.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
                    {Math.min(indexOfLastItem, filteredPrestamos.length)}
                  </span>{' '}
                  de <span className="font-medium">{filteredPrestamos.length}</span> resultados
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
                  {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = index + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = index + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + index;
                    } else {
                      pageNumber = currentPage - 2 + index;
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNumber
                            ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
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
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingPrestamo ? 'Editar Préstamo' : 'Nuevo Préstamo'}
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
              {/* Employee & Type Selection */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Información Principal</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Empleado *
                    </label>
                    <select
                      value={formData.empleado}
                      onChange={(e) => setFormData({ ...formData, empleado: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.empleado ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                    >
                      <option value="">Seleccione un empleado</option>
                      {empleados.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombres} {emp.apellidos} - {emp.documento || emp.numero_identificacion || 'Sin documento'}
                        </option>
                      ))}
                    </select>
                    {errors.empleado && <p className="mt-1 text-sm text-red-600">{errors.empleado}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tipo de Préstamo *
                    </label>
                    <select
                      value={formData.tipo_prestamo}
                      onChange={(e) => handleTipoPrestamoChange(e.target.value)}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.tipo_prestamo ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                    >
                      <option value="">Seleccione un tipo</option>
                      {tiposPrestamo.map(tipo => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nombre} ({tipo.tasa_interes_defecto}%)
                        </option>
                      ))}
                    </select>
                    {errors.tipo_prestamo && <p className="mt-1 text-sm text-red-600">{errors.tipo_prestamo}</p>}
                  </div>
                </div>
              </div>

              {/* Financial Terms */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Términos Financieros</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Monto Solicitado *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monto_solicitado}
                      onChange={(e) => setFormData({ ...formData, monto_solicitado: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.monto_solicitado ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                    {errors.monto_solicitado && <p className="mt-1 text-sm text-red-600">{errors.monto_solicitado}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tasa de Interés (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tasa_interes}
                      onChange={(e) => setFormData({ ...formData, tasa_interes: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.tasa_interes ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                    {errors.tasa_interes && <p className="mt-1 text-sm text-red-600">{errors.tasa_interes}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Plazo (meses) *
                    </label>
                    <input
                      type="number"
                      value={formData.plazo_meses}
                      onChange={(e) => setFormData({ ...formData, plazo_meses: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.plazo_meses ? 'border-red-300' : 'border-gray-300'
                      } focus:ring-emerald-500 focus:border-emerald-500`}
                    />
                    {errors.plazo_meses && <p className="mt-1 text-sm text-red-600">{errors.plazo_meses}</p>}
                  </div>
                </div>
              </div>

              {/* Guarantee & Details */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Garantía y Detalles</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Fecha de Solicitud
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_solicitud}
                        onChange={(e) => setFormData({ ...formData, fecha_solicitud: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tipo de Garantía
                      </label>
                      <select
                        value={formData.tipo_garantia}
                        onChange={(e) => setFormData({ ...formData, tipo_garantia: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {TIPOS_GARANTIA.map(tipo => (
                          <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formData.tipo_garantia !== 'ninguna' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Descripción de la Garantía
                      </label>
                      <textarea
                        value={formData.garantia_descripcion}
                        onChange={(e) => setFormData({ ...formData, garantia_descripcion: e.target.value })}
                        rows="2"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Describa la garantía ofrecida..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Observaciones
                    </label>
                    <textarea
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      rows="3"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Notas adicionales sobre el préstamo..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Estado
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {ESTADOS.map(estado => (
                        <option key={estado.value} value={estado.value}>{estado.label}</option>
                      ))}
                    </select>
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
                  {editingPrestamo ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
