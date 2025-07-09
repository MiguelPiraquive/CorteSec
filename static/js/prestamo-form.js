/**
 * Gestor del Formulario de Préstamos
 * Maneja validaciones, cálculos automáticos y formateo de números
 */

class PrestamoFormManager {
    constructor() {
        this.form = document.getElementById('prestamoForm');
        
        // Intentar encontrar elementos por ID primero
        this.montoInput = document.getElementById('id_monto_solicitado');
        this.plazoInput = document.getElementById('id_plazo_meses');
        this.tasaInput = document.getElementById('id_tasa_interes');
        this.fechaSolicitudInput = document.getElementById('id_fecha_solicitud');
        this.fechaPrimerPagoInput = document.getElementById('id_fecha_primer_pago');
        
        // Si no encuentra por ID, buscar por name o selector más específico
        if (!this.montoInput) {
            this.montoInput = document.querySelector('input[name="monto_solicitado"]');
            console.log('🔍 Monto encontrado por name:', !!this.montoInput);
        }
        if (!this.plazoInput) {
            this.plazoInput = document.querySelector('input[name="plazo_meses"]');
            console.log('🔍 Plazo encontrado por name:', !!this.plazoInput);
        }
        if (!this.tasaInput) {
            this.tasaInput = document.querySelector('input[name="tasa_interes"]');
            console.log('🔍 Tasa encontrada por name:', !!this.tasaInput);
        }
        if (!this.fechaSolicitudInput) {
            this.fechaSolicitudInput = document.querySelector('input[name="fecha_solicitud"]');
        }
        if (!this.fechaPrimerPagoInput) {
            this.fechaPrimerPagoInput = document.querySelector('input[name="fecha_primer_pago"]');
        }
        
        console.log('🔍 Elementos encontrados:', {
            form: !!this.form,
            monto: !!this.montoInput,
            plazo: !!this.plazoInput,
            tasa: !!this.tasaInput,
            fechaSolicitud: !!this.fechaSolicitudInput,
            fechaPrimerPago: !!this.fechaPrimerPagoInput
        });
        
        this.init();
    }

    init() {
        if (!this.form) {
            console.warn('❌ Formulario de préstamo no encontrado');
            return;
        }
        
        // Log de elementos encontrados
        console.log('🔍 Estado de elementos:', {
            form: !!this.form,
            monto: !!this.montoInput,
            plazo: !!this.plazoInput,
            tasa: !!this.tasaInput,
            fechaSolicitud: !!this.fechaSolicitudInput,
            fechaPrimerPago: !!this.fechaPrimerPagoInput
        });
        
        // Verificar elementos críticos para cálculo
        if (!this.montoInput) console.warn('❌ Campo monto no encontrado - ID esperado: id_monto_solicitado');
        if (!this.plazoInput) console.warn('❌ Campo plazo no encontrado - ID esperado: id_plazo_meses');
        if (!this.tasaInput) console.warn('❌ Campo tasa no encontrado - ID esperado: id_tasa_interes');
        
        this.setupEventListeners();
        this.setupDateDefaults();
        this.triggerCalculations();
        
        console.log('💼 PrestamoFormManager inicializado correctamente');
    }

    setupEventListeners() {
        // Validación y formateo de números
        if (this.montoInput) {
            this.montoInput.addEventListener('input', (e) => this.handleMontoInput(e));
            this.montoInput.addEventListener('blur', (e) => this.validateMonto(e));
        }

        if (this.tasaInput) {
            this.tasaInput.addEventListener('input', (e) => this.handleTasaInput(e));
            this.tasaInput.addEventListener('blur', (e) => this.validateTasa(e));
        }

        if (this.plazoInput) {
            this.plazoInput.addEventListener('input', (e) => this.handlePlazoInput(e));
            this.plazoInput.addEventListener('blur', (e) => this.validatePlazo(e));
        }

        // Cálculo automático de fechas
        if (this.fechaSolicitudInput) {
            this.fechaSolicitudInput.addEventListener('change', () => this.calculateFechaPrimerPago());
        }

        // Validación del formulario antes del envío
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.validateForm(e));
        }

        // Cálculos en tiempo real
        [this.montoInput, this.tasaInput, this.plazoInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    setTimeout(() => this.triggerCalculations(), 100);
                });
            }
        });
    }

    setupDateDefaults() {
        // Establecer fecha actual si no hay valor
        if (this.fechaSolicitudInput && !this.fechaSolicitudInput.value) {
            const today = new Date().toISOString().split('T')[0];
            this.fechaSolicitudInput.value = today;
            this.calculateFechaPrimerPago();
        }
    }

    handleMontoInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^\d]/g, '');
        
        // Para campos number, mantener solo dígitos sin formato
        if (value) {
            input.value = value;
        } else {
            input.value = '';
        }
        
        this.clearFieldError(input);
    }

    handleTasaInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^\d.]/g, '');
        
        // Permitir solo un punto decimal
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Limitar a 2 decimales
        if (parts[1] && parts[1].length > 2) {
            value = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        input.value = value;
        this.clearFieldError(input);
    }

    handlePlazoInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^\d]/g, '');
        
        if (value) {
            const numValue = parseInt(value);
            if (numValue > 60) {
                value = '60'; // Máximo 60 meses
            }
            input.value = value;
        } else {
            input.value = '';
        }
        
        this.clearFieldError(input);
    }

    validateMonto(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        
        if (!value || value <= 0) {
            this.showFieldError(input, 'El monto debe ser mayor a 0');
            return false;
        }
        
        if (value > 100000000) { // 100 millones
            this.showFieldError(input, 'El monto no puede ser mayor a $100,000,000');
            return false;
        }
        
        this.clearFieldError(input);
        return true;
    }

    validateTasa(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        
        // Permitir tasa de 0% (sin interés)
        if (isNaN(value) || value < 0) {
            this.showFieldError(input, 'La tasa de interés debe ser mayor o igual a 0');
            return false;
        }
        
        if (value > 50) {
            this.showFieldError(input, 'La tasa de interés no puede ser mayor al 50%');
            return false;
        }
        
        this.clearFieldError(input);
        return true;
    }

    validatePlazo(event) {
        const input = event.target;
        const value = parseInt(input.value);
        
        if (!value || value <= 0) {
            this.showFieldError(input, 'El plazo debe ser mayor a 0 meses');
            return false;
        }
        
        if (value > 60) {
            this.showFieldError(input, 'El plazo no puede ser mayor a 60 meses');
            return false;
        }
        
        this.clearFieldError(input);
        return true;
    }

    calculateFechaPrimerPago() {
        if (!this.fechaSolicitudInput || !this.fechaPrimerPagoInput) return;
        
        const fechaSolicitud = new Date(this.fechaSolicitudInput.value);
        if (isNaN(fechaSolicitud.getTime())) return;
        
        // Calcular un mes después
        const fechaPrimerPago = new Date(fechaSolicitud);
        fechaPrimerPago.setMonth(fechaPrimerPago.getMonth() + 1);
        
        // Formatear para input date
        const year = fechaPrimerPago.getFullYear();
        const month = String(fechaPrimerPago.getMonth() + 1).padStart(2, '0');
        const day = String(fechaPrimerPago.getDate()).padStart(2, '0');
        
        this.fechaPrimerPagoInput.value = `${year}-${month}-${day}`;
    }

    triggerCalculations() {
        const monto = this.montoInput ? parseFloat(this.montoInput.value) || 0 : 0;
        const tasa = this.tasaInput ? parseFloat(this.tasaInput.value) || 0 : 0;
        const plazo = this.plazoInput ? parseInt(this.plazoInput.value) || 0 : 0;
        
        console.log('🧮 Calculando cuota con valores:', { 
            monto, 
            tasa, 
            plazo,
            montoInput: this.montoInput?.value,
            tasaInput: this.tasaInput?.value,
            plazoInput: this.plazoInput?.value
        });
        
        this.updateCalculatedPayment(monto, tasa, plazo);
    }

    updateCalculatedPayment(monto, tasaAnual, plazoMeses) {
        const cuotaDisplay = document.getElementById('cuota-calculada');
        if (!cuotaDisplay) {
            console.warn('❌ Elemento cuota-calculada no encontrado en el DOM');
            return;
        }

        console.log('💰 Actualizando cálculo de cuota:', { monto, tasaAnual, plazoMeses });

        if (monto <= 0 || plazoMeses <= 0) {
            cuotaDisplay.textContent = '$0';
            console.log('⚠️ Valores insuficientes para cálculo');
            return;
        }

        try {
            let cuotaMensual;
            
            if (tasaAnual === 0) {
                // Sin interés
                cuotaMensual = monto / plazoMeses;
                console.log('📊 Cálculo sin interés:', cuotaMensual);
            } else {
                // Con interés - fórmula de anualidad
                const tasaMensual = (tasaAnual / 100) / 12;
                cuotaMensual = monto * (tasaMensual * Math.pow(1 + tasaMensual, plazoMeses)) / 
                              (Math.pow(1 + tasaMensual, plazoMeses) - 1);
                console.log('📊 Cálculo con interés:', { tasaMensual, cuotaMensual });
            }
            
            // Formatear como moneda colombiana
            const formatter = new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
            
            const cuotaFormateada = formatter.format(cuotaMensual);
            cuotaDisplay.textContent = cuotaFormateada;
            console.log('✅ Cuota calculada y mostrada:', cuotaFormateada);
        } catch (error) {
            console.error('❌ Error calculando cuota:', error);
            cuotaDisplay.textContent = '$0';
        }
    }

    showFieldError(input, message) {
        this.clearFieldError(input);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'mt-1 text-sm text-red-600 field-error-prestamo';
        errorDiv.innerHTML = `<p>${message}</p>`;
        
        // Buscar el contenedor del campo
        const fieldContainer = input.closest('.form-field') || input.parentNode;
        fieldContainer.appendChild(errorDiv);
        
        // Aplicar estilos de error
        input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
    }

    clearFieldError(input) {
        // Remover mensajes de error existentes
        const fieldContainer = input.closest('.form-field') || input.parentNode;
        const existingErrors = fieldContainer.querySelectorAll('.field-error-prestamo');
        existingErrors.forEach(error => error.remove());
        
        // Remover estilos de error
        input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
    }

    validateForm(event) {
        let isValid = true;
        
        // Validar campos principales
        if (this.montoInput && !this.validateMonto({ target: this.montoInput })) {
            isValid = false;
        }
        
        if (this.tasaInput && !this.validateTasa({ target: this.tasaInput })) {
            isValid = false;
        }
        
        if (this.plazoInput && !this.validatePlazo({ target: this.plazoInput })) {
            isValid = false;
        }
        
        if (!isValid) {
            event.preventDefault();
            
            // Mostrar alerta con SweetAlert2 si está disponible
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Error de Validación',
                    text: 'Por favor, corrija los errores en el formulario antes de continuar.',
                    icon: 'error',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#EF4444'
                });
            } else {
                alert('Por favor, corrija los errores en el formulario antes de continuar.');
            }
        }
        
        return isValid;
    }

    reset() {
        if (!this.form) return;
        
        const doReset = () => {
            this.form.reset();
            
            // Limpiar errores
            const errors = this.form.querySelectorAll('.field-error-prestamo');
            errors.forEach(error => error.remove());
            
            // Limpiar estilos de error
            const errorInputs = this.form.querySelectorAll('.border-red-500');
            errorInputs.forEach(input => {
                input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
            });
            
            // Restablecer fecha por defecto
            this.setupDateDefaults();
            
            // Limpiar calculadora
            const cuotaDisplay = document.getElementById('cuota-calculada');
            if (cuotaDisplay) {
                cuotaDisplay.textContent = '$0';
            }
        };
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '¿Limpiar formulario?',
                text: 'Esto borrará todos los datos ingresados.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, limpiar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#F59E0B',
                cancelButtonColor: '#6B7280'
            }).then((result) => {
                if (result.isConfirmed) {
                    doReset();
                    
                    Swal.fire({
                        title: 'Formulario limpiado',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            });
        } else {
            if (confirm('¿Está seguro de que desea limpiar el formulario?')) {
                doReset();
            }
        }
    }
}

// Inicializar automáticamente cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando PrestamoFormManager...');
    
    // Verificar que existe el formulario antes de inicializar
    const form = document.getElementById('prestamoForm');
    if (!form) {
        console.warn('❌ No se encontró el formulario prestamoForm en la página');
        return;
    }
    
    // Esperar un poco para asegurar que todos los elementos estén cargados
    setTimeout(() => {
        console.log('🚀 Iniciando PrestamoFormManager...');
        window.prestamoFormManager = new PrestamoFormManager();
        console.log('✅ PrestamoFormManager iniciado exitosamente');
    }, 100);
});

// Exportar para uso global
window.PrestamoFormManager = PrestamoFormManager;

console.log('📝 Script prestamo-form.js cargado correctamente');
