// Dashboard Alpine.js Store
console.log('🎯 Dashboard Alpine Store Iniciado');

// Función que retorna el store data
window.createDashboardStore = function() {
    return {
        // Estado inicial
        loading: true,
        autoRefresh: false,
        showFilters: false,
        currentPeriod: 'mes',
        refreshInterval: null,
        sistemMetrics: {
            cpu_porcentaje: 0,
            memoria_porcentaje: 0,
            memoria_usado_gb: 0,
            memoria_total_gb: 0,
            disco_porcentaje: 0,
            usuarios_conectados: 1,
            conexiones_activas: 0,
            transacciones_minuto: 0,
            sistema_activo: true,
            timestamp: null
        },
        filters: {
            globalSearch: '',
            quickFilters: [],
            dateFrom: '',
            dateTo: '',
            department: '',
            cargo: '',
            location: '',
            salaryRange: [1000000, 5000000],
            experienceRange: [0, 20],
            onlyActive: false,
            withLoans: false,
            recentPayroll: false,
            newEmployees: false
        },
        
        // Datos
        metricas: {
            empleados: {
                total: 0,
                activos: 0,
                nuevos_mes: 0,
                crecimiento: 0
            },
            nominas: {
                total_mes: 0,
                produccion_mes: 0,
                count_mes: 0
            },
            prestamos: {
                activos: 0,
                pendientes: 0,
                en_mora: 0
            },
            proyectos: {
                activos: 0,
                completados: 0,
                este_mes: 0
            },
            rendimiento: {
                eficiencia: 85,
                ratio_prestamos: 15,
                productividad: 92
            }
        },
        
        filteredResults: [],
        filtersApplied: false,
        searchSuggestions: [],
        departments: [],
        cargos: [],
        locations: [],
        allCargos: [],
        
        // Inicialización
        init() {
            console.log('🚀 Inicializando Dashboard Store...');
            this.loadInitialData();
            this.loadFiltersData();
            this.loadSistemMetrics();
            
            // Configurar refresh automático de métricas del sistema cada 5 segundos
            setInterval(() => {
                this.loadSistemMetrics();
            }, 5000);
            
            console.log('✅ Dashboard Store inicializado');
        },
        
        // Cargar datos iniciales
        async loadInitialData() {
            try {
                this.loading = true;
                console.log('🔄 Intentando cargar datos reales del sistema...');
                
                // Cargar métricas reales desde el contexto de Django
                const metricsElement = document.getElementById('dashboard-metrics-data');
                console.log('📊 Elemento de métricas encontrado:', !!metricsElement);
                
                if (metricsElement) {
                    const metricsData = metricsElement.dataset.dashboardMetrics;
                    console.log('📦 Datos en el elemento:', !!metricsData);
                    console.log('🔍 Primeros 100 caracteres:', metricsData ? metricsData.substring(0, 100) : 'null');
                    
                    if (metricsData && metricsData.trim() !== '') {
                        try {
                            const parsedMetrics = JSON.parse(metricsData);
                            this.metricas = parsedMetrics;
                            console.log('✅ Métricas reales cargadas desde Django:', parsedMetrics);
                            console.log('👥 Total empleados real:', parsedMetrics.empleados?.total || 'no definido');
                            
                            // TAMBIÉN cargar datos frescos desde la API
                            try {
                                const response = await fetch('/dashboard/api/metricas/?tipo=completo');
                                if (response.ok) {
                                    const freshData = await response.json();
                                    console.log('🔄 Datos frescos desde API:', freshData);
                                    
                                    // Combinar datos del contexto con datos frescos
                                    if (freshData.empleados) {
                                        this.metricas.empleados = { ...this.metricas.empleados, ...freshData.empleados };
                                    }
                                    if (freshData.nominas) {
                                        this.metricas.nominas = { ...this.metricas.nominas, ...freshData.nominas };
                                    }
                                    if (freshData.prestamos) {
                                        this.metricas.prestamos = { ...this.metricas.prestamos, ...freshData.prestamos };
                                    }
                                    if (freshData.proyectos) {
                                        this.metricas.proyectos = { ...this.metricas.proyectos, ...freshData.proyectos };
                                    }
                                    
                                    console.log('🎯 DATOS FINALES (contexto + API):', this.metricas);
                                }
                            } catch (apiError) {
                                console.log('ℹ️ No se pudieron cargar datos frescos de API, usando contexto Django');
                            }
                            
                        } catch (e) {
                            console.error('❌ Error parseando métricas de Django:', e);
                            console.log('🔧 Usando datos mock como fallback');
                            this.loadMockData();
                        }
                    } else {
                        console.warn('⚠️ No hay datos de métricas en el elemento HTML');
                        console.log('🔧 Usando datos mock como fallback');
                        this.loadMockData();
                    }
                } else {
                    console.warn('⚠️ Elemento dashboard-metrics-data no encontrado');
                    console.log('🔧 Usando datos mock como fallback');
                    this.loadMockData();
                }
                
                this.loading = false;
                console.log('SUCCESS: Dashboard cargado correctamente');
            } catch (error) {
                console.error('ERROR: Error cargando datos del dashboard:', error);
                this.loadMockData();
                this.loading = false;
            }
        },
        
        // Cargar datos mock como fallback
        loadMockData() {
            console.log('🔧 Cargando datos mock (sistema sin datos reales)');
            this.metricas = {
                empleados: {
                    total: 0,
                    activos: 0,
                    nuevos_mes: 0,
                    nuevos_semana: 0,
                    crecimiento: 0
                },
                nominas: {
                    total_mes: 0,
                    produccion_mes: 0,
                    deducciones_mes: 0,
                    promedio_produccion: 0,
                    count_mes: 0
                },
                prestamos: {
                    activos: 0,
                    pendientes: 0,
                    aprobados: 0,
                    completados: 0,
                    en_mora: 0,
                    monto_activos: 0,
                    monto_pendientes: 0
                },
                proyectos: {
                    activos: 0,
                    completados: 0,
                    este_mes: 0,
                    contratistas: 0,
                    con_proyectos: 0
                },
                pagos: {
                    total_mes: 0,
                    count_mes: 0
                },
                rendimiento: {
                    eficiencia: 0,
                    ratio_prestamos: 0
                }
            };
            console.log('📊 Datos mock cargados como fallback');
        },
        
        // Cargar métricas del servidor
        async loadMetricas() {
            try {
                const response = await fetch('/dashboard/api/metricas/');
                if (response.ok) {
                    const data = await response.json();
                    this.metricas = { ...this.metricas, ...data };
                }
            } catch (error) {
                console.error('Error cargando métricas:', error);
            }
        },
        
        // Cargar datos para filtros
        async loadFiltersData() {
            try {
                console.log('📊 Cargando datos de filtros...');
                
                // Usar datos mock por defecto para evitar cuelgues
                this.departments = [
                    { id: 1, nombre: 'BOGOTA' },
                    { id: 2, nombre: 'CUNDINAMARCA' },
                    { id: 3, nombre: 'ANTIOQUIA' },
                    { id: 4, nombre: 'VALLE DEL CAUCA' },
                    { id: 5, nombre: 'SANTANDER' }
                ];
                
                this.locations = [
                    { id: 1, nombre: 'Bogotá D.C.' },
                    { id: 2, nombre: 'Medellín' },
                    { id: 3, nombre: 'Cali' },
                    { id: 4, nombre: 'Barranquilla' }
                ];
                
                this.allCargos = [
                    { id: 1, nombre: 'Administrador' },
                    { id: 2, nombre: 'Empleado' },
                    { id: 3, nombre: 'Supervisor' },
                    { id: 4, nombre: 'Operario' }
                ];
                
                this.cargos = [...this.allCargos];
                
                console.log('✅ Datos de filtros cargados exitosamente');
                
            } catch (error) {
                console.error('⚠️ Error cargando datos de filtros:', error);
                // Mantener datos mock como fallback
                this.departments = [{ id: 1, nombre: 'Sin departamento' }];
                this.locations = [{ id: 1, nombre: 'Sin ubicación' }];
                this.cargos = [{ id: 1, nombre: 'Sin cargo' }];
                this.allCargos = [...this.cargos];
            }
        },
        
        // Funciones de filtros
        toggleQuickFilter(filterName) {
            const index = this.filters.quickFilters.indexOf(filterName);
            if (index > -1) {
                this.filters.quickFilters.splice(index, 1);
            } else {
                this.filters.quickFilters.push(filterName);
            }
            this.applyFilters();
        },
        
        updateSalaryRange(value, index) {
            this.filters.salaryRange[index] = parseInt(value);
            // Asegurar que el valor mínimo no sea mayor que el máximo
            if (index === 0 && this.filters.salaryRange[0] > this.filters.salaryRange[1]) {
                this.filters.salaryRange[1] = this.filters.salaryRange[0];
            }
            if (index === 1 && this.filters.salaryRange[1] < this.filters.salaryRange[0]) {
                this.filters.salaryRange[0] = this.filters.salaryRange[1];
            }
        },
        
        updateExperienceRange(value, index) {
            this.filters.experienceRange[index] = parseInt(value);
            // Asegurar que el valor mínimo no sea mayor que el máximo
            if (index === 0 && this.filters.experienceRange[0] > this.filters.experienceRange[1]) {
                this.filters.experienceRange[1] = this.filters.experienceRange[0];
            }
            if (index === 1 && this.filters.experienceRange[1] < this.filters.experienceRange[0]) {
                this.filters.experienceRange[0] = this.filters.experienceRange[1];
            }
        },
        
        loadCargosForDepartment() {
            if (this.filters.department) {
                this.cargos = this.allCargos.filter(cargo => 
                    cargo.departamento_id == this.filters.department
                );
                console.log(`🔄 Cargos filtrados para departamento ${this.filters.department}:`, this.cargos.length);
            } else {
                this.cargos = this.allCargos;
                console.log('🔄 Mostrando todos los cargos:', this.cargos.length);
            }
            this.filters.cargo = ''; // Reset cargo selection
        },
        
        // Función para toggle auto refresh
        toggleAutoRefresh() {
            this.autoRefresh = !this.autoRefresh;
            if (this.autoRefresh) {
                this.refreshInterval = setInterval(() => {
                    this.loadInitialData();
                    this.loadSistemMetrics(); // También actualizar métricas del sistema
                }, 30000); // Refresh cada 30 segundos
                console.log('✅ Auto-refresh activado (datos + sistema)');
            } else {
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                    this.refreshInterval = null;
                }
                console.log('⏸️ Auto-refresh desactivado');
            }
        },
        
        // Función para exportar datos
        exportData(format) {
            console.log(`📄 Exportando datos en formato: ${format}`);
            if (format === 'csv') {
                this.exportToCSV();
            } else if (format === 'json') {
                this.exportToJSON();
            }
        },
        
        exportToCSV() {
            // Implementar exportación CSV
            console.log('📊 Exportando a CSV...');
            // Aquí iría la lógica real de exportación
        },
        
        exportToJSON() {
            // Implementar exportación JSON
            console.log('📋 Exportando a JSON...');
            // Aquí iría la lógica real de exportación
        },
        
        // Función para aplicar presets de fechas
        applyDatePreset(preset) {
            const today = new Date();
            const formatDate = (date) => date.toISOString().split('T')[0];
            
            switch(preset) {
                case 'today':
                    this.filters.dateFrom = formatDate(today);
                    this.filters.dateTo = formatDate(today);
                    break;
                case 'week':
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    this.filters.dateFrom = formatDate(weekAgo);
                    this.filters.dateTo = formatDate(today);
                    break;
                case 'month':
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    this.filters.dateFrom = formatDate(monthAgo);
                    this.filters.dateTo = formatDate(today);
                    break;
                case 'quarter':
                    const quarterAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                    this.filters.dateFrom = formatDate(quarterAgo);
                    this.filters.dateTo = formatDate(today);
                    break;
            }
            this.applyFilters();
            console.log(`📅 Preset de fecha aplicado: ${preset}`);
        },
        
        // Función para seleccionar sugerencias de búsqueda
        selectSearchSuggestion(suggestion) {
            this.filters.globalSearch = suggestion;
            this.performGlobalSearch();
        },
        
        // Funciones de utilidad
        formatNumber(num) {
            if (!num && num !== 0) return '0';
            return new Intl.NumberFormat('es-CO').format(num);
        },
        
        formatCurrency(amount) {
            if (!amount && amount !== 0) return '$0';
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        },
        
        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('es-CO');
        },
        
        // Funciones para mostrar empleados
        showEmployeeDetails(employeeId) {
            // Implementar lógica para mostrar detalles del empleado
            console.log('Mostrar detalles del empleado:', employeeId);
        },
        
        exportResults() {
            // Implementar lógica para exportar resultados
            console.log('Exportar resultados:', this.filteredResults.length, 'empleados');
        },
        
        async applyFilters() {
            try {
                this.filtersApplied = true;
                console.log('🔍 Aplicando filtros...');
                
                // Construir parámetros de filtro
                const params = new URLSearchParams();
                
                if (this.filters.globalSearch) {
                    params.append('search', this.filters.globalSearch);
                }
                if (this.filters.department) {
                    params.append('department', this.filters.department);
                }
                if (this.filters.cargo) {
                    params.append('cargo', this.filters.cargo);
                }
                if (this.filters.location) {
                    params.append('location', this.filters.location);
                }
                if (this.filters.dateFrom) {
                    params.append('date_from', this.filters.dateFrom);
                }
                if (this.filters.dateTo) {
                    params.append('date_to', this.filters.dateTo);
                }
                
                params.append('salary_min', this.filters.salaryRange[0]);
                params.append('salary_max', this.filters.salaryRange[1]);
                params.append('experience_min', this.filters.experienceRange[0]);
                params.append('experience_max', this.filters.experienceRange[1]);
                
                if (this.filters.onlyActive) {
                    params.append('only_active', 'true');
                }
                if (this.filters.withLoans) {
                    params.append('with_loans', 'true');
                }
                if (this.filters.recentPayroll) {
                    params.append('recent_payroll', 'true');
                }
                if (this.filters.newEmployees) {
                    params.append('new_employees', 'true');
                }
                
                // Aplicar filtros rápidos
                this.filters.quickFilters.forEach(filter => {
                    params.append('quick_filter', filter);
                });
                
                // Hacer petición al servidor
                try {
                    const response = await fetch(`/dashboard/api/empleados/?${params.toString()}`);
                    if (response.ok) {
                        this.filteredResults = await response.json();
                        console.log('✅ Filtros aplicados:', this.filteredResults.length, 'resultados');
                    } else {
                        console.log('⚠️ Error en filtros, usando datos mock');
                        this.filteredResults = [];
                    }
                } catch (error) {
                    console.log('⚠️ Error aplicando filtros, usando datos mock');
                    this.filteredResults = [];
                }
            } catch (error) {
                console.error('Error en applyFilters:', error);
                this.filteredResults = [];
            }
        },
        
        async performGlobalSearch() {
            if (this.filters.globalSearch.length === 0) {
                this.filteredResults = [];
                this.filtersApplied = false;
                console.log('🔍 Búsqueda limpiada');
                return;
            }
            
            if (this.filters.globalSearch.length < 2) {
                console.log('🔍 Búsqueda muy corta, esperando más caracteres...');
                return;
            }
            
            console.log('🔍 Realizando búsqueda global:', this.filters.globalSearch);
            await this.applyFilters();
        },
        
        clearFilters() {
            this.filters = {
                globalSearch: '',
                quickFilters: [],
                dateFrom: '',
                dateTo: '',
                department: '',
                cargo: '',
                location: '',
                salaryRange: [1000000, 5000000],
                experienceRange: [0, 20],
                onlyActive: false,
                withLoans: false,
                recentPayroll: false,
                newEmployees: false
            };
            this.filteredResults = [];
            this.filtersApplied = false;
            this.cargos = this.allCargos;
            console.log('🧹 Filtros limpiados');
        },
        
        // Cargar métricas del sistema en tiempo real
        async loadSistemMetrics() {
            try {
                const response = await fetch('/dashboard/api/sistema/simple/');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.sistemMetrics = {
                            cpu_porcentaje: data.cpu_porcentaje,
                            memoria_porcentaje: data.memoria_porcentaje,
                            memoria_usado_gb: data.memoria_usado_gb,
                            memoria_total_gb: data.memoria_total_gb,
                            disco_porcentaje: data.disco_porcentaje,
                            usuarios_conectados: data.usuarios_conectados,
                            conexiones_activas: data.conexiones_activas,
                            actividad_sistema: data.actividad_sistema,        // DATOS REALES del sistema CorteSec
                            sesiones_django: data.sesiones_django,           // Sesiones Django activas
                            empleados_total: data.empleados_total,           // Total de empleados REAL
                            prestamos_pendientes: data.prestamos_pendientes, // Préstamos pendientes REALES
                            nominas_mes: data.nominas_mes,                   // Nóminas del mes REALES
                            consultas_db: data.consultas_db,                // Consultas a la BD
                            sistema_activo: true,
                            timestamp: data.timestamp
                        };
                        console.log('🖥️ Métricas REALES del sistema actualizadas:', this.sistemMetrics);
                        console.log('📊 Actividad sistema CorteSec:', data.actividad_sistema, 'operaciones/hora');
                        console.log('👥 Empleados totales:', data.empleados_total);
                        console.log('🏦 Préstamos pendientes:', data.prestamos_pendientes);
                        console.log('💰 Nóminas del mes:', data.nominas_mes);
                    }
                } else {
                    console.warn('⚠️ Error cargando métricas del sistema');
                }
            } catch (error) {
                console.error('❌ Error en loadSistemMetrics:', error);
                // Mantener valores por defecto en caso de error
                this.sistemMetrics.sistema_activo = false;
            }
        },
        
        // Getters computados
        get hasFilters() {
            return this.filters.globalSearch || 
                   this.filters.quickFilters.length > 0 ||
                   this.filters.department ||
                   this.filters.cargo ||
                   this.filters.location ||
                   this.filters.dateFrom ||
                   this.filters.dateTo ||
                   this.filters.onlyActive ||
                   this.filters.withLoans ||
                   this.filters.recentPayroll ||
                   this.filters.newEmployees;
        },
        
        get totalResults() {
            return this.filteredResults.length;
        }
    };
}

// Registrar el store globalmente para Alpine.js
window.dashboardStore = createDashboardStore;

console.log('✅ Dashboard Alpine Store registrado globalmente');
