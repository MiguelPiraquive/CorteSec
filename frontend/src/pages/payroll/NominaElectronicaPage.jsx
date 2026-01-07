// Página principal de Nómina Electrónica - Lista y gestión
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Plus, Download, Send, FileText, CheckCircle, XCircle,
  RefreshCw, Filter, Search, Save, Calculator
} from 'lucide-react';
import { Card, CardHeader } from '../../components/payroll/Card';
import { Button } from '../../components/payroll/Button';
import { Table } from '../../components/payroll/Table';
import { EstadoNominaElectronicaBadge } from '../../components/payroll/Badge';
import { FormField, SelectField } from '../../components/payroll/FormField';
import { Modal, ModalFooter } from '../../components/payroll/Modal';
import { nominaElectronicaAPI, downloadFile, empleadosAPI, periodosAPI, nominasAPI } from '../../services/payrollService';

const NominaElectronicaPage = () => {
  const navigate = useNavigate();
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNominas, setSelectedNominas] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 0,
  });

  const [filters, setFilters] = useState({
    estado: '',
    search: '',
    page: 1,
    page_size: 20,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showNominaModal, setShowNominaModal] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [nominasSimples, setNominasSimples] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [generarDesdeExistente, setGenerarDesdeExistente] = useState(false);
  
  const [formData, setFormData] = useState({
    empleado: '',
    periodo: '',
    periodo_inicio: '',
    periodo_fin: '',
    nomina_simple_id: '',
    dias_trabajados: 30,
    salario_base_contrato: '',
    observaciones: ''
  });

  useEffect(() => {
    loadNominas();
  }, [filters]);

  useEffect(() => {
    if (showNominaModal) {
      loadEmpleados();
      loadPeriodos();
      if (generarDesdeExistente) {
        loadNominasSimples();
      }
    }
  }, [showNominaModal, generarDesdeExistente]);

  const loadNominas = async () => {
    try {
      setLoading(true);
      // Usar nominaElectronicaAPI para traer nóminas ELECTRÓNICAS
      const response = await nominaElectronicaAPI.list(filters);
      
      const data = response.data || response;
      const nominasData = data.results || (Array.isArray(data) ? data : []);
      
      setNominas(nominasData);
      setPagination({
        currentPage: filters.page || 1,
        totalPages: Math.ceil((data.count || 0) / (filters.page_size || 20)),
        pageSize: filters.page_size || 20,
        totalItems: data.count || 0,
      });
    } catch (error) {
      console.error('Error loading nominas:', error);
      toast.error('Error al cargar las nóminas electrónicas');
      setNominas([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEmpleados = async () => {
    try {
      const response = await empleadosAPI.activos();
      const data = response.data || response;
      const empleadosData = data.results || (Array.isArray(data) ? data : []);
      setEmpleados(empleadosData);
    } catch (error) {
      console.error('Error al cargar empleados:', error);
      toast.error('Error al cargar empleados');
      setEmpleados([]);
    }
  };

  const loadPeriodos = async () => {
    try {
      const response = await periodosAPI.abiertos();
      const data = response.data || response;
      const periodosData = data.results || (Array.isArray(data) ? data : []);
      setPeriodos(periodosData);
    } catch (error) {
      console.error('Error al cargar periodos:', error);
      toast.error('Error al cargar periodos');
      setPeriodos([]);
    }
  };

  const loadNominasSimples = async () => {
    try {
      const response = await nominasAPI.sinElectronica();
      const data = response.data || response;
      const nominasData = data.results || (Array.isArray(data) ? data : []);
      setNominasSimples(nominasData);
    } catch (error) {
      console.error('Error al cargar nóminas simples:', error);
      toast.error('Error al cargar nóminas disponibles');
      setNominasSimples([]);
    }
  };

  const handleOpenNominaModal = () => {
    setFormData({
      empleado: '',
      periodo: '',
      periodo_inicio: '',
      periodo_fin: '',
      nomina_simple_id: '',
      dias_trabajados: 30,
      salario_base_contrato: '',
      observaciones: ''
    });
    setGenerarDesdeExistente(false);
    setShowNominaModal(true);
  };

  const handleCloseNominaModal = () => {
    setShowNominaModal(false);
    setGenerarDesdeExistente(false);
    setFormData({
      empleado: '',
      periodo: '',
      periodo_inicio: '',
      periodo_fin: '',
      nomina_simple_id: '',
      dias_trabajados: 30,
      salario_base_contrato: '',
      observaciones: ''
    });
  };

  const handleCalcularYCrear = async () => {
    // Modo 1: Generar desde nómina simple existente
    if (generarDesdeExistente) {
      if (!formData.nomina_simple_id) {
        toast.warning('Seleccione una nómina existente');
        return;
      }

      setLoadingModal(true);
      try {
        const response = await nominaElectronicaAPI.generarDesdeNomina(
          parseInt(formData.nomina_simple_id)
        );
        
        toast.success('Nómina electrónica generada desde nómina existente');
        handleCloseNominaModal();
        loadNominas();
      } catch (error) {
        console.error('Error al generar desde nómina:', error);
        
        let errorMsg = 'Error al generar nómina electrónica';
        if (error.response?.data?.error) {
          errorMsg = error.response.data.error;
        } else if (error.response?.data?.detail) {
          errorMsg = error.response.data.detail;
        }
        
        toast.error(errorMsg);
      } finally {
        setLoadingModal(false);
      }
      return;
    }

    // Modo 2: Crear desde cero
    if (!formData.empleado || !formData.periodo || !formData.periodo_inicio || !formData.periodo_fin || !formData.salario_base_contrato) {
      toast.warning('Complete todos los campos requeridos');
      return;
    }

    setLoadingModal(true);
    try {
      // Crear la nómina electrónica directamente
      const nuevaNominaElectronica = await nominaElectronicaAPI.create({
        empleado: parseInt(formData.empleado),
        periodo: parseInt(formData.periodo),
        periodo_inicio: formData.periodo_inicio,
        periodo_fin: formData.periodo_fin,
        dias_trabajados: parseInt(formData.dias_trabajados),
        salario_base_contrato: formData.salario_base_contrato,
        observaciones: formData.observaciones || '',
        detalles_items: [],
        detalles_conceptos: []
      });

      toast.success('Nómina electrónica creada exitosamente');
      handleCloseNominaModal();
      loadNominas();
    } catch (error) {
      console.error('Error al crear nómina electrónica:', error);
      
      let errorMsg = 'Error al crear nómina electrónica';
      
      if (error.response?.data?.non_field_errors) {
        const errors = error.response.data.non_field_errors;
        if (errors[0]?.includes('único') || errors[0]?.includes('unique')) {
          errorMsg = 'Ya existe una nómina electrónica para este empleado en el periodo seleccionado';
        } else {
          errorMsg = errors[0];
        }
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (typeof error.response?.data === 'object') {
        const firstError = Object.values(error.response.data)[0];
        if (Array.isArray(firstError)) {
          errorMsg = firstError[0];
        }
      }
      
      toast.error(errorMsg);
    } finally {
      setLoadingModal(false);
    }
  };

  const handleProcessar = async (id) => {
    if (!confirm('¿Procesar nómina completa (XML, Firma, Envío DIAN)?')) return;

    try {
      const response = await nominaElectronicaAPI.procesarCompleto(id);
      toast.success(`Procesamiento iniciado: ${response.data.mensaje}`);
      setTimeout(() => loadNominas(), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar nómina');
    }
  };

  const handleEnviarDIAN = async (id) => {
    if (!confirm('¿Enviar nómina a DIAN?')) return;

    try {
      await nominaElectronicaAPI.enviarDIAN(id);
      toast.success('Nómina enviada a DIAN exitosamente');
      loadNominas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar a DIAN');
    }
  };

  const handleDescargarPDF = async (id, numeroDocumento) => {
    try {
      const response = await nominaElectronicaAPI.descargarPDF(id);
      downloadFile(response.data, `nomina_${numeroDocumento}.pdf`);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al descargar PDF');
    }
  };

  const handleDescargarXML = async (id, numeroDocumento) => {
    try {
      const response = await nominaElectronicaAPI.descargarXML(id);
      downloadFile(response.data, `nomina_${numeroDocumento}.xml`);
      toast.success('XML descargado');
    } catch (error) {
      toast.error('Error al descargar XML');
    }
  };

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (item) => (
        <div className="font-medium">#{item.id}</div>
      ),
    },
    {
      key: 'empleado',
      header: 'Empleado',
      render: (item) => (
        <div>
          <div className="font-medium">
            {item.empleado_info?.nombre_completo || 'N/A'}
          </div>
          <div className="text-xs text-gray-500">
            {item.empleado_info?.documento || ''}
          </div>
        </div>
      ),
    },
    {
      key: 'periodo',
      header: 'Periodo',
      render: (item) => (
        <div className="text-sm">
          {item.periodo_nombre || 
           `${new Date(item.periodo_inicio).toLocaleDateString()} - ${new Date(item.periodo_fin).toLocaleDateString()}`}
        </div>
      ),
    },
    {
      key: 'total_items',
      header: 'Total Items',
      render: (item) => (
        <div className="font-medium text-purple-600">
          ${parseFloat(item.total_items || '0').toLocaleString()}
        </div>
      ),
      align: 'right',
    },
    {
      key: 'salario_base',
      header: 'Salario Base',
      render: (item) => (
        <div className="font-medium text-indigo-600">
          ${parseFloat(item.salario_base_contrato || '0').toLocaleString()}
        </div>
      ),
      align: 'right',
    },
    {
      key: 'ingreso',
      header: 'Ingreso Total',
      render: (item) => (
        <div className="font-medium text-blue-600">
          ${parseFloat(item.ingreso_real_periodo || '0').toLocaleString()}
        </div>
      ),
      align: 'right',
    },
    {
      key: 'deducciones',
      header: 'Deducciones',
      render: (item) => (
        <div className="font-medium text-red-600">
          ${parseFloat(item.total_deducciones || '0').toLocaleString()}
        </div>
      ),
      align: 'right',
    },
    {
      key: 'neto_pagar',
      header: 'Neto a Pagar',
      render: (item) => (
        <div className="font-medium text-green-600">
          ${parseFloat(item.neto_pagar || '0').toLocaleString()}
        </div>
      ),
      align: 'right',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <EstadoNominaElectronicaBadge estado={item.estado || 'borrador'} />
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/dashboard/nomina-electronica/nominas/${item.id}/editar`);
            }}
            icon={<FileText className="h-4 w-4" />}
            title="Ver/Editar Detalles"
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleProcessar(item.id);
            }}
            icon={<Send className="h-4 w-4" />}
            title="Procesar Nómina"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleDescargarPDF(item.id, item.numero_documento || item.id);
            }}
            icon={<Download className="h-4 w-4" />}
            title="Descargar PDF"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nómina Electrónica</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de nómina electrónica y envío a DIAN
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            icon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtros
          </Button>
          <Button
            variant="outline"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={loadNominas}
          >
            Actualizar
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={handleOpenNominaModal}
          >
            Nueva Nómina
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardHeader title="Filtros" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              label="Buscar"
              type="text"
              placeholder="Número, empleado..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
            <SelectField
              label="Estado"
              value={filters.estado}
              onChange={(e) => setFilters({ ...filters, estado: e.target.value, page: 1 })}
              options={[
                { value: 'borrador', label: 'Borrador' },
                { value: 'generado', label: 'Generado' },
                { value: 'firmado', label: 'Firmado' },
                { value: 'enviado', label: 'Enviado' },
                { value: 'aceptado', label: 'Aceptado' },
                { value: 'rechazado', label: 'Rechazado' },
              ]}
            />
            <FormField
              label="Fecha Inicio"
              type="date"
              value={filters.fecha_inicio}
              onChange={(e) => setFilters({ ...filters, fecha_inicio: e.target.value, page: 1 })}
            />
            <FormField
              label="Fecha Fin"
              type="date"
              value={filters.fecha_fin}
              onChange={(e) => setFilters({ ...filters, fecha_fin: e.target.value, page: 1 })}
            />
          </div>
        </Card>
      )}

      <Card padding="none">
        <Table
          data={nominas}
          columns={columns}
          loading={loading}
          emptyMessage="No hay nóminas electrónicas registradas"
          onRowClick={(item) => navigate(`/payroll/nominas-electronicas/${item.id}`)}
          pagination={{
            ...pagination,
            onPageChange: (page) => setFilters({ ...filters, page }),
          }}
        />
      </Card>

      {/* Modal Nueva Nómina */}
      <Modal
        isOpen={showNominaModal}
        onClose={handleCloseNominaModal}
        title="Nueva Nómina Electrónica"
        size="lg"
      >
        <div className="space-y-6">
          {/* Checkbox para elegir modo de creación */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={generarDesdeExistente}
                onChange={(e) => {
                  setGenerarDesdeExistente(e.target.checked);
                  // Limpiar campos al cambiar modo
                  setFormData({
                    empleado: '',
                    periodo: '',
                    periodo_inicio: '',
                    periodo_fin: '',
                    nomina_simple_id: '',
                    dias_trabajados: 30,
                    salario_base_contrato: '',
                    observaciones: ''
                  });
                }}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">
                  Generar desde nómina existente
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  {generarDesdeExistente 
                    ? 'Se creará la nómina electrónica a partir de una nómina simple ya procesada'
                    : 'Se creará una nueva nómina electrónica desde cero'}
                </p>
              </div>
            </label>
          </div>

          {/* Modo 1: Generar desde nómina existente */}
          {generarDesdeExistente ? (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <FileText className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Seleccionar Nómina Simple
                  </h3>
                </div>
                
                <SelectField
                  label="Nómina Simple Disponible"
                  name="nomina_simple_id"
                  value={formData.nomina_simple_id}
                  onChange={(e) => setFormData({ ...formData, nomina_simple_id: e.target.value })}
                  options={[
                    { value: '', label: '-- Seleccione una nómina --' },
                    ...nominasSimples.map(nomina => ({
                      value: nomina.id,
                      label: `#${nomina.id} - ${nomina.empleado_info?.nombre_completo || 'N/A'} - ${nomina.periodo_info?.nombre || 'N/A'} - $${parseFloat(nomina.ingreso_real_periodo || 0).toLocaleString()}`
                    }))
                  ]}
                  required
                  helpText={nominasSimples.length === 0 ? 'No hay nóminas simples disponibles sin nómina electrónica' : `${nominasSimples.length} nómina(s) disponible(s)`}
                />

                {nominasSimples.length === 0 && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>No hay nóminas disponibles.</strong><br/>
                      Todas las nóminas simples ya tienen su nómina electrónica asociada,
                      o no hay nóminas simples creadas en Recursos Humanos.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Observaciones (Opcional)
                </label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={3}
                  placeholder="Agregue notas o comentarios adicionales..."
                  className="block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          ) : (
            /* Modo 2: Crear desde cero */
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Plus className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Nueva Nómina Electrónica
                  </h3>
                </div>

                <div className="space-y-4">
                  <SelectField
                    label="Empleado"
                    name="empleado"
                    value={formData.empleado}
                    onChange={(e) => setFormData({ ...formData, empleado: e.target.value })}
                    options={[
                      { value: '', label: '-- Seleccione un empleado --' },
                      ...empleados.map(emp => ({
                        value: emp.id,
                        label: emp.nombre_completo || `${emp.primer_nombre} ${emp.primer_apellido}`
                      }))
                    ]}
                    required
                  />

                  <SelectField
                    label="Periodo"
                    name="periodo"
                    value={formData.periodo}
                    onChange={(e) => {
                      setFormData({ ...formData, periodo: e.target.value });
                      // Auto-completar fechas del periodo si está disponible
                      const periodoSeleccionado = periodos.find(p => p.id === parseInt(e.target.value));
                      if (periodoSeleccionado) {
                        setFormData(prev => ({
                          ...prev,
                          periodo: e.target.value,
                          periodo_inicio: periodoSeleccionado.fecha_inicio || '',
                          periodo_fin: periodoSeleccionado.fecha_fin || ''
                        }));
                      }
                    }}
                    options={[
                      { value: '', label: '-- Seleccione un periodo --' },
                      ...periodos.map(per => ({
                        value: per.id,
                        label: per.nombre
                      }))
                    ]}
                    required
                  />

                  <FormField
                    label="Fecha Inicio Periodo"
                    name="periodo_inicio"
                    type="date"
                    value={formData.periodo_inicio}
                    onChange={(e) => setFormData({ ...formData, periodo_inicio: e.target.value })}
                    required
                  />

                  <FormField
                    label="Fecha Fin Periodo"
                    name="periodo_fin"
                    type="date"
                    value={formData.periodo_fin}
                    onChange={(e) => setFormData({ ...formData, periodo_fin: e.target.value })}
                    required
                  />

                  <FormField
                    label="Salario Base Contrato"
                    name="salario_base_contrato"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salario_base_contrato}
                    onChange={(e) => setFormData({ ...formData, salario_base_contrato: e.target.value })}
                    required
                    helpText="Base para calcular seguridad social y prestaciones"
                  />

                  <FormField
                    label="Días Trabajados"
                    name="dias_trabajados"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dias_trabajados}
                    onChange={(e) => setFormData({ ...formData, dias_trabajados: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Observaciones (Opcional)
                </label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={3}
                  placeholder="Agregue notas o comentarios adicionales..."
                  className="block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={handleCloseNominaModal}
            disabled={loadingModal}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            icon={generarDesdeExistente ? <FileText className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
            onClick={handleCalcularYCrear}
            disabled={loadingModal}
          >
            {loadingModal ? 'Procesando...' : (generarDesdeExistente ? 'Generar desde Nómina' : 'Crear Nómina')}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default NominaElectronicaPage;
