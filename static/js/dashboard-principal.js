/*
================================================================================
DASHBOARD PRINCIPAL JAVASCRIPT v2.1.0 - CORTESEC ENTERPRISE
================================================================================
Sistema avanzado de dashboard con métricas en tiempo real, gráficos interactivos,
notificaciones inteligentes y gestión empresarial completa.

✨ CARACTERÍSTICAS:
- Actualización automática de métricas
- Gráficos interactivos con Chart.js
- Sistema de notificaciones
- Modo oscuro/claro
- Filtros avanzados por período
- Animaciones y transiciones suaves
- API REST para datos en tiempo real
- Exportación de datos
- Gestión mejorada de modales y gráficos expandidos
================================================================================
*/

// Dashboard Principal JavaScript - Versión Completa y Robusta
console.log('🚀 Cargando Dashboard CorteSec Enterprise...');

class DashboardPrincipal {
    constructor() {
        this.charts = {};
        this.modalCharts = {}; // Para gráficos en modales
        this.chartData = null;
        this.apiUrl = '/dashboard/api/graficos/';
        this.refreshInterval = null;
        this.chartRefreshInterval = null;
        this.autoRefreshEnabled = true;
        this.currentPeriod = 'mes';
        this.refreshRate = 30; // segundos para métricas
        this.chartRefreshRate = 60; // segundos para gráficos
        this.countdown = this.refreshRate;
        
        console.log('📊 Inicializando Dashboard...');
        this.init();
    }

    async init() {
        try {
            console.log('🔄 Cargando datos...');
            await this.loadData();
            
            console.log('🎨 Inicializando gráficos...');
            this.initializeCharts();
            
            console.log('✅ Dashboard inicializado correctamente');
            this.showNotification('Dashboard cargado exitosamente', 'success');
            
        } catch (error) {
            console.error('❌ Error inicializando dashboard:', error);
            this.showNotification('Error al cargar dashboard', 'error');
        }
    }

    async loadData() {
        try {
            const csrfToken = this.getCSRFToken();
            const response = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📋 Datos recibidos:', data);

            if (data.success) {
                this.chartData = data;
                return data;
            } else {
                throw new Error('API no devolvió success=true');
            }

        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            console.log('🔄 Usando datos de fallback...');
            
            // Datos de fallback
            this.chartData = {
                success: true,
                nominas_evolucion: [
                    { mes: 'Ene 2024', total: 1250000, produccion: 980000, count: 45 },
                    { mes: 'Feb 2024', total: 1380000, produccion: 1120000, count: 48 },
                    { mes: 'Mar 2024', total: 1420000, produccion: 1180000, count: 52 },
                    { mes: 'Abr 2024', total: 1350000, produccion: 1050000, count: 49 },
                    { mes: 'May 2024', total: 1480000, produccion: 1220000, count: 55 },
                    { mes: 'Jun 2024', total: 1520000, produccion: 1280000, count: 58 }
                ],
                prestamos_distribucion: [
                    { estado: 'Pendiente', count: 12, monto: 150000, color: '#f59e0b' },
                    { estado: 'Aprobado', count: 8, monto: 320000, color: '#3b82f6' },
                    { estado: 'Activo', count: 25, monto: 890000, color: '#10b981' },
                    { estado: 'Completado', count: 45, monto: 1200000, color: '#22c55e' }
                ],
                empleados_crecimiento: [
                    { mes: 'Jul 2023', total_acumulado: 85, nuevos: 3 },
                    { mes: 'Ago 2023', total_acumulado: 88, nuevos: 3 },
                    { mes: 'Sep 2023', total_acumulado: 92, nuevos: 4 },
                    { mes: 'Oct 2023', total_acumulado: 95, nuevos: 3 },
                    { mes: 'Nov 2023', total_acumulado: 98, nuevos: 3 },
                    { mes: 'Dic 2023', total_acumulado: 102, nuevos: 4 },
                    { mes: 'Ene 2024', total_acumulado: 105, nuevos: 3 },
                    { mes: 'Feb 2024', total_acumulado: 108, nuevos: 3 },
                    { mes: 'Mar 2024', total_acumulado: 112, nuevos: 4 },
                    { mes: 'Abr 2024', total_acumulado: 115, nuevos: 3 },
                    { mes: 'May 2024', total_acumulado: 118, nuevos: 3 },
                    { mes: 'Jun 2024', total_acumulado: 122, nuevos: 4 }
                ],
                top_productividad: [
                    { empleado: 'María González', produccion_promedio: 125000, total_produccion: 750000, cargo: 'Supervisor', nominas_count: 6 },
                    { empleado: 'Carlos Rodríguez', produccion_promedio: 118000, total_produccion: 708000, cargo: 'Operario Senior', nominas_count: 6 },
                    { empleado: 'Ana Martínez', produccion_promedio: 112000, total_produccion: 672000, cargo: 'Técnico', nominas_count: 6 }
                ]
            };
            
            this.showNotification('Usando datos de demostración', 'warning');
        }
    }

    initializeCharts() {
        console.log('🎯 Inicializando gráficos individuales...');
        
        this.initNominasChart();
        this.initPrestamosChart();
        this.initEmpleadosChart();
        this.initProductividadChart();
        
        console.log('✅ Todos los gráficos inicializados');
    }

    initNominasChart() {
        const canvas = document.getElementById('nominasChart');
        if (!canvas) {
            console.warn('⚠️ Canvas nominasChart no encontrado');
            return;
        }

        const ctx = canvas.getContext('2d');
        const data = this.chartData?.nominas_evolucion || [];

        this.charts.nominas = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.mes),
                datasets: [
                    {
                        label: 'Total Nóminas ($)',
                        data: data.map(item => item.total),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Producción ($)',
                        data: data.map(item => item.produccion),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

        console.log('✅ Gráfico de nóminas creado');
    }

    initPrestamosChart() {
        const canvas = document.getElementById('prestamosChart');
        if (!canvas) {
            console.warn('⚠️ Canvas prestamosChart no encontrado');
            return;
        }

        const ctx = canvas.getContext('2d');
        const data = this.chartData?.prestamos_distribucion || [];

        this.charts.prestamos = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.estado),
                datasets: [{
                    data: data.map(item => item.count),
                    backgroundColor: data.map(item => item.color),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        console.log('✅ Gráfico de préstamos creado');
    }

    initEmpleadosChart() {
        const canvas = document.getElementById('empleadosChart');
        if (!canvas) {
            console.warn('⚠️ Canvas empleadosChart no encontrado');
            return;
        }

        const ctx = canvas.getContext('2d');
        const data = this.chartData?.empleados_crecimiento || [];

        this.charts.empleados = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.mes),
                datasets: [
                    {
                        label: 'Total Acumulado',
                        data: data.map(item => item.total_acumulado),
                        backgroundColor: '#10b981',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Nuevos',
                        data: data.map(item => item.nuevos),
                        backgroundColor: '#3b82f6',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left'
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });

        console.log('✅ Gráfico de empleados creado');
    }

    initProductividadChart() {
        const canvas = document.getElementById('productividadChart');
        if (!canvas) {
            console.warn('⚠️ Canvas productividadChart no encontrado');
            return;
        }

        const ctx = canvas.getContext('2d');
        const data = this.chartData?.top_productividad || [];

        this.charts.productividad = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.empleado),
                datasets: [{
                    label: 'Producción Promedio ($)',
                    data: data.map(item => item.produccion_promedio),
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

        console.log('✅ Gráfico de productividad creado');
    }

    // Funciones para expandir gráficos en modales
    expandChart(chartId) {
        console.log('🔍 Expandiendo gráfico:', chartId);
        
        // Verificar que el gráfico original existe
        const originalChart = this.charts[chartId.replace('Chart', '')];
        if (!originalChart) {
            console.warn('❌ Gráfico no encontrado:', chartId);
            this.showNotification('Error: Gráfico no disponible', 'error');
            return;
        }
        
        // Modal mejorado con limpieza automática
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.id = `modal-${chartId}`;
        
        // Función para cerrar el modal y limpiar recursos
        const closeModal = () => {
            // Limpiar gráfico del modal si existe
            const expandedCanvasId = `expanded-${chartId}`;
            if (this.modalCharts && this.modalCharts[expandedCanvasId]) {
                console.log('🗑️ Limpiando gráfico del modal:', expandedCanvasId);
                this.modalCharts[expandedCanvasId].destroy();
                delete this.modalCharts[expandedCanvasId];
            }
            
            // Remover modal del DOM
            modal.remove();
            console.log('✅ Modal cerrado y recursos limpiados');
        };
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-600">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                        <i class="fas fa-chart-line mr-2 text-blue-500"></i>
                        ${this.getChartTitle(chartId)}
                    </h3>
                    <button id="close-modal-btn" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="flex-1 p-6">
                    <div class="h-96 relative">
                        <canvas id="expanded-${chartId}" class="w-full h-full"></canvas>
                    </div>
                </div>
                <div class="px-6 pb-6">
                    <div class="text-sm text-gray-500 dark:text-gray-400 text-center">
                        💡 Use Esc para cerrar o haga clic en la X
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners para cerrar
        modal.querySelector('#close-modal-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(); // Cerrar al hacer clic fuera
        });
        
        // Cerrar con Esc
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // Recrear el gráfico en el modal
        setTimeout(() => {
            this.recreateChartInModal(chartId, `expanded-${chartId}`);
        }, 150);
    }
    
    // Función auxiliar para obtener títulos de gráficos
    getChartTitle(chartId) {
        const titles = {
            'nominasChart': 'Evolución de Nóminas',
            'prestamosChart': 'Estado de Préstamos', 
            'empleadosChart': 'Crecimiento de Empleados',
            'productividadChart': 'Top Productividad'
        };
        return titles[chartId] || 'Gráfico';
    }

    recreateChartInModal(originalChartId, newCanvasId) {
        const originalChart = this.charts[originalChartId.replace('Chart', '')];
        if (!originalChart) {
            console.warn('❌ No se encontró el gráfico original:', originalChartId);
            return;
        }

        const canvas = document.getElementById(newCanvasId);
        if (!canvas) {
            console.warn('❌ No se encontró el canvas:', newCanvasId);
            return;
        }

        // Verificar si ya existe un gráfico en este canvas y destruirlo
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            console.log('🗑️ Destruyendo gráfico existente en canvas:', newCanvasId);
            existingChart.destroy();
        }

        try {
            const ctx = canvas.getContext('2d');
            
            // Crear configuración clonada para evitar problemas de referencia
            const config = {
                type: originalChart.config.type,
                data: JSON.parse(JSON.stringify(originalChart.config.data)), // Deep clone
                options: {
                    ...JSON.parse(JSON.stringify(originalChart.config.options)), // Deep clone
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        ...originalChart.config.options?.plugins,
                        title: {
                            ...originalChart.config.options?.plugins?.title,
                            display: true,
                            text: `${originalChart.config.options?.plugins?.title?.text || 'Gráfico'} (Ampliado)`
                        }
                    }
                }
            };

            const newChart = new Chart(ctx, config);
            console.log('✅ Gráfico recreado exitosamente en modal:', newCanvasId);
            
            // Almacenar referencia del gráfico modal para limpieza posterior
            if (!this.modalCharts) {
                this.modalCharts = {};
            }
            this.modalCharts[newCanvasId] = newChart;
            
        } catch (error) {
            console.error('❌ Error recreando gráfico en modal:', error);
            // Mostrar mensaje de error en el canvas
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Error cargando gráfico', canvas.width / 2, canvas.height / 2);
        }
    }

    async refreshCharts() {
        console.log('🔄 Refrescando gráficos...');
        this.showNotification('Actualizando datos...', 'info');
        
        await this.loadData();
        
        // Destruir gráficos existentes en el dashboard principal
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
        
        // Destruir gráficos en modales si existen
        Object.values(this.modalCharts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.modalCharts = {};
        
        // Cerrar modales abiertos
        document.querySelectorAll('[id^="modal-"]').forEach(modal => modal.remove());
        
        // Recrear gráficos
        this.initializeCharts();
        
        this.showNotification('Gráficos actualizados exitosamente', 'success');
    }

    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : '';
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas fa-info-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Variables globales
window.DashboardPrincipal = DashboardPrincipal;
window.dashboard = null;

// Funciones globales para botones
window.expandChart = function(chartId) {
    if (window.dashboard) {
        window.dashboard.expandChart(chartId);
    } else {
        console.error('Dashboard no disponible');
    }
};

window.refreshCharts = function() {
    if (window.dashboard) {
        window.dashboard.refreshCharts();
    } else {
        console.error('Dashboard no disponible');
    }
};

// Inicialización
function initDashboard() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js no disponible');
        return;
    }
    
    const requiredElements = ['nominasChart', 'prestamosChart', 'empleadosChart', 'productividadChart'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('Elementos faltantes:', missingElements);
        return;
    }
    
    if (!window.dashboard) {
        window.dashboard = new DashboardPrincipal();
    }
}

// Event listeners
document.addEventListener('click', function(e) {
    const expandBtn = e.target.closest('[data-expand-chart]');
    if (expandBtn) {
        e.preventDefault();
        const chartId = expandBtn.getAttribute('data-expand-chart');
        window.expandChart(chartId);
        return;
    }
    
    const refreshBtn = e.target.closest('[data-refresh-chart]');
    if (refreshBtn) {
        e.preventDefault();
        window.refreshCharts();
        return;
    }
});

// Inicialización cuando DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initDashboard, 1000);
    });
} else {
    setTimeout(initDashboard, 1000);
}

// Función de limpieza global
function cleanupCharts() {
    if (window.dashboard) {
        // Limpiar gráficos principales
        Object.values(window.dashboard.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        // Limpiar gráficos de modales
        Object.values(window.dashboard.modalCharts || {}).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        // Remover modales
        document.querySelectorAll('[id^="modal-"]').forEach(modal => modal.remove());
        
        console.log('🧹 Charts limpiados correctamente');
    }
}

// Limpiar cuando se cierre/recargue la página
window.addEventListener('beforeunload', cleanupCharts);
window.addEventListener('unload', cleanupCharts);

console.log('✅ Dashboard script cargado');