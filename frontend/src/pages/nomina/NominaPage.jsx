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
import contratosService from '../../services/contratosService';
import conceptosLaboralesService from '../../services/conceptosLaboralesService';
import itemsService from '../../services/itemsService';

export default function NominaPage() {
  const audit = useAudit('Nomina');
  
  const [nominas, setNominas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [items, setItems] = useState([]);
  const [conceptosLaborales, setConceptosLaborales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterContrato, setFilterContrato] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [editingNomina, setEditingNomina] = useState(null);
  const [selectedNomina, setSelectedNomina] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [estadisticas, setEstadisticas] = useState(null);

  const [formData, setFormData] = useState({
    contrato: '',
    periodo_inicio: '',
    periodo_fin: '',
    fecha_pago: '',
    estado: 'borrador',
    observaciones: '',
    items: []
  });

  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterContrato]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Cargar datos principales desde /api/nomina/
      const [nominasData, empleadosData, contratosData, itemsData, conceptosData] = await Promise.all([
        nominaService.getAllNominas(),
        empleadosService.getAllEmpleados(),
        contratosService.getActivos(),
        itemsService.getAllItems(),
        conceptosLaboralesService.getActivos()
      ]);

      // Cargar estadísticas por separado para no bloquear si falla
      let statsData = null;
      try {
        statsData = await nominaService.getEstadisticas();
      } catch (statsError) {
        console.warn('⚠️ No se pudieron cargar estadísticas:', statsError);
      }

      console.log('📊 Nóminas recibidas:', nominasData);
      
      // Extraer el array correcto de la respuesta
      const nominasArray = nominasData?.results || nominasData || [];
      const empleadosArray = empleadosData?.results || empleadosData || [];
      const contratosArray = contratosData?.results || contratosData || [];
      const itemsArray = itemsData?.results || itemsData || [];
      const conceptosArray = conceptosData?.results || conceptosData || [];
      
      setNominas(Array.isArray(nominasArray) ? nominasArray : []);
      setEmpleados(Array.isArray(empleadosArray) ? empleadosArray : []);
      setContratos(Array.isArray(contratosArray) ? contratosArray : []);
      setItems(Array.isArray(itemsArray) ? itemsArray : []);
      setConceptosLaborales(Array.isArray(conceptosArray) ? conceptosArray : []);
      setEstadisticas(statsData);
      
      console.log(`✅ ${nominasArray.length} nóminas, ${contratosArray.length} contratos cargados`);
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
        contrato: formData.contrato,
        periodo_inicio: formData.periodo_inicio,
        periodo_fin: formData.periodo_fin,
        fecha_pago: formData.fecha_pago || null,
        observaciones: formData.observaciones || '',
        items: formData.items.map(item => ({
          item: item.item,
          cantidad: parseFloat(item.cantidad),
          valor_total: parseFloat(item.valor_total || 0)
        }))
      };

      if (editingNomina) {
        await nominaService.updateNomina(editingNomina.id, dataToSend);
        audit.button('modificar_nomina', { nomina_id: editingNomina.id });
        showNotification('success', 'Nómina actualizada exitosamente');
      } else {
        await nominaService.createNomina(dataToSend);
        audit.button('crear_nomina', { contrato_id: formData.contrato });
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

    if (!formData.contrato) {
      newErrors.contrato = 'El contrato es requerido';
    }

    if (!formData.periodo_inicio) {
      newErrors.periodo_inicio = 'La fecha de inicio es requerida';
    }

    if (!formData.periodo_fin) {
      newErrors.periodo_fin = 'La fecha fin es requerida';
    }

    if (formData.periodo_inicio && formData.periodo_fin) {
      if (new Date(formData.periodo_inicio) > new Date(formData.periodo_fin)) {
        newErrors.periodo_fin = 'La fecha fin debe ser posterior a la fecha de inicio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (nomina) => {
    audit.modalOpen('editar_nomina', { nomina_id: nomina.id });
    setEditingNomina(nomina);
    setFormData({
      contrato: nomina.contrato?.id || nomina.contrato,
      periodo_inicio: nomina.periodo_inicio,
      periodo_fin: nomina.periodo_fin,
      fecha_pago: nomina.fecha_pago || '',
      estado: nomina.estado || 'borrador',
      observaciones: nomina.observaciones || '',
      items: (nomina.items || []).map(item => ({
        item: item.item?.id || item.item,
        cantidad: item.cantidad?.toString() || '',
        valor_total: item.valor_total?.toString() || ''
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

  const handleCalcular = async (nominaId) => {
    try {
      await nominaService.calcularNomina(nominaId);
      audit.button('calcular_nomina', { nomina_id: nominaId });
      showNotification('success', 'Nómina calculada exitosamente');
      loadInitialData();
    } catch (error) {
      showNotification('error', 'Error al calcular nómina');
    }
  };

  const handleAprobar = async (nominaId) => {
    if (!window.confirm('¿Está seguro de aprobar esta nómina?')) return;
    try {
      await nominaService.aprobarNomina(nominaId);
      audit.button('aprobar_nomina', { nomina_id: nominaId });
      showNotification('success', 'Nómina aprobada exitosamente');
      loadInitialData();
    } catch (error) {
      showNotification('error', 'Error al aprobar nómina');
    }
  };

  const handlePagar = async (nominaId) => {
    if (!window.confirm('¿Está seguro de marcar esta nómina como pagada?')) return;
    try {
      await nominaService.pagarNomina(nominaId);
      audit.button('pagar_nomina', { nomina_id: nominaId });
      showNotification('success', 'Nómina marcada como pagada');
      loadInitialData();
    } catch (error) {
      showNotification('error', 'Error al marcar como pagada');
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
      await nominaService.exportarExcel({ search: searchTerm, contrato: filterContrato });
      showNotification('success', 'Archivo exportado exitosamente');
    } catch (error) {
      showNotification('error', 'Error al exportar archivo');
    }
  };

  const resetForm = () => {
    setFormData({
      contrato: '',
      periodo_inicio: '',
      periodo_fin: '',
      fecha_pago: '',
      estado: 'borrador',
      observaciones: '',
      items: []
    });
    setErrors({});
    setEditingNomina(null);
  };

  const agregarItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item: '', cantidad: '', valor_total: '' }]
    });
  };

  const removerItem = (index) => {
    const nuevosItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: nuevosItems });
  };

  const actualizarItem = (index, field, value) => {
    const nuevosItems = [...formData.items];
    nuevosItems[index][field] = value;
    setFormData({ ...formData, items: nuevosItems });
  };

  const calcularTotalItems = () => {
    return formData.items.reduce((sum, item) => {
      if (item.valor_total) {
        return sum + parseFloat(item.valor_total);
      }
      return sum;
    }, 0);
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Helper para obtener info del contrato
  const getContratoInfo = (nomina) => {
    const contratoId = nomina.contrato?.id || nomina.contrato;
    const contrato = contratos.find(c => c.id === contratoId);
    if (contrato) {
      const empleado = empleados.find(e => e.id === contrato.empleado?.id || e.id === contrato.empleado);
      return {
        empleadoNombre: empleado?.nombre_completo || empleado?.nombre || 'Sin empleado',
        salario: contrato.salario,
        tipoContrato: contrato.tipo_contrato?.nombre || ''
      };
    }
    // Si viene info anidada del backend
    if (nomina.contrato?.empleado) {
      return {
        empleadoNombre: nomina.contrato.empleado.nombre_completo || nomina.contrato.empleado.nombre,
        salario: nomina.contrato.salario,
        tipoContrato: nomina.contrato.tipo_contrato?.nombre || ''
      };
    }
    return { empleadoNombre: 'Sin información', salario: 0, tipoContrato: '' };
  };

  // Filtrar nóminas
  const filteredNominas = nominas.filter(nomina => {
    const info = getContratoInfo(nomina);
    const matchSearch = 
      info.empleadoNombre.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchContrato = filterContrato === '' || 
      (nomina.contrato?.id || nomina.contrato) === filterContrato;
    
    return matchSearch && matchContrato;
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
              placeholder="Buscar por empleado..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterContrato}
                onChange={(e) => {
                  setFilterContrato(e.target.value);
                  audit.filter('nominas_contrato', { contrato_id: e.target.value });
                }}
                className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
              >
                <option value="">Todos los contratos</option>
                {contratos.map(contrato => {
                  const empleado = empleados.find(e => e.id === contrato.empleado?.id || e.id === contrato.empleado);
                  return (
                    <option key={contrato.id} value={contrato.id}>
                      {empleado?.nombre_completo || empleado?.nombre || 'Empleado'} - {contrato.tipo_contrato?.nombre || 'Contrato'}
                    </option>
                  );
                })}
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
                <th className="px-6 py-4 text-left font-semibold">Período</th>
                <th className="px-6 py-4 text-right font-semibold">Devengado</th>
                <th className="px-6 py-4 text-right font-semibold">Deducciones</th>
                <th className="px-6 py-4 text-right font-semibold">Neto a Pagar</th>
                <th className="px-6 py-4 text-center font-semibold">Estado</th>
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
                currentNominas.map((nomina, index) => {
                  const info = getContratoInfo(nomina);
                  return (
                  <tr
                    key={nomina.id}
                    className={`${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    } hover:bg-teal-50 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {info.empleadoNombre}
                      </div>
                      <div className="text-sm text-gray-500">
                        {info.tipoContrato}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 font-medium">
                          {nomina.periodo_inicio ? new Date(nomina.periodo_inicio).toLocaleDateString('es-CO') : '-'}
                        </div>
                        <div className="text-gray-500">
                          {nomina.periodo_fin ? new Date(nomina.periodo_fin).toLocaleDateString('es-CO') : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-600">
                      {formatMoney(nomina.total_devengado || 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-red-600">
                      {formatMoney(nomina.total_deducciones || 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-lg text-teal-600">
                        {formatMoney(nomina.total_pagar || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        nomina.estado === 'pagada' ? 'bg-green-100 text-green-800' :
                        nomina.estado === 'aprobada' ? 'bg-blue-100 text-blue-800' :
                        nomina.estado === 'calculada' ? 'bg-yellow-100 text-yellow-800' :
                        nomina.estado === 'anulada' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {nomina.estado_display || nomina.estado || 'Borrador'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleVerDetalle(nomina)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {nomina.estado === 'borrador' && (
                          <button
                            onClick={() => handleCalcular(nomina.id)}
                            className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
                            title="Calcular nómina"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        {nomina.estado === 'calculada' && (
                          <button
                            onClick={() => handleAprobar(nomina.id)}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                            title="Aprobar nómina"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {(nomina.estado === 'aprobada' || nomina.estado === 'pagada') && (
                          <button
                            onClick={() => handleDescargarDesprendible(nomina.id)}
                            className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                            title="Descargar desprendible"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {nomina.estado === 'aprobada' && (
                          <button
                            onClick={() => handlePagar(nomina.id)}
                            className="p-2 bg-teal-100 text-teal-600 rounded-lg hover:bg-teal-200 transition-colors"
                            title="Marcar como pagada"
                          >
                            <Wallet className="w-4 h-4" />
                          </button>
                        )}
                        {(nomina.estado === 'borrador' || nomina.estado === 'calculada') && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
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

      {/* Modal Crear/Editar Nómina */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">
                {editingNomina ? 'Editar Nómina' : 'Nueva Nómina'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Selección de Contrato */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contrato (Empleado) *
                </label>
                <select
                  value={formData.contrato}
                  onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-teal-500 transition-colors ${
                    errors.contrato ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Seleccione un contrato</option>
                  {contratos.map(contrato => {
                    const empleado = empleados.find(e => e.id === contrato.empleado?.id || e.id === contrato.empleado);
                    return (
                      <option key={contrato.id} value={contrato.id}>
                        {empleado?.nombre_completo || empleado?.nombre || 'Empleado'} - {contrato.tipo_contrato?.nombre || 'Contrato'} ({formatMoney(contrato.salario)})
                      </option>
                    );
                  })}
                </select>
                {errors.contrato && <p className="text-red-500 text-sm mt-1">{errors.contrato}</p>}
              </div>

              {/* Fechas del período */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Inicio Período *
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
                    Fecha Fin Período *
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
                    Fecha de Pago
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_pago}
                    onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              {/* Items de Trabajo */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Items de Trabajo (Opcional)</h3>
                  <button
                    type="button"
                    onClick={agregarItem}
                    className="flex items-center space-x-2 px-4 py-2 bg-teal-100 text-teal-600 rounded-lg hover:bg-teal-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Item</span>
                  </button>
                </div>

                {formData.items.length > 0 && (
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg">
                        <div className="col-span-5">
                          <select
                            value={item.item}
                            onChange={(e) => actualizarItem(index, 'item', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                          >
                            <option value="">Seleccione item</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>{i.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Cantidad"
                            value={item.cantidad}
                            onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Valor Total"
                            value={item.valor_total}
                            onChange={(e) => actualizarItem(index, 'valor_total', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removerItem(index)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-lg font-bold text-teal-600">
                      Total Items: {formatMoney(calcularTotalItems())}
                    </div>
                  </div>
                )}
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
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="Notas u observaciones sobre esta nómina..."
                />
              </div>

              {/* Nota informativa */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold">Nota:</p>
                    <p>Los valores de seguridad social (salud, pensión, ARL) y parafiscales se calculan automáticamente al hacer clic en "Calcular Nómina" después de guardar.</p>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-700 text-white rounded-xl hover:from-teal-700 hover:to-cyan-800 transition-all font-semibold shadow-lg"
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
              {/* Información del Contrato/Empleado */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Información del Empleado</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Empleado:</span>
                    <p className="font-semibold text-gray-900">
                      {getContratoInfo(selectedNomina).empleadoNombre}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Tipo Contrato:</span>
                    <p className="font-semibold text-gray-900">
                      {getContratoInfo(selectedNomina).tipoContrato}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Salario Base:</span>
                    <p className="font-semibold text-gray-900">
                      {formatMoney(getContratoInfo(selectedNomina).salario)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Período:</span>
                    <p className="font-semibold text-gray-900">
                      {selectedNomina.periodo_inicio ? new Date(selectedNomina.periodo_inicio).toLocaleDateString('es-CO') : '-'} al{' '}
                      {selectedNomina.periodo_fin ? new Date(selectedNomina.periodo_fin).toLocaleDateString('es-CO') : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Estado:</span>
                    <p className={`font-semibold ${
                      selectedNomina.estado === 'pagada' ? 'text-green-600' :
                      selectedNomina.estado === 'aprobada' ? 'text-blue-600' :
                      selectedNomina.estado === 'calculada' ? 'text-yellow-600' :
                      selectedNomina.estado === 'anulada' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {selectedNomina.estado_display || selectedNomina.estado || 'Borrador'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Fecha de Pago:</span>
                    <p className="font-semibold text-gray-900">
                      {selectedNomina.fecha_pago ? new Date(selectedNomina.fecha_pago).toLocaleDateString('es-CO') : 'Pendiente'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detalle de Items */}
              {selectedNomina.items && selectedNomina.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Items de Trabajo</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-teal-600 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Item</th>
                          <th className="px-4 py-3 text-right">Cantidad</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedNomina.items.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-4 py-3">{item.item?.nombre || item.item_nombre || 'Item'}</td>
                            <td className="px-4 py-3 text-right">{parseFloat(item.cantidad || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-green-600">
                              {formatMoney(item.valor_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detalle de Conceptos */}
              {selectedNomina.conceptos && selectedNomina.conceptos.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Conceptos Aplicados</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-cyan-600 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Concepto</th>
                          <th className="px-4 py-3 text-center">Tipo</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedNomina.conceptos.map((concepto, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-4 py-3">{concepto.concepto?.nombre || concepto.concepto_nombre || 'Concepto'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                (concepto.concepto?.tipo || concepto.tipo) === 'DEVENGADO' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {(concepto.concepto?.tipo || concepto.tipo) === 'DEVENGADO' ? 'Devengado' : 'Deducción'}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold ${
                              (concepto.concepto?.tipo || concepto.tipo) === 'DEVENGADO' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatMoney(concepto.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Resumen Financiero */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen Financiero</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>IBC (Base de Cotización):</span>
                    <span className="font-semibold">{formatMoney(selectedNomina.ibc)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Total Devengado:</span>
                    <span className="font-semibold text-green-600">{formatMoney(selectedNomina.total_devengado)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>(-) Total Deducciones:</span>
                    <span className="font-semibold text-red-600">{formatMoney(selectedNomina.total_deducciones)}</span>
                  </div>
                  <div className="border-t-2 border-teal-300 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900">NETO A PAGAR:</span>
                      <span className="text-2xl font-bold text-teal-600">{formatMoney(selectedNomina.total_pagar)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              {selectedNomina.observaciones && (
                <div className="bg-yellow-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-yellow-800 mb-2">Observaciones:</h4>
                  <p className="text-yellow-700">{selectedNomina.observaciones}</p>
                </div>
              )}

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
