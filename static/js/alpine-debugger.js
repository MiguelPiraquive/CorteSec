/**
 * Alpine.js Dashboard Debugger
 * Herramienta para diagnosticar problemas con Alpine.js en el dashboard
 */

window.AlpineDebugger = {
    init() {
        console.log('🔍 Alpine.js Dashboard Debugger Iniciado');
        this.checkAlpineLoaded();
        this.checkDOMStructure();
        this.checkContexts();
        this.createDebugPanel();
    },

    checkAlpineLoaded() {
        console.log('📦 Verificando carga de Alpine.js...');
        if (typeof Alpine !== 'undefined') {
            console.log('✅ Alpine.js está cargado');
            console.log('📋 Versión Alpine:', Alpine.version || 'Desconocida');
        } else {
            console.error('❌ Alpine.js NO está cargado');
        }
    },

    checkDOMStructure() {
        console.log('🏗️ Verificando estructura DOM...');
        
        // Buscar elementos con x-data
        const xDataElements = document.querySelectorAll('[x-data]');
        console.log(`📊 Elementos con x-data encontrados: ${xDataElements.length}`);
        
        xDataElements.forEach((el, index) => {
            const xDataValue = el.getAttribute('x-data');
            console.log(`${index + 1}. Elemento:`, el.tagName, 'x-data:', xDataValue.substring(0, 50) + '...');
            
            // Verificar si el elemento está inicializado por Alpine
            if (el._x_dataStack) {
                console.log('   ✅ Inicializado por Alpine');
            } else {
                console.log('   ❌ NO inicializado por Alpine');
            }
        });

        // Buscar elementos con expresiones Alpine problemáticas
        const problematicExpressions = [
            'showFilters', 'loading', 'formatNumber', 'formatCurrency', 
            'metricas', 'kpiView', 'searchQuery', 'activeFilters'
        ];
        
        problematicExpressions.forEach(expr => {
            const elements = document.querySelectorAll(`[x-text*="${expr}"], [x-show*="${expr}"], [:class*="${expr}"]`);
            if (elements.length > 0) {
                console.log(`🔍 Expresiones con '${expr}': ${elements.length} elementos`);
            }
        });
    },

    checkContexts() {
        console.log('🎯 Verificando contextos Alpine...');
        
        if (typeof Alpine !== 'undefined' && Alpine.store) {
            const stores = Alpine.store();
            console.log('📦 Stores disponibles:', Object.keys(stores));
        }

        // Intentar encontrar el contexto principal del dashboard
        const mainDashboard = document.querySelector('[x-data*="loading"]');
        if (mainDashboard) {
            console.log('🎛️ Dashboard principal encontrado:', mainDashboard);
            
            // Intentar acceder al contexto
            try {
                const context = Alpine.$data(mainDashboard);
                console.log('📊 Contexto disponible:', Object.keys(context));
            } catch (error) {
                console.error('❌ Error accediendo al contexto:', error.message);
            }
        } else {
            console.error('❌ No se encontró el elemento principal del dashboard');
        }
    },

    createDebugPanel() {
        // Crear panel de debug flotante
        const debugPanel = document.createElement('div');
        debugPanel.id = 'alpine-debug-panel';
        debugPanel.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; z-index: 9999; background: #1f2937; color: white; padding: 15px; border-radius: 8px; max-width: 300px; font-family: monospace; font-size: 12px;">
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                    <strong>🔍 Alpine.js Debug</strong>
                    <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" style="background: #ef4444; border: none; color: white; padding: 2px 6px; border-radius: 4px; margin-left: 10px;">×</button>
                </div>
                <div id="debug-content">
                    <div>Status: <span id="alpine-status">Verificando...</span></div>
                    <div>Contextos: <span id="context-count">0</span></div>
                    <div>Errores: <span id="error-count">0</span></div>
                    <button onclick="AlpineDebugger.runTests()" style="background: #3b82f6; border: none; color: white; padding: 5px 10px; border-radius: 4px; margin-top: 10px; width: 100%;">Ejecutar Tests</button>
                    <button onclick="AlpineDebugger.fixCommonIssues()" style="background: #10b981; border: none; color: white; padding: 5px 10px; border-radius: 4px; margin-top: 5px; width: 100%;">Auto-Fix</button>
                </div>
            </div>
        `;
        document.body.appendChild(debugPanel);

        this.updateDebugPanel();
    },

    updateDebugPanel() {
        const statusEl = document.getElementById('alpine-status');
        const contextEl = document.getElementById('context-count');
        const errorEl = document.getElementById('error-count');

        if (!statusEl) return;

        // Status de Alpine
        statusEl.textContent = typeof Alpine !== 'undefined' ? '✅ Cargado' : '❌ No cargado';
        
        // Contar contextos
        const xDataElements = document.querySelectorAll('[x-data]');
        contextEl.textContent = xDataElements.length;

        // Contar errores (aproximado basado en elementos sin contexto)
        let errorCount = 0;
        xDataElements.forEach(el => {
            if (!el._x_dataStack) errorCount++;
        });
        errorEl.textContent = errorCount;
    },

    runTests() {
        console.log('🧪 Ejecutando tests de diagnóstico...');
        
        const tests = [
            this.testAlpineCore,
            this.testMainContext,
            this.testExpressions,
            this.testDOMNesting,
            this.testScriptOrder
        ];

        tests.forEach((test, index) => {
            try {
                console.log(`Test ${index + 1}:`, test.name);
                test.call(this);
            } catch (error) {
                console.error(`❌ Test ${index + 1} falló:`, error.message);
            }
        });
    },

    testAlpineCore() {
        if (typeof Alpine === 'undefined') {
            throw new Error('Alpine.js no está disponible');
        }
        console.log('✅ Alpine.js core está disponible');
    },

    testMainContext() {
        const mainEl = document.querySelector('[x-data*="loading"]');
        if (!mainEl) {
            throw new Error('Elemento principal con x-data no encontrado');
        }
        
        if (!mainEl._x_dataStack) {
            throw new Error('Contexto Alpine no inicializado en elemento principal');
        }
        
        console.log('✅ Contexto principal inicializado');
    },

    testExpressions() {
        const expressions = document.querySelectorAll('[x-text], [x-show], [:class]');
        let errorCount = 0;
        
        expressions.forEach(el => {
            const expr = el.getAttribute('x-text') || el.getAttribute('x-show') || el.getAttribute(':class');
            if (expr && (expr.includes('showFilters') || expr.includes('loading') || expr.includes('formatNumber'))) {
                if (!el._x_dataStack) {
                    errorCount++;
                }
            }
        });
        
        if (errorCount > 0) {
            throw new Error(`${errorCount} expresiones sin contexto Alpine válido`);
        }
        
        console.log('✅ Expresiones Alpine funcionando correctamente');
    },

    testDOMNesting() {
        const xDataElements = document.querySelectorAll('[x-data]');
        
        if (xDataElements.length > 1) {
            console.warn('⚠️ Múltiples elementos x-data detectados - verificar anidación');
            
            // Verificar anidación problemática
            let hasNestingIssue = false;
            xDataElements.forEach(el => {
                const parent = el.closest('[x-data]');
                if (parent && parent !== el) {
                    hasNestingIssue = true;
                }
            });
            
            if (hasNestingIssue) {
                throw new Error('Anidación problemática de x-data detectada');
            }
        }
        
        console.log('✅ Estructura DOM correcta');
    },

    testScriptOrder() {
        const scripts = document.querySelectorAll('script[src*="alpine"]');
        if (scripts.length === 0) {
            throw new Error('Scripts de Alpine.js no encontrados');
        }
        
        console.log('✅ Scripts de Alpine.js cargados');
    },

    fixCommonIssues() {
        console.log('🔧 Intentando reparaciones automáticas...');
        
        try {
            // 1. Reinicializar Alpine si es necesario
            if (typeof Alpine !== 'undefined') {
                console.log('🔄 Reinicializando Alpine...');
                
                // Limpiar elementos no inicializados
                const uninitialized = document.querySelectorAll('[x-data]:not([data-alpine-initialized])');
                uninitialized.forEach(el => {
                    if (!el._x_dataStack) {
                        Alpine.initTree(el);
                    }
                });
                
                console.log('✅ Reinicialización completada');
            }
            
            // 2. Crear contexto global de emergencia
            if (!window.dashboardContext) {
                console.log('🆘 Creando contexto de emergencia...');
                window.dashboardContext = {
                    loading: false,
                    showFilters: false,
                    formatNumber: (num) => num.toLocaleString('es-ES'),
                    formatCurrency: (amount) => new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    }).format(amount),
                    metricas: {
                        empleados: { total: 0, activos: 0, nuevos_mes: 0, crecimiento: 0 },
                        nominas: { total_mes: 0, produccion_mes: 0, count_mes: 0 },
                        prestamos: { activos: 0, pendientes: 0, en_mora: 0 },
                        proyectos: { activos: 0, completados: 0, este_mes: 0 },
                        rendimiento: { eficiencia: 0, ratio_prestamos: 0 }
                    }
                };
                console.log('✅ Contexto de emergencia creado');
            }
            
            this.updateDebugPanel();
            
        } catch (error) {
            console.error('❌ Error en reparación automática:', error.message);
        }
    },

    // Método para inyectar contexto en elementos problemáticos
    injectContext(element, context) {
        if (typeof Alpine !== 'undefined' && element) {
            Alpine.bind(element, context);
        }
    }
};

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => AlpineDebugger.init(), 1000);
    });
} else {
    setTimeout(() => AlpineDebugger.init(), 1000);
}

// Exponer funciones útiles globalmente
window.debugAlpine = () => AlpineDebugger.runTests();
window.fixAlpine = () => AlpineDebugger.fixCommonIssues();
