/**
 * DASHBOARD GLOBAL FUNCTIONS - CorteSec Enterprise
 * Funciones globales necesarias para Alpine.js
 */

// Función global para crear el store del dashboard
window.dashboardStore = function() {
    return window.createDashboardStore ? window.createDashboardStore() : {
        // Fallback básico si el store no se carga
        loading: false,
        metricas: {
            empleados: { total: 0, activos: 0, nuevos_mes: 0, crecimiento: 0 },
            nominas: { total_mes: 0, produccion_mes: 0, count_mes: 0 },
            prestamos: { activos: 0, pendientes: 0, en_mora: 0 },
            proyectos: { activos: 0, completados: 0, este_mes: 0 },
            rendimiento: { eficiencia: 85, ratio_prestamos: 15 }
        },
        sistemMetrics: {
            usuarios_conectados: 1,
            actividad_sistema: 0,
            cpu_porcentaje: 0,
            memoria_usado_gb: 0,
            memoria_porcentaje: 0,
            disco_porcentaje: 0,
            conexiones_activas: 0,
            memoria_total_gb: 8,
            sistema_activo: true,
            timestamp: Date.now()
        },
        filters: {
            globalSearch: '',
            quickFilters: [],
            dateFrom: '',
            dateTo: '',
            department: '',
            cargo: '',
            location: '',
            salaryRange: [0, 10000000],
            experienceRange: [0, 40],
            onlyActive: false,
            withLoans: false,
            recentPayroll: false,
            newEmployees: false
        },
        filteredResults: [],
        filtersApplied: false,
        
        init() {
            console.log('Dashboard Store Fallback inicializado');
        },
        
        // Funciones de utilidad
        formatNumber(num) {
            return new Intl.NumberFormat('es-CO').format(num || 0);
        },
        
        formatCurrency(amount) {
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
            }).format(amount || 0);
        }
    };
};

// Función global para filtros (alias)
window.filters = {};

// Función para formatear números
window.formatNumber = function(num) {
    return new Intl.NumberFormat('es-CO').format(num || 0);
};

// Función para formatear moneda
window.formatCurrency = function(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

// Variables globales para evitar errores de Alpine
window.filteredResults = [];
window.filtersApplied = false;
window.sistemMetrics = {
    usuarios_conectados: 1,
    actividad_sistema: 0,
    cpu_porcentaje: 0,
    memoria_usado_gb: 0,
    memoria_porcentaje: 0,
    disco_porcentaje: 0,
    conexiones_activas: 0,
    memoria_total_gb: 8,
    sistema_activo: true,
    timestamp: Date.now()
};

window.metricas = {
    empleados: { total: 0, activos: 0, nuevos_mes: 0, crecimiento: 0 },
    nominas: { total_mes: 0, produccion_mes: 0, count_mes: 0 },
    prestamos: { activos: 0, pendientes: 0, en_mora: 0 },
    proyectos: { activos: 0, completados: 0, este_mes: 0 },
    rendimiento: { eficiencia: 85, ratio_prestamos: 15 }
};

console.log('🔧 Dashboard Global Functions cargadas');
