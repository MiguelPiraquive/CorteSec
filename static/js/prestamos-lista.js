/**
 * Gestor de la Lista de Préstamos
 * Maneja confirmaciones, acciones AJAX y filtros
 */

// Función para confirmar aprobación de préstamo
function confirmarAprobacion(prestamoId, nombreEmpleado) {
    Swal.fire({
        title: '¿Aprobar préstamo?',
        text: `¿Está seguro de aprobar el préstamo de ${nombreEmpleado}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, aprobar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#6B7280',
        customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            content: 'swal2-content-custom'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Mostrar formulario para ingresar monto aprobado
            Swal.fire({
                title: 'Monto a aprobar',
                html: `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Monto aprobado
                        </label>
                        <input type="number" 
                               id="montoAprobado" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" 
                               placeholder="Ingrese el monto aprobado"
                               min="0">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Observaciones (opcional)
                        </label>
                        <textarea id="observacionesAprobacion" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" 
                                  rows="3"
                                  placeholder="Observaciones sobre la aprobación"></textarea>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Aprobar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#10B981',
                cancelButtonColor: '#6B7280',
                preConfirm: () => {
                    const monto = document.getElementById('montoAprobado').value;
                    const observaciones = document.getElementById('observacionesAprobacion').value;
                    
                    if (!monto || parseFloat(monto) <= 0) {
                        Swal.showValidationMessage('Debe ingresar un monto válido');
                        return false;
                    }
                    
                    return { monto, observaciones };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    enviarAprobacion(prestamoId, result.value.monto, result.value.observaciones);
                }
            });
        }
    });
}

// Función para enviar la aprobación
function enviarAprobacion(prestamoId, monto, observaciones) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/prestamos/${prestamoId}/aprobar/`;
    
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                     document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    if (csrfToken) {
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrfmiddlewaretoken';
        csrfInput.value = csrfToken;
        form.appendChild(csrfInput);
    }
    
    const montoInput = document.createElement('input');
    montoInput.type = 'hidden';
    montoInput.name = 'monto_aprobado';
    montoInput.value = monto;
    form.appendChild(montoInput);
    
    if (observaciones) {
        const obsInput = document.createElement('input');
        obsInput.type = 'hidden';
        obsInput.name = 'observaciones';
        obsInput.value = observaciones;
        form.appendChild(obsInput);
    }
    
    document.body.appendChild(form);
    form.submit();
}

// Función para confirmar rechazo de préstamo
function confirmarRechazo(prestamoId, nombreEmpleado) {
    Swal.fire({
        title: '¿Rechazar préstamo?',
        html: `
            <p class="mb-4">¿Está seguro de rechazar el préstamo de <strong>${nombreEmpleado}</strong>?</p>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Motivo del rechazo (requerido)
                </label>
                <textarea id="motivoRechazo" 
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" 
                          rows="3"
                          placeholder="Explique el motivo del rechazo"></textarea>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, rechazar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            content: 'swal2-content-custom'
        },
        preConfirm: () => {
            const motivo = document.getElementById('motivoRechazo').value.trim();
            
            if (!motivo) {
                Swal.showValidationMessage('Debe ingresar el motivo del rechazo');
                return false;
            }
            
            return motivo;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            enviarRechazo(prestamoId, result.value);
        }
    });
}

// Función para enviar el rechazo
function enviarRechazo(prestamoId, motivo) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/prestamos/${prestamoId}/rechazar/`;
    
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                     document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    if (csrfToken) {
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrfmiddlewaretoken';
        csrfInput.value = csrfToken;
        form.appendChild(csrfInput);
    }
    
    const motivoInput = document.createElement('input');
    motivoInput.type = 'hidden';
    motivoInput.name = 'motivo_rechazo';
    motivoInput.value = motivo;
    form.appendChild(motivoInput);
    
    document.body.appendChild(form);
    form.submit();
}

// Función para confirmar eliminación de préstamo
function confirmarEliminacion(prestamoId, nombreEmpleado) {
    Swal.fire({
        title: '¿Eliminar préstamo?',
        text: `¿Está seguro de eliminar el préstamo de ${nombreEmpleado}? Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            content: 'swal2-content-custom'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `/prestamos/${prestamoId}/eliminar/`;
            
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                             document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            if (csrfToken) {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrfmiddlewaretoken';
                csrfInput.value = csrfToken;
                form.appendChild(csrfInput);
            }
            
            document.body.appendChild(form);
            form.submit();
        }
    });
}

// Función para exportar préstamos
function exportarPrestamos() {
    Swal.fire({
        title: 'Exportar préstamos',
        text: 'Seleccione el formato de exportación',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Excel',
        cancelButtonText: 'PDF',
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#3B82F6',
        customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            content: 'swal2-content-custom'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Exportar a Excel
            window.location.href = '/prestamos/exportar/?formato=excel';
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // Exportar a PDF
            window.location.href = '/prestamos/exportar/?formato=pdf';
        }
    });
}

class PrestamosListaManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('📋 PrestamosListaManager inicializado correctamente');
    }

    setupEventListeners() {
        // Auto-submit en cambio de filtros
        const filtros = document.querySelectorAll('#filtrosForm select');
        filtros.forEach(filtro => {
            filtro.addEventListener('change', () => {
                document.getElementById('filtrosForm').submit();
            });
        });
    }

    // Funciones de confirmación
    confirmarAprobacion(id, empleado) {
        Swal.fire({
            title: '¿Aprobar préstamo?',
            text: `¿Está seguro de aprobar el préstamo de ${empleado}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#6B7280'
        }).then((result) => {
            if (result.isConfirmed) {
                this.aprobarPrestamo(id);
            }
        });
    }

    confirmarRechazo(id, empleado) {
        Swal.fire({
            title: '¿Rechazar préstamo?',
            text: `¿Está seguro de rechazar el préstamo de ${empleado}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, rechazar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280'
        }).then((result) => {
            if (result.isConfirmed) {
                this.rechazarPrestamo(id);
            }
        });
    }

    confirmarEliminacion(id, empleado) {
        Swal.fire({
            title: '¿Eliminar préstamo?',
            text: `¿Está seguro de eliminar el préstamo de ${empleado}? Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280'
        }).then((result) => {
            if (result.isConfirmed) {
                this.eliminarPrestamo(id);
            }
        });
    }

    // Funciones de acción
    async aprobarPrestamo(id) {
        try {
            const response = await fetch(`/prestamos/${id}/aprobar/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                Swal.fire({
                    title: '¡Aprobado!',
                    text: data.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.message,
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error al aprobar préstamo:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al procesar la solicitud',
                icon: 'error'
            });
        }
    }

    async rechazarPrestamo(id) {
        try {
            const response = await fetch(`/prestamos/${id}/rechazar/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                Swal.fire({
                    title: 'Rechazado',
                    text: data.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.message,
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error al rechazar préstamo:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al procesar la solicitud',
                icon: 'error'
            });
        }
    }

    async eliminarPrestamo(id) {
        try {
            const response = await fetch(`/prestamos/${id}/eliminar/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': this.getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                Swal.fire({
                    title: '¡Eliminado!',
                    text: data.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.message,
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error al eliminar préstamo:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al procesar la solicitud',
                icon: 'error'
            });
        }
    }

    confirmarDesembolso(id, empleado) {
        Swal.fire({
            title: '¿Desembolsar préstamo?',
            text: `¿Está seguro de desembolsar el préstamo de ${empleado}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, desembolsar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3B82F6',
            cancelButtonColor: '#6B7280',
            customClass: {
                popup: 'swal2-popup-custom',
                title: 'swal2-title-custom',
                content: 'swal2-content-custom'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.desembolsarPrestamo(id);
            }
        });
    }

    async desembolsarPrestamo(id) {
        try {
            const response = await fetch(`/prestamos/${id}/desembolsar/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                Swal.fire({
                    title: '¡Desembolsado!',
                    text: data.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.message,
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error al desembolsar préstamo:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al procesar la solicitud',
                icon: 'error'
            });
        }
    }

    exportarPrestamos() {
        Swal.fire({
            title: 'Exportar préstamos',
            text: '¿En qué formato desea exportar?',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Excel',
            denyButtonText: 'PDF',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10B981',
            denyButtonColor: '#3B82F6',
            cancelButtonColor: '#6B7280'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/prestamos/exportar/excel/';
            } else if (result.isDenied) {
                window.location.href = '/prestamos/exportar/pdf/';
            }
        });
    }

    // Función auxiliar para obtener el token CSRF
    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
               document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
               document.querySelector('input[name="csrfmiddlewaretoken"]')?.value;
    }
}

// Funciones globales para usar desde el HTML
function confirmarAprobacion(id, empleado) {
    window.prestamosListaManager.confirmarAprobacion(id, empleado);
}

function confirmarRechazo(id, empleado) {
    window.prestamosListaManager.confirmarRechazo(id, empleado);
}

function confirmarEliminacion(id, empleado) {
    window.prestamosListaManager.confirmarEliminacion(id, empleado);
}

function exportarPrestamos() {
    window.prestamosListaManager.exportarPrestamos();
}

function confirmarDesembolso(id, empleado) {
    if (window.prestamosListaManager) {
        window.prestamosListaManager.confirmarDesembolso(id, empleado);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando PrestamosListaManager...');
    window.prestamosListaManager = new PrestamosListaManager();
});

// Exportar para uso global
window.PrestamosListaManager = PrestamosListaManager;

console.log('📝 Script prestamos-lista.js cargado correctamente');
