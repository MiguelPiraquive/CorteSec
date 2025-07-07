<!-- Script de inicialización de dashboard simplificado -->
<script>
console.log('🚀 Iniciando dashboard CorteSec...');

// Estado global del dashboard
window.dashboardState = {
    initialized: false,
    attempts: 0,
    maxAttempts: 15,
    lastError: null
};

// Función principal de inicialización
async function initializeDashboard() {
    window.dashboardState.attempts++;
    console.log(`🔄 Intento ${window.dashboardState.attempts}/${window.dashboardState.maxAttempts}`);

    try {
        // Verificar Chart.js
        if (typeof Chart === 'undefined') {
            throw new Error('Chart.js no disponible');
        }
        
        // Verificar clase DashboardPrincipal
        if (typeof DashboardPrincipal === 'undefined') {
            throw new Error('DashboardPrincipal no disponible');
        }

        // Verificar elementos DOM
        const charts = ['nominasChart', 'prestamosChart', 'empleadosChart', 'productividadChart'];
        const missing = charts.filter(id => !document.getElementById(id));
        
        if (missing.length > 0) {
            throw new Error(`Elementos faltantes: ${missing.join(', ')}`);
        }

        // Inicializar solo si no existe
        if (!window.dashboard) {
            console.log('✅ Iniciando dashboard...');
            window.dashboard = new DashboardPrincipal();
            window.dashboardState.initialized = true;
            
            // Mostrar notificación de éxito
            showNotification('Dashboard cargado correctamente', 'success');
            console.log('🎯 Dashboard inicializado exitosamente');
            
            return true;
        }
        
        return true;
        
    } catch (error) {
        window.dashboardState.lastError = error.message;
        console.error(`❌ Error en intento ${window.dashboardState.attempts}:`, error);
        
        if (window.dashboardState.attempts < window.dashboardState.maxAttempts) {
            const delay = Math.min(1000 * window.dashboardState.attempts, 5000);
            setTimeout(initializeDashboard, delay);
        } else {
            console.error('💥 Falló la inicialización del dashboard');
            showNotification('Error al cargar dashboard. Recarga la página.', 'error');
        }
        
        return false;
    }
}

// Funciones globales para botones
window.expandChart = function(chartId) {
    console.log('🔍 expandChart:', chartId);
    
    if (window.dashboard?.expandChart) {
        window.dashboard.expandChart(chartId);
    } else {
        showNotification('Dashboard no está listo. Intenta de nuevo.', 'warning');
        setTimeout(initializeDashboard, 500);
    }
};

window.refreshCharts = function() {
    console.log('🔄 refreshCharts');
    
    if (window.dashboard?.refreshCharts) {
        window.dashboard.refreshCharts();
        showNotification('Gráficos actualizados', 'success');
    } else {
        showNotification('Dashboard no está listo. Intenta de nuevo.', 'warning');
        setTimeout(initializeDashboard, 500);
    }
};

// Sistema de notificaciones
function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const icons = {
        success: 'check',
        error: 'exclamation-triangle',
        warning: 'exclamation',
        info: 'info-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300`;
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas fa-${icons[type]}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Event listeners para botones
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

// Inicialización
function startDashboard() {
    console.log('📄 Iniciando dashboard...');
    setTimeout(initializeDashboard, 1500);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDashboard);
} else {
    startDashboard();
}

// También con Alpine.js
document.addEventListener('alpine:init', function() {
    console.log('🏔️ Alpine listo');
    if (!window.dashboardState.initialized) {
        setTimeout(initializeDashboard, 1000);
    }
});

console.log('✅ Script configurado');
</script>
