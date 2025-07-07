/*
================================================================================
NOTIFICATION SYSTEM - CORTESEC ENTERPRISE v2.1.0
================================================================================
Sistema avanzado de notificaciones para CorteSec con múltiples tipos de alerta,
persistencia, animaciones y integración con el backend.

✨ CARACTERÍSTICAS:
- Múltiples tipos de notificación (success, error, warning, info)
- Persistencia en localStorage
- Animaciones fluidas
- Auto-dismiss configurable
- Queue de notificaciones
- Integración con API del backend
================================================================================
*/

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        this.init();
    }

    init() {
        console.log('🔔 Inicializando Sistema de Notificaciones CorteSec...');
        this.createContainer();
        this.loadPersistedNotifications();
        this.setupGlobalFunction();
        console.log('✅ Sistema de Notificaciones inicializado correctamente');
    }

    createContainer() {
        if (document.getElementById('notification-container')) {
            this.container = document.getElementById('notification-container');
            return;
        }

        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', options = {}) {
        const notification = {
            id: this.generateId(),
            message,
            type,
            timestamp: new Date(),
            duration: options.duration || this.defaultDuration,
            persistent: options.persistent || false,
            actions: options.actions || []
        };

        this.addNotification(notification);
        this.renderNotification(notification);
        
        if (!notification.persistent && notification.duration > 0) {
            setTimeout(() => {
                this.remove(notification.id);
            }, notification.duration);
        }

        return notification.id;
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        
        // Limitar número de notificaciones
        if (this.notifications.length > this.maxNotifications) {
            const oldest = this.notifications.pop();
            this.removeElement(oldest.id);
        }

        this.saveToStorage();
    }

    renderNotification(notification) {
        const element = document.createElement('div');
        element.id = `notification-${notification.id}`;
        element.className = this.getNotificationClasses(notification.type);
        
        const icon = this.getIcon(notification.type);
        const actionsHtml = this.renderActions(notification.actions, notification.id);
        
        element.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <i class="${icon} text-lg"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                        ${notification.message}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ${this.formatTimestamp(notification.timestamp)}
                    </p>
                    ${actionsHtml}
                </div>
                <div class="flex-shrink-0">
                    <button onclick="notificationSystem.remove('${notification.id}')" 
                            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
            </div>
        `;

        // Agregar al container con animación
        element.style.transform = 'translateX(100%)';
        element.style.opacity = '0';
        this.container.insertBefore(element, this.container.firstChild);

        // Animar entrada
        requestAnimationFrame(() => {
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
            element.style.transition = 'all 0.3s ease-out';
        });
    }

    getNotificationClasses(type) {
        const baseClasses = 'bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 p-4 transform transition-all duration-300';
        
        const typeClasses = {
            success: 'border-green-500',
            error: 'border-red-500',
            warning: 'border-yellow-500',
            info: 'border-blue-500'
        };

        return `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
    }

    getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle text-green-500',
            error: 'fas fa-exclamation-circle text-red-500',
            warning: 'fas fa-exclamation-triangle text-yellow-500',
            info: 'fas fa-info-circle text-blue-500'
        };

        return icons[type] || icons.info;
    }

    renderActions(actions, notificationId) {
        if (!actions || actions.length === 0) return '';

        return `
            <div class="mt-2 flex space-x-2">
                ${actions.map(action => `
                    <button onclick="notificationSystem.handleAction('${notificationId}', '${action.id}')"
                            class="text-xs px-3 py-1 rounded ${action.primary ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'} hover:opacity-80 transition-opacity">
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    handleAction(notificationId, actionId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        const action = notification.actions.find(a => a.id === actionId);
        if (action && typeof action.handler === 'function') {
            action.handler();
        }

        this.remove(notificationId);
    }

    remove(id) {
        const element = document.getElementById(`notification-${id}`);
        if (element) {
            element.style.transform = 'translateX(100%)';
            element.style.opacity = '0';
            
            setTimeout(() => {
                this.removeElement(id);
            }, 300);
        }

        this.notifications = this.notifications.filter(n => n.id !== id);
        this.saveToStorage();
    }

    removeElement(id) {
        const element = document.getElementById(`notification-${id}`);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    clear() {
        this.notifications.forEach(n => this.remove(n.id));
        this.notifications = [];
        this.saveToStorage();
    }

    formatTimestamp(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        
        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return timestamp.toLocaleDateString('es-CO');
    }

    generateId() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveToStorage() {
        try {
            const persistentNotifications = this.notifications.filter(n => n.persistent);
            localStorage.setItem('cortesec_notifications', JSON.stringify(persistentNotifications));
        } catch (error) {
            console.warn('⚠️ No se pudieron guardar las notificaciones en localStorage:', error);
        }
    }

    loadPersistedNotifications() {
        try {
            const stored = localStorage.getItem('cortesec_notifications');
            if (stored) {
                const notifications = JSON.parse(stored);
                notifications.forEach(notification => {
                    notification.timestamp = new Date(notification.timestamp);
                    this.addNotification(notification);
                    this.renderNotification(notification);
                });
            }
        } catch (error) {
            console.warn('⚠️ Error cargando notificaciones persistentes:', error);
        }
    }

    setupGlobalFunction() {
        // Función global para mostrar notificaciones
        window.showToast = (message, type = 'info', options = {}) => {
            return this.show(message, type, options);
        };

        // Función global para notificaciones de éxito
        window.showSuccess = (message, options = {}) => {
            return this.show(message, 'success', options);
        };

        // Función global para notificaciones de error
        window.showError = (message, options = {}) => {
            return this.show(message, 'error', options);
        };

        // Función global para notificaciones de advertencia
        window.showWarning = (message, options = {}) => {
            return this.show(message, 'warning', options);
        };

        // Función global para notificaciones informativas
        window.showInfo = (message, options = {}) => {
            return this.show(message, 'info', options);
        };

        // Función para mostrar notificaciones con acciones
        window.showNotificationWithActions = (message, type, actions, options = {}) => {
            return this.show(message, type, { ...options, actions });
        };
    }

    // Métodos de conveniencia para diferentes tipos
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    // Notificaciones específicas del sistema
    showSystemUpdate(version) {
        return this.show(
            `Sistema actualizado a la versión ${version}`,
            'success',
            {
                persistent: true,
                actions: [
                    {
                        id: 'view_changelog',
                        label: 'Ver cambios',
                        primary: true,
                        handler: () => {
                            console.log('Ver changelog');
                        }
                    }
                ]
            }
        );
    }

    showMaintenanceMode() {
        return this.show(
            'El sistema entrará en mantenimiento en 5 minutos',
            'warning',
            {
                persistent: true,
                actions: [
                    {
                        id: 'save_work',
                        label: 'Guardar trabajo',
                        primary: true,
                        handler: () => {
                            console.log('Guardar trabajo pendiente');
                        }
                    }
                ]
            }
        );
    }

    showBackupComplete() {
        return this.show(
            'Copia de seguridad completada exitosamente',
            'success',
            { duration: 3000 }
        );
    }

    showConnectionError() {
        return this.show(
            'Error de conexión con el servidor. Reintentando...',
            'error',
            {
                persistent: true,
                actions: [
                    {
                        id: 'retry',
                        label: 'Reintentar',
                        primary: true,
                        handler: () => {
                            window.location.reload();
                        }
                    }
                ]
            }
        );
    }
}

// Inicializar sistema de notificaciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.notificationSystem = new NotificationSystem();
    console.log('🔔 Sistema de Notificaciones CorteSec listo');
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}
