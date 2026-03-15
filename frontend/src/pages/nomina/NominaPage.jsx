/**
 * Página Unificada de Gestión de Nómina
 * Incluye gestión completa de nóminas y generación de desprendibles
 */

import { useState, useEffect, useCallback } from 'react';
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
import Can from '../../components/permissions/Can';
import { usePermissions } from '../../context/PermissionsContext';
import { useConfiguracion } from '../../context/ConfiguracionContext';
import { useActiveProject } from '../../context/ActiveProjectContext';
import useServerPagination from '../../hooks/useServerPagination';
import Pagination from '../../components/Pagination';
import nominaService from '../../services/nominaService';
import empleadosService from '../../services/empleadosService';
import contratosService from '../../services/contratosService';
import conceptosLaboralesService from '../../services/conceptosLaboralesService';
import itemsService from '../../services/itemsService';
import prestamosService from '../../services/prestamosService';
import configuracionService from '../../services/configuracionService';
import contabilidadService from '../../services/contabilidadService';
import useProductTour from '../../hooks/useProductTour';
import { TOUR_CONFIGS } from '../../data/tourConfigs';

export default function NominaPage() {
  const audit = useAudit('Nomina');
  const { hasPermission, initialized } = usePermissions();
  const { activeProject, getProjectFilter } = useActiveProject();

  const [empleados, setEmpleados] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [items, setItems] = useState([]);
  const [conceptosLaborales, setConceptosLaborales] = useState([]);
  const [prestamosActivos, setPrestamosActivos] = useState([]);
  const [filterContrato, setFilterContrato] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [editingNomina, setEditingNomina] = useState(null);
  const [selectedNomina, setSelectedNomina] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [dropdownsLoading, setDropdownsLoading] = useState(true);

  const [formData, setFormData] = useState({
    contrato: '',
    periodo_inicio: '',
    periodo_fin: '',
    fecha_pago: '',
    estado: 'borrador',
    observaciones: '',
    items: [],
    tiene_deduccion_restaurante: false,
    valor_restaurante: 0,
    prestamos_seleccionados: [],
    cuotas_a_descontar: {},
    conceptos_seleccionados: [],
    incluir_salario_base: false
  });

  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [errors, setErrors] = useState({});

  // Server-side pagination for nominas
  const pf = getProjectFilter();
  const fetchNominas = useCallback((params) => nominaService.getAllNominas({ ...params, ...pf }), [activeProject]);
  const {
    data: nominas,
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
  } = useServerPagination(fetchNominas, { pageSize: 10 });

  useProductTour('nomina', TOUR_CONFIGS.nomina.steps, {
    ready: !loading && initialized,
  });

  // Load dropdown/reference data separately
  useEffect(() => {
    loadDropdownData();
  }, [activeProject]);

  const loadDropdownData = async () => {
    try {
      setDropdownsLoading(true);
      const pf = getProjectFilter();
      const [empleadosData, contratosData, itemsData, conceptosData] = await Promise.all([
        empleadosService.getAllEmpleados(pf),
        contratosService.getActivos(pf),
        itemsService.getAllItems(),
        conceptosLaboralesService.getActivos()
      ]);

      // Cargar estadísticas por separado para no bloquear si falla
      let statsData = null;
      try {
        statsData = await nominaService.getEstadisticas(pf);
      } catch (statsError) {
        console.warn('No se pudieron cargar estadísticas:', statsError);
      }

      const empleadosArray = empleadosData?.results || empleadosData || [];
      const contratosArray = contratosData?.results || contratosData || [];
      const itemsArray = itemsData?.results || itemsData || [];
      const conceptosArray = conceptosData?.results || conceptosData || [];

      setEmpleados(Array.isArray(empleadosArray) ? empleadosArray : []);
      setContratos(Array.isArray(contratosArray) ? contratosArray : []);
      setItems(Array.isArray(itemsArray) ? itemsArray : []);
      setConceptosLaborales(Array.isArray(conceptosArray) ? conceptosArray : []);
      setEstadisticas(statsData);
    } catch (error) {
      showNotification('error', 'Error al cargar datos');
      console.error('Error completo:', error);
    } finally {
      setDropdownsLoading(false);
    }
  };

  const handleFilterContrato = (value) => {
    setFilterContrato(value);
    audit.filter('nominas_contrato', { contrato_id: value });
    if (value) {
      setFilters({ contrato: value });
    } else {
      setFilters({});
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
      // Asegurar que todos los préstamos seleccionados tengan valor en cuotas_a_descontar
      const cuotasCompletas = { ...formData.cuotas_a_descontar };
      (formData.prestamos_seleccionados || []).forEach(prestamoId => {
        if (!cuotasCompletas[prestamoId]) {
          cuotasCompletas[prestamoId] = 1;
        }
      });

      const dataToSend = {
        contrato: formData.contrato,
        periodo_inicio: formData.periodo_inicio,
        periodo_fin: formData.periodo_fin,
        fecha_pago: formData.fecha_pago || null,
        observaciones: formData.observaciones || '',
        items: formData.items.map(item => ({
          item: item.item,
          cantidad: parseFloat(item.cantidad),
          valor_unitario: parseFloat(item.valor_unitario || 0),
          observaciones: item.observaciones || ''
        })),
        // Campos de deducciones especiales
        tiene_deduccion_restaurante: formData.tiene_deduccion_restaurante || false,
        valor_restaurante: formData.tiene_deduccion_restaurante ? parseFloat(formData.valor_restaurante || 0) : 0,
        prestamos_seleccionados: formData.prestamos_seleccionados || [],
        cuotas_a_descontar: cuotasCompletas,
        conceptos_seleccionados: formData.conceptos_seleccionados || [],
        incluir_salario_base: !!formData.incluir_salario_base
      };

      let savedNomina = null;
      if (editingNomina) {
        savedNomina = await nominaService.updateNomina(editingNomina.id, dataToSend);
        audit.button('modificar_nomina', { nomina_id: editingNomina.id });
        showNotification('success', 'Nómina actualizada exitosamente');
      } else {
        savedNomina = await nominaService.createNomina(dataToSend);
        audit.button('crear_nomina', { contrato_id: formData.contrato });
        showNotification('success', 'Nómina creada exitosamente');
      }

      const nominaId = editingNomina?.id || savedNomina?.id;
      if (nominaId) {
        try {
          await nominaService.calcularNomina(nominaId);
          showNotification('success', 'Nómina calculada automáticamente');
        } catch (calcError) {
          console.error('Error en cálculo automático:', calcError);
          showNotification('error', 'Guardado ok, pero no se pudo calcular automáticamente');
        }
      }

      setShowModal(false);
      resetForm();
      refresh();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Error al guardar nómina';
      showNotification('error', errorMsg);
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

  const handleEdit = async (nomina) => {
    audit.modalOpen('editar_nomina', { nomina_id: nomina.id });
    try {
      const detalleNomina = await nominaService.getNominaById(nomina.id);
      setEditingNomina(detalleNomina);
      setFormData({
        contrato: detalleNomina.contrato?.id || detalleNomina.contrato,
        periodo_inicio: detalleNomina.periodo_inicio,
        periodo_fin: detalleNomina.periodo_fin,
        fecha_pago: detalleNomina.fecha_pago || '',
        estado: detalleNomina.estado || 'borrador',
        observaciones: detalleNomina.observaciones || '',
        items: (detalleNomina.items || []).map(item => ({
          item: item.item?.id || item.item,
          cantidad: item.cantidad?.toString() || '',
          valor_unitario: item.valor_unitario?.toString() || ''
        })),
        tiene_deduccion_restaurante: !!detalleNomina.tiene_deduccion_restaurante,
        valor_restaurante: parseFloat(detalleNomina.valor_restaurante || 0),
        prestamos_seleccionados: detalleNomina.prestamos_seleccionados || (detalleNomina.prestamos || []).map(p => p.prestamo),
        cuotas_a_descontar: detalleNomina.cuotas_a_descontar || {},
        conceptos_seleccionados: detalleNomina.conceptos_seleccionados || (detalleNomina.conceptos || []).map(c => c.concepto),
        incluir_salario_base: !!detalleNomina.incluir_salario_base
      });
      // Cargar préstamos del empleado
      if (detalleNomina.contrato?.id || detalleNomina.contrato) {
        cargarPrestamosEmpleado(detalleNomina.contrato?.id || detalleNomina.contrato);
      }
      setShowModal(true);
    } catch (error) {
      console.error('Error cargando detalle de nómina:', error);
      showNotification('error', 'Error al cargar detalle de nómina');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta nómina?')) return;
    
    try {
      const nomina = nominas.find(n => n.id === id);
      await nominaService.deleteNomina(id);
      audit.button('eliminar_nomina', { nomina_id: id });
      showNotification('success', 'Nómina eliminada exitosamente');
      refresh();
    } catch (error) {
      showNotification('error', 'Error al eliminar nómina');
    }
  };

  const handleCalcular = async (nominaId) => {
    try {
      await nominaService.calcularNomina(nominaId);
      audit.button('calcular_nomina', { nomina_id: nominaId });
      showNotification('success', 'Nómina calculada exitosamente');
      refresh();
      if (selectedNomina?.id === nominaId) {
        const detalleNomina = await nominaService.getNominaById(nominaId);
        setSelectedNomina(detalleNomina);
      }
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
      refresh();
    } catch (error) {
      showNotification('error', 'Error al aprobar nómina');
    }
  };

  const handlePagar = async (nominaId) => {
    if (!window.confirm('¿Está seguro de marcar esta nómina como pagada?')) return;
    try {
      const [configuracion, auditoria] = await Promise.all([
        configuracionService.getConfiguracionGeneral(),
        contabilidadService.getPucAudit(),
      ]);

      const faltanConfig = [];
      if (!configuracion.cuenta_efectivo_defecto) faltanConfig.push('cuenta_efectivo_defecto');
      if (!configuracion.cuenta_nomina_defecto) faltanConfig.push('cuenta_nomina_defecto');
      if (!configuracion.cuenta_otras_deducciones_defecto) faltanConfig.push('cuenta_otras_deducciones_defecto');

      const detalleNomina = await nominaService.getNominaById(nominaId);
      if ((detalleNomina.total_prestamos || 0) > 0 && !configuracion.cuenta_prestamos_defecto) {
        faltanConfig.push('cuenta_prestamos_defecto');
      }

      if (faltanConfig.length > 0 || (auditoria.faltan_cuentas || []).length > 0) {
        const mensaje = [
          faltanConfig.length ? `Faltan en configuración: ${faltanConfig.join(', ')}` : null,
          auditoria.faltan_cuentas?.length ? `Faltan cuentas PUC: ${auditoria.faltan_cuentas.join(', ')}` : null,
        ].filter(Boolean).join(' | ');
        showNotification('error', `No se puede pagar nómina. ${mensaje}`);
        return;
      }

      await nominaService.pagarNomina(nominaId);
      audit.button('pagar_nomina', { nomina_id: nominaId });
      showNotification('success', 'Nómina marcada como pagada');
      refresh();
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

  const handleVerDetalle = async (nomina) => {
    audit.modalOpen('ver_detalle_nomina', { nomina_id: nomina.id });
    try {
      const detalleNomina = await nominaService.getNominaById(nomina.id);
      setSelectedNomina(detalleNomina);
      setShowDetalleModal(true);
    } catch (error) {
      console.error('Error cargando detalle de nómina:', error);
      showNotification('error', 'Error al cargar detalle de nómina');
    }
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
      items: [],
      tiene_deduccion_restaurante: false,
      valor_restaurante: 0,
      prestamos_seleccionados: [],
      cuotas_a_descontar: {},
      conceptos_seleccionados: [],
      incluir_salario_base: false
    });
    setErrors({});
    setEditingNomina(null);
    setPrestamosActivos([]);
  };

  const agregarItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item: '', cantidad: 1, valor_unitario: 0 }]
    });
  };

  const removerItem = (index) => {
    const nuevosItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: nuevosItems });
  };

  const actualizarItem = (index, field, value) => {
    const nuevosItems = [...formData.items];
    nuevosItems[index][field] = value;
    
    // Si se cambia el item, autocompletar el precio
    if (field === 'item' && value) {
      const itemSeleccionado = items.find(i => i.id.toString() === value.toString());
      if (itemSeleccionado && itemSeleccionado.precio_unitario) {
        nuevosItems[index].valor_unitario = itemSeleccionado.precio_unitario;
      }
    }
    
    setFormData({ ...formData, items: nuevosItems });
  };

  const calcularTotalItems = () => {
    return formData.items.reduce((sum, item) => {
      const cantidad = parseFloat(item.cantidad || 0);
      const valorUnitario = parseFloat(item.valor_unitario || 0);
      return sum + (cantidad * valorUnitario);
    }, 0);
  };

  const cargarPrestamosEmpleado = async (contratoId) => {
    try {
      const contrato = contratos.find(c => c.id === contratoId);
      if (!contrato) {
        setPrestamosActivos([]);
        return;
      }

      const empleadoId = contrato.empleado?.id || contrato.empleado;
      if (!empleadoId) {
        setPrestamosActivos([]);
        return;
      }

      // Filtrar directamente en el backend por empleado y estados activos
      const response = await prestamosService.getPrestamos({
        empleado: empleadoId,
        estado__in: 'aprobado,desembolsado,activo,en_mora',
        page_size: 100,
        ...getProjectFilter(),
      });
      const prestamos = response.results || response;
      
      // Filtrar solo los que tienen saldo pendiente > 0
      const prestamosConSaldo = (Array.isArray(prestamos) ? prestamos : []).filter(p => {
        const saldoPendiente = parseFloat(p.saldo_pendiente ?? 0);
        return saldoPendiente > 0;
      });

      setPrestamosActivos(prestamosConSaldo);
    } catch (error) {
      console.error('Error al cargar préstamos:', error);
      setPrestamosActivos([]);
    }
  };

  const handleContratoChange = (contratoId) => {
    setFormData({ ...formData, contrato: contratoId, prestamos_seleccionados: [] });
    if (contratoId) {
      cargarPrestamosEmpleado(contratoId);
      sugerirSiguientePeriodo(contratoId);
    } else {
      setPrestamosActivos([]);
    }
  };

  // Sugiere el siguiente período basado en la última nómina del contrato
  const sugerirSiguientePeriodo = async (contratoId) => {
    try {
      const response = await nominaService.getAllNominas({
        contrato: contratoId,
        ordering: '-periodo_fin',
        page_size: 1,
      });
      const ultimasNominas = response.results || response || [];
      if (ultimasNominas.length > 0) {
        const ultima = ultimasNominas[0];
        if (ultima.periodo_fin) {
          // Siguiente día después del último período
          const finAnterior = new Date(ultima.periodo_fin + 'T00:00:00');
          const siguienteInicio = new Date(finAnterior);
          siguienteInicio.setDate(siguienteInicio.getDate() + 1);

          // Detectar patrón: quincenal o mensual
          const inicioAnterior = new Date(ultima.periodo_inicio + 'T00:00:00');
          const diasPeriodo = Math.round((finAnterior - inicioAnterior) / (1000 * 60 * 60 * 24)) + 1;

          let siguienteFin;
          if (diasPeriodo <= 16) {
            // Quincenal: calcular fin de quincena
            if (siguienteInicio.getDate() <= 15) {
              siguienteFin = new Date(siguienteInicio.getFullYear(), siguienteInicio.getMonth(), 15);
            } else {
              siguienteFin = new Date(siguienteInicio.getFullYear(), siguienteInicio.getMonth() + 1, 0);
            }
          } else {
            // Mensual: último día del mes
            siguienteFin = new Date(siguienteInicio.getFullYear(), siguienteInicio.getMonth() + 1, 0);
          }

          const formatFecha = (d) => d.toISOString().split('T')[0];
          setFormData(prev => ({
            ...prev,
            contrato: contratoId,
            periodo_inicio: formatFecha(siguienteInicio),
            periodo_fin: formatFecha(siguienteFin),
          }));
          return;
        }
      }
    } catch (err) {
      // Si falla, no pasa nada — el usuario elige manualmente
    }
  };

  // Aplica un preset de período rápido
  const aplicarPeriodoRapido = (tipo) => {
    const hoy = new Date();
    let inicio, fin;

    if (tipo === 'Q1') {
      // 1ra quincena: día 1 al 15 del mes actual
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
    } else if (tipo === 'Q2') {
      // 2da quincena: día 16 al último del mes actual
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 16);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    } else if (tipo === 'MENSUAL') {
      // Mes completo actual
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    } else if (tipo === 'SEMANAL') {
      // Semana actual (lunes a domingo)
      const dia = hoy.getDay();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      inicio = lunes;
      fin = domingo;
    }

    if (inicio && fin) {
      const formatFecha = (d) => d.toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        periodo_inicio: formatFecha(inicio),
        periodo_fin: formatFecha(fin),
      }));
    }
  };

  const togglePrestamoSeleccionado = (prestamoId) => {
    const prestamosActuales = formData.prestamos_seleccionados || [];
    const yaSeleccionado = prestamosActuales.includes(prestamoId);
    
    if (yaSeleccionado) {
      // Deseleccionar: remover del array y del diccionario de cuotas
      const nuevasCuotas = { ...formData.cuotas_a_descontar };
      delete nuevasCuotas[prestamoId];
      setFormData({
        ...formData,
        prestamos_seleccionados: prestamosActuales.filter(id => id !== prestamoId),
        cuotas_a_descontar: nuevasCuotas
      });
    } else {
      // Seleccionar: agregar al array e inicializar cuotas en 1
      setFormData({
        ...formData,
        prestamos_seleccionados: [...prestamosActuales, prestamoId],
        cuotas_a_descontar: {
          ...formData.cuotas_a_descontar,
          [prestamoId]: 1
        }
      });
    }
  };

  const toggleConceptoSeleccionado = (conceptoId) => {
    const conceptosActuales = formData.conceptos_seleccionados || [];
    const yaSeleccionado = conceptosActuales.includes(conceptoId);

    if (yaSeleccionado) {
      setFormData({
        ...formData,
        conceptos_seleccionados: conceptosActuales.filter(id => id !== conceptoId)
      });
    } else {
      setFormData({
        ...formData,
        conceptos_seleccionados: [...conceptosActuales, conceptoId]
      });
    }
  };

  const { formatCurrency: formatMoney, formatDate } = useConfiguracion();

  // Helper para obtener info del contrato
  const getContratoInfo = (nomina) => {
    const contratoId = nomina.contrato?.id || nomina.contrato;
    const contrato = contratos.find(c => c.id === contratoId);
    if (contrato) {
      const empleado = empleados.find(e => e.id === contrato.empleado?.id || e.id === contrato.empleado);
      return {
        empleadoNombre: empleado?.nombre_completo || empleado?.nombre || nomina.empleado_nombre || 'Sin empleado',
        salario: nomina.salario_base || contrato.salario,
        tipoContrato: contrato.tipo_contrato?.nombre || nomina.tipo_contrato || ''
      };
    }
    // Si viene info anidada del backend
    if (nomina.contrato?.empleado) {
      return {
        empleadoNombre: nomina.contrato.empleado.nombre_completo || nomina.contrato.empleado.nombre || nomina.empleado_nombre,
        salario: nomina.salario_base || nomina.contrato.salario,
        tipoContrato: nomina.contrato.tipo_contrato?.nombre || nomina.tipo_contrato || ''
      };
    }
    return {
      empleadoNombre: nomina.empleado_nombre || 'Sin información',
      salario: nomina.salario_base || 0,
      tipoContrato: nomina.tipo_contrato || ''
    };
  };

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('nomina.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  if (loading && dropdownsLoading) {
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
      <div id="tour-nomina-header" className="backdrop-blur-xl bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
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
          <Can permission="nomina.add">
            <button
              id="tour-nomina-btn-nueva"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-teal-600 hover:bg-teal-50 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Nómina</span>
            </button>
          </Can>
        </div>

        {/* Estadísticas */}
        {estadisticas && (
          <div id="tour-nomina-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
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
      <div id="tour-nomina-filters" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
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
                  handleFilterContrato(e.target.value);
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
      <div id="tour-nomina-table" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg overflow-hidden border border-gray-200/50">
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
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-3">
                      <div className="w-6 h-6 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando nóminas...</span>
                    </div>
                  </td>
                </tr>
              ) : nominas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No hay nóminas registradas</p>
                    <p className="text-sm mt-1">Crea tu primera nómina para comenzar</p>
                  </td>
                </tr>
              ) : (
                nominas.map((nomina, index) => {
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
                          {formatDate(nomina.periodo_inicio)}
                        </div>
                        <div className="text-gray-500">
                          {formatDate(nomina.periodo_fin)}
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
                          <Can permission="nomina.calcular">
                            <button
                              onClick={() => handleCalcular(nomina.id)}
                              className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
                              title="Calcular nómina"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          </Can>
                        )}
                        {nomina.estado === 'calculada' && (
                          <Can permission="nomina.aprobar">
                            <button
                              onClick={() => handleAprobar(nomina.id)}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                              title="Aprobar nómina"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </Can>
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
                          <Can permission="nomina.pagar">
                            <button
                              onClick={() => handlePagar(nomina.id)}
                              className="p-2 bg-teal-100 text-teal-600 rounded-lg hover:bg-teal-200 transition-colors"
                              title="Marcar como pagada"
                            >
                              <Wallet className="w-4 h-4" />
                            </button>
                          </Can>
                        )}
                        {(nomina.estado === 'borrador' || nomina.estado === 'calculada') && (
                          <>
                            <Can permission="nomina.change">
                              <button
                                onClick={() => handleEdit(nomina)}
                                className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </Can>
                            <Can permission="nomina.delete">
                              <button
                                onClick={() => handleDelete(nomina.id)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Can>
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="nóminas"
        />
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
              {/* Errores generales */}
              {(errors.non_field_errors || errors.detail) && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                  <p className="font-semibold mb-2">No se pudo guardar la nómina</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {Array.isArray(errors.non_field_errors)
                      ? errors.non_field_errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))
                      : null}
                    {errors.detail && <li>{errors.detail}</li>}
                  </ul>
                </div>
              )}
              {/* Selección de Contrato */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contrato (Empleado) *
                </label>
                <select
                  value={formData.contrato}
                  onChange={(e) => handleContratoChange(e.target.value)}
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

              {/* Período */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Período de Nómina *</label>

                {/* Botones rápidos */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { tipo: 'Q1', label: '1ra Quincena' },
                    { tipo: 'Q2', label: '2da Quincena' },
                    { tipo: 'MENSUAL', label: 'Mensual' },
                    { tipo: 'SEMANAL', label: 'Semanal' },
                  ].map(({ tipo, label }) => {
                    // Detectar si este preset coincide con las fechas actuales
                    const hoy = new Date();
                    let presetInicio, presetFin;
                    if (tipo === 'Q1') {
                      presetInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                      presetFin = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
                    } else if (tipo === 'Q2') {
                      presetInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 16);
                      presetFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
                    } else if (tipo === 'MENSUAL') {
                      presetInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                      presetFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
                    } else if (tipo === 'SEMANAL') {
                      const dia = hoy.getDay();
                      presetInicio = new Date(hoy);
                      presetInicio.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
                      presetFin = new Date(presetInicio);
                      presetFin.setDate(presetInicio.getDate() + 6);
                    }
                    const fmt = (d) => d?.toISOString().split('T')[0];
                    const isActive = formData.periodo_inicio === fmt(presetInicio) && formData.periodo_fin === fmt(presetFin);

                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => aplicarPeriodoRapido(tipo)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                          isActive
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400 hover:text-teal-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Campos de fecha */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Inicio</label>
                    <input
                      type="date"
                      value={formData.periodo_inicio}
                      onChange={(e) => setFormData({ ...formData, periodo_inicio: e.target.value })}
                      className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:border-teal-500 transition-colors text-sm ${
                        errors.periodo_inicio ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors.periodo_inicio && <p className="text-red-500 text-xs mt-1">{errors.periodo_inicio}</p>}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fin</label>
                    <input
                      type="date"
                      value={formData.periodo_fin}
                      onChange={(e) => setFormData({ ...formData, periodo_fin: e.target.value })}
                      className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:border-teal-500 transition-colors text-sm ${
                        errors.periodo_fin ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors.periodo_fin && <p className="text-red-500 text-xs mt-1">{errors.periodo_fin}</p>}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha de Pago</label>
                    <input
                      type="date"
                      value={formData.fecha_pago}
                      onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 transition-colors text-sm"
                    />
                  </div>
                </div>

                {/* Resumen visual del período */}
                {formData.periodo_inicio && formData.periodo_fin && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {(() => {
                        const inicio = new Date(formData.periodo_inicio + 'T00:00:00');
                        const fin = new Date(formData.periodo_fin + 'T00:00:00');
                        const dias = Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
                        return `${dias} día${dias !== 1 ? 's' : ''} · ${formatDate(formData.periodo_inicio)} al ${formatDate(formData.periodo_fin)}`;
                      })()}
                    </span>
                  </div>
                )}
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
                    {formData.items.map((item, index) => {
                      const itemSeleccionado = items.find(i => i.id === parseInt(item.item));
                      const subtotal = (parseFloat(item.cantidad || 0) * parseFloat(item.valor_unitario || 0));
                      
                      return (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg">
                        <div className="col-span-5">
                          <select
                            value={item.item}
                            onChange={(e) => actualizarItem(index, 'item', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                          >
                            <option value="">Seleccione item</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>{i.nombre} - {formatMoney(i.precio_unitario || 0)}</option>
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
                            placeholder="Precio Unit."
                            value={item.valor_unitario}
                            onChange={(e) => actualizarItem(index, 'valor_unitario', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 bg-gray-100"
                            readOnly={!!itemSeleccionado}
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Subtotal: {formatMoney(subtotal)}
                          </div>
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
                      );
                    })}
                    <div className="text-right text-lg font-bold text-teal-600">
                      Total Items: {formatMoney(calcularTotalItems())}
                    </div>
                  </div>
                )}
              </div>

              {/* Salario Base — solo visible si hay items de producción */}
              {formData.items.length > 0 && (
                <div className={`rounded-xl p-4 border-2 transition-all ${
                  formData.incluir_salario_base
                    ? 'bg-teal-50 border-teal-300'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label htmlFor="incluir_salario_base" className="font-semibold text-gray-900 cursor-pointer">
                        Incluir Salario Base además de producción
                      </label>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formData.incluir_salario_base
                          ? 'El empleado recibirá salario base + producción'
                          : 'El empleado recibirá solo el valor de los items de producción'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.incluir_salario_base}
                      onClick={() => setFormData({ ...formData, incluir_salario_base: !formData.incluir_salario_base })}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                        formData.incluir_salario_base ? 'bg-teal-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.incluir_salario_base ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Conceptos Laborales Manuales */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Conceptos Laborales</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Selecciona conceptos adicionales. Los aportes legales (salud, pensión, ARL) se calculan automáticamente.
                </p>

                {/* Chips de conceptos seleccionados */}
                {(formData.conceptos_seleccionados || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(formData.conceptos_seleccionados || []).map(id => {
                      const concepto = conceptosLaborales.find(c => c.id === id);
                      if (!concepto) return null;
                      const esDev = concepto.tipo === 'DEVENGADO';
                      return (
                        <span
                          key={id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            esDev
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${esDev ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {concepto.nombre}
                          {concepto.aplica_porcentaje && concepto.porcentaje
                            ? ` (${concepto.porcentaje}%)`
                            : concepto.monto_fijo > 0
                              ? ` (${formatMoney(concepto.monto_fijo)})`
                              : ''
                          }
                          <button
                            type="button"
                            onClick={() => toggleConceptoSeleccionado(id)}
                            className={`ml-0.5 rounded-full p-0.5 transition-colors ${
                              esDev ? 'hover:bg-emerald-200' : 'hover:bg-rose-200'
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Selector con dos columnas: Devengados | Deducciones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Devengados dropdown */}
                  {(() => {
                    const disponibles = conceptosLaborales.filter(
                      c => c.tipo === 'DEVENGADO' && !c.es_legal && !(formData.conceptos_seleccionados || []).includes(c.id)
                    );
                    return (
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">
                          + Agregar Devengado
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) toggleConceptoSeleccionado(e.target.value);
                          }}
                          className="w-full px-3 py-2.5 border-2 border-dashed border-emerald-300 rounded-xl text-sm text-gray-700 bg-emerald-50/50 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer hover:border-emerald-400"
                          disabled={disponibles.length === 0}
                        >
                          <option value="">
                            {disponibles.length === 0
                              ? 'Sin conceptos disponibles'
                              : `Seleccionar (${disponibles.length} disponibles)`}
                          </option>
                          {disponibles.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                              {c.aplica_porcentaje && c.porcentaje ? ` — ${c.porcentaje}%` : ''}
                              {c.monto_fijo > 0 ? ` — ${formatMoney(c.monto_fijo)}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}

                  {/* Deducciones dropdown */}
                  {(() => {
                    const disponibles = conceptosLaborales.filter(
                      c => c.tipo === 'DEDUCCION' && !c.es_legal && c.codigo !== 'RESTAURANTE'
                        && !(formData.conceptos_seleccionados || []).includes(c.id)
                    );
                    return (
                      <div>
                        <label className="block text-xs font-semibold text-rose-700 uppercase tracking-wide mb-1.5">
                          + Agregar Deducción
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) toggleConceptoSeleccionado(e.target.value);
                          }}
                          className="w-full px-3 py-2.5 border-2 border-dashed border-rose-300 rounded-xl text-sm text-gray-700 bg-rose-50/50 focus:outline-none focus:border-rose-500 focus:bg-white transition-all cursor-pointer hover:border-rose-400"
                          disabled={disponibles.length === 0}
                        >
                          <option value="">
                            {disponibles.length === 0
                              ? 'Sin conceptos disponibles'
                              : `Seleccionar (${disponibles.length} disponibles)`}
                          </option>
                          {disponibles.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                              {c.aplica_porcentaje && c.porcentaje ? ` — ${c.porcentaje}%` : ''}
                              {c.monto_fijo > 0 ? ` — ${formatMoney(c.monto_fijo)}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>

                {(formData.conceptos_seleccionados || []).length === 0 && (
                  <p className="text-xs text-gray-400 mt-3 text-center italic">
                    No se han agregado conceptos adicionales a esta nómina
                  </p>
                )}
              </div>

              {/* Deducción de Restaurante */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="tiene_deduccion_restaurante"
                    checked={formData.tiene_deduccion_restaurante}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      tiene_deduccion_restaurante: e.target.checked,
                      valor_restaurante: e.target.checked ? formData.valor_restaurante : 0
                    })}
                    className="mt-1 w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="tiene_deduccion_restaurante" className="font-semibold text-gray-900 cursor-pointer">
                      Deducción de Restaurante
                    </label>
                    <p className="text-sm text-gray-600 mb-2">
                      ¿El empleado tiene deuda de restaurante para descontar en esta nómina?
                    </p>
                    {formData.tiene_deduccion_restaurante && (
                      <div className="mt-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Valor a Descontar
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.valor_restaurante}
                          onChange={(e) => setFormData({ ...formData, valor_restaurante: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                          placeholder="Ingrese el valor del descuento"
                        />
                        <p className="text-sm text-orange-600 mt-1">
                          Se descontará: {formatMoney(formData.valor_restaurante)}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-gray-600 mt-2">
                      Estado actual: {formData.tiene_deduccion_restaurante ? 'Sí' : 'No'}
                      {formData.tiene_deduccion_restaurante && (
                        <> · Valor: {formatMoney(formData.valor_restaurante)}</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Préstamos Activos */}
              {prestamosActivos.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center space-x-2">
                    <Wallet className="w-5 h-5 text-blue-600" />
                    <span>Préstamos Activos del Empleado</span>
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Seleccione los préstamos que desea descontar en esta nómina:
                  </p>
                  <div className="space-y-3">
                    {prestamosActivos.map(prestamo => {
                      const isSelected = (formData.prestamos_seleccionados || []).includes(prestamo.id);
                      return (
                        <div 
                          key={prestamo.id}
                          className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-100 border-blue-500' 
                              : 'bg-white border-gray-200 hover:border-blue-300'
                          }`}
                          onClick={() => togglePrestamoSeleccionado(prestamo.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePrestamoSeleccionado(prestamo.id)}
                            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {prestamo.tipo_prestamo?.nombre || 'Préstamo'}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                              <div>
                                <span className="text-gray-600">Monto Total:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {formatMoney(prestamo.monto_total)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Saldo Pendiente:</span>
                                <span className="ml-2 font-semibold text-red-600">
                                  {formatMoney(prestamo.saldo_pendiente)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Cuota:</span>
                                <span className="ml-2 font-semibold text-blue-600">
                                  {formatMoney(prestamo.valor_cuota)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Cuotas Pendientes:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {prestamo.cuotas_pendientes || 0} de {prestamo.numero_cuotas}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Primer Pago:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {prestamo.fecha_primer_pago ? formatDate(prestamo.fecha_primer_pago) : 'No definido'}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Cuotas a descontar en esta nómina:
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max={prestamo.cuotas_pendientes || 1}
                                  value={formData.cuotas_a_descontar[prestamo.id] || 1}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setFormData({
                                      ...formData,
                                      cuotas_a_descontar: {
                                        ...formData.cuotas_a_descontar,
                                        [prestamo.id]: parseInt(e.target.value) || 1
                                      }
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Total a descontar: {formatMoney((formData.cuotas_a_descontar[prestamo.id] || 1) * parseFloat(prestamo.valor_cuota || 0))}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(formData.prestamos_seleccionados || []).length > 0 && (
                    <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <span className="font-semibold">Total a descontar por préstamos:</span>
                        <span className="ml-2 text-lg font-bold">
                          {formatMoney(
                            prestamosActivos
                              .filter(p => (formData.prestamos_seleccionados || []).includes(p.id))
                              .reduce((sum, p) => {
                                const cuotas = formData.cuotas_a_descontar[p.id] || 1;
                                return sum + (parseFloat(p.valor_cuota || 0) * cuotas);
                              }, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                    <p className="font-semibold mb-2">Flujo de Creación de Nómina:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li><strong>Guardar:</strong> Se crea la nómina en estado "Borrador" con los items de trabajo, restaurante y préstamos seleccionados.</li>
                      <li><strong>Calcular:</strong> El sistema calcula automáticamente los devengados (salario base + items), deducciones (seguridad social, préstamos, restaurante) y el neto a pagar.</li>
                      <li><strong>Aprobar:</strong> Revisa y aprueba la nómina calculada.</li>
                      <li><strong>Pagar:</strong> Marca la nómina como pagada y genera el desprendible.</li>
                    </ol>
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
                      {formatDate(selectedNomina.periodo_inicio)} al{' '}
                      {formatDate(selectedNomina.periodo_fin)}
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
                      {selectedNomina.fecha_pago ? formatDate(selectedNomina.fecha_pago) : 'Pendiente'}
                    </p>
                  </div>
                </div>
              </div>

                {selectedNomina.estado === 'borrador' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-sm text-yellow-800">
                        <p className="font-semibold">Nómina en borrador</p>
                        <p>Para ver devengados, deducciones y neto, primero debes calcular la nómina.</p>
                      </div>
                      <button
                        onClick={() => handleCalcular(selectedNomina.id)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
                      >
                        Calcular ahora
                      </button>
                    </div>
                  </div>
                )}

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
                  <div className="flex justify-between text-gray-700">
                    <span>Deducción Préstamos:</span>
                    <span className="font-semibold text-red-600">
                      {formatMoney(selectedNomina.total_prestamos || 0)}
                    </span>
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
