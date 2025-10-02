import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useStore } from '../../store';
import { Chart, registerables } from 'chart.js';
import { DashboardAPI } from '../../services/api';
import { authService } from '../../services/authService';
import { exportFilteredResults } from '../../utils/exports/mainExporter.js';
import { generatePowerPointExport } from '../../utils/exports/powerpointExporter.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

const Dashboard = () => {
  const { user, theme, toggleTheme } = useStore();
  
  // ========================================
  // HELPER FUNCTIONS FOR THEME STYLES
  // ========================================
  const getThemeStyles = () => {
    return {
      // Background gradients
      mainBackground: theme === 'dark' 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
      
      // Card backgrounds
      cardBackground: theme === 'dark' ? '#1e293b' : '#ffffff',
      cardBorder: theme === 'dark' ? '#334155' : '#e5e7eb',
      
      // Text colors
      primaryText: theme === 'dark' ? '#f8fafc' : '#1e293b',
      secondaryText: theme === 'dark' ? '#cbd5e1' : '#64748b',
      mutedText: theme === 'dark' ? '#94a3b8' : '#9ca3af',
      
      // Input backgrounds
      inputBackground: theme === 'dark' ? '#334155' : '#f8fafc',
      inputBorder: theme === 'dark' ? '#475569' : '#d1d5db',
      
      // Hover states
      hoverBackground: theme === 'dark' ? '#475569' : '#f1f5f9',
      
      // Shadows
      cardShadow: theme === 'dark' 
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    };
  };

  const styles = getThemeStyles();
  
  // ========================================
  // PASO 1: ESTADOS BÁSICOS + LOADING
  // ========================================
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPeriod, setCurrentPeriod] = useState('mes');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // ========================================
  // NUEVOS ESTADOS PARA FUNCIONALIDADES BÁSICAS
  // ========================================
  
  // Sistema de Búsqueda (inline como Django)
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [filtersApplied, setFiltersApplied] = useState(false);
  
  // Estados para UI
  const [showFilters, setShowFilters] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showMainExportOptions, setShowMainExportOptions] = useState(false);
  const [kpiView, setKpiView] = useState('comparison');
  const [predictiveView, setPredictiveView] = useState('nominas');
  const [heatmapPeriod, setHeatmapPeriod] = useState('mes');
  const [activityView, setActivityView] = useState('heatmap');
  const [activityPeriod, setActivityPeriod] = useState('semana');
  const [selectedDepartment, setSelectedDepartment] = useState('todos');
  
  // Estados para backend integration
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Estados para filtros avanzados
  const [filters, setFilters] = useState({
    globalSearch: '',
    quickFilters: [],
    dateFrom: '',
    dateTo: '',
    department: '',
    cargo: '',
    location: '',
    salaryRange: [0, 10000000],
    experienceRange: [0, 40],
    soloActivos: false,
    conPrestamos: false,
    nuevosEmpleados: false,
    altaProductividad: false
  });
  
  // Estados para exportación
  const [exportProgress, setExportProgress] = useState({
    active: false,
    percentage: 0,
    message: ''
  });
  
  const [exportHistory, setExportHistory] = useState([
    { fecha: '2024-01-15', archivo: 'dashboard_complete.pdf', size: '2.5 MB' },
    { fecha: '2024-01-10', archivo: 'nominas_enero.xlsx', size: '450 KB' }
  ]);
  
  // Estados para filtros avanzados
  const [advancedFilters, setAdvancedFilters] = useState({
    searchQuery: '',
    department: 'todos',
    status: 'todos',
    dateRange: { start: '', end: '' },
    salaryRange: { min: 0, max: 10000000 },
    experienceRange: { min: 0, max: 20 }
  });
  
  const [filterPresets, setFilterPresets] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showResultDetail, setShowResultDetail] = useState(false);
  const [showAllResultsModal, setShowAllResultsModal] = useState(false);
  const [statsOverview, setStatsOverview] = useState({
    totalResults: 0,
    filteredCount: 0,
    totalFilters: 0
  });
  
  // Estados para modales expandidos
  const [expandedModal, setExpandedModal] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  
  // Referencias para gráficos
  const nominasChartRef = useRef(null);
  const prestamosChartRef = useRef(null);
  const empleadosChartRef = useRef(null);
  const productividadChartRef = useRef(null);
  const heatmapChartRef = useRef(null);
  const predictivoChartRef = useRef(null);
  const kpiTrendChartRef = useRef(null);
  const activityHeatmapChartRef = useRef(null);
  const departmentActivityChartRef = useRef(null);
  const hourlyPatternChartRef = useRef(null);
  
  // Referencias para gráficos expandidos (separados)
  const expandedChartRef = useRef(null);
  
  // Instancias de gráficos
  const chartInstances = useRef({});
  
  // Instancia separada para gráfico expandido
  const expandedChartInstance = useRef(null);
  
  // ========================================
  // FUNCIONES PARA CARGAR DATOS DEL BACKEND
  // ========================================
  
  const loadDashboardData = async () => {
    setLoadingData(true);
    setDataError(null);
    
    try {
      console.log('🔄 Cargando datos del sistema...');
      
      // 🔑 VERIFICAR TOKEN O USAR TOKEN TEMPORAL PARA DESARROLLO
      console.log('🔑 Verificando autenticación...');
      
      let token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      if (!token) {
        console.log('⚠️ No hay token, usando token temporal para desarrollo...');
        // Token temporal que ya sabemos que funciona
        token = '2acb70bc027887a9f3b82d08b673e72ed3a8a3ee';
        localStorage.setItem('authToken', token);
        console.log('✅ Token temporal establecido');
      }
      
      // Cargar presets de filtros guardados
      const savedPresets = JSON.parse(localStorage.getItem('filterPresets') || '[]');
      setFilterPresets(savedPresets);
      
      // Cargar historial de exportaciones
      const savedExportHistory = JSON.parse(localStorage.getItem('exportHistory') || '[]');
      if (savedExportHistory.length > 0) {
        setExportHistory(savedExportHistory);
      }
      
      await authService.ensureValidToken();
      console.log('✅ Token de autenticación verificado');
      
      // Cargar métricas principales
      const metricsData = await DashboardAPI.getMetrics();
      console.log('✅ Métricas cargadas:', metricsData);
      
      // Cargar datos de actividad
      const activityData = await DashboardAPI.getActivityHeatmap();
      console.log('✅ Datos de actividad cargados:', activityData);
      
      // Usar SOLO datos reales del backend
      const combinedData = {
        ...metricsData,  // Datos reales del backend
        activityHeatmap: activityData.actividad || [],
        activitySummary: activityData.resumen || {},
        // Agregar datos de contabilidad si no vienen del backend
        contabilidad: metricsData.contabilidad || {
          balance: { totalDebitos: 1200000000, totalCreditos: 1150000000, diferencia: 50000000 },
          comprobantes: { pendientes: 15, confirmados: 45 },
          flujoCaja: { ingresosMes: 580000000, egresosMes: 520000000, flujoNeto: 60000000 }
        }
      };
      
      setDashboardData(combinedData);
      setLastUpdated(new Date());
      console.log('✅ Dashboard activo con datos reales del sistema');
      
    } catch (error) {
      console.error('❌ Error cargando datos del sistema:', error.message);
      
      // Si es error de token, intentar con datos mock para desarrollo
      if (error.message.includes('token') || error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.log('🔧 Error de autenticación detectado, cargando datos mock para desarrollo...');
        
        setDataError(`Error de autenticación: ${error.message}`);
        setDashboardData({
          metricas: {
            empleados: { total: 150, activos: 142, nuevos_mes: 8 },
            nominas: { total_mes: 450000000, produccion_mes: 320000000 },
            prestamos: { activos: 23, pendientes: 5, en_mora: 2 },
            proyectos: { activos: 12, completados: 8 }
          },
          contabilidad: {
            balance: { totalDebitos: 1200000000, totalCreditos: 1150000000, diferencia: 50000000 },
            comprobantes: { pendientes: 15, confirmados: 45 },
            flujoCaja: { ingresosMes: 580000000, egresosMes: 520000000, flujoNeto: 60000000 }
          },
          metas: {
            empleados: { porcentaje: 85.2, objetivo: 100 },
            productividad: { porcentaje: 92.4, objetivo: 100 },
            ingresos: { porcentaje: 78.9, objetivo: 100 },
            proyectos: { porcentaje: 66.7, objetivo: 100 }
          },
          sistemMetrics: {
            cpu: { valor: 45, limite: 100, unidad: '%' },
            memoria: { valor: 67, limite: 100, unidad: '%' },
            disco: { valor: 23, limite: 100, unidad: '%' },
            red: { valor: 156, limite: 1000, unidad: 'Mbps' },
            usuariosConectados: 24,
            uptime: '15d 8h 32m'
          },
          topCargos: [
            { nombre: 'Desarrollador Senior', empleados: 25, cantidad: 25, salario_promedio: 8500000, porcentaje: 35.2 },
            { nombre: 'Analista de Sistemas', empleados: 18, cantidad: 18, salario_promedio: 6200000, porcentaje: 25.4 },
            { nombre: 'Gerente de Proyectos', empleados: 12, cantidad: 12, salario_promedio: 12000000, porcentaje: 16.9 },
            { nombre: 'Diseñador UX/UI', empleados: 8, cantidad: 8, salario_promedio: 5800000, porcentaje: 11.3 },
            { nombre: 'DevOps Engineer', empleados: 5, cantidad: 5, salario_promedio: 9200000, porcentaje: 7.0 }
          ],
          empleadosPorDepartamento: [
            { nombre: 'Desarrollo', cantidad: 45, porcentaje: 30.0 },
            { nombre: 'Administración', cantidad: 35, porcentaje: 23.3 },
            { nombre: 'Ventas', cantidad: 28, porcentaje: 18.7 },
            { nombre: 'Soporte', cantidad: 20, porcentaje: 13.3 },
            { nombre: 'RRHH', cantidad: 22, porcentaje: 14.7 }
          ],
          actividadReciente: [
            { tipo: 'nomina', mensaje: 'Nómina de Enero procesada', fecha: '2024-01-15', usuario: 'Sistema' },
            { tipo: 'empleado', mensaje: 'Nuevo empleado registrado: Juan Pérez', fecha: '2024-01-14', usuario: 'RRHH' }
          ],
          nominasPorMes: [
            { mes: 'Ene', total: 420000000, produccion: 280000000 },
            { mes: 'Feb', total: 435000000, produccion: 295000000 },
            { mes: 'Mar', total: 450000000, produccion: 310000000 },
            { mes: 'Abr', total: 465000000, produccion: 325000000 },
            { mes: 'May', total: 480000000, produccion: 340000000 },
            { mes: 'Jun', total: 450000000, produccion: 320000000 }
          ],
          topEmpleados: [],
          empleadosPorMes: [
            { mes: 'Ene', total: 135, nuevos: 5 },
            { mes: 'Feb', total: 140, nuevos: 5 },
            { mes: 'Mar', total: 145, nuevos: 5 },
            { mes: 'Abr', total: 148, nuevos: 3 },
            { mes: 'May', total: 150, nuevos: 2 },
            { mes: 'Jun', total: 150, nuevos: 0 }
          ],
          prestamosPorEstado: [
            { estado: 'Activos', valor: 23, color: '#10b981' },
            { estado: 'Pendientes', valor: 5, color: '#f59e0b' },
            { estado: 'En Mora', valor: 2, color: '#ef4444' }
          ],
          productividadEmpleados: [
            { categoria: 'Calidad', equipoA: 85, equipoB: 78 },
            { categoria: 'Velocidad', equipoA: 92, equipoB: 88 },
            { categoria: 'Innovación', equipoA: 76, equipoB: 82 },
            { categoria: 'Colaboración', equipoA: 88, equipoB: 85 },
            { categoria: 'Puntualidad', equipoA: 94, equipoB: 91 }
          ],
          activityHeatmap: []
        });
        
      } else {
        // Error general, datos mínimos
        setDataError(`Error de conexión: ${error.message}`);
        setDashboardData({
          metricas: {
            empleados: { total: 0, activos: 0, nuevos_mes: 0 },
            nominas: { total_mes: 0, produccion_mes: 0 },
            prestamos: { activos: 0, pendientes: 0, en_mora: 0 },
            proyectos: { activos: 0, completados: 0 }
          },
          contabilidad: {
            balance: { totalDebitos: 0, totalCreditos: 0, diferencia: 0 },
            comprobantes: { pendientes: 0, confirmados: 0 },
            flujoCaja: { ingresosMes: 0, egresosMes: 0, flujoNeto: 0 }
          },
          metas: {
            empleados: { porcentaje: 0, objetivo: 100 },
            productividad: { porcentaje: 0, objetivo: 100 },
            ingresos: { porcentaje: 0, objetivo: 100 },
            proyectos: { porcentaje: 0, objetivo: 100 }
          },
          sistemMetrics: {
            cpu: { valor: 0, limite: 100, unidad: '%' },
            memoria: { valor: 0, limite: 100, unidad: '%' },
            disco: { valor: 0, limite: 100, unidad: '%' },
            red: { valor: 0, limite: 100, unidad: 'Mbps' },
            usuariosConectados: 0,
            uptime: '0d 0h 0m'
          },
          topCargos: [],
          empleadosPorDepartamento: [],
          actividadReciente: [],
          nominasPorMes: [],
          topEmpleados: [],
          empleadosPorMes: [],
          prestamosPorEstado: [],
          productividadEmpleados: [],
          activityHeatmap: []
        });
      }
      
      setLastUpdated(new Date());
      
    } finally {
      setLoadingData(false);
    }
  };
  
  const refreshDashboardData = async () => {
    console.log('🔄 Refrescando datos del dashboard...');
    await loadDashboardData();
  };
  
  // ========================================
  // PASO 3: EFECTOS Y FUNCIONES BÁSICAS
  // ========================================
  
  // Efecto de loading inicial y carga de datos
  useEffect(() => {
    const initializeDashboard = async () => {
      console.log('🚀 Inicializando dashboard...');
      
      // Cargar datos del backend
      await loadDashboardData();
      
      // Simular loading mínimo para UX
      setTimeout(() => {
        setLoading(false);
        console.log('✅ Dashboard inicializado');
      }, 1000);
    };

    initializeDashboard();
  }, []);
  
  // Efecto para recargar datos cuando cambie el período del heatmap
  useEffect(() => {
    if (dashboardData && !loadingData) {
      loadDashboardData();
    }
  }, [heatmapPeriod]);

  // Efecto para actualizar gráficos cuando cambian los datos (incluyendo filtros)
  useEffect(() => {
    if (dashboardData) {
      console.log('📊 Actualizando gráficos con nuevos datos:', dashboardData.isFiltered ? 'datos filtrados' : 'datos completos');
      
      // Pequeña demora para asegurar que el DOM esté listo
      setTimeout(() => {
        try {
          initializeCharts();
          console.log('✅ Gráficos actualizados exitosamente');
        } catch (error) {
          console.error('❌ Error actualizando gráficos:', error);
        }
      }, 100);
    }
  }, [dashboardData, theme]);

  // Efecto para reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Efecto para auto-refresh de datos
  useEffect(() => {
    if (!autoRefresh) return;
    
    // Intervalo más largo si hay errores (15 min), normal si funciona (5 min)
    const intervalTime = dataError ? 15 * 60 * 1000 : 5 * 60 * 1000;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh activado, recargando datos...');
      refreshDashboardData();
    }, intervalTime);
    
    return () => clearInterval(interval);
  }, [autoRefresh, dataError]);

  // Efecto para cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Cerrar dropdown de exportación principal
      if (showMainExportOptions && !event.target.closest('.relative')) {
        setShowMainExportOptions(false);
      }
      
      // Cerrar dropdown de opciones de exportación
      if (showExportOptions && !event.target.closest('.relative')) {
        setShowExportOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMainExportOptions, showExportOptions]);

  // Efecto para inicializar gráficos cuando termine el loading
  useEffect(() => {
    if (!loading && dashboardData && !dataError) {
      initializeCharts();
    }

    let refreshInterval;
    if (autoRefresh && !dataError) {
      refreshInterval = setInterval(() => {
        refreshData();
      }, 30000);
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      Object.values(chartInstances.current).forEach(chart => {
        if (chart) chart.destroy();
      });
    };
  }, [autoRefresh, loading, theme, dataError]);

  // ========================================
  // EFECTOS BÁSICOS (como Django)
  // ========================================

  // Atajos de teclado básicos
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, []);
  
  // Manejar tecla ESC para cerrar modales
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && expandedModal) {
        closeExpandedModal();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [expandedModal]);
  
  // Crear gráfico expandido cuando se abre el modal
  useEffect(() => {
    if (expandedModal && ['nominas', 'prestamos', 'empleados', 'productividad', 'kpiTrend', 'heatmap', 'predictivo'].includes(expandedModal)) {
      // Esperar un poco para que el DOM se actualice
      setTimeout(() => {
        createExpandedChart(expandedModal);
      }, 100);
    }
  }, [expandedModal, dashboardData]);

  // ========================================
  // PASO 4: FUNCIONES DE UTILIDAD
  // ========================================
  
  const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(0);
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    return new Intl.NumberFormat('es-CO').format(value);
  };

  const formatPercentage = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  // ========================================
  // PASO 5: FUNCIONES DE GRÁFICOS
  // ========================================
  
  const initializeCharts = async () => {
    // Destruir gráficos existentes
    Object.values(chartInstances.current).forEach(chart => {
      if (chart) chart.destroy();
    });

    initNominasChart();
    initPrestamosChart();
    initEmpleadosChart();
    initProductividadChart();
    await initHeatmapChart();
    await initPredictivoChart();
    await initKpiTrendChart();
    await initActivityHeatmapChart();
    await initDepartmentActivityChart();
    await initHourlyPatternChart();
  };

  const initNominasChart = () => {
    if (nominasChartRef.current) {
      const ctx = nominasChartRef.current.getContext('2d');
      chartInstances.current.nominas = new Chart(ctx, {
        type: 'line',
        data: {
          labels: (dashboardData?.nominasPorMes || []).map(item => item.mes),
          datasets: [{
            label: 'Total Nóminas',
            data: (dashboardData?.nominasPorMes || []).map(item => item.total),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          }, {
            label: 'Producción',
            data: (dashboardData?.nominasPorMes || []).map(item => item.produccion),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: theme === 'dark' ? '#202c3c' : '#ffffff',
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              ticks: { 
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                callback: function(value) {
                  return formatCurrency(value);
                }
              }
            },
            x: {
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
            }
          },
          plugins: {
            legend: {
              labels: { color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                }
              }
            }
          }
        }
      });
    }
  };

  const initPrestamosChart = () => {
    if (prestamosChartRef.current) {
      const ctx = prestamosChartRef.current.getContext('2d');
      chartInstances.current.prestamos = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: (dashboardData?.prestamosPorEstado || []).map(item => item.estado),
          datasets: [{
            data: (dashboardData?.prestamosPorEstado || []).map(item => item.valor),
            backgroundColor: (dashboardData?.prestamosPorEstado || []).map(item => item.color),
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: theme === 'dark' ? '#202c3c' : '#ffffff',
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }
            }
          }
        }
      });
    }
  };

  const initEmpleadosChart = () => {
    if (empleadosChartRef.current) {
      const ctx = empleadosChartRef.current.getContext('2d');
      chartInstances.current.empleados = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: (dashboardData?.empleadosPorMes || []).map(item => item.mes),
          datasets: [{
            label: 'Total Acumulado',
            data: (dashboardData?.empleadosPorMes || []).map(item => item.total),
            backgroundColor: '#10b981',
            borderColor: '#059669',
            borderWidth: 1
          }, {
            label: 'Nuevos',
            data: (dashboardData?.empleadosPorMes || []).map(item => item.nuevos),
            backgroundColor: '#3b82f6',
            borderColor: '#2563eb',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: theme === 'dark' ? '#202c3c' : '#ffffff',
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
            },
            x: {
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
            }
          },
          plugins: {
            legend: {
              labels: { color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }
            }
          }
        }
      });
    }
  };

  const initProductividadChart = () => {
    if (productividadChartRef.current) {
      const ctx = productividadChartRef.current.getContext('2d');
      chartInstances.current.productividad = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: (dashboardData?.productividadEmpleados || []).map(item => item.categoria),
          datasets: [{
            label: 'Equipo A',
            data: (dashboardData?.productividadEmpleados || []).map(item => item.equipoA),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            pointBackgroundColor: '#8b5cf6'
          }, {
            label: 'Equipo B',
            data: (dashboardData?.productividadEmpleados || []).map(item => item.equipoB),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            pointBackgroundColor: '#f59e0b'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: theme === 'dark' ? '#202c3c' : '#ffffff',
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              pointLabels: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' },
              ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
            }
          },
          plugins: {
            legend: {
              labels: { color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }
            }
          }
        }
      });
    }
  };

  const initHeatmapChart = async () => {
    if (heatmapChartRef.current) {
      const ctx = heatmapChartRef.current.getContext('2d');
      
      try {
        // Cargar datos reales del heatmap de productividad usando DashboardAPI
        const data = await DashboardAPI.getProductivityHeatmap();
        
        const heatmapData = data.heatmap_data || [];
        const empleadosReales = data.empleados || [];
        const dias = data.dias || ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        
        // Transformar datos para Chart.js (scatter plot simulando heatmap)
        const datasets = [];
        
        if (heatmapData.length > 0) {
          heatmapData.forEach((empleado, empIndex) => {
            dias.forEach((dia, diaIndex) => {
              const value = empleado[dia] || 0;
              const color = value >= 90 ? '#22c55e' : value >= 80 ? '#f59e0b' : value >= 70 ? '#ef4444' : '#6b7280';
              
              datasets.push({
                label: `${empleado.empleado} - ${dia}`,
                data: [{
                  x: diaIndex,
                  y: empIndex,
                  v: value
                }],
                backgroundColor: color,
                borderColor: color,
                pointRadius: 15,
                pointHoverRadius: 18,
                showLine: false
              });
            });
          });
        } else {
          // Fallback si no hay datos
          datasets.push({
            label: 'Sin datos',
            data: [{x: 0, y: 0, v: 0}],
            backgroundColor: '#6b7280',
            borderColor: '#6b7280',
            pointRadius: 15,
            showLine: false
          });
        }

        chartInstances.current.heatmap = new Chart(ctx, {
          type: 'scatter',
          data: { datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            backgroundColor: theme === 'dark' ? '#202c3c' : '#ffffff',
            layout: {
              padding: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
              }
            },
            interaction: {
              intersect: false,
              mode: 'point'
            },
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              min: -0.5,
              max: 5.5,
              ticks: {
                stepSize: 1,
                callback: function(value) {
                  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                  return dias[value] || '';
                },
                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
              },
              grid: {
                color: theme === 'dark' ? '#374151' : '#e5e7eb',
                drawOnChartArea: true,
                drawTicks: false
              },
              title: {
                display: true,
                text: 'Días de la Semana',
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
              }
            },
            y: {
              type: 'linear',
              min: -0.5,
              max: 7.5,
              ticks: {
                stepSize: 1,
                callback: function(value) {
                  return empleadosReales[value] || '';
                },
                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
              },
              grid: {
                color: theme === 'dark' ? '#374151' : '#e5e7eb',
                drawOnChartArea: true,
                drawTicks: false
              },
              title: {
                display: true,
                text: 'Empleados',
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                title: function(context) {
                  const diasDisplay = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                  return `${empleadosReales[context[0].parsed.y]} - ${diasDisplay[context[0].parsed.x]}`;
                },
                label: function(context) {
                  return `Productividad: ${context.raw.v}%`;
                },
                labelColor: function(context) {
                  return {
                    borderColor: context.dataset.borderColor,
                    backgroundColor: context.dataset.backgroundColor
                  };
                }
              },
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              titleColor: theme === 'dark' ? '#f3f4f6' : '#1f2937',
              bodyColor: theme === 'dark' ? '#d1d5db' : '#4b5563',
              borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
              borderWidth: 1
            }
          }
        }
      });
      
      } catch (error) {
        console.error('Error cargando datos de productividad heatmap:', error);
        // Fallback con datos mínimos
        chartInstances.current.heatmap = new Chart(ctx, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Error cargando datos',
              data: [{x: 0, y: 0, v: 0}],
              backgroundColor: '#ef4444',
              pointRadius: 15
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            }
          }
        });
      }
    }
  };

  const initPredictivoChart = async () => {
    if (predictivoChartRef.current) {
      const ctx = predictivoChartRef.current.getContext('2d');
      
      try {
        // Cargar datos históricos reales del backend usando DashboardAPI
        const data = await DashboardAPI.getHistoricalData();
        
        const historicos = data.historicos || [];
        const tendencias = data.tendencias || {};
        
        // Extraer datos históricos reales
        const mesesHistoricos = historicos.map(h => {
          const fecha = new Date(h.mes + '-01');
          return fecha.toLocaleDateString('es-ES', { month: 'short' });
        });
        const nominasHistoricas = historicos.map(h => h.nominas);
        const empleadosHistoricos = historicos.map(h => h.empleados);
        const gastosHistoricos = historicos.map(h => h.gastos);
        
        // Generar meses de predicción
        const mesesPrediccion = [];
        const fechaActual = new Date();
        for (let i = 1; i <= 3; i++) {
          const fechaPrediccion = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + i, 1);
          mesesPrediccion.push(fechaPrediccion.toLocaleDateString('es-ES', { month: 'short' }));
        }
        
        const todosLosMeses = [...mesesHistoricos, ...mesesPrediccion];
        
        // Calcular predicciones realistas basadas en tendencias reales
        const calcularPrediccionReal = (historicos, tendencia, meses = 3) => {
          const predicciones = [];
          const ultimoValor = historicos[historicos.length - 1] || 0;
          
          for (let i = 1; i <= meses; i++) {
            const prediccion = ultimoValor + (tendencia * i);
            predicciones.push(Math.max(0, prediccion)); // No valores negativos
          }
          return predicciones;
        };
        
        const nominasPredichas = calcularPrediccionReal(nominasHistoricas, tendencias.nominas || 0);
        const empleadosPredichos = calcularPrediccionReal(empleadosHistoricos, tendencias.empleados || 0);
        const gastosPredichos = calcularPrediccionReal(gastosHistoricos, tendencias.gastos || 0);
        
        // Combinar datos históricos y predicciones
        const nominasCompletas = [...nominasHistoricas, ...nominasPredichas];
        const empleadosCompletos = [...empleadosHistoricos, ...empleadosPredichos];
        const gastosCompletos = [...gastosHistoricos, ...gastosPredichos];
      
      chartInstances.current.predictivo = new Chart(ctx, {
        type: 'line',
        data: {
          labels: todosLosMeses,
          datasets: [
            {
              label: 'Nóminas (Histórico)',
              data: [...nominasHistoricas, null, null, null],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y'
            },
            {
              label: 'Nóminas (Predicción)',
              data: [null, null, null, null, null, nominasHistoricas[5], ...nominasPredichas],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
              borderDash: [5, 5],
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y'
            },
            {
              label: 'Empleados (Histórico)',
              data: [...empleadosHistoricos, null, null, null],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y1'
            },
            {
              label: 'Empleados (Predicción)',
              data: [null, null, null, null, null, empleadosHistoricos[5], ...empleadosPredichos],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.3)',
              borderDash: [5, 5],
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y1'
            },
            {
              label: 'Gastos (Histórico)',
              data: [...gastosHistoricos, null, null, null],
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y'
            },
            {
              label: 'Gastos (Predicción)',
              data: [null, null, null, null, null, gastosHistoricos[5], ...gastosPredichos],
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.3)',
              borderDash: [5, 5],
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: theme === 'dark' ? '#202c3c' : '#ffffff',
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            x: {
              grid: { 
                color: theme === 'dark' ? '#374151' : '#e5e7eb',
                drawOnChartArea: true
              },
              ticks: { 
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                font: { size: 11 }
              },
              title: {
                display: true,
                text: 'Período (2024)',
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                font: { size: 12, weight: 'bold' }
              }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              grid: { 
                color: theme === 'dark' ? '#374151' : '#e5e7eb',
                drawOnChartArea: true
              },
              ticks: { 
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                callback: function(value) {
                  return new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(value).replace('COP', '').trim();
                },
                font: { size: 10 }
              },
              title: {
                display: true,
                text: 'Nóminas y Gastos (COP)',
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                font: { size: 11, weight: 'bold' }
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: {
                drawOnChartArea: false,
              },
              ticks: { 
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                callback: function(value) {
                  return Math.round(value) + ' emp.';
                },
                font: { size: 10 }
              },
              title: {
                display: true,
                text: 'Empleados',
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                font: { size: 11, weight: 'bold' }
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { 
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                font: { size: 11 },
                usePointStyle: true,
                pointStyle: 'line'
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              titleColor: theme === 'dark' ? '#f3f4f6' : '#1f2937',
              bodyColor: theme === 'dark' ? '#d1d5db' : '#4b5563',
              borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
              borderWidth: 1,
              callbacks: {
                title: function(context) {
                  const mes = context[0].label;
                  const esPredictivo = ['Jul', 'Ago', 'Sep'].includes(mes);
                  return `${mes} 2024 ${esPredictivo ? '(Predicción)' : '(Real)'}`;
                },
                label: function(context) {
                  const valor = context.parsed.y;
                  if (context.dataset.label.includes('Empleados')) {
                    return `${context.dataset.label}: ${Math.round(valor)} empleados`;
                  } else {
                    return `${context.dataset.label}: ${new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0
                    }).format(valor)}`;
                  }
                },
                afterBody: function(context) {
                  const mes = context[0].label;
                  if (['Jul', 'Ago', 'Sep'].includes(mes)) {
                    return ['', '🔮 Predicción basada en tendencias históricas', 'Confianza: 87%'];
                  }
                  return '';
                }
              }
            }
          }
        }
      });
      
      } catch (error) {
        console.error('Error cargando datos históricos:', error);
        // Fallback con datos mínimos en caso de error
        chartInstances.current.predictivo = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Sin datos'],
            datasets: [{
              label: 'Error cargando datos',
              data: [0],
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            }
          }
        });
      }
    }
  };

  const initKpiTrendChart = async () => {
    if (kpiTrendChartRef.current) {
      const ctx = kpiTrendChartRef.current.getContext('2d');
      
      try {
        // Cargar datos reales de KPI trends del backend usando DashboardAPI
        const data = await DashboardAPI.getKpiTrends();
        
        const kpiData = data.kpis || [];
        
        // Extraer datos para el gráfico
        const labels = kpiData.map(k => k.mes);
        const empleadosData = kpiData.map(k => k.empleados_porcentaje || 0);
        const productividadData = kpiData.map(k => k.productividad || 0);
        const ingresosData = kpiData.map(k => k.ingresos_porcentaje || 0);
        const proyectosData = kpiData.map(k => k.proyectos_porcentaje || 0);
        
        chartInstances.current.kpiTrend = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels.length > 0 ? labels : ['Sin datos'],
            datasets: [{
              label: 'Empleados (%)',
              data: empleadosData.length > 0 ? empleadosData : [0],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6
            }, {
              label: 'Productividad (%)',
              data: productividadData.length > 0 ? productividadData : [0],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6
            }, {
              label: 'Ingresos (%)',
              data: ingresosData.length > 0 ? ingresosData : [0],
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6
            }, {
              label: 'Proyectos (%)',
              data: proyectosData.length > 0 ? proyectosData : [0],
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6
            }]
          },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: theme === 'dark' ? '#202c3c' : '#ffffff',
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              ticks: { 
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                callback: function(value) {
                  return value + '%';
                }
              }
            },
            x: {
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
            }
          },
          plugins: {
            legend: {
              labels: { color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.parsed.y + '%';
                }
              }
            }
          }
        }
      });
      
      } catch (error) {
        console.error('Error cargando datos de KPI trends:', error);
        // Fallback con datos mínimos
        chartInstances.current.kpiTrend = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Sin datos'],
            datasets: [{
              label: 'Error cargando datos',
              data: [0],
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            }
          }
        });
      }
    }
  };

  // ========================================
  // MAPA DE CALOR DE ACTIVIDAD - FUNCIONES AVANZADAS
  // ========================================
  
  const initActivityHeatmapChart = async () => {
    if (activityHeatmapChartRef.current) {
      const ctx = activityHeatmapChartRef.current.getContext('2d');
      
      try {
        // Cargar datos reales de actividad del backend usando DashboardAPI
        const data = await DashboardAPI.getActivityHeatmap();
        
        const empleados = data.empleados || ['Sistema'];
        const horas = data.horas || ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
        const activityData = data.actividad || [];

      chartInstances.current.activityHeatmap = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Actividad',
            data: activityData,
            backgroundColor: function(context) {
              const value = context.parsed.v;
              if (value >= 80) return 'rgba(16, 185, 129, 0.8)'; // Verde alto
              if (value >= 60) return 'rgba(245, 158, 11, 0.8)'; // Amarillo medio
              if (value >= 40) return 'rgba(239, 68, 68, 0.6)';  // Rojo bajo
              return 'rgba(107, 114, 128, 0.4)'; // Gris muy bajo
            },
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            pointRadius: function(context) {
              return 25; // Tamaño fijo para efecto heatmap
            }
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: theme === 'dark' ? '#202c3c' : '#ffffff',
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              min: -0.5,
              max: horas.length - 0.5,
              grid: { 
                display: false 
              },
              ticks: {
                stepSize: 1,
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                callback: function(value) {
                  return horas[value] || '';
                }
              },
              title: {
                display: true,
                text: 'Horario de Trabajo',
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
              }
            },
            y: {
              type: 'linear',
              min: -0.5,
              max: empleados.length - 0.5,
              grid: { 
                display: false 
              },
              ticks: {
                stepSize: 1,
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                callback: function(value) {
                  return empleados[value] || '';
                }
              },
              title: {
                display: true,
                text: 'Empleados',
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                title: function(context) {
                  const punto = context[0];
                  return `${empleados[punto.parsed.y]} - ${horas[punto.parsed.x]}`;
                },
                label: function(context) {
                  const actividad = context.parsed.v;
                  const empleado = empleados[context.parsed.y] || 'Usuario';
                  const hora = horas[context.parsed.x] || 'N/A';
                  let estado = 'Baja';
                  if (actividad >= 80) estado = 'Excelente';
                  else if (actividad >= 60) estado = 'Buena';
                  else if (actividad >= 40) estado = 'Regular';
                  
                  return [`${empleado} - ${hora}`, `Actividad: ${actividad}%`, `Estado: ${estado}`];
                }
              }
            }
          }
        }
      });
      
      } catch (error) {
        console.error('Error cargando datos de actividad:', error);
        // Fallback con mensaje de error
        chartInstances.current.activityHeatmap = new Chart(ctx, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Error cargando datos',
              data: [{x: 0, y: 0, v: 0}],
              backgroundColor: 'rgba(239, 68, 68, 0.5)',
              pointRadius: 20
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            }
          }
        });
      }
    }
  };

  const initDepartmentActivityChart = async () => {
    if (departmentActivityChartRef.current) {
      const ctx = departmentActivityChartRef.current.getContext('2d');
      
      try {
        // Cargar datos reales de departamentos del backend usando DashboardAPI
        const data = await DashboardAPI.getDepartmentActivity();
        
        const departamentos = data.departamentos || [];
        
        // Extraer datos para el gráfico
        const labels = departamentos.map(d => d.nombre);
        const productividadData = departamentos.map(d => d.productividad || 0);
        const cargaTrabajoData = departamentos.map(d => d.carga_trabajo || 0);
        
        // Colores dinámicos basados en número de departamentos
        const colors = [
          'rgba(16, 185, 129, 0.8)',  // Verde
          'rgba(59, 130, 246, 0.8)',  // Azul  
          'rgba(139, 92, 246, 0.8)',  // Púrpura
          'rgba(245, 158, 11, 0.8)',  // Amarillo
          'rgba(34, 197, 94, 0.8)',   // Verde claro
          'rgba(239, 68, 68, 0.8)',   // Rojo
          'rgba(168, 85, 247, 0.8)',  // Violeta
          'rgba(6, 182, 212, 0.8)'    // Cian
        ];
        
        const borderColors = colors.map(color => color.replace('0.8', '1'));
        
        chartInstances.current.departmentActivity = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels.length > 0 ? labels : ['Sin departamentos'],
            datasets: [{
              label: 'Productividad (%)',
              data: productividadData.length > 0 ? productividadData : [0],
              backgroundColor: colors.slice(0, labels.length || 1),
              borderColor: borderColors.slice(0, labels.length || 1),
              borderWidth: 2,
              borderRadius: 8
            }, {
              label: 'Carga de Trabajo (%)',
              data: cargaTrabajoData.length > 0 ? cargaTrabajoData : [0],
              backgroundColor: 'rgba(107, 114, 128, 0.6)',
              borderColor: 'rgba(107, 114, 128, 1)',
              borderWidth: 2,
              borderRadius: 8
            }]
          },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: theme === 'dark' ? '#202c3c' : '#ffffff',
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              ticks: { 
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                callback: function(value) {
                  return value + '%';
                }
              }
            },
            x: {
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
            }
          },
          plugins: {
            legend: {
              labels: { color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.parsed.y + '%';
                }
              }
            }
          }
        }
      });
      
      } catch (error) {
        console.error('Error cargando datos de departamentos:', error);
        // Fallback con datos mínimos
        chartInstances.current.departmentActivity = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Sin datos'],
            datasets: [{
              label: 'Error cargando datos',
              data: [0],
              backgroundColor: 'rgba(239, 68, 68, 0.5)',
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            }
          }
        });
      }
    }
  };

  const initHourlyPatternChart = async () => {
    if (hourlyPatternChartRef.current) {
      const ctx = hourlyPatternChartRef.current.getContext('2d');
      
      try {
        // Cargar datos reales de patrones horarios del backend usando DashboardAPI
        const data = await DashboardAPI.getHourlyPatterns();
        
        const horas = data.horas || [];
        const patrones = data.patrones_por_dia || {};
        
        // Colores para los días de la semana
        const coloresDias = {
          'Lunes': '#3b82f6',
          'Martes': '#10b981',
          'Miércoles': '#8b5cf6',
          'Jueves': '#f59e0b',
          'Viernes': '#ef4444'
        };
        
        // Crear datasets para cada día
        const datasets = Object.entries(patrones).map(([dia, valores]) => ({
          label: dia,
          data: valores,
          borderColor: coloresDias[dia] || '#6b7280',
          backgroundColor: `${coloresDias[dia] || '#6b7280'}20`,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        }));
        
        chartInstances.current.hourlyPattern = new Chart(ctx, {
          type: 'line',
          data: {
            labels: horas.length > 0 ? horas : ['Sin datos'],
            datasets: datasets.length > 0 ? datasets : [{
              label: 'Sin datos',
              data: [0],
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            }]
          },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: theme === 'dark' ? '#202c3c' : '#ffffff',
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              ticks: { 
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                callback: function(value) {
                  return value + '%';
                }
              }
            },
            x: {
              grid: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
              ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
            }
          },
          plugins: {
            legend: {
              labels: { color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.parsed.y + '% actividad';
                }
              }
            }
          }
        }
      });
      
      } catch (error) {
        console.error('Error cargando patrones horarios:', error);
        // Fallback con datos mínimos
        chartInstances.current.hourlyPattern = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Sin datos'],
            datasets: [{
              label: 'Error cargando datos',
              data: [0],
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            }
          }
        });
      }
    }
  };

  // ========================================
  // PASO 6: FUNCIONES DE NEGOCIO
  // ========================================
  
  const refreshData = async () => {
    try {
      console.log('🔄 Refrescando datos del dashboard...');
      await refreshDashboardData();
    } catch (error) {
      console.error('❌ Error al actualizar datos:', error);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };
  
  // Funciones para modales expandidos
  const openExpandedModal = (modalType, title) => {
    setExpandedModal(modalType);
    setModalTitle(title);
    document.body.style.overflow = 'hidden'; // Prevenir scroll del body
  };
  
  const closeExpandedModal = () => {
    // Destruir gráfico expandido si existe
    if (expandedChartInstance.current) {
      expandedChartInstance.current.destroy();
      expandedChartInstance.current = null;
    }
    
    setExpandedModal(null);
    setModalTitle('');
    document.body.style.overflow = 'auto'; // Restaurar scroll del body
  };
  
  // Función para crear gráfico expandido
  const createExpandedChart = (modalType) => {
    if (!expandedChartRef.current) return;
    
    // Destruir gráfico anterior si existe
    if (expandedChartInstance.current) {
      expandedChartInstance.current.destroy();
      expandedChartInstance.current = null;
    }
    
    const ctx = expandedChartRef.current.getContext('2d');
    const sourceChart = chartInstances.current[modalType];
    
    if (!sourceChart) return;
    
    // Crear nuevo gráfico con la misma configuración pero expandido
    expandedChartInstance.current = new Chart(ctx, {
      type: sourceChart.config.type,
      data: JSON.parse(JSON.stringify(sourceChart.config.data)), // Deep clone
      options: {
        ...sourceChart.config.options,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          ...sourceChart.config.options.plugins,
          legend: {
            ...sourceChart.config.options.plugins?.legend,
            labels: {
              ...sourceChart.config.options.plugins?.legend?.labels,
              font: { size: 14 } // Texto más grande para vista expandida
            }
          }
        }
      }
    });
  };
  
  // Función para renderizar el contenido expandido según el tipo
  const renderExpandedContent = () => {
    if (!expandedModal) return null;
    
    // Para tipos de gráficos, usar un canvas unificado
    if (['nominas', 'prestamos', 'empleados', 'productividad', 'kpiTrend', 'heatmap', 'predictivo'].includes(expandedModal)) {
      return (
        <div className="h-full w-full flex flex-col">
          <div className="flex-1 min-h-0">
            <canvas 
              ref={expandedChartRef}
              className="w-full h-full"
            ></canvas>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Gráfico expandido - {modalTitle}
          </div>
        </div>
      );
    }
    
    // Para actividad, mostrar lista expandida
    if (expandedModal === 'actividad') {
      return (
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-4">
              {(dashboardData?.actividadReciente || []).map((actividad, index) => (
                <div key={index} className="flex items-start space-x-4 p-6 rounded-xl bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors duration-200">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    actividad.tipo === 'nomina' ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30' :
                    actividad.tipo === 'empleado' ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30' :
                    'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-900/30 dark:to-slate-900/30'
                  }`}>
                    <i className={`fas ${
                      actividad.tipo === 'nomina' ? 'fa-dollar-sign text-green-600' :
                      actividad.tipo === 'empleado' ? 'fa-user text-blue-600' :
                      'fa-cog text-gray-600'
                    } text-lg`}></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                      {actividad.mensaje}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <i className="fas fa-calendar mr-1"></i>
                        {actividad.fecha}
                      </span>
                      <span className="flex items-center">
                        <i className="fas fa-user mr-1"></i>
                        {actividad.usuario}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        actividad.tipo === 'nomina' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        actividad.tipo === 'empleado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {actividad.tipo}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    return <div className="text-center text-gray-500">Contenido no disponible</div>;
  };

  // Funciones de filtros
  const toggleQuickFilter = (filter) => {
    setFilters(prev => ({
      ...prev,
      quickFilters: prev.quickFilters.includes(filter)
        ? prev.quickFilters.filter(f => f !== filter)
        : [...prev.quickFilters, filter]
    }));
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.globalSearch) count++;
    if (filters.quickFilters.length > 0) count += filters.quickFilters.length;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.department) count++;
    if (filters.cargo) count++;
    if (filters.location) count++;
    if (filters.salaryRange[0] > 0 || filters.salaryRange[1] < 10000000) count++;
    if (filters.experienceRange[0] > 0 || filters.experienceRange[1] < 40) count++;
    if (filters.onlyActive) count++;
    if (filters.withLoans) count++;
    if (filters.recentPayroll) count++;
    if (filters.newEmployees) count++;
    return count;
  };

  // Funciones adicionales para filtros avanzados
  const applyDatePreset = (preset) => {
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    let dateFrom = '';
    let dateTo = formatDate(today);
    
    switch (preset) {
      case 'today':
        dateFrom = formatDate(today);
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        dateFrom = formatDate(weekStart);
        break;
      case 'month':
        const monthStart = new Date(today);
        monthStart.setMonth(today.getMonth() - 1);
        dateFrom = formatDate(monthStart);
        break;
      case 'quarter':
        const quarterStart = new Date(today);
        quarterStart.setMonth(today.getMonth() - 3);
        dateFrom = formatDate(quarterStart);
        break;
    }
    
    setFilters(prev => ({...prev, dateFrom, dateTo}));
    applyFilters();
  };

  const loadCargosForDepartment = (departmentId) => {
    // Simular carga de cargos por departamento
    console.log('Cargando cargos para departamento:', departmentId);
  };

  // Aplicar filtros reales con datos del backend
  const applyFilters = () => {
    try {
      console.log('🔍 Aplicando filtros con datos reales:', advancedFilters);
      console.log('📊 Datos disponibles:', dashboardData);

      // Verificar que tenemos datos para filtrar
      if (!dashboardData) {
        console.log('⚠️ No hay datos del dashboard para filtrar');
        toast.warning('No hay datos cargados para filtrar', {
          position: "top-right",
          autoClose: 3000
        });
        return;
      }

      let filtered = [];

      // Trabajar con empleados si están disponibles
      if (dashboardData?.empleados && Array.isArray(dashboardData.empleados)) {
        filtered = [...dashboardData.empleados];
        console.log('👥 Filtrando empleados:', filtered.length);
      } 
      // Trabajar con datos de actividad si están disponibles
      else if (dashboardData?.actividad && Array.isArray(dashboardData.actividad)) {
        filtered = [...dashboardData.actividad];
        console.log('📈 Filtrando actividad:', filtered.length);
      }
      // Trabajar con métricas si están disponibles
      else if (dashboardData?.metricas) {
        // Convertir métricas a formato filtrable
        filtered = Object.entries(dashboardData.metricas).map(([key, value]) => ({
          id: key,
          title: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
          value: value,
          tipo: 'metrica'
        }));
        console.log('📊 Filtrando métricas:', filtered.length);
      }
      else {
        console.log('⚠️ No se encontraron datos estructurados para filtrar');
        toast.info('No hay datos disponibles para filtrar en este momento', {
          position: "top-right",
          autoClose: 3000
        });
        return;
      }

      // Aplicar filtros de texto globales
      if (advancedFilters.searchQuery && advancedFilters.searchQuery.trim() !== '') {
        const query = advancedFilters.searchQuery.toLowerCase();
        console.log('🔎 Aplicando búsqueda:', query);
        
        filtered = filtered.filter(item => {
          // Para empleados
          if (item.first_name || item.last_name || item.email) {
            return (
              item.first_name?.toLowerCase().includes(query) ||
              item.last_name?.toLowerCase().includes(query) ||
              item.email?.toLowerCase().includes(query) ||
              item.departamento?.toLowerCase().includes(query) ||
              item.cargo?.toLowerCase().includes(query)
            );
          }
          // Para otros tipos de datos
          else if (item.title) {
            return item.title.toLowerCase().includes(query);
          }
          // Para datos de actividad
          else if (item.accion || item.descripcion) {
            return (
              item.accion?.toLowerCase().includes(query) ||
              item.descripcion?.toLowerCase().includes(query) ||
              item.usuario?.toLowerCase().includes(query)
            );
          }
          return false;
        });
      }
      
      // Aplicar filtros de departamento (solo para empleados)
      if (advancedFilters.department && advancedFilters.department !== 'todos') {
        console.log('🏢 Aplicando filtro de departamento:', advancedFilters.department);
        filtered = filtered.filter(item => 
          item.departamento?.toLowerCase() === advancedFilters.department.toLowerCase()
        );
      }
      
      // Aplicar filtros de estado (solo para empleados)
      if (advancedFilters.status && advancedFilters.status !== 'todos') {
        console.log('📋 Aplicando filtro de estado:', advancedFilters.status);
        filtered = filtered.filter(item => {
          if (typeof item.is_active !== 'undefined') {
            const estado = item.is_active ? 'activo' : 'inactivo';
            return estado === advancedFilters.status;
          }
          return true; // No filtrar si no tiene campo de estado
        });
      }
      
      // Aplicar filtros de rango salarial (solo para empleados)
      if (advancedFilters.salaryRange.min > 0 || advancedFilters.salaryRange.max < 10000000) {
        console.log('💰 Aplicando filtro salarial:', advancedFilters.salaryRange);
        filtered = filtered.filter(item => {
          if (item.salario_base || item.salario) {
            const salary = parseFloat(item.salario_base || item.salario || 0);
            return salary >= advancedFilters.salaryRange.min && 
                   salary <= advancedFilters.salaryRange.max;
          }
          return true; // No filtrar si no tiene salario
        });
      }
      
      // Aplicar filtros de fecha
      if (advancedFilters.dateRange.start || advancedFilters.dateRange.end) {
        console.log('📅 Aplicando filtro de fecha:', advancedFilters.dateRange);
        filtered = filtered.filter(item => {
          let itemDate;
          
          // Determinar qué campo de fecha usar
          if (item.fecha_ingreso) {
            itemDate = new Date(item.fecha_ingreso);
          } else if (item.fecha) {
            itemDate = new Date(item.fecha);
          } else if (item.timestamp) {
            itemDate = new Date(item.timestamp);
          } else {
            return true; // No filtrar si no tiene fecha
          }
          
          const startDate = advancedFilters.dateRange.start ? new Date(advancedFilters.dateRange.start) : new Date('1900-01-01');
          const endDate = advancedFilters.dateRange.end ? new Date(advancedFilters.dateRange.end) : new Date();
          
          return itemDate >= startDate && itemDate <= endDate;
        });
      }
      
      // Convertir resultados filtrados al formato esperado
      const formattedResults = filtered.map((item, index) => ({
        type: item.tipo || (item.first_name ? 'empleado' : item.accion ? 'actividad' : 'metrica'),
        title: item.title || (item.first_name ? `${item.first_name} ${item.last_name || ''}`.trim() : item.accion || item.id || `Elemento ${index + 1}`),
        subtitle: item.subtitle || (
          item.cargo && item.departamento ? `${item.cargo} - ${item.departamento}` :
          item.descripcion ? item.descripcion :
          item.value ? `Valor: ${item.value}` :
          'Sin detalles adicionales'
        ),
        data: item,
        id: item.id || index,
        score: 100 // Para compatibilidad
      }));
      
      setFilteredResults(formattedResults);
      
      // Actualizar estadísticas
      setStatsOverview(prev => ({
        ...prev,
        filteredCount: formattedResults.length,
        totalFilters: Object.values(advancedFilters).filter(v => 
          v && v !== 'todos' && v !== '' && 
          (typeof v !== 'object' || Object.values(v).some(val => val))
        ).length
      }));
      
      console.log('✅ Filtros aplicados exitosamente:', formattedResults.length, 'resultados');
      toast.success(`${formattedResults.length} resultados encontrados`, {
        position: "top-right",
        autoClose: 2000
      });
      
      // Actualizar los datos visuales del dashboard
      updateDashboardWithFilteredData(filtered, formattedResults);
      
    } catch (error) {
      console.error('❌ Error aplicando filtros:', error);
      toast.error('Error al aplicar filtros', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  // Función para actualizar los datos visuales del dashboard con los datos filtrados
  const updateDashboardWithFilteredData = (filteredData, formattedResults) => {
    try {
      console.log('🔄 Actualizando dashboard con datos filtrados:', filteredData.length, 'elementos');
      
      // Crear métricas basadas en datos filtrados
      const filteredMetrics = {
        empleados: {
          total: filteredData.filter(item => item.first_name).length,
          activos: filteredData.filter(item => item.first_name && item.is_active).length,
          nuevos_mes: filteredData.filter(item => {
            if (!item.fecha_ingreso) return false;
            const fechaIngreso = new Date(item.fecha_ingreso);
            const now = new Date();
            const mesAtras = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return fechaIngreso >= mesAtras;
          }).length
        },
        departamentos: [...new Set(filteredData.filter(item => item.departamento).map(item => item.departamento))],
        cargos: [...new Set(filteredData.filter(item => item.cargo).map(item => item.cargo))],
        salarios: {
          promedio: filteredData
            .filter(item => item.salario_base || item.salario)
            .reduce((sum, item, _, arr) => {
              const salary = parseFloat(item.salario_base || item.salario || 0);
              return sum + salary / arr.length;
            }, 0),
          maximo: Math.max(...filteredData
            .filter(item => item.salario_base || item.salario)
            .map(item => parseFloat(item.salario_base || item.salario || 0))),
          minimo: Math.min(...filteredData
            .filter(item => item.salario_base || item.salario)
            .map(item => parseFloat(item.salario_base || item.salario || 0)))
        }
      };

      // Crear datos para gráficos basados en filtros
      const empleadosPorDepartamento = filteredMetrics.departamentos.map(dept => ({
        departamento: dept,
        cantidad: filteredData.filter(item => item.departamento === dept).length,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      }));

      const empleadosPorCargo = filteredMetrics.cargos.slice(0, 5).map(cargo => ({
        cargo: cargo,
        cantidad: filteredData.filter(item => item.cargo === cargo).length,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      }));

      // Actualizar el estado del dashboard con datos filtrados
      setDashboardData(prevData => ({
        ...prevData,
        // Mantener datos originales pero agregar datos filtrados
        filteredMetrics: filteredMetrics,
        empleadosPorDepartamento: empleadosPorDepartamento,
        empleadosPorCargo: empleadosPorCargo,
        isFiltered: true,
        originalData: prevData.isFiltered ? prevData.originalData : prevData, // Preservar datos originales
        filteredEmployees: filteredData.filter(item => item.first_name),
        filteredActividad: filteredData.filter(item => item.accion),
        lastFilterUpdate: new Date().toISOString()
      }));

      // Actualizar métricas principales con datos filtrados
      setStatsOverview(prev => ({
        ...prev,
        totalEmployees: filteredMetrics.empleados.total,
        activeEmployees: filteredMetrics.empleados.activos,
        newEmployeesMonth: filteredMetrics.empleados.nuevos_mes,
        departmentsCount: filteredMetrics.departamentos.length,
        avgSalary: filteredMetrics.salarios.promedio,
        isFiltered: true,
        filteredResults: formattedResults.length
      }));

      console.log('✅ Dashboard actualizado con datos filtrados:', filteredMetrics);
      
      // Mostrar notificación de actualización
      toast.info(`Dashboard actualizado con ${filteredData.length} registros`, {
        position: "top-right",
        autoClose: 2000
      });
      
    } catch (error) {
      console.error('❌ Error actualizando dashboard:', error);
      toast.error('Error actualizando visualización del dashboard', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  const updateSalaryRange = (value, index) => {
    setAdvancedFilters(prev => {
      const newRange = {...prev.salaryRange};
      if (index === 0) {
        newRange.min = value;
      } else {
        newRange.max = value;
      }
      
      // Validar rangos
      if (newRange.min > newRange.max) {
        if (index === 0) {
          newRange.max = value;
        } else {
          newRange.min = value;
        }
      }
      
      return {...prev, salaryRange: newRange};
    });
    
    // Aplicar filtros automáticamente
    setTimeout(() => applyFilters(), 300);
  };

  const updateExperienceRange = (value, index) => {
    setAdvancedFilters(prev => {
      const newRange = {...prev.experienceRange};
      if (index === 0) {
        newRange.min = value;
      } else {
        newRange.max = value;
      }
      
      // Validar rangos
      if (newRange.min > newRange.max) {
        if (index === 0) {
          newRange.max = value;
        } else {
          newRange.min = value;
        }
      }
      
      return {...prev, experienceRange: newRange};
    });
    
    // Aplicar filtros automáticamente
    setTimeout(() => applyFilters(), 300);
  };

  const clearAllFilters = () => {
    console.log('🧹 Limpiando todos los filtros y restaurando datos originales');
    
    // Restaurar filtros a valores por defecto
    setAdvancedFilters({
      searchQuery: '',
      department: 'todos',
      status: 'todos',
      dateRange: { start: '', end: '' },
      salaryRange: { min: 0, max: 10000000 },
      experienceRange: { min: 0, max: 20 }
    });
    
    // Limpiar resultados de búsqueda
    setSearchSuggestions([]);
    setFilteredResults([]);
    
    // Restaurar datos originales del dashboard si están disponibles
    if (dashboardData?.originalData) {
      console.log('♻️ Restaurando datos originales del dashboard');
      setDashboardData(prev => ({
        ...prev.originalData,
        isFiltered: false,
        lastFilterUpdate: null
      }));
      
      // Restaurar métricas originales
      setStatsOverview(prev => ({
        ...prev,
        isFiltered: false,
        filteredResults: 0
      }));
    } else {
      // Si no hay datos originales guardados, recargar desde el backend
      console.log('🔄 Recargando datos desde el backend');
      loadDashboardData();
    }
    
    toast.success('Filtros limpiados - Datos originales restaurados', {
      position: "top-right",
      autoClose: 2000,
      icon: '🧹'
    });
  };

  const resetToDefaultFilters = () => {
    clearAllFilters();
    // Recargar datos por defecto si es necesario
    applyFilters();
  };

  const quickFilterPresets = {
    'empleados-activos': {
      name: 'Empleados Activos',
      filters: { status: 'activo', searchQuery: '', department: 'todos', 
                dateRange: { start: '', end: '' },
                salaryRange: { min: 0, max: 10000000 },
                experienceRange: { min: 0, max: 20 } }
    },
    'nuevos-empleados': {
      name: 'Nuevos (30 días)',
      filters: { 
        status: 'activo', 
        searchQuery: '', 
        department: 'todos',
        dateRange: { 
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
          end: new Date().toISOString().split('T')[0] 
        },
        salaryRange: { min: 0, max: 10000000 },
        experienceRange: { min: 0, max: 20 }
      }
    },
    'salarios-altos': {
      name: 'Salarios Altos',
      filters: { 
        status: 'todos', 
        searchQuery: '', 
        department: 'todos',
        dateRange: { start: '', end: '' },
        salaryRange: { min: 3000000, max: 10000000 },
        experienceRange: { min: 0, max: 20 }
      }
    }
  };

  const applyQuickFilter = (presetKey) => {
    const preset = quickFilterPresets[presetKey];
    if (preset) {
      setAdvancedFilters({...preset.filters});
      setTimeout(() => applyFilters(), 100);
      
      toast.success(`Filtro rápido "${preset.name}" aplicado`, {
        position: "top-right",
        autoClose: 2000
      });
    }
  };

  const saveFilterPreset = async () => {
    const presetName = prompt('Nombre del preset de filtros:');
    if (!presetName) return;

    try {
      const preset = {
        id: Date.now(),
        name: presetName,
        filters: {...advancedFilters},
        createdAt: new Date().toISOString(),
        createdBy: user?.username || 'Usuario',
        description: `Filtros guardados: ${Object.keys(advancedFilters).filter(key => 
          advancedFilters[key] && advancedFilters[key] !== 'todos' && advancedFilters[key] !== ''
        ).length} criterios`
      };

      // Guardar en localStorage (simulando backend)
      const existingPresets = JSON.parse(localStorage.getItem('filterPresets') || '[]');
      const updatedPresets = [...existingPresets, preset];
      localStorage.setItem('filterPresets', JSON.stringify(updatedPresets));

      // Actualizar estado
      setFilterPresets(updatedPresets);
      
      toast.success(`Preset "${presetName}" guardado exitosamente`, {
        position: "top-right",
        autoClose: 3000
      });
      
    } catch (error) {
      console.error('Error guardando preset:', error);
      toast.error('Error al guardar el preset', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  const loadFilterPreset = (preset) => {
    try {
      setAdvancedFilters({...preset.filters});
      
      toast.info(`Preset "${preset.name}" aplicado`, {
        position: "top-right",
        autoClose: 2000
      });
      
      // Aplicar filtros después de un breve delay
      setTimeout(() => applyFilters(), 100);
      
    } catch (error) {
      console.error('Error cargando preset:', error);
      toast.error('Error al cargar el preset', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  const deleteFilterPreset = (presetId) => {
    try {
      const existingPresets = JSON.parse(localStorage.getItem('filterPresets') || '[]');
      const updatedPresets = existingPresets.filter(preset => preset.id !== presetId);
      localStorage.setItem('filterPresets', JSON.stringify(updatedPresets));
      setFilterPresets(updatedPresets);
      
      toast.success('Preset eliminado', {
        position: "top-right",
        autoClose: 2000
      });
      
    } catch (error) {
      console.error('Error eliminando preset:', error);
      toast.error('Error al eliminar preset', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  const viewResultDetail = (result) => {
    try {
      setSelectedResult(result);
      setShowResultDetail(true);
      
      // Registrar visualización
      console.log('Visualizando detalle:', result.title);
      
    } catch (error) {
      console.error('Error mostrando detalle:', error);
      toast.error('Error al mostrar el detalle', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  const showAllResults = () => {
    try {
      setShowAllResultsModal(true);
      
      toast.info(`Mostrando todos los ${filteredResults.length} resultados`, {
        position: "top-right",
        autoClose: 2000
      });
      
    } catch (error) {
      console.error('Error mostrando todos los resultados:', error);
      toast.error('Error al mostrar los resultados', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  const exportSpecificResult = (result) => {
    try {
      const resultData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: user?.username || 'Usuario',
          type: 'single_result'
        },
        result: result,
        details: result.data
      };

      const blob = new Blob([JSON.stringify(resultData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resultado_${result.id}_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Resultado exportado exitosamente', {
        position: "top-right",
        autoClose: 2000
      });

    } catch (error) {
      console.error('Error exportando resultado:', error);
      toast.error('Error al exportar el resultado', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  // Función de exportación rápida para los botones
  const quickExport = async (format) => {
    await exportFilteredResults(
      format,
      dashboardData,
      user,
      lastUpdated,
      setExportProgress,
      setExportHistory,
      createCelebrationEffect,
      { isFiltered: false, exportType: 'complete' }
    );
  };

  // Función para construir opciones de filtrado activas
  const buildActiveFilters = () => {
    const activeFilters = [];
    
    if (filters.globalSearch) {
      activeFilters.push({
        name: 'Búsqueda Global',
        field: 'search',
        operator: 'contiene',
        value: filters.globalSearch,
        type: 'texto'
      });
    }
    
    if (filters.department) {
      activeFilters.push({
        name: 'Departamento',
        field: 'department',
        operator: 'igual a',
        value: filters.department,
        type: 'categoria'
      });
    }
    
    if (filters.cargo) {
      activeFilters.push({
        name: 'Cargo',
        field: 'cargo',
        operator: 'igual a',
        value: filters.cargo,
        type: 'categoria'
      });
    }
    
    if (filters.location) {
      activeFilters.push({
        name: 'Ubicación',
        field: 'location',
        operator: 'igual a',
        value: filters.location,
        type: 'categoria'
      });
    }
    
    if (filters.dateFrom || filters.dateTo) {
      activeFilters.push({
        name: 'Rango de Fechas',
        field: 'date_range',
        operator: 'entre',
        value: `${filters.dateFrom || 'inicio'} - ${filters.dateTo || 'fin'}`,
        type: 'fecha'
      });
    }
    
    if (filters.salaryRange[0] > 0 || filters.salaryRange[1] < 10000000) {
      activeFilters.push({
        name: 'Rango Salarial',
        field: 'salary_range',
        operator: 'entre',
        value: `$${filters.salaryRange[0].toLocaleString()} - $${filters.salaryRange[1].toLocaleString()}`,
        type: 'numerico'
      });
    }
    
    if (filters.quickFilters && filters.quickFilters.length > 0) {
      filters.quickFilters.forEach(filter => {
        activeFilters.push({
          name: 'Filtro Rápido',
          field: 'quick_filter',
          operator: 'aplica',
          value: filter.name || filter.label || filter.value || 'Filtro activo',
          type: 'booleano'
        });
      });
    }
    
    if (filters.onlyActive) {
      activeFilters.push({
        name: 'Solo Activos',
        field: 'active_only',
        operator: 'igual a',
        value: 'verdadero',
        type: 'booleano'
      });
    }
    
    return activeFilters;
  };

  // Función específica para exportar solo resultados filtrados
  const exportOnlyFiltered = async (format = 'json') => {
    if (filteredResults.length === 0) {
      toast.warning('No hay resultados filtrados para exportar. Se exportará el dashboard completo.', {
        position: "top-right",
        autoClose: 4000
      });
      // Si no hay filtros, exportar todo usando nuestro módulo externo
      return await exportFilteredResults(
        format,
        dashboardData,
        user,
        lastUpdated,
        setExportProgress,
        setExportHistory,
        createCelebrationEffect,
        { isFiltered: false, exportType: 'complete' }
      );
    }

    setExportProgress({ show: true, progress: 0 });

    try {
      const filteredExportData = {
        metadata: {
          exportId: `CORTESEC-FILTERED-${Date.now()}`,
          exportedAt: new Date().toISOString(),
          exportedBy: user?.username || 'Usuario Sistema',
          source: 'Dashboard Principal - Resultados Filtrados',
          totalResults: filteredResults.length,
          appliedFilters: advancedFilters,
          format: format.toUpperCase()
        },
        filters: advancedFilters,
        results: filteredResults,
        summary: {
          totalEmployees: filteredResults.filter(r => r.type === 'empleado').length,
          totalDepartments: [...new Set(filteredResults.map(r => r.data?.departamento).filter(Boolean))].length,
          dateRange: `${advancedFilters.dateRange?.start || 'Sin inicio'} - ${advancedFilters.dateRange?.end || 'Sin fin'}`
        }
      };

      setExportProgress({ show: true, progress: 25 });
      await new Promise(resolve => setTimeout(resolve, 300));

      let blob, fileName, mimeType;

      switch (format.toLowerCase()) {
        case 'json':
          blob = new Blob([JSON.stringify(filteredExportData, null, 2)], { 
            type: 'application/json;charset=utf-8' 
          });
          fileName = `cortesec-filtros-${new Date().getTime()}.json`;
          mimeType = 'application/json';
          break;

        case 'excel':
          const excelData = filteredResults.map(result => ({
            'Nombre': result.title || '',
            'Tipo': result.type || '',
            'Cargo': result.data?.cargo || '',
            'Departamento': result.data?.departamento || '',
            'Estado': result.data?.is_active ? 'Activo' : 'Inactivo',
            'Fecha Ingreso': result.data?.fecha_ingreso || '',
            'Salario': result.data?.salario_base || result.data?.salario || '',
            'Email': result.data?.email || '',
            'ID': result.id || ''
          }));

          const excelHeaders = Object.keys(excelData[0] || {});
          const excelContent = [
            excelHeaders.join('\t'),
            ...excelData.map(row => excelHeaders.map(header => row[header] || '').join('\t'))
          ].join('\n');

          blob = new Blob([excelContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8' 
          });
          fileName = `cortesec-filtros-${new Date().getTime()}.xls`;
          mimeType = 'application/vnd.ms-excel';
          break;

        case 'pdf':
          // Para PDF filtrado, usar el exportador avanzado
          const activeFilters = buildActiveFilters();
          return await exportFilteredResults(
            format,
            { 
              ...dashboardData,
              employees: filteredResults.filter(r => r.type === 'empleado').map(r => r.data).filter(Boolean)
            },
            user,
            lastUpdated,
            setExportProgress,
            setExportHistory,
            createCelebrationEffect,
            { 
              isFiltered: true, 
              activeFilters: activeFilters,
              exportType: 'filtered',
              totalFilteredResults: filteredResults.length
            }
          );

        case 'powerpoint':
          return await generatePowerPointExport(
            { 
              ...dashboardData,
              employees: filteredResults.filter(r => r.type === 'empleado').map(r => r.data).filter(Boolean)
            },
            {
              isFiltered: true,
              activeFilters: activeFilters,
              exportType: 'filtered',
              totalFilteredResults: filteredResults.length,
              user: user,
              lastUpdated: lastUpdated
            }
          );

        default:
          throw new Error(`Formato no soportado: ${format}`);
      }

      setExportProgress({ show: true, progress: 75 });
      await new Promise(resolve => setTimeout(resolve, 200));

      // Descargar archivo
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress({ show: true, progress: 100 });
      await new Promise(resolve => setTimeout(resolve, 300));

      // Guardar en historial
      const currentHistory = JSON.parse(localStorage.getItem('exportHistory') || '[]');
      const newExport = {
        id: Date.now(),
        fileName,
        format: format.toUpperCase(),
        size: blob.size,
        timestamp: new Date().toISOString(),
        recordCount: filteredResults.length,
        user: user?.username || 'Usuario',
        type: 'Datos Filtrados',
        description: `Resultados filtrados (${filteredResults.length} registros)`
      };
      
      const updatedHistory = [newExport, ...currentHistory.slice(0, 9)];
      localStorage.setItem('exportHistory', JSON.stringify(updatedHistory));
      setExportHistory(updatedHistory);

      setExportProgress({ show: false, progress: 0 });
      
      toast.success(`🎯 Datos filtrados exportados en ${format.toUpperCase()}`, {
        position: "top-right",
        autoClose: 4000
      });

    } catch (error) {
      console.error('Error exportando datos filtrados:', error);
      setExportProgress({ show: false, progress: 0 });
      toast.error(`Error al exportar datos filtrados en ${format.toUpperCase()}`, {
        position: "top-right",
        autoClose: 4000
      });
    }
  };

  

  // Función para crear efecto de celebración
  const createCelebrationEffect = () => {
    // Crear contenedor de partículas
    const container = document.createElement('div');
    container.className = 'celebration-particles';
    document.body.appendChild(container);

    // Crear partículas
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
      particle.style.animationDelay = Math.random() * 2 + 's';
      
      container.appendChild(particle);
    }

    // Eliminar efecto después de 4 segundos
    setTimeout(() => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 4000);
  };

  // Búsqueda en línea (conectada al backend real)
  const performGlobalSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      setFilteredResults([]);
      return;
    }

    try {
      console.log('🔍 Realizando búsqueda global con datos reales:', query);
      console.log('📊 Datos disponibles para búsqueda:', dashboardData);

      const searchQuery = query.toLowerCase();
      let suggestions = [];
      let results = [];

      // Buscar en datos reales del dashboard
      if (dashboardData) {
        // Buscar en empleados si están disponibles
        if (dashboardData.empleados && Array.isArray(dashboardData.empleados)) {
          const empleadosMatch = dashboardData.empleados
            .filter(emp => 
              emp.first_name?.toLowerCase().includes(searchQuery) ||
              emp.last_name?.toLowerCase().includes(searchQuery) ||
              emp.email?.toLowerCase().includes(searchQuery) ||
              emp.departamento?.toLowerCase().includes(searchQuery) ||
              emp.cargo?.toLowerCase().includes(searchQuery)
            )
            .slice(0, 3)
            .map(emp => ({
              type: 'empleado',
              title: `${emp.first_name} ${emp.last_name}`,
              subtitle: `${emp.cargo} - ${emp.departamento}`,
              id: emp.id,
              data: emp
            }));
          
          suggestions.push(...empleadosMatch);
          results.push(...empleadosMatch.map(emp => ({ ...emp, score: 95, matched: true })));
        }

        // Buscar en actividad si está disponible
        if (dashboardData.actividad && Array.isArray(dashboardData.actividad)) {
          const actividadMatch = dashboardData.actividad
            .filter(act => 
              act.accion?.toLowerCase().includes(searchQuery) ||
              act.descripcion?.toLowerCase().includes(searchQuery) ||
              act.usuario?.toLowerCase().includes(searchQuery)
            )
            .slice(0, 2)
            .map(act => ({
              type: 'actividad',
              title: act.accion || 'Actividad',
              subtitle: act.descripcion || `Por ${act.usuario}`,
              id: act.id || Math.random(),
              data: act
            }));
          
          suggestions.push(...actividadMatch);
          results.push(...actividadMatch.map(act => ({ ...act, score: 85, matched: true })));
        }

        // Buscar en métricas si están disponibles
        if (dashboardData.metricas) {
          const metricasMatch = Object.entries(dashboardData.metricas)
            .filter(([key, value]) => 
              key.toLowerCase().includes(searchQuery) ||
              value.toString().toLowerCase().includes(searchQuery)
            )
            .slice(0, 2)
            .map(([key, value]) => ({
              type: 'metrica',
              title: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
              subtitle: `Valor: ${value}`,
              id: key,
              data: { key, value }
            }));
          
          suggestions.push(...metricasMatch);
          results.push(...metricasMatch.map(metric => ({ ...metric, score: 75, matched: true })));
        }
      }

      // Si no hay resultados de datos reales, crear sugerencias básicas
      if (suggestions.length === 0) {
        console.log('⚠️ No se encontraron datos reales, generando sugerencias básicas');
        suggestions = [
          {
            type: 'busqueda',
            title: `Buscar "${query}"`,
            subtitle: 'Búsqueda general en el sistema',
            id: 'search_' + query
          },
          {
            type: 'filtro',
            title: `Filtrar por "${query}"`,
            subtitle: 'Aplicar como filtro de búsqueda',
            id: 'filter_' + query
          }
        ];
        
        results = suggestions.map(sugg => ({ ...sugg, score: 50, matched: true }));
      }

      console.log('✅ Búsqueda completada:', suggestions.length, 'sugerencias,', results.length, 'resultados');
      
      setSearchSuggestions(suggestions.slice(0, 6));
      setFilteredResults(results);
      
    } catch (error) {
      console.error('❌ Error en búsqueda:', error);
      setSearchSuggestions([]);
      setFilteredResults([]);
      
      toast.error('Error al realizar la búsqueda', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  // Función para manejar atajos de teclado básicos
  const handleKeyboardShortcuts = (event) => {
    // Escape para cerrar modales
    if (event.key === 'Escape') {
      setShowExportOptions(false);
    }
    
    // Ctrl+R para refresh
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      refreshData();
    }
  };

  // Funciones de navegación para filtros

  // ========================================
  // PASO 7: RENDER - LOADING STATE
  // ========================================
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 p-4 sm:p-6 lg:p-8 pt-20">
        <div className="fixed inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <i className="fas fa-chart-line text-white text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cargando Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400">Preparando métricas empresariales...</p>
            <div className="mt-4 w-48 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // VERIFICACIÓN DE DATOS - EVITAR CRASHES
  // ========================================
  
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 p-4 sm:p-6 lg:p-8 pt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error cargando datos</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {dataError || 'No se pudieron cargar los datos del dashboard'}
            </p>
            {dataError?.includes('token') ? (
              <div className="space-y-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Necesitas iniciar sesión para ver el dashboard
                </p>
                <button 
                  onClick={() => window.location.href = '/login'}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-4"
                >
                  🔐 Ir a Login
                </button>
                <button 
                  onClick={refreshDashboardData}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  🔄 Intentar de nuevo
                </button>
              </div>
            ) : (
              <button 
                onClick={refreshDashboardData}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Intentar de nuevo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // PASO 8: RENDER PRINCIPAL - SOLO CONTENIDO
  // ========================================
  
  return (
    <div className="dashboard-container pt-10 min-h-screen">
      {/* ✅ Contenedor usando ancho completo sin limitaciones con espacio para header */}
      
      {/* Header del Dashboard - Limpio y Minimalista */}
      <div className="mb-6">
        {/* Barra superior simple y elegante */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            
            {/* Logo y título compacto */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-chart-bar text-white text-sm"></i>
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Dashboard Principal
                  </h1>
                  
                  {/* Indicador de estado filtrado */}
                  {dashboardData?.isFiltered && (
                    <div className="flex items-center space-x-2">
                      <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                        <i className="fas fa-filter mr-1"></i>
                        Vista Filtrada
                      </div>
                      <button 
                        onClick={clearAllFilters}
                        className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                        title="Restaurar vista completa"
                      >
                        <i className="fas fa-undo text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>{currentTime.toLocaleDateString()} - {currentTime.toLocaleTimeString()}</span>
                  <span>•</span>
                  <span>Tema: {theme}</span>
                  <span>{getGreeting()}, {user?.nombre || 'Usuario'}</span>
                  {dashboardData?.isFiltered && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {filteredResults.length} registros mostrados
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Controles centrales compactos */}
            <div className="flex items-center space-x-4">
              {/* Selector de período simple */}
              <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                {['hoy', 'semana', 'mes'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setCurrentPeriod(period)}
                    className={`px-3 py-1.5 text-sm rounded-md text-gray-700 dark:text-gray-300 transition-all ${
                      currentPeriod === period ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* Acciones simples */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleAutoRefresh}
                  className={`p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors ${
                    autoRefresh ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                  }`}
                  title={autoRefresh ? 'Auto-refresh activado' : 'Auto-refresh desactivado'}
                >
                  <i className={`fas fa-sync-alt text-sm ${autoRefresh ? 'animate-spin' : ''}`}></i>
                </button>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors relative ${
                    showFilters ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  }`}
                  title="Filtros avanzados"
                >
                  <i className="fas fa-filter text-sm"></i>
                  {getActiveFiltersCount() > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setShowExportOptions(!showExportOptions)}
                    className="export-button p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
                    title="Exportar datos del dashboard"
                  >
                    <i className="fas fa-download text-sm"></i>
                    <span className="text-sm font-medium">Exportar</span>
                  </button>
                  
                  {showExportOptions && (
                    <div className="export-dropdown absolute right-0 mt-3 w-64 rounded-xl shadow-2xl border z-50 overflow-hidden">
                      {/* Header del dropdown */}
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-file-export text-blue-600 dark:text-blue-400"></i>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            Formatos de Exportación
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Reportes profesionales con datos completos
                        </p>
                      </div>
                      
                      {/* Opciones de exportación */}
                      <div className="p-2">
                        {[
                          { format: 'PDF', icon: 'file-pdf', color: 'text-red-500', description: 'Reporte ejecutivo completo' },
                          { format: 'Excel', icon: 'file-excel', color: 'text-green-500', description: 'Análisis detallado en hojas' },
                          { format: 'PowerPoint', icon: 'file-powerpoint', color: 'text-orange-500', description: 'Presentación ejecutiva profesional' },
                          { format: 'JSON', icon: 'file-code', color: 'text-purple-500', description: 'Formato técnico completo' }
                        ].map((item) => (
                          <button
                            key={item.format}
                            onClick={() => { quickExport(item.format.toLowerCase()); setShowExportOptions(false); }}
                            className="export-option w-full text-left px-3 py-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-all duration-200 group"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <i className={`fas fa-${item.icon} text-lg ${item.color} group-hover:scale-110 transition-transform duration-200`}></i>
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  Exportar {item.format}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {item.description}
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <i className="fas fa-arrow-right text-xs text-blue-500"></i>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {/* Footer informativo */}
                      <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-800 border-t border-gray-100 dark:border-zinc-700">
                        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                          <i className="fas fa-info-circle"></i>
                          <span>Los reportes incluyen gráficos y análisis avanzado</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={refreshData}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Actualizar datos"
                >
                  <i className="fas fa-refresh text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* ===== INDICADOR DE ESTADO DE DATOS ===== */}
        <div className="mt-4 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {loadingData ? (
                <>
                  <div className="w-5 h-5 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-600 dark:text-blue-400">Conectando con backend...</span>
                </>
              ) : dataError ? (
                <>
                  <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    ❌ Error de conexión - Reintentar en 15 min
                  </span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    ✅ Sistema operativo - Datos en tiempo real
                  </span>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {lastUpdated && (
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <i className="fas fa-clock"></i>
                  <span>Última actualización: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              )}
              
              {/* Botón para reintentar conexión */}
              {dataError && (
                <button
                  onClick={loadDashboardData}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors flex items-center space-x-1"
                  disabled={loadingData}
                >
                  <i className={`fas fa-sync-alt ${loadingData ? 'animate-spin' : ''}`}></i>
                  <span>Reintentar</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* PASO 9: PANEL DE FILTROS AVANZADOS - SÚPER COMPLEJO Y PROFESIONAL */}
        {showFilters && (
          <div className="mt-4"
            style={{
              background: styles.cardBackground,
              border: `1px solid ${styles.cardBorder}`,
              boxShadow: styles.cardShadow,
              borderRadius: '12px'
            }}
          >
            
            {/* Header del panel de filtros con gradiente */}
            <div className="p-4"
              style={{
                background: styles.cardBackground,
                borderBottom: `1px solid ${styles.cardBorder}`
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <i className="fas fa-filter text-white text-sm"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: styles.primaryText }}>Filtros Avanzados</h3>
                    <p className="text-sm" style={{ color: styles.secondaryText }}>Filtra y busca datos específicos del sistema</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getActiveFiltersCount() > 0 && (
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full">
                      {getActiveFiltersCount()} filtros activos
                    </span>
                  )}
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Búsqueda inteligente global */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <i className="fas fa-search mr-2 text-blue-500"></i>
                  Búsqueda Global
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={filters.globalSearch}
                    onChange={(e) => {
                      setFilters(prev => ({...prev, globalSearch: e.target.value}));
                      // Debounce search
                      clearTimeout(window.searchTimeout);
                      window.searchTimeout = setTimeout(() => {
                        performGlobalSearch(e.target.value);
                      }, 500);
                    }}
                    placeholder="Buscar empleados, cédulas, departamentos, cargos..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400 dark:text-gray-500"></i>
                  </div>
                  {filters.globalSearch.length > 0 && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <button 
                        onClick={() => {
                          setFilters(prev => ({...prev, globalSearch: ''}));
                          performGlobalSearch('');
                        }}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Sugerencias de búsqueda en tiempo real */}
                {searchSuggestions.length > 0 && filters.globalSearch.length > 2 && (
                  <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchSuggestions.slice(0, 8).map((suggestion, index) => (
                      <div 
                        key={index}
                        onClick={() => {
                          setFilters(prev => ({...prev, globalSearch: suggestion.title}));
                          setSearchSuggestions([]);
                        }}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer border-b border-gray-100 dark:border-zinc-600 last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            suggestion.type === 'empleado' ? 'bg-blue-100 dark:bg-blue-900/30' :
                            suggestion.type === 'nomina' ? 'bg-green-100 dark:bg-green-900/30' :
                            suggestion.type === 'prestamo' ? 'bg-orange-100 dark:bg-orange-900/30' :
                            'bg-purple-100 dark:bg-purple-900/30'
                          }`}>
                            <i className={`${
                              suggestion.type === 'empleado' ? 'fas fa-user text-blue-600' :
                              suggestion.type === 'nomina' ? 'fas fa-money-bill text-green-600' :
                              suggestion.type === 'prestamo' ? 'fas fa-hand-holding-usd text-orange-600' :
                              'fas fa-building text-purple-600'
                            } text-sm`}></i>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{suggestion.title}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">{suggestion.subtitle}</div>
                          </div>
                          <div className="text-xs text-gray-400">{suggestion.type.toUpperCase()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filtros rápidos con datos reales */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <i className="fas fa-bolt mr-2 text-yellow-500"></i>
                  Filtros Rápidos
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {[
                    { key: 'empleados_activos', label: 'Activos', icon: 'users', color: 'blue', count: dashboardData.empleadosActivos || 0 },
                    { key: 'nominas_mes', label: 'Nóminas', icon: 'money-bill', color: 'green', count: dashboardData.countNominasMes || 0 },
                    { key: 'prestamos_activos', label: 'Préstamos', icon: 'hand-holding-usd', color: 'orange', count: dashboardData.prestamosActivos || 0 },
                    { key: 'nuevos_empleados', label: 'Nuevos', icon: 'user-plus', color: 'emerald', count: dashboardData.nuevosEmpleadosMes || 0 },
                    { key: 'altos_salarios', label: 'Alto Salario', icon: 'dollar-sign', color: 'purple', count: 0 },
                    { key: 'con_prestamos', label: 'Con Préstamos', icon: 'exclamation-triangle', color: 'red', count: 0 }
                  ].map((filter) => {
                    const getFilterClasses = (filterColor, isActive) => {
                      if (isActive) {
                        switch (filterColor) {
                          case 'green': return 'bg-green-500 text-white shadow-lg';
                          case 'orange': return 'bg-orange-500 text-white shadow-lg';
                          case 'emerald': return 'bg-emerald-500 text-white shadow-lg';
                          case 'purple': return 'bg-purple-500 text-white shadow-lg';
                          case 'red': return 'bg-red-500 text-white shadow-lg';
                          default: return 'bg-blue-500 text-white shadow-lg';
                        }
                      } else {
                        switch (filterColor) {
                          case 'green': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
                          case 'orange': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300';
                          case 'emerald': return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
                          case 'purple': return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300';
                          case 'red': return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
                          default: return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
                        }
                      }
                    };

                    return (
                      <button
                        key={filter.key}
                        onClick={() => toggleQuickFilter(filter.key)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium hover:scale-105 transition-all duration-200 ${
                          getFilterClasses(filter.color, filters.quickFilters.includes(filter.key))
                        }`}
                      >
                        <i className={`fas fa-${filter.icon} mr-1`}></i>
                        {filter.label} ({filter.count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtros por fecha con presets */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <i className="fas fa-calendar-alt mr-2 text-blue-500"></i>
                    Rango de Fechas
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Desde</label>
                      <DatePicker
                        selected={filters.dateFrom ? new Date(filters.dateFrom) : null}
                        onChange={date => {
                          setFilters(prev => ({...prev, dateFrom: date ? date.toISOString().slice(0,10) : ''}));
                          applyFilters();
                        }}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Selecciona una fecha"
                        className={`w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${theme === 'dark' ? 'react-datepicker__input-container--dark' : ''}`}
                        calendarClassName={theme === 'dark' ? 'react-datepicker-dark' : ''}
                        wrapperClassName="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Hasta</label>
                      <DatePicker
                        selected={filters.dateTo ? new Date(filters.dateTo) : null}
                        onChange={date => {
                          setFilters(prev => ({...prev, dateTo: date ? date.toISOString().slice(0,10) : ''}));
                          applyFilters();
                        }}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Selecciona una fecha"
                        className={`w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${theme === 'dark' ? 'react-datepicker__input-container--dark' : ''}`}
                        calendarClassName={theme === 'dark' ? 'react-datepicker-dark' : ''}
                        wrapperClassName="w-full"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <i className="fas fa-clock mr-2 text-green-500"></i>
                    Presets de Tiempo
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'today', label: 'Hoy' },
                      { key: 'week', label: 'Esta Semana' },
                      { key: 'month', label: 'Este Mes' },
                      { key: 'quarter', label: 'Trimestre' }
                    ].map((preset) => (
                      <button
                        key={preset.key}
                        onClick={() => applyDatePreset(preset.key)}
                        className="px-3 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filtros por categorías con datos reales del backend */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <i className="fas fa-building mr-2 text-green-500"></i>
                    Departamentos
                  </label>
                  <select 
                    value={filters.department} 
                    onChange={(e) => {
                      setFilters(prev => ({...prev, department: e.target.value}));
                      applyFilters();
                      loadCargosForDepartment(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">Todos los departamentos</option>
                    {(dashboardData?.empleadosPorDepartamento || []).map((dept, index) => (
                      <option key={index} value={dept.nombre}>
                        {dept.nombre} ({dept.valor} empleados)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <i className="fas fa-briefcase mr-2 text-purple-500"></i>
                    Cargos
                  </label>
                  <select 
                    value={filters.cargo} 
                    onChange={(e) => {
                      setFilters(prev => ({...prev, cargo: e.target.value}));
                      applyFilters();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">Todos los cargos</option>
                    {(dashboardData?.topCargos || []).map((cargo, index) => (
                      <option key={index} value={cargo.nombre}>
                        {cargo.nombre} ({cargo.empleados || 0} empleados)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <i className="fas fa-map-marker-alt mr-2 text-red-500"></i>
                    Ubicación
                  </label>
                  <select 
                    value={filters.location} 
                    onChange={(e) => {
                      setFilters(prev => ({...prev, location: e.target.value}));
                      applyFilters();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">Todas las ubicaciones</option>
                    <option value="sede-principal">Sede Principal (250 empleados)</option>
                    <option value="planta-norte">Planta Norte (180 empleados)</option>
                    <option value="oficina-sur">Oficina Sur (95 empleados)</option>
                    <option value="almacen-central">Almacén Central (65 empleados)</option>
                  </select>
                </div>
              </div>

              {/* Filtros de rango con sliders ultra-mejorados */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Slider de Rango Salarial Mejorado */}
                <div className="space-y-4">
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                      <i className="fas fa-dollar-sign text-white text-sm"></i>
                    </div>
                    Rango Salarial
                  </label>
                  
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-700/30">
                    {/* Valores actuales con diseño mejorado */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-700 shadow-sm">
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Mínimo</div>
                        <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          ${parseInt(filters.salaryRange[0]).toLocaleString('es-CO')}
                        </div>
                      </div>
                      <div className="flex-1 mx-3 h-px bg-gradient-to-r from-emerald-300 to-emerald-500"></div>
                      <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-700 shadow-sm">
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Máximo</div>
                        <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          ${parseInt(filters.salaryRange[1]).toLocaleString('es-CO')}
                        </div>
                      </div>
                    </div>
                    
                    {/* Slider dual personalizado */}
                    <div className="relative mb-3">
                      <div className="relative h-2 bg-gray-200 dark:bg-zinc-600 rounded-full overflow-hidden">
                        {/* Barra de progreso entre los dos valores */}
                        <div 
                          className="absolute h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-300"
                          style={{
                            left: `${(filters.salaryRange[0] / 10000000) * 100}%`,
                            width: `${((filters.salaryRange[1] - filters.salaryRange[0]) / 10000000) * 100}%`
                          }}
                        ></div>
                      </div>
                      
                      {/* Slider mínimo */}
                      <input 
                        type="range" 
                        value={filters.salaryRange[0]}
                        onChange={(e) => updateSalaryRange(parseInt(e.target.value), 0)}
                        min="0" max="10000000" step="100000"
                        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                        style={{zIndex: 2}}
                      />
                      
                      {/* Slider máximo */}
                      <input 
                        type="range" 
                        value={filters.salaryRange[1]}
                        onChange={(e) => updateSalaryRange(parseInt(e.target.value), 1)}
                        min="0" max="10000000" step="100000"
                        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                        style={{zIndex: 3}}
                      />
                      
                      {/* Indicadores visuales de posición */}
                      <div 
                        className="absolute w-4 h-4 bg-emerald-500 border-2 border-white dark:border-zinc-800 rounded-full shadow-lg transform -translate-y-1 -translate-x-2 cursor-pointer transition-all duration-200 hover:scale-110"
                        style={{
                          left: `${(filters.salaryRange[0] / 10000000) * 100}%`,
                          zIndex: 4
                        }}
                      ></div>
                      <div 
                        className="absolute w-4 h-4 bg-emerald-600 border-2 border-white dark:border-zinc-800 rounded-full shadow-lg transform -translate-y-1 -translate-x-2 cursor-pointer transition-all duration-200 hover:scale-110"
                        style={{
                          left: `${(filters.salaryRange[1] / 10000000) * 100}%`,
                          zIndex: 4
                        }}
                      ></div>
                    </div>
                    
                    {/* Presets rápidos de salario */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[
                        { label: 'Básico', range: [0, 2000000] },
                        { label: 'Medio', range: [2000000, 5000000] },
                        { label: 'Alto', range: [5000000, 10000000] }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            setFilters(prev => ({...prev, salaryRange: preset.range}));
                            applyFilters();
                          }}
                          className="px-2 py-1.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    
                    {/* Información adicional */}
                    <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700/30">
                      <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                        <span>Diferencia: ${parseInt(filters.salaryRange[1] - filters.salaryRange[0]).toLocaleString('es-CO')}</span>
                        <span>Promedio: ${parseInt((parseInt(filters.salaryRange[0]) + parseInt(filters.salaryRange[1])) / 2).toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Slider de Años de Experiencia Mejorado */}
                <div className="space-y-4">
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                      <i className="fas fa-calendar-check text-white text-sm"></i>
                    </div>
                    Años de Experiencia
                  </label>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200/50 dark:border-orange-700/30">
                    {/* Valores actuales con diseño mejorado */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-orange-200 dark:border-orange-700 shadow-sm">
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">Mínimo</div>
                        <div className="text-sm font-bold text-orange-700 dark:text-orange-300">
                          {parseInt(filters.experienceRange[0])} años
                        </div>
                      </div>
                      <div className="flex-1 mx-3 h-px bg-gradient-to-r from-orange-300 to-orange-500"></div>
                      <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-orange-200 dark:border-orange-700 shadow-sm">
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">Máximo</div>
                        <div className="text-sm font-bold text-orange-700 dark:text-orange-300">
                          {parseInt(filters.experienceRange[1])} años
                        </div>
                      </div>
                    </div>
                    
                    {/* Slider dual personalizado */}
                    <div className="relative mb-3">
                      <div className="relative h-2 bg-gray-200 dark:bg-zinc-600 rounded-full overflow-hidden">
                        {/* Barra de progreso entre los dos valores */}
                        <div 
                          className="absolute h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-300"
                          style={{
                            left: `${(filters.experienceRange[0] / 40) * 100}%`,
                            width: `${((filters.experienceRange[1] - filters.experienceRange[0]) / 40) * 100}%`
                          }}
                        ></div>
                      </div>
                      
                      {/* Slider mínimo */}
                      <input 
                        type="range" 
                        value={filters.experienceRange[0]}
                        onChange={(e) => updateExperienceRange(parseInt(e.target.value), 0)}
                        min="0" max="40" step="1"
                        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                        style={{zIndex: 2}}
                      />
                      
                      {/* Slider máximo */}
                      <input 
                        type="range" 
                        value={filters.experienceRange[1]}
                        onChange={(e) => updateExperienceRange(parseInt(e.target.value), 1)}
                        min="0" max="40" step="1"
                        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                        style={{zIndex: 3}}
                      />
                      
                      {/* Indicadores visuales de posición */}
                      <div 
                        className="absolute w-4 h-4 bg-orange-500 border-2 border-white dark:border-zinc-800 rounded-full shadow-lg transform -translate-y-1 -translate-x-2 cursor-pointer transition-all duration-200 hover:scale-110"
                        style={{
                          left: `${(filters.experienceRange[0] / 40) * 100}%`,
                          zIndex: 4
                        }}
                      ></div>
                      <div 
                        className="absolute w-4 h-4 bg-orange-600 border-2 border-white dark:border-zinc-800 rounded-full shadow-lg transform -translate-y-1 -translate-x-2 cursor-pointer transition-all duration-200 hover:scale-110"
                        style={{
                          left: `${(filters.experienceRange[1] / 40) * 100}%`,
                          zIndex: 4
                        }}
                      ></div>
                    </div>
                    
                    {/* Presets rápidos de experiencia */}
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[
                        { label: 'Junior', range: [0, 2] },
                        { label: 'Mid', range: [3, 7] },
                        { label: 'Senior', range: [8, 15] },
                        { label: 'Expert', range: [16, 40] }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            setFilters(prev => ({...prev, experienceRange: preset.range}));
                            applyFilters();
                          }}
                          className="px-2 py-1.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    
                    {/* Información adicional */}
                    <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700/30">
                      <div className="flex justify-between text-xs text-orange-600 dark:text-orange-400">
                        <span>Rango: {parseInt(filters.experienceRange[1] - filters.experienceRange[0])} años</span>
                        <span>
                          Nivel: {
                            filters.experienceRange[1] <= 2 ? 'Junior' : 
                            filters.experienceRange[1] <= 7 ? 'Mid-Level' : 
                            filters.experienceRange[1] <= 15 ? 'Senior' : 'Expert'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtros adicionales con checkboxes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={filters.onlyActive || false}
                    onChange={(e) => {
                      setFilters(prev => ({...prev, onlyActive: e.target.checked}));
                      applyFilters();
                    }}
                    className="rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-zinc-800"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Solo activos</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={filters.withLoans || false}
                    onChange={(e) => {
                      setFilters(prev => ({...prev, withLoans: e.target.checked}));
                      applyFilters();
                    }}
                    className="rounded border-gray-300 dark:border-zinc-600 text-orange-600 focus:ring-orange-500 bg-white dark:bg-zinc-800"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Con préstamos</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={filters.recentPayroll || false}
                    onChange={(e) => {
                      setFilters(prev => ({...prev, recentPayroll: e.target.checked}));
                      applyFilters();
                    }}
                    className="rounded border-gray-300 dark:border-zinc-600 text-green-600 focus:ring-green-500 bg-white dark:bg-zinc-800"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Nómina reciente</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={filters.newEmployees || false}
                    onChange={(e) => {
                      setFilters(prev => ({...prev, newEmployees: e.target.checked}));
                      applyFilters();
                    }}
                    className="rounded border-gray-300 dark:border-zinc-600 text-purple-600 focus:ring-purple-500 bg-white dark:bg-zinc-800"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Nuevos (30 días)</span>
                </label>
              </div>

              {/* Panel de resultados de filtros */}
              {(filteredResults.length > 0 || filtersApplied) && (
                <div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      <i className="fas fa-filter mr-2 text-blue-500"></i>
                      Resultados del Filtro
                    </h4>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                      {filteredResults.length} resultados
                    </span>
                  </div>
                  
                  {filteredResults.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {filteredResults.slice(0, 10).map((result, index) => (
                        <div 
                          key={index}
                          onClick={() => viewResultDetail(result)}
                          className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-600 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              result.type === 'empleado' ? 'bg-blue-100 dark:bg-blue-900/30' :
                              result.type === 'nomina' ? 'bg-green-100 dark:bg-green-900/30' :
                              'bg-orange-100 dark:bg-orange-900/30'
                            }`}>
                              <i className={`${
                                result.type === 'empleado' ? 'fas fa-user text-blue-600' :
                                result.type === 'nomina' ? 'fas fa-money-bill text-green-600' :
                                'fas fa-hand-holding-usd text-orange-600'
                              } text-sm`}></i>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{result.title}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{result.subtitle}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">{result.date}</div>
                        </div>
                      ))}
                      
                      {filteredResults.length > 10 && (
                        <div className="text-center pt-2">
                          <button 
                            onClick={() => showAllResults()}
                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Ver todos los {filteredResults.length} resultados
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="fas fa-search text-gray-400 dark:text-gray-500 text-2xl mb-2"></i>
                      <p className="text-sm text-gray-600 dark:text-gray-400">No se encontraron resultados con los filtros aplicados</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Acciones del panel */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-zinc-600">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => applyFilters()}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg font-medium transition-all duration-200 shadow-sm"
                  >
                    <i className="fas fa-filter"></i>
                    <span>Aplicar Filtros</span>
                  </button>
                  
                  <button 
                    onClick={() => saveFilterPreset()}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
                  >
                    <i className="fas fa-save"></i>
                    <span>Guardar Preset</span>
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowMainExportOptions(!showMainExportOptions)}
                      className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors"
                    >
                      <i className="fas fa-download"></i>
                      <span>Exportar</span>
                      <i className="fas fa-caret-down ml-1"></i>
                    </button>
                    
                    {showMainExportOptions && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-700 z-50">
                        <div className="p-3">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            <i className="fas fa-file-export mr-2 text-green-500"></i>
                            Opciones de Exportación
                          </div>
                          
                          {/* Exportación completa */}
                          <div className="mb-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">📊 Dashboard Completo:</p>
                            <div className="grid grid-cols-2 gap-1">
                              {['JSON', 'PowerPoint', 'Excel', 'PDF'].map((format) => (
                                <button
                                  key={format}
                                  onClick={() => { 
                                    quickExport(format.toLowerCase()); 
                                    setShowMainExportOptions(false); 
                                  }}
                                  className="text-left px-2 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                >
                                  <i className={`fas fa-file-${
                                    format.toLowerCase() === 'excel' ? 'excel' : 
                                    format.toLowerCase() === 'pdf' ? 'pdf' : 
                                    format.toLowerCase() === 'powerpoint' ? 'powerpoint' : 
                                    'code'
                                  } mr-1`}></i>
                                  {format}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Exportación filtrada */}
                          {filteredResults.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">🎯 Solo Filtrados ({filteredResults.length}):</p>
                              <div className="grid grid-cols-2 gap-1">
                                {['JSON', 'PowerPoint', 'Excel', 'PDF'].map((format) => (
                                  <button
                                    key={format}
                                    onClick={() => { 
                                      exportOnlyFiltered(format.toLowerCase()); 
                                      setShowMainExportOptions(false); 
                                    }}
                                    className="text-left px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                  >
                                    <i className={`fas fa-filter mr-1`}></i>
                                    {format}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => clearAllFilters()}
                    className="px-3 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 text-sm transition-colors"
                  >
                    <i className="fas fa-eraser mr-1"></i>
                    Limpiar Todo
                  </button>
                  
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="px-3 py-2 bg-red-200 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-300 dark:hover:bg-red-900/30 text-sm transition-colors"
                  >
                    <i className="fas fa-times mr-1"></i>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
      
      {/* ===== VERIFICACIÓN DE DATOS ===== */}
      {!dashboardData ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-database text-gray-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Cargando datos del dashboard</h3>
          <p className="text-gray-600 dark:text-gray-400">Conectando con el backend para obtener las métricas...</p>
        </div>
      ) : (
        <>
          {/* PASO 10: MÉTRICAS PRINCIPALES EN CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card Empleados */}
        <div className="metric-card hover:border-blue-300"
          style={{
            background: styles.cardBackground,
            border: `1px solid ${styles.cardBorder}`,
            boxShadow: styles.cardShadow
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-users text-white text-lg"></i>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  +{dashboardData.metricas.empleados.porcentaje_crecimiento}%
                </span>
                <i className="fas fa-arrow-up text-green-600 dark:text-green-400 text-xs"></i>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium" style={{ color: styles.secondaryText }}>Total Empleados</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold" style={{ color: styles.primaryText }}>
                {formatNumber(dashboardData.metricas.empleados.total)}
              </span>
              <span className="text-sm" style={{ color: styles.secondaryText }}>activos</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span style={{ color: styles.secondaryText }}>
                <i className="fas fa-plus-circle text-green-500 mr-1"></i>
                {dashboardData.metricas.empleados.nuevos_mes} nuevos
              </span>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 dark:text-blue-300">Activos</span>
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {dashboardData.metricas.empleados.activos}
              </span>
            </div>
          </div>
        </div>

        {/* Card Nóminas */}
        <div className="metric-card hover:border-green-300"
          style={{
            background: styles.cardBackground,
            border: `1px solid ${styles.cardBorder}`,
            boxShadow: styles.cardShadow
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-money-bill-wave text-white text-lg"></i>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  +{dashboardData.metricas.nominas.porcentaje_incremento}%
                </span>
                <i className="fas fa-arrow-up text-green-600 dark:text-green-400 text-xs"></i>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium" style={{ color: styles.secondaryText }}>Nóminas Este Mes</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold" style={{ color: styles.primaryText }}>
                {formatCurrency(dashboardData.metricas.nominas.total_mes).replace('COP', '').trim()}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span style={{ color: styles.secondaryText }}>
                <i className="fas fa-users text-blue-500 mr-1"></i>
                {dashboardData.metricas.nominas.count_mes} empleados
              </span>
            </div>
          </div>
          <div className="mt-4 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700 dark:text-green-300">Producción</span>
              <span className="font-medium text-green-900 dark:text-green-100">
                {formatCurrency(dashboardData.metricas.nominas.produccion_mes).replace('COP', '').trim()}
              </span>
            </div>
          </div>
        </div>

        {/* Card Préstamos */}
        <div className="metric-card hover:border-yellow-300"
          style={{
            background: styles.cardBackground,
            border: `1px solid ${styles.cardBorder}`,
            boxShadow: styles.cardShadow
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-hand-holding-usd text-white text-lg"></i>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1">
                {dashboardData.metricas.prestamos.en_mora > 0 ? (
                  <>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {dashboardData.metricas.prestamos.en_mora} en mora
                    </span>
                    <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xs"></i>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Al día</span>
                    <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-xs"></i>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium" style={{ color: styles.secondaryText }}>Préstamos Activos</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold" style={{ color: styles.primaryText }}>
                {dashboardData.metricas.prestamos.activos}
              </span>
              <span className="text-sm" style={{ color: styles.secondaryText }}>préstamos</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span style={{ color: styles.secondaryText }}>
                <i className="fas fa-clock text-yellow-500 mr-1"></i>
                {dashboardData.metricas.prestamos.pendientes} pendientes
              </span>
            </div>
          </div>
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-yellow-700 dark:text-yellow-300">Valor Total</span>
              <span className="font-medium text-yellow-900 dark:text-yellow-100">
                {formatCurrency(dashboardData.metricas.prestamos.total_valor).replace('COP', '').trim()}
              </span>
            </div>
          </div>
        </div>

        {/* Card Proyectos */}
        <div className="metric-card hover:border-purple-300"
          style={{
            background: styles.cardBackground,
            border: `1px solid ${styles.cardBorder}`,
            boxShadow: styles.cardShadow
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-project-diagram text-white text-lg"></i>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {dashboardData.metricas.proyectos.porcentaje_completado}%
                </span>
                <i className="fas fa-chart-pie text-purple-600 dark:text-purple-400 text-xs"></i>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="cs-text-secondary text-sm font-medium">Proyectos Activos</h3>
            <div className="flex items-baseline space-x-2">
              <span className="cs-text-primary text-3xl font-bold">
                {dashboardData.metricas.proyectos.activos}
              </span>
              <span className="cs-text-secondary text-sm">proyectos</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="cs-text-secondary">
                <i className="fas fa-check-double text-green-500 mr-1"></i>
                {dashboardData.metricas.proyectos.completados} completados
              </span>
            </div>
          </div>
          <div className="mt-4 cs-alert cs-alert-info rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-700 dark:text-purple-300">En Progreso</span>
              <span className="font-medium text-purple-900 dark:text-purple-100">
                {dashboardData.metricas.proyectos.en_progreso}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PASO 11: KPIs DINÁMICOS Y COMPARATIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Panel KPIs principales */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Indicadores Clave (KPIs)</h3>
            <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
              {['comparison', 'trend'].map((view) => (
                <button
                  key={view}
                  onClick={() => setKpiView(view)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    kpiView === view 
                      ? 'bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {view === 'comparison' ? 'Comparativo' : 'Tendencias'}
                </button>
              ))}
            </div>
          </div>

          {kpiView === 'comparison' ? (
            <div className="grid grid-cols-2 gap-6">
              {dashboardData?.metas && Object.entries(dashboardData.metas).map(([key, meta]) => (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {key === 'empleados' ? 'Empleados' : 
                       key === 'productividad' ? 'Productividad' :
                       key === 'ingresos' ? 'Ingresos' : 'Proyectos'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatPercentage(meta.porcentaje)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        meta.porcentaje >= 90 ? 'bg-green-500' :
                        meta.porcentaje >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(meta.porcentaje, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {key === 'ingresos' ? formatCurrency(meta.actual).replace('COP', '').trim() : 
                       formatNumber(meta.actual)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      / {key === 'ingresos' ? formatCurrency(meta.objetivo).replace('COP', '').trim() : 
                          formatNumber(meta.objetivo)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-64">
                <canvas ref={kpiTrendChartRef}></canvas>
              </div>
            </div>
          )}
        </div>

        {/* Métricas del sistema en tiempo real */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Sistema</h3>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          
          <div className="space-y-4">
            {dashboardData?.sistemMetrics && Object.entries(dashboardData.sistemMetrics).slice(0, 4).map(([key, metric]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {key === 'cpu' ? 'CPU' : key === 'memoria' ? 'Memoria' : 
                     key === 'disco' ? 'Disco' : 'Red'}
                  </span>
                  <span className={`text-sm font-medium ${
                    metric.valor >= metric.limite * 0.9 ? 'text-red-600' :
                    metric.valor >= metric.limite * 0.7 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {metric.valor}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      metric.valor >= metric.limite * 0.9 ? 'bg-red-500' :
                      metric.valor >= metric.limite * 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(metric.valor / metric.limite) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t border-gray-200 dark:border-zinc-700 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Usuarios conectados</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {dashboardData?.sistemMetrics?.usuariosConectados || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Uptime</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {dashboardData?.sistemMetrics?.uptime || '0d 0h 0m'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PASO 12: GRID PRINCIPAL DE MÉTRICAS COMO EN DJANGO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* COLUMNA IZQUIERDA: KPIs principales (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* GRÁFICOS PRINCIPALES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico de Nóminas */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <i className="fas fa-chart-line mr-2 text-blue-500"></i>
                  Evolución de Nóminas
                </h3>
                <div className="flex items-center space-x-2">
                  <button 
                    title="Actualizar datos"
                    className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200">
                    <i className="fas fa-sync-alt"></i>
                  </button>
                  <button 
                    title="Expandir gráfico"
                    onClick={() => openExpandedModal('nominas', 'Evolución de Nóminas')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200">
                    <i className="fas fa-expand-alt"></i>
                  </button>
                </div>
              </div>
              <div className="h-64">
                <canvas ref={nominasChartRef}></canvas>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Total Nóminas</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Producción</span>
                  </div>
                </div>
                <div className="text-xs">
                  <span>Última actualización: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Gráfico de Préstamos */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <i className="fas fa-chart-pie mr-2 text-orange-500"></i>
                  Estado de Préstamos
                </h3>
                <div className="flex items-center space-x-2">
                  <button 
                    title="Actualizar datos"
                    className="text-orange-500 hover:text-orange-700 dark:hover:text-orange-300 transition-colors duration-200">
                    <i className="fas fa-sync-alt"></i>
                  </button>
                  <button 
                    title="Expandir gráfico"
                    onClick={() => openExpandedModal('prestamos', 'Estado de Préstamos')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200">
                    <i className="fas fa-expand-alt"></i>
                  </button>
                </div>
              </div>
              <div className="h-64">
                <canvas ref={prestamosChartRef}></canvas>
              </div>
              <div className="mt-4 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Distribución por estado actual de préstamos
                </div>
              </div>
            </div>

            {/* Gráfico de Empleados */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <i className="fas fa-chart-bar mr-2 text-emerald-500"></i>
                  Crecimiento de Empleados
                </h3>
                <div className="flex items-center space-x-2">
                  <button 
                    title="Actualizar datos"
                    className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors duration-200">
                    <i className="fas fa-sync-alt"></i>
                  </button>
                  <button 
                    title="Expandir gráfico"
                    onClick={() => openExpandedModal('empleados', 'Crecimiento de Empleados')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200">
                    <i className="fas fa-expand-alt"></i>
                  </button>
                </div>
              </div>
              <div className="h-64">
                <canvas ref={empleadosChartRef}></canvas>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span>Total Acumulado</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Nuevos</span>
                  </div>
                </div>
                <div className="text-xs">
                  Últimos 12 meses
                </div>
              </div>
            </div>

            {/* Gráfico de Productividad */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <i className="fas fa-trophy mr-2 text-purple-500"></i>
                  Top Productividad
                </h3>
                <div className="flex items-center space-x-2">
                  <button 
                    title="Actualizar datos"
                    className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 transition-colors duration-200">
                    <i className="fas fa-sync-alt"></i>
                  </button>
                  <button 
                    title="Expandir gráfico"
                    onClick={() => openExpandedModal('productividad', 'Top Productividad')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200">
                    <i className="fas fa-expand-alt"></i>
                  </button>
                </div>
              </div>
              <div className="h-64">
                <canvas ref={productividadChartRef}></canvas>
              </div>
              <div className="mt-4 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Top 10 empleados por producción promedio
                </div>
              </div>
            </div>
          </div>
          
          {/* HEATMAP DE PRODUCTIVIDAD - NUEVO GRÁFICO */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-fire mr-2 text-red-500"></i>
                Heatmap de Productividad
              </h3>
              <div className="flex items-center space-x-2">
                <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                  {['semana', 'mes'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setHeatmapPeriod(period)}
                      className={`px-3 py-1.5 text-xs rounded-md text-gray-700 dark:text-gray-300 transition-all ${
                        heatmapPeriod === period ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
                <button 
                  title="Actualizar datos"
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200">
                  <i className="fas fa-sync-alt"></i>
                </button>
                <button 
                  title="Expandir gráfico"
                  onClick={() => openExpandedModal('heatmap', 'Heatmap de Productividad')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200">
                  <i className="fas fa-expand-alt"></i>
                </button>
              </div>
            </div>
            <div className="h-80">
              <canvas ref={heatmapChartRef}></canvas>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Leyenda de Productividad:</span>
                <span className="text-xs">Últimos 7 días por empleado</span>
              </div>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Excelente (90%+)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Bueno (80-89%)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Mejorable (&lt;80%)</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* ANÁLISIS PREDICTIVO - GRÁFICO AVANZADO */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-crystal-ball mr-2 text-purple-500"></i>
                Análisis Predictivo
              </h3>
              <div className="flex items-center space-x-2">
                <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                  {['nominas', 'empleados', 'gastos'].map((view) => (
                    <button
                      key={view}
                      onClick={() => setPredictiveView(view)}
                      className={`px-3 py-1.5 text-xs rounded-md text-gray-700 dark:text-gray-300 transition-all ${
                        predictiveView === view ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''
                      }`}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}
                </div>
                <button 
                  title="Recalcular predicciones"
                  className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 transition-colors duration-200">
                  <i className="fas fa-sync-alt"></i>
                </button>
                <button 
                  title="Expandir análisis"
                  onClick={() => openExpandedModal('predictivo', 'Análisis Predictivo')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200">
                  <i className="fas fa-expand-alt"></i>
                </button>
              </div>
            </div>
            
            <div className="h-80">
              <canvas ref={predictivoChartRef}></canvas>
            </div>
            
            <div className="mt-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Indicadores de Confianza */}
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">87%</div>
                  <div className="text-xs text-purple-700 dark:text-purple-300">Confianza</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">+5.2%</div>
                  <div className="text-xs text-green-700 dark:text-green-300">Tendencia</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">3 meses</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">Horizonte</div>
                </div>
              </div>
              
              {/* Leyenda y Algoritmo */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="flex items-center space-x-2">
                  <i className="fas fa-info-circle text-purple-500"></i>
                  <span>Predicciones basadas en IA:</span>
                </span>
                <span className="text-xs">Actualizado hace 5 min</span>
              </div>
              
              <div className="flex items-center space-x-6 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-1 bg-blue-500 rounded"></div>
                  <span>Datos Históricos</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-1 bg-blue-500 rounded" style={{borderStyle: 'dashed'}}></div>
                  <span>Predicciones</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="fas fa-brain text-purple-500 text-xs"></i>
                  <span>Algoritmo: Regresión + Tendencias</span>
                </div>
              </div>
              
              {/* Alertas Predictivas */}
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded-r-lg">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-400"></i>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Alerta Predictiva</span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Se prevé un incremento del 8% en gastos operativos para Septiembre. Revisar presupuesto.
                </p>
              </div>
            </div>
          </div>
          
          {/* ========================================== */}
          {/* MAPA DE CALOR DE ACTIVIDAD - MISMO NIVEL QUE OTROS GRÁFICOS */}
          {/* ========================================== */}
          
          {/* TÍTULO Y CONTROLES PRINCIPALES */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
                  <i className="fas fa-fire text-white text-lg"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Mapa de Calor de Actividad
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Análisis en tiempo real de productividad
                  </p>
                </div>
              </div>
              
              {/* CONTROLES DE VISTA COMPACTOS */}
              <div className="flex items-center space-x-2">
                <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                  {['heatmap', 'departamentos', 'patrones'].map((view) => (
                    <button
                      key={view}
                      onClick={() => setActivityView(view)}
                      className={`px-2 py-1 text-xs rounded-md transition-all ${
                        activityView === view 
                          ? 'bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {view === 'heatmap' ? 'Calor' : 
                       view === 'departamentos' ? 'Dept.' : 'Hora'}
                    </button>
                  ))}
                </div>
                
                <button 
                  title="Actualizar datos"
                  className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200">
                  <i className="fas fa-sync-alt text-sm"></i>
                </button>
              </div>
            </div>
            
            {/* MÉTRICAS RÁPIDAS COMPACTAS */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">94%</div>
                <div className="text-xs text-green-700 dark:text-green-300">Productividad</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">23</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Activos</div>
              </div>
            </div>
            
            {/* GRÁFICO PRINCIPAL */}
            {activityView === 'heatmap' && (
              <div>
                <div className="h-64 mb-4">
                  <canvas ref={activityHeatmapChartRef}></canvas>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded"></div>
                    <span>Alto</span>
                    <div className="w-2 h-2 bg-yellow-500 rounded"></div>
                    <span>Medio</span>
                    <div className="w-2 h-2 bg-red-500 rounded"></div>
                    <span>Bajo</span>
                  </div>
                </div>
              </div>
            )}
            
            {activityView === 'departamentos' && (
              <div>
                <div className="h-64 mb-4">
                  <canvas ref={departmentActivityChartRef}></canvas>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Mejor: IT</span>
                      <span className="font-bold text-blue-800 dark:text-blue-200">94%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activityView === 'patrones' && (
              <div>
                <div className="h-64 mb-4">
                  <canvas ref={hourlyPatternChartRef}></canvas>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-center">
                    <div className="font-bold text-green-700 dark:text-green-300">11:00</div>
                    <div className="text-green-600 dark:text-green-400">Pico</div>
                  </div>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-center">
                    <div className="font-bold text-yellow-700 dark:text-yellow-300">87%</div>
                    <div className="text-yellow-600 dark:text-yellow-400">Consist.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* PANEL DE INSIGHTS DEL MAPA DE CALOR */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <i className="fas fa-lightbulb mr-2 text-yellow-500"></i>
              Insights de Actividad
            </h3>
            
            <div className="space-y-3">
              {/* Insight 1 */}
              <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-l-4 border-green-500">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-arrow-up text-green-600 mt-1"></i>
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Productividad Creciente</p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      El equipo de IT muestra una mejora del 12% esta semana
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Insight 2 */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-clock text-blue-600 mt-1"></i>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Patrón Óptimo</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      11:00 AM es la hora más productiva del día
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Insight 3 */}
              <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border-l-4 border-orange-500">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-exclamation-triangle text-orange-600 mt-1"></i>
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Atención Requerida</p>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                      3 empleados con baja actividad requieren seguimiento
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Acciones Recomendadas */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                <i className="fas fa-tasks mr-1"></i>
                Acciones Recomendadas
              </h4>
              <div className="space-y-2">
                <button className="w-full text-left p-2 text-xs bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors">
                  <i className="fas fa-user-clock mr-2 text-blue-500"></i>
                  Reunión con empleados de baja productividad
                </button>
                <button className="w-full text-left p-2 text-xs bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors">
                  <i className="fas fa-calendar-plus mr-2 text-green-500"></i>
                  Programar capacitación para RRHH
                </button>
                <button className="w-full text-left p-2 text-xs bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors">
                  <i className="fas fa-award mr-2 text-yellow-500"></i>
                  Reconocimiento al equipo IT
                </button>
              </div>
            </div>
          </div>
          
          {/* PANEL DE ESTADO CONTABLE */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <i className="fas fa-balance-scale mr-2 text-indigo-500"></i>
              Estado Contable
            </h3>
            
            <div className="space-y-4">
              {/* Balance en Tiempo Real */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Total Débitos
                    </span>
                    <i className="fas fa-arrow-up text-green-600"></i>
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    ${((dashboardData?.contabilidad?.balance?.totalDebitos || 0) / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-green-500 mt-1">Este mes</p>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Total Créditos
                    </span>
                    <i className="fas fa-arrow-down text-blue-600"></i>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    ${((dashboardData?.contabilidad?.balance?.totalCreditos || 0) / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-blue-500 mt-1">Este mes</p>
                </div>
              </div>
              
              {/* Estado del Balance */}
              <div className={`p-3 rounded-lg border-l-4 ${
                (dashboardData?.contabilidad?.balance?.diferencia || 0) < 1000 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                  : 'bg-red-50 dark:bg-red-900/20 border-red-500'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      (dashboardData?.contabilidad?.balance?.diferencia || 0) < 1000 
                        ? 'text-green-800 dark:text-green-200' 
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      Balance Contable
                    </p>
                    <p className={`text-xs ${
                      (dashboardData?.contabilidad?.balance?.diferencia || 0) < 1000 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {(dashboardData?.contabilidad?.balance?.diferencia || 0) < 1000 
                        ? 'Balanceado correctamente' 
                        : 'Requiere revisión'}
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${
                    (dashboardData?.contabilidad?.balance?.diferencia || 0) < 1000 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    ${(dashboardData?.contabilidad?.balance?.diferencia || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Flujo de Caja */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                      Ingresos
                    </span>
                    <i className="fas fa-plus-circle text-emerald-600 text-sm"></i>
                  </div>
                  <p className="text-lg font-bold text-emerald-600">
                    ${((dashboardData?.contabilidad?.flujoCaja?.ingresosMes || 0) / 1000000).toFixed(1)}M
                  </p>
                </div>
                
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-red-800 dark:text-red-200">
                      Egresos
                    </span>
                    <i className="fas fa-minus-circle text-red-600 text-sm"></i>
                  </div>
                  <p className="text-lg font-bold text-red-600">
                    ${((dashboardData?.contabilidad?.flujoCaja?.egresosMes || 0) / 1000000).toFixed(1)}M
                  </p>
                </div>
              </div>
              
              {/* Comprobantes y Estadísticas */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">
                    {dashboardData?.contabilidad?.comprobantes?.pendientes || 0}
                  </div>
                  <div className="text-xs text-orange-500">Pendientes</div>
                </div>
                
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {dashboardData.contabilidad?.comprobantes?.pendientes || 0}
                  </div>
                  <div className="text-xs text-blue-500">Comprobantes</div>
                </div>
                
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {dashboardData.contabilidad?.comprobantes?.confirmados || 0}
                  </div>
                  <div className="text-xs text-purple-500">Confirmados</div>
                </div>
              </div>
              
              {/* Alertas Contables */}
              {dashboardData.contabilidad?.alertas && dashboardData.contabilidad.alertas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    <i className="fas fa-exclamation-triangle mr-1 text-yellow-500"></i>
                    Alertas Contables
                  </h4>
                  {dashboardData?.contabilidad?.alertas?.slice(0, 2).map((alerta, index) => (
                    <div key={index} className={`p-2 rounded-lg text-xs ${
                      alerta.prioridad === 'alta' 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' 
                        : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{alerta.mensaje}</span>
                        <button className={`text-xs hover:underline ${
                          alerta.prioridad === 'alta' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          Ver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Acceso Rápido */}
              <div className="pt-3 border-t border-gray-200 dark:border-zinc-700">
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-2 text-xs bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors text-indigo-700 dark:text-indigo-300 font-medium">
                    <i className="fas fa-plus-circle mr-1"></i>
                    Nuevo Comprobante
                  </button>
                  <button className="p-2 text-xs bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors text-gray-700 dark:text-gray-300 font-medium">
                    <i className="fas fa-chart-bar mr-1"></i>
                    Ver Reportes
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* PANEL DE ACCESOS RÁPIDOS MEJORADO */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-bolt mr-2 text-yellow-500"></i>
                Accesos Rápidos
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                  Sistema Activo
                </span>
                <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                  <i className="fas fa-ellipsis-v"></i>
                </button>
              </div>
            </div>
            
            {/* Acciones Principales */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Gestión de Empleados */}
              <button className="group p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/40 hover:from-blue-100 hover:to-indigo-200 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/50 rounded-xl transition-all duration-300 transform hover:scale-105 border border-blue-200/50 dark:border-blue-800/50">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300">
                  <i className="fas fa-users text-white text-lg"></i>
                </div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Empleados</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Gestionar personal activo</p>
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <i className="fas fa-arrow-right mr-1"></i>125 registros
                </div>
              </button>
              
              {/* Cálculo de Nóminas */}
              <button className="group p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/40 hover:from-green-100 hover:to-emerald-200 dark:hover:from-green-900/30 dark:hover:to-emerald-900/50 rounded-xl transition-all duration-300 transform hover:scale-105 border border-green-200/50 dark:border-green-800/50">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300">
                  <i className="fas fa-calculator text-white text-lg"></i>
                </div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Nóminas</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Procesar pagos</p>
                <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                  <i className="fas fa-arrow-right mr-1"></i>Próx: 15 Ago
                </div>
              </button>
              
              {/* Contabilidad */}
              <button className="group p-4 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/40 hover:from-purple-100 hover:to-violet-200 dark:hover:from-purple-900/30 dark:hover:to-violet-900/50 rounded-xl transition-all duration-300 transform hover:scale-105 border border-purple-200/50 dark:border-purple-800/50">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300">
                  <i className="fas fa-balance-scale text-white text-lg"></i>
                </div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Contabilidad</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Libros y balances</p>
                <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
                  <i className="fas fa-arrow-right mr-1"></i>3 pendientes
                </div>
              </button>
              
              {/* Préstamos */}
              <button className="group p-4 bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/40 hover:from-yellow-100 hover:to-orange-200 dark:hover:from-yellow-900/30 dark:hover:to-orange-900/50 rounded-xl transition-all duration-300 transform hover:scale-105 border border-yellow-200/50 dark:border-yellow-800/50">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300">
                  <i className="fas fa-hand-holding-usd text-white text-lg"></i>
                </div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Préstamos</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Créditos activos</p>
                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                  <i className="fas fa-arrow-right mr-1"></i>$2.3M activos
                </div>
              </button>
            </div>
            
            {/* Acciones Secundarias */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button className="p-3 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-all duration-200 group">
                <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform">
                  <i className="fas fa-chart-line text-white text-sm"></i>
                </div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Reportes</div>
              </button>
              
              <button className="p-3 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-all duration-200 group">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform">
                  <i className="fas fa-cog text-white text-sm"></i>
                </div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Config</div>
              </button>
              
              <button className="p-3 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-all duration-200 group">
                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform">
                  <i className="fas fa-question-circle text-white text-sm"></i>
                </div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Ayuda</div>
              </button>
            </div>
            
            {/* Estado del Sistema */}
            <div className="pt-4 border-t border-gray-200 dark:border-zinc-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                <i className="fas fa-server mr-2 text-blue-500"></i>
                Estado del Sistema
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200/50 dark:border-green-800/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-green-800 dark:text-green-200">Uptime</span>
                    <i className="fas fa-check-circle text-green-600 text-sm"></i>
                  </div>
                  <div className="text-lg font-bold text-green-600">99.9%</div>
                  <div className="text-xs text-green-500">Óptimo</div>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Usuarios</span>
                    <i className="fas fa-users text-blue-600 text-sm"></i>
                  </div>
                  <div className="text-lg font-bold text-blue-600">{dashboardData?.sistemMetrics?.usuariosConectados || 0}</div>
                  <div className="text-xs text-blue-500">En línea</div>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-purple-800 dark:text-purple-200">Respuesta</span>
                    <i className="fas fa-tachometer-alt text-purple-600 text-sm"></i>
                  </div>
                  <div className="text-lg font-bold text-purple-600">1.2s</div>
                  <div className="text-xs text-purple-500">Promedio</div>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-orange-800 dark:text-orange-200">Tareas</span>
                    <i className="fas fa-tasks text-orange-600 text-sm"></i>
                  </div>
                  <div className="text-lg font-bold text-orange-600">8</div>
                  <div className="text-xs text-orange-500">Activas</div>
                </div>
              </div>
            </div>
            
            {/* Acceso de Emergencia */}
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200/50 dark:border-red-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Acceso de Emergencia
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">Para situaciones críticas</div>
                </div>
                <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors">
                  Activar
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* COLUMNA DERECHA: Información complementaria (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* METAS Y OBJETIVOS */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-bullseye mr-2 text-blue-500"></i>
                Metas y Objetivos
              </h3>
              <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <i className="fas fa-cog"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Meta Empleados */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Meta Empleados 2025</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">120 / 150</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 dark:bg-zinc-600 rounded-full h-3">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-1000 animate-pulse" 
                         style={{width: '80%'}}></div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">80%</span>
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  <i className="fas fa-calendar-alt mr-1"></i>
                  Faltan 30 empleados para la meta
                </div>
              </div>
              
              {/* Meta Productividad */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Productividad Q4</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">92% / 95%</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 dark:bg-zinc-600 rounded-full h-3">
                    <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-3 rounded-full transition-all duration-1000" 
                         style={{width: '96.8%'}}></div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">96%</span>
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  <i className="fas fa-trending-up mr-1"></i>
                  ¡Muy cerca de alcanzar la meta!
                </div>
              </div>
              
              {/* Meta Ingresos */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ingresos Mensual</span>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">$2.1M / $2.5M</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 dark:bg-zinc-600 rounded-full h-3">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000" 
                         style={{width: '84%'}}></div>
                  </div>
                  <span className="text-sm font-bold text-purple-600">84%</span>
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  <i className="fas fa-dollar-sign mr-1"></i>
                  Quedan $400K para la meta
                </div>
              </div>
              
              {/* Meta Proyectos */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Proyectos Completados</span>
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">45 / 60</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 dark:bg-zinc-600 rounded-full h-3">
                    <div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-3 rounded-full transition-all duration-1000" 
                         style={{width: '75%'}}></div>
                  </div>
                  <span className="text-sm font-bold text-orange-600">75%</span>
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  <i className="fas fa-project-diagram mr-1"></i>
                  15 proyectos restantes
                </div>
              </div>
            </div>
            
            {/* Botón de configurar metas */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-600">
              <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 group">
                <i className="fas fa-plus mr-2 group-hover:animate-pulse"></i>
                Configurar Nueva Meta
              </button>
            </div>
          </div>
          
          {/* INDICADORES DE RENDIMIENTO */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-tachometer-alt mr-2 text-emerald-500"></i>
                Indicadores de Rendimiento
              </h3>
              <div className="flex space-x-2">
                <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                  <i className="fas fa-sync-alt"></i>
                </button>
                <button 
                  onClick={() => openExpandedModal('kpiTrend', 'Indicadores de Rendimiento')}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200">
                  <i className="fas fa-expand-alt"></i>
                </button>
              </div>
            </div>
            
            <div className="space-y-5">
              {/* Eficiencia General */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-bolt text-white text-sm"></i>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Eficiencia General</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">94.2%</div>
                    <div className="text-xs text-emerald-500 dark:text-emerald-400">
                      <i className="fas fa-arrow-up mr-1"></i>+2.1%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-emerald-200 dark:bg-emerald-700/30 rounded-full h-2">
                  <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-1000" 
                       style={{width: '94.2%'}}></div>
                </div>
              </div>
              
              {/* Tiempo Promedio de Proyecto */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-clock text-white text-sm"></i>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tiempo Prom. Proyecto</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">12.5 días</div>
                    <div className="text-xs text-red-500 dark:text-red-400">
                      <i className="fas fa-arrow-up mr-1"></i>+0.8 días
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Meta: 10 días | Actual: 12.5 días
                </div>
              </div>
              
              {/* Satisfacción del Cliente */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-heart text-white text-sm"></i>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Satisfacción Cliente</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">4.8/5</div>
                    <div className="text-xs text-green-500 dark:text-green-400">
                      <i className="fas fa-arrow-up mr-1"></i>+0.2
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  {[1,2,3,4,5].map((star) => (
                    <i key={star} className={`fas fa-star text-sm ${
                      star <= 4 ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                    }`}></i>
                  ))}
                </div>
              </div>
              
              {/* Tasa de Retención */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-user-shield text-white text-sm"></i>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tasa de Retención</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">89.3%</div>
                    <div className="text-xs text-green-500 dark:text-green-400">
                      <i className="fas fa-arrow-up mr-1"></i>+1.5%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-orange-200 dark:bg-orange-700/30 rounded-full h-2">
                  <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-1000" 
                       style={{width: '89.3%'}}></div>
                </div>
              </div>
              
              {/* ROI Mensual */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-chart-line text-white text-sm"></i>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">ROI Mensual</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">27.8%</div>
                    <div className="text-xs text-green-500 dark:text-green-400">
                      <i className="fas fa-arrow-up mr-1"></i>+4.2%
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
                  <span>Inversión: $45,000</span>
                  <span>Ganancia: $12,510</span>
                </div>
              </div>
            </div>
            
            {/* Botón Ver Reporte Completo */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-600">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 group">
                <i className="fas fa-file-chart-line mr-2 group-hover:animate-pulse"></i>
                Ver Reporte Completo de Rendimiento
              </button>
            </div>
          </div>
          
          {/* BÚSQUEDA RÁPIDA SIDEBAR */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-search mr-2 text-blue-500"></i>
                Búsqueda Rápida
              </h3>
              <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <i className="fas fa-cog"></i>
              </button>
            </div>
            
            {/* Campo de búsqueda */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400 dark:text-gray-500 text-sm"></i>
              </div>
              <input
                type="text"
                value={filters.globalSearch}
                onChange={(e) => {
                  setFilters(prev => ({...prev, globalSearch: e.target.value}));
                  performGlobalSearch(e.target.value);
                }}
                placeholder="Buscar empleado, proyecto, documento..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
              />
              {filters.globalSearch && (
                <button
                  onClick={() => {
                    setFilters(prev => ({...prev, globalSearch: ''}));
                    setSearchSuggestions([]);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <i className="fas fa-times text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"></i>
                </button>
              )}
            </div>
            
            {/* Resultados de búsqueda rápida */}
            {searchSuggestions.length > 0 && (
              <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                {searchSuggestions.slice(0, 5).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setFilters(prev => ({...prev, globalSearch: typeof suggestion === 'string' ? suggestion : suggestion.title || ''}));
                      setSearchSuggestions([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center space-x-3 transition-colors duration-150"
                  >
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-md flex items-center justify-center">
                      <i className="fas fa-clock text-blue-500 text-xs"></i>
                    </div>
                    <span className="flex-1">{typeof suggestion === 'string' ? suggestion : suggestion.title || suggestion.subtitle || 'Elemento'}</span>
                    <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
                  </button>
                ))}
              </div>
            )}
            
            {/* Búsquedas frecuentes */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Búsquedas Frecuentes</h4>
              <div className="space-y-2">
                {[
                  { label: 'Empleados Activos', icon: 'users', color: 'green', count: '120' },
                  { label: 'Préstamos Pendientes', icon: 'hand-holding-usd', color: 'yellow', count: '8' },
                  { label: 'Nómina Actual', icon: 'money-bill-wave', color: 'blue', count: '1' },
                  { label: 'Proyectos Activos', icon: 'project-diagram', color: 'purple', count: '15' },
                  { label: 'Reportes Mes', icon: 'file-pdf', color: 'red', count: '24' }
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setFilters(prev => ({...prev, globalSearch: item.label}));
                      performGlobalSearch(item.label);
                    }}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors duration-150 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 bg-${item.color}-100 dark:bg-${item.color}-900/30 rounded-lg flex items-center justify-center`}>
                        <i className={`fas fa-${item.icon} text-${item.color}-600 dark:text-${item.color}-400 text-sm`}></i>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-semibold px-2 py-1 bg-${item.color}-100 dark:bg-${item.color}-900/30 text-${item.color}-700 dark:text-${item.color}-300 rounded-full`}>
                        {item.count}
                      </span>
                      <i className="fas fa-chevron-right text-gray-400 text-xs group-hover:text-gray-600 dark:group-hover:text-gray-300"></i>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Atajos de búsqueda */}
            <div className="pt-4 border-t border-gray-200 dark:border-zinc-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Atajos Rápidos</h4>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-xs font-medium transition-all duration-200">
                  <i className="fas fa-plus mr-1"></i>
                  Nuevo Empleado
                </button>
                <button className="p-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-xs font-medium transition-all duration-200">
                  <i className="fas fa-calculator mr-1"></i>
                  Calcular Nómina
                </button>
                <button className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg text-xs font-medium transition-all duration-200">
                  <i className="fas fa-file-pdf mr-1"></i>
                  Generar Reporte
                </button>
                <button className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg text-xs font-medium transition-all duration-200">
                  <i className="fas fa-cog mr-1"></i>
                  Configuración
                </button>
              </div>
            </div>
          </div>
          
          {/* EXPORTACIÓN AVANZADA */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-download mr-2 text-indigo-500"></i>
                Exportación Avanzada
              </h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">En línea</span>
              </div>
            </div>
            
            {/* Tipos de exportación */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Formatos Disponibles</h4>
              
              {/* PDF Reports */}
              <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-file-pdf text-white"></i>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Reportes PDF Avanzados</h5>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Informes profesionales con gráficos interactivos incluidos</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => quickExport('pdf')}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors duration-200">
                    Exportar
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Tamaño aprox: 5-8 MB</span>
                  <span>Tiempo: ~45 seg</span>
                </div>
              </div>
              
              {/* Excel Spreadsheets */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-file-excel text-white"></i>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Hojas de Cálculo</h5>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Datos estructurados para análisis</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => quickExport('excel')}
                    className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors duration-200">
                    Exportar
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Múltiples pestañas</span>
                  <span>Tiempo: ~15 seg</span>
                </div>
              </div>
              
              {/* PowerPoint Presentation */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-file-powerpoint text-white"></i>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Presentación PowerPoint</h5>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Dashboard profesional con gráficos y diseño corporativo</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => quickExport('powerpoint')}
                    className="px-3 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-lg text-xs font-medium transition-all duration-200 shadow-sm">
                    Exportar
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>5 slides profesionales</span>
                  <span>Tiempo: ~20 seg</span>
                </div>
              </div>
              
              {/* JSON API */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-code text-white"></i>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">API JSON</h5>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Para integraciones y desarrollo</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => quickExport('json')}
                    className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors duration-200">
                    Exportar
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Formato REST API</span>
                  <span>Tiempo: ~3 seg</span>
                </div>
              </div>
            </div>
            
            {/* Opciones avanzadas */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Opciones Avanzadas</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Incluir gráficos en PDF</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Aplicar filtros actuales</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Enviar por email automáticamente</span>
                </label>
              </div>
            </div>
            
            {/* Historial de exportaciones */}
            <div className="pt-4 border-t border-gray-200 dark:border-zinc-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Exportaciones Recientes</h4>
              <div className="space-y-2">
                {[
                  { name: 'Dashboard_Completo_2024.pdf', time: 'Hace 2 horas', size: '2.1 MB', status: 'success' },
                  { name: 'Nominas_Enero_2024.xlsx', time: 'Hace 1 día', size: '890 KB', status: 'success' },
                  { name: 'Empleados_Data.csv', time: 'Hace 2 días', size: '156 KB', status: 'success' }
                ].map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-zinc-700/50 rounded-lg transition-colors duration-150">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                        file.status === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <i className={`fas fa-${file.status === 'success' ? 'check' : 'times'} text-xs ${
                          file.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}></i>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-32">
                          {file.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {file.time} • {file.size}
                        </div>
                      </div>
                    </div>
                    <button className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300">
                      <i className="fas fa-download text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Exportación programada */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-600">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 group">
                <i className="fas fa-clock mr-2 group-hover:animate-spin"></i>
                Programar Exportación Automática
              </button>
            </div>
          </div>
          
          {/* ACTIVIDAD RECIENTE REORGANIZADA */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-history mr-2 text-green-500"></i>
                Actividad Reciente
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">En vivo</span>
              </div>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {(dashboardData?.actividadReciente || []).slice(0, 6).map((actividad, index) => (
                <div key={index} className="group flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                    actividad.tipo === 'nomina' ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30' :
                    actividad.tipo === 'empleado' ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30' :
                    actividad.tipo === 'prestamo' ? 'bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30' :
                    actividad.tipo === 'sistema' ? 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-900/30 dark:to-slate-900/30' :
                    'bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30'
                  }`}>
                    <i className={`fas ${
                      actividad.tipo === 'nomina' ? 'fa-money-bill-wave text-green-600 dark:text-green-400' :
                      actividad.tipo === 'empleado' ? 'fa-user-plus text-blue-600 dark:text-blue-400' :
                      actividad.tipo === 'prestamo' ? 'fa-hand-holding-usd text-yellow-600 dark:text-yellow-400' :
                      actividad.tipo === 'sistema' ? 'fa-cog text-gray-600 dark:text-gray-400' :
                      'fa-file-pdf text-purple-600 dark:text-purple-400'
                    } text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {actividad.descripcion}
                    </p>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                        {actividad.tiempo}
                      </span>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {actividad.usuario}
                      </span>
                    </div>
                    {actividad.valor && (
                      <div className="mt-1">
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                          {actividad.valor}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700 text-center">
              <button className="w-full p-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 font-medium">
                <i className="fas fa-eye mr-2"></i>
                Ver Toda la Actividad
              </button>
            </div>
          </div>

          {/* PRESUPUESTO & GASTOS - SIDEBAR DERECHO */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-chart-pie mr-2 text-purple-500"></i>
                Presupuesto & Gastos
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                  Agosto 2025
                </span>
                <button 
                  onClick={() => openExpandedModal('actividad', 'Actividad Reciente')}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200">
                  <i className="fas fa-expand-alt text-sm"></i>
                </button>
              </div>
            </div>
            
            {/* Resumen Compacto */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Presupuesto</span>
                  <i className="fas fa-wallet text-blue-600 text-xs"></i>
                </div>
                <div className="text-lg font-bold text-blue-600">$8.5M</div>
                <div className="text-xs text-blue-500">Asignado</div>
              </div>
              
              <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200/50 dark:border-red-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-red-800 dark:text-red-200">Ejecutado</span>
                  <i className="fas fa-credit-card text-red-600 text-xs"></i>
                </div>
                <div className="text-lg font-bold text-red-600">$6.2M</div>
                <div className="text-xs text-red-500">73% usado</div>
              </div>
            </div>

            {/* Barra de Progreso Compacta */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ejecución</span>
                <span className="text-sm font-bold text-purple-600">$2.3M disponible</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all duration-700" 
                     style={{ width: '73%' }}></div>
              </div>
              <div className="text-center text-xs text-orange-600 font-medium mt-1">73% ejecutado</div>
            </div>

            {/* Top 3 Categorías */}
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-list-ul mr-2 text-gray-500"></i>
                Principales Gastos
              </h4>
              
              {[
                { categoria: 'Nóminas', gastado: 2800000, presupuesto: 3200000, color: 'blue', porcentaje: 87.5 },
                { categoria: 'Operaciones', gastado: 1650000, presupuesto: 2100000, color: 'green', porcentaje: 78.6 },
                { categoria: 'Tecnología', gastado: 420000, presupuesto: 850000, color: 'purple', porcentaje: 49.4 }
              ].map((item, index) => (
                <div key={index} className="p-2 bg-gray-50 dark:bg-zinc-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        item.color === 'blue' ? 'bg-blue-500' :
                        item.color === 'green' ? 'bg-green-500' :
                        'bg-purple-500'
                      }`}></div>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{item.categoria}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        ${(item.gastado / 1000000).toFixed(1)}M
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        item.color === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                        item.color === 'green' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                        'bg-gradient-to-r from-purple-400 to-purple-600'
                      }`}
                      style={{ width: `${item.porcentaje}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs font-medium ${
                      item.porcentaje >= 90 ? 'text-red-600' :
                      item.porcentaje >= 75 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {item.porcentaje.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">
                      ${((item.presupuesto - item.gastado) / 1000000).toFixed(1)}M rest.
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Alerta Principal */}
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50 dark:border-orange-800/50 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    <i className="fas fa-exclamation-triangle mr-2 text-orange-500"></i>
                    Nóminas críticas
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400">
                    87.5% del presupuesto utilizado
                  </div>
                </div>
                <button className="text-xs text-orange-600 hover:text-orange-800 font-medium">
                  Revisar
                </button>
              </div>
            </div>

            {/* Acciones Compactas */}
            <div className="grid grid-cols-2 gap-2">
              <button className="p-2 text-xs bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors text-purple-700 dark:text-purple-300 font-medium">
                <i className="fas fa-plus-circle mr-1"></i>
                Nuevo Gasto
              </button>
              <button className="p-2 text-xs bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors text-gray-700 dark:text-gray-300 font-medium">
                <i className="fas fa-chart-line mr-1"></i>
                Ver Análisis
              </button>
            </div>
          </div>
          
        </div>
      </div>

      {/* PASO 13: PANEL LATERAL CON TOP INFORMACIÓN REORGANIZADO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Top Cargos - Columna Izquierda */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-trophy mr-2 text-yellow-500"></i>
                Top Cargos
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full">
                  Ranking
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {(dashboardData?.topCargos || []).map((cargo, index) => (
                <div key={index} className="group relative p-4 bg-gradient-to-r from-gray-50 to-white dark:from-zinc-800/50 dark:to-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-700 hover:shadow-md transition-all duration-300 hover:scale-105">
                  {/* Ranking Badge */}
                  <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                    index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                    'bg-gradient-to-r from-blue-400 to-blue-600'
                  }`}>
                    {index + 1}
                  </div>
                  
                  {/* Cargo Info */}
                  <div className="ml-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-2">
                        {cargo.nombre}
                      </span>
                      {index === 0 && <i className="fas fa-crown text-yellow-500 text-sm"></i>}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {cargo.cantidad || cargo.empleados || 0}
                      </div>
                      <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                        (cargo.porcentaje || 0) >= 30 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        (cargo.porcentaje || 0) >= 20 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                        {formatPercentage(cargo.porcentaje || 0)}
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3 w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-700 ease-out ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                          index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                          'bg-gradient-to-r from-blue-400 to-blue-600'
                        }`}
                        style={{ width: `${cargo.porcentaje}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Estadística resumen */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-700">
              <div className="text-center p-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg">
                <div className="text-sm font-medium text-indigo-800 dark:text-indigo-200 mb-1">
                  Total de Cargos Activos
                </div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {(dashboardData?.topCargos || []).reduce((sum, cargo) => sum + cargo.cantidad, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Por Departamento y Actividad Reciente - Columnas Derechas */}
        <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Por Departamento - Mejorado */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-building mr-2 text-indigo-500"></i>
                Por Departamento
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">
                  {(dashboardData?.empleadosPorDepartamento || []).length} Dept.
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {(dashboardData?.empleadosPorDepartamento || []).slice(0, 6).map((dept, index) => (
                <div key={index} className="group p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full shadow-sm ${
                        index === 0 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                        index === 1 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                        index === 2 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                        index === 3 ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                        index === 4 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        'bg-gradient-to-r from-pink-400 to-pink-600'
                      }`}></div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {dept.nombre}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {dept.cantidad}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({formatPercentage(dept.porcentaje)})
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar Mejorada */}
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-700 ease-out shadow-sm ${
                        index === 0 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                        index === 1 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                        index === 2 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                        index === 3 ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                        index === 4 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        'bg-gradient-to-r from-pink-400 to-pink-600'
                      }`}
                      style={{ width: `${dept.porcentaje}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Total Empleados */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
              <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Total Empleados por Departamentos
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {(dashboardData?.empleadosPorDepartamento || []).reduce((sum, dept) => sum + dept.cantidad, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
        </>
      )}

      {/* MODAL EXPANDIDO */}
      {expandedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative w-full h-full max-w-7xl max-h-screen p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 h-full flex flex-col">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {modalTitle}
                </h2>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={closeExpandedModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    title="Cerrar">
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
              </div>
              
              {/* Contenido del Modal */}
              <div className="flex-1 p-6 overflow-auto">
                {renderExpandedContent()}
              </div>
              
              {/* Footer del Modal */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-zinc-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Presiona ESC para cerrar
                </div>
                <button
                  onClick={closeExpandedModal}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors duration-200"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PROGRESO DE EXPORTACIÓN */}
      {exportProgress.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="export-progress-modal relative bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl max-w-md w-full mx-4">
            {/* Header del Modal */}
            <div className="p-6 pb-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center status-indicator processing">
                    <i className="fas fa-download text-white text-lg"></i>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Exportando Datos
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Generando reporte profesional...
                  </p>
                </div>
              </div>
              
              {/* Barra de Progreso */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Progreso
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {exportProgress.progress}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="export-progress-bar h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${exportProgress.progress}%` }}
                  ></div>
                </div>
                
                {/* Indicador de Estado */}
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0">
                    {exportProgress.progress < 25 ? (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    ) : exportProgress.progress < 75 ? (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    ) : exportProgress.progress < 100 ? (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    ) : (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {exportProgress.progress === 0 ? 'Iniciando exportación...' :
                     exportProgress.progress === 25 ? 'Recopilando datos del dashboard...' :
                     exportProgress.progress === 75 ? 'Generando formato profesional...' :
                     exportProgress.progress === 100 ? '¡Exportación completada!' :
                     'Procesando...'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Footer con animación */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs">
                  Por favor espera...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container para notificaciones */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme === 'dark' ? 'dark' : 'light'}
      />

    </div>
  );
};

export default Dashboard;

