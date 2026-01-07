// Dashboard de Analytics - Métricas y KPIs de nómina electrónica
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  TrendingUp, DollarSign, CheckCircle, AlertTriangle,
  Clock, Users, BarChart3, PieChart
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/payroll/Card';
import { Badge } from '../../components/payroll/Badge';
import { analyticsAPI } from '../../services/payrollService';

const AnalyticsDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [metricas, setMetricas] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState(30);

  useEffect(() => {
    loadData();
  }, [periodo]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashResp, metricasResp, alertasResp] = await Promise.all([
        analyticsAPI.dashboardGeneral(periodo),
        analyticsAPI.metricasDIAN(),
        analyticsAPI.alertas(),
      ]);
      setDashboard(dashResp.data || dashResp || {});
      setMetricas(metricasResp.data || metricasResp || {});
      setAlertas(alertasResp.data || alertasResp || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Error al cargar analytics');
      setDashboard({});
      setMetricas({});
      setAlertas([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !dashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Validar estructuras de datos
  const dashboardData = dashboard || {};
  const metricasData = metricas || {};
  const alertasData = Array.isArray(alertas) ? alertas : [];
  const tiemposRespuesta = metricasData.tiempos_respuesta || { promedio: 'N/A', minimo: 'N/A', maximo: 'N/A' };
  const porEstado = metricasData.por_estado || {};
  const kpis = dashboardData.kpis || {};

  const AlertIcon = ({ tipo }) => {
    switch (tipo) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics - Nómina Electrónica</h1>
          <p className="mt-1 text-sm text-gray-500">
            Métricas, KPIs y análisis de desempeño
          </p>
        </div>
        <div className="flex space-x-2">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                periodo === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p} días
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Nóminas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpis.total_nominas || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Aceptadas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpis.nominas_aceptadas || 0}
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
              <p className="text-sm font-medium text-gray-500">Tasa Aceptación</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpis.tasa_aceptacion || 0}%
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
                ${(parseFloat(kpis.total_pagado) || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tiempo Promedio</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpis.tiempo_promedio_procesamiento || 'N/A'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <Card>
          <CardHeader title="Alertas del Sistema" />
          <CardBody>
            <div className="space-y-3">
              {alertas.map((alerta, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50"
                >
                  <AlertIcon tipo={alerta.tipo} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{alerta.titulo}</p>
                    <p className="text-sm text-gray-600">{alerta.descripcion}</p>
                    {alerta.cantidad > 0 && (
                      <Badge variant={alerta.tipo === 'error' ? 'error' : alerta.tipo === 'warning' ? 'warning' : 'info'}>
                        {alerta.cantidad} registro{alerta.cantidad !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Métricas DIAN */}
      {metricas && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Códigos de Respuesta DIAN" />
            <CardBody>
              <div className="space-y-3">
                {(metricasData.codigos_respuesta || []).map((codigo, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{codigo.codigo}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({codigo.cantidad} respuestas)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${codigo.porcentaje}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{codigo.porcentaje}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tiempos de Respuesta DIAN" />
            <CardBody>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Promedio</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {tiemposRespuesta.promedio}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Mínimo</span>
                  <span className="text-lg font-semibold text-green-600">
                    {tiemposRespuesta.minimo}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Máximo</span>
                  <span className="text-lg font-semibold text-red-600">
                    {tiemposRespuesta.maximo}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">Intentos Promedio de Envío</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metricas.intentos_promedio}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Errores Frecuentes */}
      {metricasData.errores_frecuentes && metricasData.errores_frecuentes.length > 0 && (
        <Card>
          <CardHeader title="Errores Más Frecuentes" />
          <CardBody>
            <div className="space-y-4">
              {metricasData.errores_frecuentes.map((error, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <p className="text-sm text-gray-900">{error.error}</p>
                  <Badge variant="error">{error.cantidad} veces</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsDashboardPage;
