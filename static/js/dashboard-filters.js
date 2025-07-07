/*
================================================================================
DASHBOARD FILTERS - CORTESEC ENTERPRISE v2.1.0
================================================================================
Sistema avanzado de filtros para el dashboard con datos reales del backend Django
✨ CARACTERÍSTICAS:
- Búsqueda inteligente en tiempo real
- Filtros por departamento, cargo, fechas
- Auto-sugerencias con datos reales
- Presets de filtros personalizables
- Integración completa con Alpine.js
================================================================================
*/

// Sistema de filtros mejorado para Alpine.js
window.createDashboardFilters = function() {
    return {
        // === ESTADO PRINCIPAL ===
        loading: true,
        showFilters: false,
        filtersApplied: false,
        autoRefresh: false,
        countdown: 30,
        
        // === DATOS DEL DASHBOARD ===
        metricas: {
            empleados: { total: 0, activos: 0, nuevos_mes: 0, crecimiento: 0 },
            nominas: { total_mes: 0, promedio: 0, pendientes: 0, produccion_mes: 0, count_mes: 0 },
            prestamos: { activos: 0, monto_total: 0, vencidos: 0, pendientes: 0, en_mora: 0 },
            proyectos: { activos: 0, completados: 0, este_mes: 0 },
            rendimiento: { eficiencia: 85, ratio_prestamos: 15 }
        },
        
        // === FILTROS AVANZADOS ===
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
        
        // === DATOS PARA FILTROS ===
        departamentos: [],
        cargos: [],
        locations: [],
        searchSuggestions: [],
        filteredResults: [],
        availableDepartments: [],
        availableCargos: [],
        
        // === INICIALIZACIÓN ===
        init() {
            console.log('🚀 Inicializando Dashboard CorteSec Enterprise...');
            this.loadDataFromDOM();
            this.setupAutoRefresh();
            
            setTimeout(() => {
                this.loading = false;
                this.showToast('Dashboard cargado correctamente', 'success');
            }, 1500);
        },
        
        // Cargar datos desde el DOM (datos reales de Django)
        loadDataFromDOM() {
            try {
                // Cargar métricas desde data attributes
                const metricsElement = document.querySelector('[data-dashboard-metrics]');
                if (metricsElement?.dataset.dashboardMetrics) {
                    const metricsData = JSON.parse(metricsElement.dataset.dashboardMetrics);
                    this.metricas = { ...this.metricas, ...metricsData };
                }
                
                // Cargar departamentos desde script JSON
                const deptScript = document.getElementById('departamentos-data');
                if (deptScript) {
                    const deptData = JSON.parse(deptScript.textContent || '[]');
                    this.departamentos = deptData;
                    this.availableDepartments = deptData.map(dept => ({
                        id: dept.departamento__id || dept.id,
                        name: dept.departamento__nombre || dept.nombre,
                        count: dept.count || dept.empleados_count || 0
                    }));
                }
                
                // Cargar cargos desde script JSON
                const cargoScript = document.getElementById('top-cargos-data');
                if (cargoScript) {
                    const cargoData = JSON.parse(cargoScript.textContent || '[]');
                    this.cargos = cargoData;
                    this.availableCargos = cargoData.map(cargo => ({
                        id: cargo.id,
                        name: cargo.nombre,
                        count: cargo.num_empleados || cargo.count || 0
                    }));
                }
                
                console.log('📊 Datos cargados desde Django:', {
                    departamentos: this.departamentos.length,
                    cargos: this.cargos.length,
                    metricas: this.metricas
                });
                
            } catch (error) {
                console.warn('⚠️ Error cargando datos desde DOM:', error);
                this.loadMockData();
            }
        },
        
        // Datos de respaldo si no hay datos del DOM
        loadMockData() {
            this.availableDepartments = [
                { id: 1, name: 'Producción', count: 45 },
                { id: 2, name: 'Administración', count: 12 },
                { id: 3, name: 'Ventas', count: 28 },
                { id: 4, name: 'Logística', count: 15 },
                { id: 5, name: 'Calidad', count: 8 }
            ];
            
            this.availableCargos = [
                { id: 1, name: 'Operario', count: 35 },
                { id: 2, name: 'Supervisor', count: 8 },
                { id: 3, name: 'Administrador', count: 6 },
                { id: 4, name: 'Vendedor', count: 12 },
                { id: 5, name: 'Técnico', count: 10 }
            ];
        },
        
        // === FUNCIONES DE FILTROS AVANZADOS ===
        
        // Toggle para filtros rápidos
        toggleQuickFilter(filter) {
            const index = this.filters.quickFilters.indexOf(filter);
            if (index > -1) {
                this.filters.quickFilters.splice(index, 1);
            } else {
                this.filters.quickFilters.push(filter);
            }
            this.applyFilters();
            this.showToast(`Filtro "${filter}" ${index > -1 ? 'desactivado' : 'activado'}`, 'info');
        },
        
        // Búsqueda global inteligente con datos reales
        async performGlobalSearch() {
            if (this.filters.globalSearch.length < 2) {
                this.searchSuggestions = [];
                return;
            }
            
            const searchTerm = this.filters.globalSearch.toLowerCase();
            const suggestions = [];
            
            try {
                // Buscar en departamentos reales
                this.availableDepartments.forEach(dept => {
                    if (dept.name.toLowerCase().includes(searchTerm)) {
                        suggestions.push({
                            id: `dept_${dept.id}`,
                            type: 'departamento',
                            title: dept.name,
                            subtitle: `${dept.count} empleados`
                        });
                    }
                });
                
                // Buscar en cargos reales
                this.availableCargos.forEach(cargo => {
                    if (cargo.name.toLowerCase().includes(searchTerm)) {
                        suggestions.push({
                            id: `cargo_${cargo.id}`,
                            type: 'cargo',
                            title: cargo.name,
                            subtitle: `${cargo.count} empleados`
                        });
                    }
                });
                
                // Sugerencias inteligentes basadas en métricas
                if (searchTerm.includes('empleado') || searchTerm.includes('activo')) {
                    suggestions.push({
                        id: 'search_empleados_activos',
                        type: 'empleado',
                        title: 'Empleados Activos',
                        subtitle: `${this.metricas.empleados.activos || 0} registros`
                    });
                }
                
                if (searchTerm.includes('nomina') || searchTerm.includes('salario')) {
                    suggestions.push({
                        id: 'search_nominas_mes',
                        type: 'nomina',
                        title: 'Nóminas del Mes',
                        subtitle: `${this.metricas.nominas.count_mes || 0} registros`
                    });
                }
                
                if (searchTerm.includes('prestamo') || searchTerm.includes('credito')) {
                    suggestions.push({
                        id: 'search_prestamos_activos',
                        type: 'prestamo',
                        title: 'Préstamos Activos',
                        subtitle: `${this.metricas.prestamos.activos || 0} registros`
                    });
                }
                
                if (searchTerm.includes('proyecto')) {
                    suggestions.push({
                        id: 'search_proyectos_activos',
                        type: 'proyecto',
                        title: 'Proyectos Activos',
                        subtitle: `${this.metricas.proyectos.activos || 0} registros`
                    });
                }
                
                this.searchSuggestions = suggestions.slice(0, 8);
                
            } catch (error) {
                console.warn('Error en búsqueda global:', error);
                this.showToast('Error en la búsqueda', 'error');
            }
        },
        
        // Seleccionar sugerencia de búsqueda
        selectSearchSuggestion(suggestion) {
            switch (suggestion.type) {
                case 'departamento':
                    this.filters.department = suggestion.id.replace('dept_', '');
                    break;
                case 'cargo':
                    this.filters.cargo = suggestion.id.replace('cargo_', '');
                    break;
                case 'empleado':
                    this.filters.onlyActive = true;
                    break;
                case 'nomina':
                    this.filters.recentPayroll = true;
                    break;
                case 'prestamo':
                    this.filters.withLoans = true;
                    break;
                case 'proyecto':
                    this.filters.quickFilters.push('proyectos_activos');
                    break;
            }
            
            this.filters.globalSearch = suggestion.title;
            this.searchSuggestions = [];
            this.applyFilters();
        },
        
        // Aplicar preset de fechas
        applyDatePreset(preset) {
            const today = new Date();
            let fromDate, toDate;
            
            switch (preset) {
                case 'today':
                    fromDate = toDate = today.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    fromDate = weekAgo.toISOString().split('T')[0];
                    toDate = today.toISOString().split('T')[0];
                    break;
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    fromDate = monthAgo.toISOString().split('T')[0];
                    toDate = today.toISOString().split('T')[0];
                    break;
                case 'quarter':
                    const quarterAgo = new Date(today);
                    quarterAgo.setMonth(quarterAgo.getMonth() - 3);
                    fromDate = quarterAgo.toISOString().split('T')[0];
                    toDate = today.toISOString().split('T')[0];
                    break;
                case 'year':
                    const yearAgo = new Date(today);
                    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                    fromDate = yearAgo.toISOString().split('T')[0];
                    toDate = today.toISOString().split('T')[0];
                    break;
                default:
                    return;
            }
            
            this.filters.dateFrom = fromDate;
            this.filters.dateTo = toDate;
            this.applyFilters();
            this.showToast(`Período aplicado: ${preset}`, 'success');
        },
        
        // Aplicar todos los filtros
        async applyFilters() {
            this.filtersApplied = this.hasActiveFilters();
            
            try {
                console.log('🔍 Aplicando filtros:', this.filters);
                
                // Generar resultados filtrados
                this.filteredResults = this.generateFilteredResults();
                
                // En un entorno real, aquí haríamos una llamada AJAX al backend Django
                // const response = await fetch('/api/dashboard/filter/', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(this.filters)
                // });
                
                if (this.filtersApplied) {
                    this.showToast(`Filtros aplicados (${this.getActiveFiltersCount()} activos)`, 'success');
                }
                
            } catch (error) {
                console.error('Error aplicando filtros:', error);
                this.showToast('Error aplicando filtros', 'error');
            }
        },
        
        // Generar resultados filtrados basados en datos reales
        generateFilteredResults() {
            const results = [];
            
            // Filtro por departamento
            if (this.filters.department) {
                const dept = this.availableDepartments.find(d => d.id == this.filters.department);
                if (dept) {
                    results.push({
                        id: `dept_result_${dept.id}`,
                        type: 'empleado',
                        name: `Empleados de ${dept.name}`,
                        subtitle: `${dept.count} empleados encontrados`,
                        date: new Date().toLocaleDateString('es-CO')
                    });
                }
            }
            
            // Filtro por cargo
            if (this.filters.cargo) {
                const cargo = this.availableCargos.find(c => c.id == this.filters.cargo);
                if (cargo) {
                    results.push({
                        id: `cargo_result_${cargo.id}`,
                        type: 'empleado',
                        name: `Empleados con cargo: ${cargo.name}`,
                        subtitle: `${cargo.count} empleados encontrados`,
                        date: new Date().toLocaleDateString('es-CO')
                    });
                }
            }
            
            // Filtros rápidos con datos reales
            this.filters.quickFilters.forEach(filter => {
                switch (filter) {
                    case 'empleados_activos':
                        results.push({
                            id: 'quick_empleados_activos',
                            type: 'empleado',
                            name: 'Empleados Activos',
                            subtitle: `${this.metricas.empleados.activos} empleados activos`,
                            date: new Date().toLocaleDateString('es-CO')
                        });
                        break;
                    case 'nominas_mes':
                        results.push({
                            id: 'quick_nominas_mes',
                            type: 'nomina',
                            name: 'Nóminas del Mes',
                            subtitle: `${this.metricas.nominas.count_mes} nóminas procesadas`,
                            date: new Date().toLocaleDateString('es-CO')
                        });
                        break;
                    case 'prestamos_activos':
                        results.push({
                            id: 'quick_prestamos_activos',
                            type: 'prestamo',
                            name: 'Préstamos Activos',
                            subtitle: `${this.metricas.prestamos.activos} préstamos vigentes`,
                            date: new Date().toLocaleDateString('es-CO')
                        });
                        break;
                    case 'proyectos_activos':
                        results.push({
                            id: 'quick_proyectos_activos',
                            type: 'proyecto',
                            name: 'Proyectos Activos',
                            subtitle: `${this.metricas.proyectos.activos} proyectos en curso`,
                            date: new Date().toLocaleDateString('es-CO')
                        });
                        break;
                }
            });
            
            return results;
        },
        
        // === UTILIDADES ===
        
        // Verificar si hay filtros activos
        hasActiveFilters() {
            return this.filters.globalSearch.length > 0 ||
                   this.filters.quickFilters.length > 0 ||
                   this.filters.dateFrom ||
                   this.filters.dateTo ||
                   this.filters.department ||
                   this.filters.cargo ||
                   this.filters.location ||
                   this.filters.onlyActive ||
                   this.filters.withLoans ||
                   this.filters.recentPayroll ||
                   this.filters.newEmployees;
        },
        
        // Contar filtros activos
        getActiveFiltersCount() {
            let count = 0;
            if (this.filters.globalSearch.length > 0) count++;
            count += this.filters.quickFilters.length;
            if (this.filters.dateFrom) count++;
            if (this.filters.dateTo) count++;
            if (this.filters.department) count++;
            if (this.filters.cargo) count++;
            if (this.filters.location) count++;
            if (this.filters.onlyActive) count++;
            if (this.filters.withLoans) count++;
            if (this.filters.recentPayroll) count++;
            if (this.filters.newEmployees) count++;
            return count;
        },
        
        // Limpiar filtros básicos
        clearFilters() {
            this.filters.dateFrom = '';
            this.filters.dateTo = '';
            this.filters.department = '';
            this.filters.cargo = '';
            this.filters.location = '';
            this.applyFilters();
            this.showToast('Filtros básicos limpiados', 'info');
        },
        
        // Limpiar todos los filtros
        clearAllFilters() {
            this.filters = {
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
            };
            this.searchSuggestions = [];
            this.filteredResults = [];
            this.filtersApplied = false;
            this.applyFilters();
            this.showToast('Todos los filtros limpiados', 'success');
        },
        
        // === AUTO-REFRESH ===
        
        toggleAutoRefresh() {
            this.autoRefresh = !this.autoRefresh;
            if (this.autoRefresh) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
            this.showToast(`Auto-refresh ${this.autoRefresh ? 'activado' : 'desactivado'}`, 'info');
        },
        
        setupAutoRefresh() {
            if (this.autoRefresh) {
                this.autoRefreshInterval = setInterval(() => {
                    this.countdown--;
                    if (this.countdown <= 0) {
                        this.refreshDashboard();
                        this.countdown = 30;
                    }
                }, 1000);
            }
        },
        
        startAutoRefresh() {
            this.countdown = 30;
            this.setupAutoRefresh();
        },
        
        stopAutoRefresh() {
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
                this.autoRefreshInterval = null;
            }
        },
        
        async refreshDashboard() {
            try {
                this.loadDataFromDOM();
                this.applyFilters();
                this.showToast('Dashboard actualizado', 'success');
            } catch (error) {
                console.error('Error actualizando dashboard:', error);
                this.showToast('Error al actualizar', 'error');
            }
        },
        
        // === EXPORTACIÓN ===
        
        async exportData(format = 'csv') {
            try {
                const data = {
                    filters: this.filters,
                    results: this.filteredResults,
                    metrics: this.metricas,
                    timestamp: new Date().toISOString()
                };
                
                let content, filename, mimeType;
                
                switch (format) {
                    case 'json':
                        content = JSON.stringify(data, null, 2);
                        filename = `dashboard_datos_${new Date().toISOString().split('T')[0]}.json`;
                        mimeType = 'application/json';
                        break;
                    case 'csv':
                        content = this.convertToCSV(this.filteredResults);
                        filename = `dashboard_filtrado_${new Date().toISOString().split('T')[0]}.csv`;
                        mimeType = 'text/csv';
                        break;
                    default:
                        throw new Error('Formato no soportado');
                }
                
                this.downloadFile(content, filename, mimeType);
                this.showToast(`Datos exportados como ${format.toUpperCase()}`, 'success');
                
            } catch (error) {
                console.error('Error exportando:', error);
                this.showToast('Error al exportar', 'error');
            }
        },
        
        // Convertir a CSV
        convertToCSV(data) {
            if (!data.length) return 'Sin datos para exportar';
            
            const headers = ['Tipo', 'Nombre', 'Descripción', 'Fecha'];
            const rows = data.map(item => [
                item.type,
                item.name || '',
                item.subtitle || '',
                item.date || ''
            ]);
            
            return [headers, ...rows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');
        },
        
        // Descargar archivo
        downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        
        // === UTILIDADES DE FORMATO ===
        
        formatNumber(num) {
            return new Intl.NumberFormat('es-CO').format(num || 0);
        },
        
        formatCurrency(amount) {
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
            }).format(amount || 0);
        },
        
        // Sistema de notificaciones
        showToast(message, type = 'info') {
            // Intentar usar el sistema de toast global si existe
            if (window.showToast && typeof window.showToast === 'function') {
                window.showToast(message, type);
                return;
            }
            
            // Fallback a console con iconos
            const icons = {
                'success': '✅',
                'error': '❌',
                'warning': '⚠️',
                'info': 'ℹ️'
            };
            
            console.log(`${icons[type] || 'ℹ️'} [${type.toUpperCase()}] ${message}`);
            
            // Crear toast visual simple si no existe sistema
            this.createSimpleToast(message, type);
        },
        
        // Toast visual simple
        createSimpleToast(message, type) {
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-all duration-300 ${
                type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
            }`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 3000);
        }
    };
};
