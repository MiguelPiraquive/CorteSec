// Portal del Empleado - Vista principal para empleados
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FileText, Download, Shield, TrendingUp, Calendar,
  DollarSign, AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/payroll/Card';
import { Button } from '../../components/payroll/Button';
import { Table } from '../../components/payroll/Table';
import { EstadoNominaElectronicaBadge } from '../../components/payroll/Badge';
import { Modal, ModalFooter } from '../../components/payroll/Modal';
import { TextAreaField } from '../../components/payroll/FormField';
import { portalEmpleadoAPI, downloadFile } from '../../services/payrollService';

const PortalEmpleadoPage = () => {
  const [nominas, setNominas] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedNomina, setSelectedNomina] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [filters, setFilters] = useState({
    año: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [nominasResp, statsResp] = await Promise.all([
        portalEmpleadoAPI.misNominas(filters),
        portalEmpleadoAPI.estadisticas(),
      ]);
      
      const nominasData = nominasResp.data || nominasResp;
      const nominas = nominasData.results || (Array.isArray(nominasData) ? nominasData : []);
      
      setNominas(nominas);
      setEstadisticas(statsResp.data || statsResp);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar información');
      setNominas([]);
      setEstadisticas(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarPDF = async (id, numero) => {
    try {
      const response = await portalEmpleadoAPI.descargarPDF(id);
      downloadFile(response.data, `nomina_${numero}.pdf`);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al descargar PDF');
    }
  };

  const handleDescargarXML = async (id, numero) => {
    try {
      const response = await portalEmpleadoAPI.descargarXML(id);
      downloadFile(response.data, `nomina_${numero}.xml`);
      toast.success('XML descargado');
    } catch (error) {
      toast.error('Error al descargar XML');
    }
  };

  const handleVerificarAutenticidad = async (id) => {
    try {
      const response = await portalEmpleadoAPI.verificarAutenticidad(id);
      if (response.data.valido) {
        toast.success(`✓ Documento válido - ${response.data.mensaje}`);
      } else {
        toast.warning(response.data.mensaje);
      }
    } catch (error) {
      toast.error('Error al verificar autenticidad');
    }
  };

  const handleReportarInconsistencia = async () => {
    if (!selectedNomina || !reportDescription.trim()) {
      toast.error('Ingrese una descripción del problema');
      return;
    }

    try {
      await portalEmpleadoAPI.reportarInconsistencia(selectedNomina.id, reportDescription);
      toast.success('Reporte enviado exitosamente');
      setShowReportModal(false);
      setReportDescription('');
      setSelectedNomina(null);
    } catch (error) {
      toast.error('Error al enviar reporte');
    }
  };

  const columns = [
    {
      key: 'numero',
      header: 'Número',
      render: (item) => (
        <div>
          <div className="font-medium">{item.numero_documento}</div>
          <div className="text-xs text-gray-500">
            {new Date(item.fecha_emision).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'periodo',
      header: 'Periodo',
      render: (item) => (
        <div className="text-sm">
          {new Date(item.fecha_inicio_periodo).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </div>
      ),
    },
    {
      key: 'neto',
      header: 'Neto a Pagar',
      render: (item) => (
        <div className="font-semibold text-green-600 text-lg">
          ${parseFloat(item.nomina_detalle?.neto_pagar || '0').toLocaleString()}
        </div>
      ),
      align: 'right',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => <EstadoNominaElectronicaBadge estado={item.estado} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleDescargarPDF(item.id, item.numero_documento)}
            icon={<FileText className="h-4 w-4" />}
          >
            PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDescargarXML(item.id, item.numero_documento)}
            icon={<Download className="h-4 w-4" />}
          >
            XML
          </Button>
          {item.cune && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleVerificarAutenticidad(item.id)}
              icon={<Shield className="h-4 w-4" />}
            >
              Verificar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedNomina(item);
              setShowReportModal(true);
            }}
            icon={<AlertCircle className="h-4 w-4" />}
          >
            Reportar
          </Button>
        </div>
      ),
      align: 'right',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portal del Empleado</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consulta tus nóminas y descarga tus documentos
        </p>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Nóminas</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {estadisticas.total_nominas}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Pagado</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${(parseFloat(estadisticas.total_pagado) || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Promedio Mensual</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${(parseFloat(estadisticas.promedio_mensual) || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pagadas</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {estadisticas.por_estado.pagada}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabla de nóminas */}
      <Card padding="none">
        <Table
          data={nominas}
          columns={columns}
          loading={loading}
          emptyMessage="No tienes nóminas disponibles"
        />
      </Card>

      {/* Modal de reporte */}
      <Modal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportDescription('');
          setSelectedNomina(null);
        }}
        title="Reportar Inconsistencia"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Describe el problema encontrado en tu nómina. Tu reporte será revisado por el departamento de recursos humanos.
          </p>
          <TextAreaField
            label="Descripción del Problema"
            required
            rows={5}
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            placeholder="Describe detalladamente el problema encontrado..."
          />
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowReportModal(false);
              setReportDescription('');
              setSelectedNomina(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleReportarInconsistencia}
          >
            Enviar Reporte
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default PortalEmpleadoPage;
