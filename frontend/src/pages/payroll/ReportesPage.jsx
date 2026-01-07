import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, Users } from 'lucide-react'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Button, Card, CardHeader, CardBody, SelectField, Badge } from '../../components/payroll'
import { reportesAPI, analyticsAPI } from '../../services/payrollService'

const ReportesPage = () => {
  const [loading, setLoading] = useState(false)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [reporteAnual, setReporteAnual] = useState(null)
  const [comparativa, setComparativa] = useState(null)
  const [analisisCostos, setAnalisisCostos] = useState(null)

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  useEffect(() => {
    loadReportes()
  }, [anio, mes])

  const loadReportes = async () => {
    setLoading(true)
    try {
      // Calcular periodo actual y anterior en formato YYYY-MM
      const periodoActual = `${anio}-${String(mes).padStart(2, '0')}`
      const mesAnterior = mes === 1 ? 12 : mes - 1
      const anioAnterior = mes === 1 ? anio - 1 : anio
      const periodoAnterior = `${anioAnterior}-${String(mesAnterior).padStart(2, '0')}`

      const [anual, comp, costos] = await Promise.all([
        reportesAPI.reporteAnual(anio),
        analyticsAPI.comparativaPeriodos(periodoActual, periodoAnterior),
        analyticsAPI.analisisCostos()
      ])

      setReporteAnual(anual)
      setComparativa(comp)
      setAnalisisCostos(costos)
    } catch (error) {
      toast.error('Error al cargar reportes')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDescargarExcel = async () => {
    try {
      await reportesAPI.nominasExcel({ fecha_inicio: `${anio}-${mes}-01` })
      toast.success('Excel descargado correctamente')
    } catch (error) {
      toast.error('Error al descargar Excel')
    }
  }

  const handleDescargarCSV = async () => {
    try {
      await reportesAPI.nominasCSV({ fecha_inicio: `${anio}-${mes}-01` })
      toast.success('CSV descargado correctamente')
    } catch (error) {
      toast.error('Error al descargar CSV')
    }
  }

  const formatCurrency = (value) => {
    const numValue = parseFloat(value) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(numValue)
  }

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  // Preparar datos para gráficos
  const dataMensual = reporteAnual?.totales ? [
    { name: 'Devengado', value: reporteAnual.totales.total_devengado || 0 },
    { name: 'Deducciones', value: reporteAnual.totales.total_deducciones || 0 },
    { name: 'Neto', value: reporteAnual.totales.total_neto || 0 }
  ] : []

  const dataComparativa = comparativa ? [
    {
      periodo: comparativa.periodo2?.fecha || 'Anterior',
      devengado: (comparativa.periodo2?.devengado || 0) / 1000000,
      deducciones: (comparativa.periodo2?.deducciones || 0) / 1000000,
      neto: (comparativa.periodo2?.neto || 0) / 1000000
    },
    {
      periodo: comparativa.periodo1?.fecha || 'Actual',
      devengado: (comparativa.periodo1?.devengado || 0) / 1000000,
      deducciones: (comparativa.periodo1?.deducciones || 0) / 1000000,
      neto: (comparativa.periodo1?.neto || 0) / 1000000
    }
  ] : []

  const dataCostos = analisisCostos ? [
    { name: 'Salarios', value: analisisCostos.total_salarios || 0 },
    { name: 'Prestaciones', value: analisisCostos.total_prestaciones || 0 },
    { name: 'Seguridad Social', value: analisisCostos.total_seguridad_social || 0 },
    { name: 'Otros', value: analisisCostos.otros_costos || 0 }
  ] : []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes y Analytics</h1>
          <p className="text-gray-600 mt-1">Análisis detallado de nómina electrónica</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDescargarExcel}
          >
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDescargarCSV}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody padding="md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SelectField
              label="Año"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              options={Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i
                return { value: year, label: year }
              })}
            />
            <SelectField
              label="Mes"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              options={meses.map((m, i) => ({ value: i + 1, label: m }))}
            />
          </div>
        </CardBody>
      </Card>

      {/* KPIs Principales */}
      {reporteAnual?.totales && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardBody padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Nóminas Procesadas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reporteAnual.totales.nominas_procesadas}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Devengado</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(reporteAnual.totales.total_devengado || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Deducciones</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(reporteAnual.totales.total_deducciones || 0)}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Neto a Pagar</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(reporteAnual.totales.total_neto || 0)}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución Mensual */}
        <Card>
          <CardHeader title="Distribución Mensual" subtitle={`${meses[mes - 1]} ${anio}`} />
          <CardBody padding="md">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataMensual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Comparativa Periodo Actual vs Anterior */}
        <Card>
          <CardHeader title="Comparativa de Periodos" subtitle="Periodo actual vs anterior (Millones COP)" />
          <CardBody padding="md">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataComparativa}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="devengado" fill="#3b82f6" name="Devengado" />
                <Bar dataKey="deducciones" fill="#ef4444" name="Deducciones" />
                <Bar dataKey="neto" fill="#10b981" name="Neto" />
              </BarChart>
            </ResponsiveContainer>
            {comparativa && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-500">Variación Devengado</div>
                  <div className={`text-lg font-semibold ${comparativa.variacion?.devengado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparativa.variacion?.devengado?.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Variación Deducciones</div>
                  <div className={`text-lg font-semibold ${comparativa.variacion?.deducciones >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {comparativa.variacion?.deducciones?.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Variación Neto</div>
                  <div className={`text-lg font-semibold ${comparativa.variacion?.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparativa.variacion?.neto?.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Análisis de Costos */}
        <Card>
          <CardHeader title="Análisis de Costos" subtitle="Distribución por concepto" />
          <CardBody padding="md">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dataCostos}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataCostos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Resumen Anual */}
        {reporteAnual && (
          <Card>
            <CardHeader title="Resumen Anual" subtitle={`Año ${anio}`} />
            <CardBody padding="md">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">Total Nóminas:</span>
                  <span className="font-bold text-lg">{reporteAnual.total_nominas}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">Total Pagado:</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(reporteAnual.total_pagado || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">Promedio Mensual:</span>
                  <span className="font-bold text-lg text-blue-600">
                    {formatCurrency((reporteAnual.total_pagado || 0) / 12)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Empleados Activos:</span>
                  <span className="font-bold text-lg text-purple-600">
                    {reporteAnual.empleados_activos || 0}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Tabla Detalle por Empleado - Requiere endpoint adicional para mostrar datos */}
    </div>
  )
}

export default ReportesPage
