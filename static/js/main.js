/*
================================================================================
MAIN JAVASCRIPT - CORTESEC ENTERPRISE v2.1.0
================================================================================
Archivo principal de JavaScript para funcionalidades globales del sistema CorteSec.

✨ CARACTERÍSTICAS:
- Configuración global del sistema
- Utilities comunes
- Event listeners globales
- Inicialización de componentes
================================================================================
*/

// Configuración global del sistema
window.CorteSec = {
    version: '2.1.0',
    debug: false,
    apiUrl: '/api/',
    locale: 'es-CO',
    
    // Configuración de componentes
    config: {
        animations: true,
        autoSave: true,
        notifications: true,
        darkMode: false
    },
    
    // Utilidades globales
    utils: {
        // Formatear números como moneda colombiana
        formatCurrency(amount) {
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
            }).format(amount || 0);
        },
        
        // Formatear fechas
        formatDate(date, options = {}) {
            const defaultOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            return new Intl.DateTimeFormat('es-CO', { ...defaultOptions, ...options })
                .format(new Date(date));
        },
        
        // Debounce function
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        // Throttle function
        throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        
        // Copiar texto al portapapeles
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                if (window.showToast) {
                    window.showToast('Copiado al portapapeles', 'success');
                }
                return true;
            } catch (err) {
                console.error('Error copiando al portapapeles:', err);
                return false;
            }
        },
        
        // Validar email
        isValidEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        
        // Validar cédula colombiana
        isValidCedula(cedula) {
            const cleanCedula = cedula.replace(/\D/g, '');
            return cleanCedula.length >= 6 && cleanCedula.length <= 10;
        },
        
        // Generar ID único
        generateId() {
            return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    },
    
    // Inicializar sistema
    init() {
        console.log('🚀 Inicializando CorteSec Enterprise v' + this.version);
        this.setupGlobalEventListeners();
        this.loadUserPreferences();
        this.initializeComponents();
        console.log('✅ CorteSec inicializado correctamente');
    },
    
    // Configurar event listeners globales
    setupGlobalEventListeners() {
        // Manejar errores globales
        window.addEventListener('error', (event) => {
            if (this.debug) {
                console.error('Error global:', event.error);
            }
        });
        
        // Manejar cambios de conexión
        window.addEventListener('online', () => {
            if (window.showToast) {
                window.showToast('Conexión restaurada', 'success');
            }
        });
        
        window.addEventListener('offline', () => {
            if (window.showToast) {
                window.showToast('Sin conexión a internet', 'warning');
            }
        });
        
        // Prevenir zoom con Ctrl+Scroll en algunos casos
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                // Permitir zoom en campos de entrada específicos
                const allowZoomElements = ['input', 'textarea'];
                if (!allowZoomElements.includes(e.target.tagName.toLowerCase())) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
    },
    
    // Cargar preferencias del usuario
    loadUserPreferences() {
        try {
            const prefs = localStorage.getItem('cortesec_preferences');
            if (prefs) {
                const userPrefs = JSON.parse(prefs);
                this.config = { ...this.config, ...userPrefs };
            }
        } catch (error) {
            console.warn('Error cargando preferencias:', error);
        }
    },
    
    // Guardar preferencias del usuario
    saveUserPreferences() {
        try {
            localStorage.setItem('cortesec_preferences', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Error guardando preferencias:', error);
        }
    },
    
    // Inicializar componentes
    initializeComponents() {
        // Inicializar tooltips si existe la librería
        if (typeof tippy !== 'undefined') {
            tippy('[data-tippy-content]', {
                theme: 'cortesec',
                placement: 'top'
            });
        }
        
        // Inicializar elementos con lazy loading
        this.initLazyLoading();
        
        // Configurar formularios
        this.setupForms();
    },
    
    // Configurar lazy loading
    initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    },
    
    // Configurar formularios
    setupForms() {
        // Auto-guardar formularios
        if (this.config.autoSave) {
            document.querySelectorAll('form[data-autosave]').forEach(form => {
                const inputs = form.querySelectorAll('input, textarea, select');
                const saveKey = form.dataset.autosave;
                
                // Cargar datos guardados
                try {
                    const saved = localStorage.getItem(`form_${saveKey}`);
                    if (saved) {
                        const data = JSON.parse(saved);
                        Object.keys(data).forEach(key => {
                            const input = form.querySelector(`[name="${key}"]`);
                            if (input && input.type !== 'password') {
                                input.value = data[key];
                            }
                        });
                    }
                } catch (error) {
                    console.warn('Error cargando datos del formulario:', error);
                }
                
                // Guardar cambios
                const saveForm = this.utils.debounce(() => {
                    try {
                        const formData = new FormData(form);
                        const data = {};
                        for (let [key, value] of formData.entries()) {
                            if (form.querySelector(`[name="${key}"]`).type !== 'password') {
                                data[key] = value;
                            }
                        }
                        localStorage.setItem(`form_${saveKey}`, JSON.stringify(data));
                    } catch (error) {
                        console.warn('Error guardando formulario:', error);
                    }
                }, 1000);
                
                inputs.forEach(input => {
                    input.addEventListener('input', saveForm);
                });
            });
        }
        
        // Validación en tiempo real
        document.querySelectorAll('input[type="email"]').forEach(input => {
            input.addEventListener('blur', () => {
                if (input.value && !this.utils.isValidEmail(input.value)) {
                    input.setCustomValidity('Por favor ingrese un email válido');
                } else {
                    input.setCustomValidity('');
                }
            });
        });
    }
};

// Event listeners para inicialización
document.addEventListener('DOMContentLoaded', () => {
    window.CorteSec.init();
});

// Hacer disponible globalmente
window.CorteSec = window.CorteSec;