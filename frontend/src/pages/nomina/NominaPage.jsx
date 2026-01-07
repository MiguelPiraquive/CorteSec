/**
 * Página Unificada de Gestión de Nómina
 * Incluye gestión completa de nóminas y generación de desprendibles
 */

import { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Download,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Eye
} from 'lucide-react';
import useAudit from '../../hooks/useAudit';
import nominaService from '../../services/nominaService';
import empleadosService from '../../services/empleadosService';
import itemsService from '../../services/itemsService';
import { periodosAPI, conceptosLaboralesAPI } from '../../services/payrollService';

export default function NominaPage() {
  const audit = useAudit('Nomina');
  
  const [nominas, setNominas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [items, setItems] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [conceptosLaborales, setConceptosLaborales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpleado, setFilterEmpleado] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [editingNomina, setEditingNomina] = useState(null);
  const [selectedNomina, setSelectedNomina] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [estadisticas, setEstadisticas] = useState(null);

  const [formData, setFormData] = useState({
    empleado: '',
    periodo: '',
    periodo_inicio: '',
    periodo_fin: '',
    dias_trabajados: 30,
    salario_base_contrato: '',
    estado: 'BOR',
    observaciones: '',
    detalles_items: [],
    detalles_conceptos: []
  });

  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEmpleado]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [nominasData, empleadosData, itemsData, periodosData, conceptosData, statsData] = await Promise.all([
        nominaService.getAllNominas(),
        empleadosService.getAllEmpleados(),
        itemsService.getAllItems(),
        periodosAPI.list(),
        conceptosLaboralesAPI.list(),
        nominaService.getEstadisticas()
      ]);

      console.log('📊 Nóminas recibidas:', nominasData);
      
      // Extraer el array correcto de la respuesta
      const nominasArray = nominasData?.data?.results || nominasData?.results || nominasData?.data || nominasData || [];
      const empleadosArray = empleadosData?.data?.results || empleadosData?.results || empleadosData?.data || empleadosData || [];
      const itemsArray = itemsData?.data?.results || itemsData?.results || itemsData?.data || itemsData || [];
      const periodosArray = periodosData?.data?.results || periodosData?.results || periodosData?.data || periodosData || [];
      const conceptosArray = conceptosData?.data?.results || conceptosData?.results || conceptosData?.data || conceptosData || [];
      
      setNominas(Array.isArray(nominasArray) ? nominasArray : []);
      setEmpleados(Array.isArray(empleadosArray) ? empleadosArray.filter(e => e.activo) : []);
      setItems(Array.isArray(itemsArray) ? itemsArray.filter(i => i.activo) : []);
      setPeriodos(Array.isArray(periodosArray) ? periodosArray : []);
      setConceptosLaborales(Array.isArray(conceptosArray) ? conceptosArray.filter(c => c.activo) : []);
      setEstadisticas(statsData);
      
      console.log(`✅ ${nominasArray.length} nóminas cargadas`);
    } catch (error) {
      showNotification('error', 'Error al cargar datos');
      console.error('Error completo:', error);
      console.error('Response:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const dataToSend = {
        empleado: parseInt(formData.empleado),
        periodo: parseInt(formData.periodo),
        periodo_inicio: formData.periodo_inicio,
        periodo_fin: formData.periodo_fin,
        dias_trabajados: parseInt(formData.dias_trabajados),
        salario_base_contrato: parseFloat(formData.salario_base_contrato),
        estado: formData.estado || 'BOR',
        observaciones: formData.observaciones || '',
        detalles_items: formData.detalles_items.map(d => ({
          item: parseInt(d.item),
          cantidad: parseFloat(d.cantidad),
          valor_unitario: parseFloat(d.valor_unitario)
        })),
        detalles_conceptos: formData.detalles_conceptos.map(c => ({
          concepto: parseInt(c.concepto),
          valor_total: parseFloat(c.valor_total)
        }))
      };

      if (editingNomina) {
        await nominaService.updateNomina(editingNomina.id, dataToSend);
        audit.button('modificar_nomina', { nomina_id: editingNomina.id });
        showNotification('success', 'Nómina actualizada exitosamente');
      } else {
        await nominaService.createNomina(dataToSend);
        audit.button('crear_nomina', { empleado_id: formData.empleado });
        showNotification('success', 'Nómina creada exitosamente');
      }

      setShowModal(false);
      resetForm();
      loadInitialData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Error al guardar nómina';
      showNotification('error', errorMsg);
      console.error(error);
      
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.empleado) {
      newErrors.empleado = 'El empleado es requerido';
    }

    if (!formData.periodo) {
      newErrors.periodo = 'El período es requerido';
    }

    if (!formData.periodo_inicio) {
      newErrors.periodo_inicio = 'La fecha de inicio es requerida';
    }

    if (!formData.periodo_fin) {
      newErrors.periodo_fin = 'La fecha fin es requerida';
    }

    if (!formData.dias_trabajados || formData.dias_trabajados <= 0) {
      newErrors.dias_trabajados = 'Los días trabajados deben ser mayor a 0';
    }

    if (!formData.salario_base_contrato || formData.salario_base_contrato <= 0) {
      newErrors.salario_base_contrato = 'El salario base es requerido';
    }

    if (formData.periodo_inicio && formData.periodo_fin) {
      if (new Date(formData.periodo_inicio) > new Date(formData.periodo_fin)) {
        newErrors.periodo_fin = 'La fecha fin debe ser posterior a la fecha de inicio';
      }
    }

    if (formData.detalles_items.length === 0 && formData.detalles_conceptos.length === 0) {
      newErrors.detalles = 'Debe agregar al menos un item o concepto';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (nomina) => {
    audit.modalOpen('editar_nomina', { nomina_id: nomina.id });
    setEditingNomina(nomina);
    setFormData({
      empleado: nomina.empleado.toString(),
      periodo: nomina.periodo?.toString() || '',
      periodo_inicio: nomina.periodo_inicio,
      periodo_fin: nomina.periodo_fin,
      dias_trabajados: nomina.dias_trabajados || 30,
      salario_base_contrato: nomina.salario_base_contrato?.toString() || '',
      estado: nomina.estado || 'BOR',
      observaciones: nomina.observaciones || '',
      detalles_items: (nomina.detalles_items || []).map(d => ({
        item: d.item.toString(),
        cantidad: d.cantidad.toString(),
        valor_unitario: d.valor_unitario.toString()
      })),
      detalles_conceptos: (nomina.detalles_conceptos || []).map(c => ({
        concepto: c.concepto.toString(),
        valor_total: c.valor_total.toString()
      }))
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta nómina?')) return;
    
    try {
      const nomina = nominas.find(n => n.id === id);
      await nominaService.deleteNomina(id);
      audit.button('eliminar_nomina', { nomina_id: id });
      showNotification('success', 'Nómina eliminada exitosamente');
      loadInitialData();
    } catch (error) {
      showNotification('error', 'Error al eliminar nómina');
    }
  };

  const handleDescargarDesprendible = async (nominaId) => {
    try {
      audit.button('descargar_desprendible', { nomina_id: nominaId });
      await nominaService.descargarDesprendible(nominaId);
      showNotification('success', 'Desprendible descargado exitosamente');
    } catch (error) {
      showNotification('error', 'Error al descargar desprendible');
    }
  };

  const handleVerDetalle = (nomina) => {
    audit.modalOpen('ver_detalle_nomina', { nomina_id: nomina.id });
    setSelectedNomina(nomina);
    setShowDetalleModal(true);
  };

  const handleExportarExcel = async () => {
    try {
      audit.button('exportar_nominas_excel');
      await nominaService.exportarExcel({ search: searchTerm, empleado: filterEmpleado });
      showNotification('success', 'Archivo exportado exitosamente');
    } catch (error) {
      showNotification('error', 'Error al exportar archivo');
    }
  };

  const resetForm = () => {
    setFormData({
      empleado: '',
      periodo: '',
      periodo_inicio: '',
      periodo_fin: '',
      dias_trabajados: 30,
      salario_base_contrato: '',
      estado: 'BOR',
      observaciones: '',
      detalles_items: [],
      detalles_conceptos: []
    });
    setErrors({});
    setEditingNomina(null);
  };

  const agregarDetalleItem = () => {
    setFormData({
      ...formData,
      detalles_items: [...formData.detalles_items, { item: '', cantidad: '', valor_unitario: '' }]
    });
  };

  const removerDetalleItem = (index) => {
    const nuevosDetalles = formData.detalles_items.filter((_, i) => i !== index);
    setFormData({ ...formData, detalles_items: nuevosDetalles });
  };

  const actualizarDetalleItem = (index, field, value) => {
    const nuevosDetalles = [...formData.detalles_items];
    nuevosDetalles[index][field] = value;
    
    // Auto-calcular valor_unitario si se selecciona un item
    if (field === 'item' && value) {
      const item = items.find(i => i.id === parseInt(value));
      if (item) {
        nuevosDetalles[index].valor_unitario = item.precio_unitario.toString();
      }
    }
    
    setFormData({ ...formData, detalles_items: nuevosDetalles });
  };

  const agregarDetalleConcepto = () => {
    setFormData({
      ...formData,
      detalles_conceptos: [...formData.detalles_conceptos, { concepto: '', valor_total: '' }]
    });
  };

  const removerDetalleConcepto = (index) => {
    const nuevosDetalles = formData.detalles_conceptos.filter((_, i) => i !== index);
    setFormData({ ...formData, detalles_conceptos: nuevosDetalles });
  };

  const actualizarDetalleConcepto = (index, field, value) => {
    const nuevosDetalles = [...formData.detalles_conceptos];
    nuevosDetalles[index][field] = value;
    
    // Auto-calcular valor_total si se selecciona un concepto
    if (field === 'concepto' && value) {
      const concepto = conceptosLaborales.find(c => c.id === parseInt(value));
      if (concepto) {
        nuevosDetalles[index].valor_total = concepto.valor_por_defecto?.toString() || '';
      }
    }
    
    setFormData({ ...formData, detalles_conceptos: nuevosDetalles });
  };

  const calcularTotalItems = () => {
    return formData.detalles_items.reduce((sum, detalle) => {
      if (detalle.item && detalle.cantidad && detalle.valor_unitario) {
        return sum + (parseFloat(detalle.valor_unitario) * parseFloat(detalle.cantidad));
      }
      return sum;
    }, 0);
  };

  const calcularTotalConceptos = () => {
    return formData.detalles_conceptos.reduce((sum, detalle) => {
      if (detalle.concepto && detalle.valor_total) {
        return sum + parseFloat(detalle.valor_total);
      }
      return sum;
    }, 0);
  };

  const calcularTotal = () => {
    return calcularTotalItems() + calcularTotalConceptos();
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Filtrar nóminas
  const filteredNominas = nominas.filter(nomina => {
    const matchSearch = 
      nomina.empleado_info?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nomina.empleado_info?.documento?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchEmpleado = filterEmpleado === '' || nomina.empleado === parseInt(filterEmpleado);
    
    return matchSearch && matchEmpleado;
  });

  // Paginación
  const totalPages = Math.ceil(filteredNominas.length / itemsPerPage);
  const currentNominas = filteredNominas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

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
      <div className="backdrop-blur-xl bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Wallet className="w-12 h-12" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Gestión de Nómina</h1>
              <p className="text-teal-100 mt-2 text-lg">
                Administración completa de nóminas y desprendibles de pago
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              audit.modalOpen('crear_nomina');
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center space-x-2 px-6 py-3 bg-white text-teal-600 hover:bg-teal-50 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Nómina</span>
          </button>
        </div>

        {/* Estadísticas */}
        {estadisticas && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-teal-100 text-sm">Total Nóminas</div>
                  <div className="text-2xl font-bold">{estadisticas.total_nominas}</div>
                </div>
                <FileText className="w-8 h-8 text-teal-200" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-teal-100 text-sm">Total Pagado</div>
                  <div className="text-2xl font-bold">{formatMoney(estadisticas.total_pagado)}</div>
                </div>
                <DollarSign className="w-8 h-8 text-green-300" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-teal-100 text-sm">Promedio</div>
                  <div className="text-2xl font-bold">{formatMoney(estadisticas.promedio_por_nomina)}</div>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-300" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-teal-100 text-sm">Empleados</div>
                  <div className="text-2xl font-bold">{estadisticas.empleados_con_nomina}</div>
                </div>
                <Users className="w-8 h-8 text-blue-300" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.length > 2) {
                  audit.search('nominas', { termino: e.target.value });
                }
              }}
              placeholder="Buscar por empleado o documento..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterEmpleado}
                onChange={(e) => {
                  setFilterEmpleado(e.target.value);
                  audit.filter('nominas_empleado', { empleado_id: e.target.value });
                }}
                className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
              >
                <option value="">Todos los empleados</option>
                {empleados.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre_completo} ({emp.documento})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleExportarExcel}
              className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all transform hover:scale-105 flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Nóminas */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden border border-gray-200/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Empleado</th>
                <th className="px-6 py-4 text-left font-semibold">Documento</th>
                <th className="px-6 py-4 text-left font-semibold">Período</th>
                <th className="px-6 py-4 text-right font-semibold">Producción</th>
                <th className="px-6 py-4 text-right font-semibold">Descuentos</th>
                <th className="px-6 py-4 text-right font-semibold">Total</th>
                <th className="px-6 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentNominas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No hay nóminas registradas</p>
                    <p className="text-sm mt-1">Crea tu primera nómina para comenzar</p>
                  </td>
                </tr>
              ) : (
                currentNominas.map((nomina, index) => (
                  <tr
                    key={nomina.id}
                    className={`${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    } hover:bg-teal-50 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {nomina.empleado_info?.nombre_completo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {nomina.empleado_info?.cargo_info?.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {nomina.empleado_info?.documento}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 font-medium">
                          {new Date(nomina.periodo_inicio).toLocaleDateString('es-CO')}
                        </div>
                        <div className="text-gray-500">
                          {new Date(nomina.periodo_fin).toLocaleDateString('es-CO')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-600">
                      {formatMoney(nomina.produccion)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-red-600">
                      {formatMoney(parseFloat(nomina.seguridad) + parseFloat(nomina.prestamos) + parseFloat(nomina.restaurante))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-lg text-teal-600">
                        {formatMoney(nomina.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleVerDetalle(nomina)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDescargarDesprendible(nomina.id)}
                          className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                          title="Descargar desprendible"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(nomina)}
                          className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(nomina.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
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
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a{' '}
              {Math.min(currentPage * itemsPerPage, filteredNominas.length)} de{' '}
              {filteredNominas.length} nóminas
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TODO: Continuar con los modales... */}

      {/* Modal Crear/Editar Nómina */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">
                {editingNomina ? 'Editar Nómina' : 'Nueva Nómina'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Empleado *
                  </label>
                  <select
                    value={formData.empleado}
                    onChange={(e) => {
                      const empleado = empleados.find(emp => emp.id === parseInt(e.target.value));
                      setFormData({ 
                        ...formData, 
                        empleado: e.target.value,
                        salario_base_contrato: empleado?.salario_base || ''
                      });
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-teal-500 transition-colors ${
                      errors.empleado ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Seleccione un empleado</option>
                    {empleados.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre_completo} ({emp.documento})
                      </option>
                    ))}
                  </select>
                  {errors.empleado && <p className="text-red-500 text-sm mt-1">{errors.empleado}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Período *
                  </label>
                  <select
                    value={formData.periodo}
                    onChange={(e) => {
                      const periodo = periodos.find(p => p.id === parseInt(e.target.value));
                      setFormData({ 
                        ...formData, 
                        periodo: e.target.value,
                        periodo_inicio: periodo?.fecha_inicio || '',
                        periodo_fin: periodo?.fecha_fin || ''
                      });
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-teal-500 transition-colors ${
                      errors.periodo ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Seleccione un período</option>
                    {periodos.map(per => (
                      <option key={per.id} value={per.id}>
                        {per.nombre} ({new Date(per.fecha_inicio).toLocaleDateString('es-CO')} - {new Date(per.fecha_fin).toLocaleDateString('es-CO')})
                      </option>
                    ))}
                  </select>
                  {errors.periodo && <p className="text-red-500 text-sm mt-1">{errors.periodo}</p>}
                </div>
              </div>

              {/* Segunda fila: Fechas, días y salario */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    value={formData.periodo_inicio}
                    onChange={(e) => setFormData({ ...formData, periodo_inicio: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-teal-500 transition-colors ${
                      errors.periodo_inicio ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.periodo_inicio && <p className="text-red-500 text-sm mt-1">{errors.periodo_inicio}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Fin *
                  </label>
                  <input
                    type="date"
                    value={formData.periodo_fin}
                    onChange={(e) => setFormData({ ...formData, periodo_fin: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-teal-500 transition-colors ${
                      errors.periodo_fin ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.periodo_fin && <p className="text-red-500 text-sm mt-1">{errors.periodo_fin}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Días Trabajados *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dias_trabajados}
                    onChange={(e) => setFormData({ ...formData, dias_trabajados: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-teal-500 transition-colors ${
                      errors.dias_trabajados ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.dias_trabajados && <p className="text-red-500 text-sm mt-1">{errors.dias_trabajados}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Salario Base *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salario_base_contrato}
                    onChange={(e) => setFormData({ ...formData, salario_base_contrato: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-teal-500 transition-colors ${
                      errors.salario_base_contrato ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.salario_base_contrato && <p className="text-red-500 text-sm mt-1">{errors.salario_base_contrato}</p>}
                </div>
              </div>

              {/* Detalles de Producción (Items) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Items de Producción</h3>
                  <button
                    type="button"
                    onClick={agregarDetalleItem}
                    className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.detalles_items.map((detalle, index) => {
                    const subtotal = detalle.cantidad && detalle.valor_unitario
                      ? parseFloat(detalle.valor_unitario) * parseFloat(detalle.cantidad)
                      : 0;

                    return (
                      <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <select
                            value={detalle.item}
                            onChange={(e) => actualizarDetalleItem(index, 'item', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                            required
                          >
                            <option value="">Seleccione un item</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.nombre} - {formatMoney(item.precio_unitario)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={detalle.cantidad}
                            onChange={(e) => actualizarDetalleItem(index, 'cantidad', e.target.value)}
                            placeholder="Cantidad"
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                            required
                          />
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={detalle.valor_unitario}
                            onChange={(e) => actualizarDetalleItem(index, 'valor_unitario', e.target.value)}
                            placeholder="Valor Unit."
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                            required
                          />
                        </div>
                        <div className="w-32 px-3 py-2 bg-teal-50 rounded-lg text-right font-medium text-teal-700">
                          {formatMoney(subtotal)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removerDetalleItem(index)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {errors.detalles && <p className="text-red-500 text-sm mt-2">{errors.detalles}</p>}
              </div>

              {/* Conceptos Laborales */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Conceptos Laborales</h3>
                  <button
                    type="button"
                    onClick={agregarDetalleConcepto}
                    className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Concepto</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.detalles_conceptos.map((detalle, index) => {
                    return (
                      <div key={index} className="flex gap-3 items-start p-4 bg-cyan-50 rounded-xl">
                        <div className="flex-1">
                          <select
                            value={detalle.concepto}
                            onChange={(e) => actualizarDetalleConcepto(index, 'concepto', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                            required
                          >
                            <option value="">Seleccione un concepto</option>
                            {conceptosLaborales.map(concepto => (
                              <option key={concepto.id} value={concepto.id}>
                                {concepto.nombre} {concepto.tipo_concepto === 'descuento' ? '(-)' : '(+)'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-48">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={detalle.valor_total}
                            onChange={(e) => actualizarDetalleConcepto(index, 'valor_total', e.target.value)}
                            placeholder="Valor Total"
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                            required
                          />
                        </div>
                        <div className="w-40 px-3 py-2 bg-cyan-100 rounded-lg text-right font-medium text-cyan-700">
                          {formatMoney(detalle.valor_total || 0)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removerDetalleConcepto(index)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500"
                  placeholder="Notas adicionales sobre esta nómina..."
                ></textarea>
              </div>

              {/* Resumen */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Total Items:</span>
                    <span className="font-semibold text-green-600">{formatMoney(calcularTotalItems())}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Total Conceptos:</span>
                    <span className="font-semibold text-blue-600">{formatMoney(calcularTotalConceptos())}</span>
                  </div>
                  <div className="border-t-2 border-teal-300 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900">TOTAL NÓMINA:</span>
                      <span className="text-2xl font-bold text-teal-600">{formatMoney(calcularTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-700 text-white rounded-xl hover:from-teal-700 hover:to-cyan-800 transition-all transform hover:scale-105 font-semibold shadow-lg"
                >
                  {editingNomina ? 'Actualizar' : 'Crear'} Nómina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle */}
      {showDetalleModal && selectedNomina && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">Detalle de Nómina</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Información del Empleado */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Información del Empleado</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Nombre:</span>
                    <p className="font-semibold text-gray-900">{selectedNomina.empleado_info?.nombre_completo}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Documento:</span>
                    <p className="font-semibold text-gray-900">{selectedNomina.empleado_info?.documento}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Cargo:</span>
                    <p className="font-semibold text-gray-900">{selectedNomina.empleado_info?.cargo_info?.nombre}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Período:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedNomina.periodo_inicio).toLocaleDateString('es-CO')} al{' '}
                      {new Date(selectedNomina.periodo_fin).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detalle de Producción */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Detalle de Producción</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-teal-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">Item</th>
                        <th className="px-4 py-3 text-right">Cantidad</th>
                        <th className="px-4 py-3 text-right">Precio Unit.</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedNomina.detalles?.map((detalle, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-4 py-3">{detalle.item_nombre}</td>
                          <td className="px-4 py-3 text-right">{parseFloat(detalle.cantidad).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(detalle.item_precio)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">
                            {formatMoney(detalle.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumen Financiero */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen Financiero</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal Producción:</span>
                    <span className="font-semibold text-green-600">{formatMoney(selectedNomina.produccion)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>(-) Seguridad Social:</span>
                    <span className="font-semibold text-red-600">{formatMoney(selectedNomina.seguridad)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>(-) Préstamos:</span>
                    <span className="font-semibold text-red-600">{formatMoney(selectedNomina.prestamos)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>(-) Restaurante:</span>
                    <span className="font-semibold text-red-600">{formatMoney(selectedNomina.restaurante)}</span>
                  </div>
                  <div className="border-t-2 border-teal-300 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900">TOTAL A PAGAR:</span>
                      <span className="text-2xl font-bold text-teal-600">{formatMoney(selectedNomina.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-between">
                <button
                  onClick={() => handleDescargarDesprendible(selectedNomina.id)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl hover:from-purple-700 hover:to-indigo-800 transition-all transform hover:scale-105 font-semibold shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  <span>Descargar Desprendible</span>
                </button>
                <button
                  onClick={() => setShowDetalleModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
