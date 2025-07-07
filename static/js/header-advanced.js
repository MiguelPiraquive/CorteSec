/*
================================================================================
HEADER ADVANCED JAVASCRIPT - CORTESEC ENTERPRISE v2.1.0
================================================================================
Sistema avanzado para el header de CorteSec con funcionalidades empresariales.

✨ CARACTERÍSTICAS:
- Notificaciones en tiempo real
- Búsqueda global inteligente
- Menús desplegables interactivos
- Estado del usuario y sesión
- Responsive design avanzado
================================================================================
*/

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Header Advanced System Iniciado');
    
    // Inicializar sistema de header avanzado
    window.headerSystem = {
        // Estado del sistema
        isInitialized: false,
        notifications: [],
        searchResults: [],
        userMenuOpen: false,
        notificationsOpen: false,
        
        // Inicializar sistema
        init() {
            console.log('🚀 Inicializando Header Advanced System...');
            this.setupEventListeners();
            this.loadNotifications();
            this.setupSearchSystem();
            this.setupUserMenu();
            this.isInitialized = true;
            console.log('✅ Header Advanced System inicializado correctamente');
        },
        
        // Configurar event listeners
        setupEventListeners() {
            // Búsqueda global
            const searchInput = document.getElementById('global-search');
            if (searchInput) {
                searchInput.addEventListener('input', this.debounce(this.performGlobalSearch.bind(this), 300));
                searchInput.addEventListener('focus', this.showSearchResults.bind(this));
            }
            
            // Menú de usuario
            const userMenuButton = document.getElementById('user-menu-button');
            if (userMenuButton) {
                userMenuButton.addEventListener('click', this.toggleUserMenu.bind(this));
            }
            
            // Notificaciones
            const notificationsButton = document.getElementById('notifications-button');
            if (notificationsButton) {
                notificationsButton.addEventListener('click', this.toggleNotifications.bind(this));
            }
            
            // Cerrar menús al hacer click fuera
            document.addEventListener('click', this.handleOutsideClick.bind(this));
            
            // Escape para cerrar menús
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeAllMenus();
                }
            });
        },
        
        // Cargar notificaciones
        async loadNotifications() {
            try {
                // Simular carga de notificaciones (reemplazar con API real)
                this.notifications = [
                    {
                        id: 1,
                        type: 'info',
                        title: 'Sistema actualizado',
                        message: 'Nueva versión del dashboard disponible',
                        timestamp: new Date(),
                        read: false
                    },
                    {
                        id: 2,
                        type: 'warning',
                        title: 'Recordatorio',
                        message: 'Revisar nóminas pendientes',
                        timestamp: new Date(Date.now() - 86400000),
                        read: false
                    }
                ];
                
                this.updateNotificationBadge();
                console.log('📢 Notificaciones cargadas:', this.notifications.length);
            } catch (error) {
                console.error('❌ Error cargando notificaciones:', error);
            }
        },
        
        // Actualizar badge de notificaciones
        updateNotificationBadge() {
            const badge = document.getElementById('notifications-badge');
            const unreadCount = this.notifications.filter(n => !n.read).length;
            
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
        },
        
        // Sistema de búsqueda global
        setupSearchSystem() {
            this.searchCategories = [
                'empleados',
                'nominas',
                'prestamos',
                'departamentos',
                'cargos',
                'configuracion'
            ];
        },
        
        // Realizar búsqueda global
        async performGlobalSearch(event) {
            const query = event.target.value.trim();
            
            if (query.length < 2) {
                this.hideSearchResults();
                return;
            }
            
            try {
                // Simular búsqueda (reemplazar con API real)
                this.searchResults = [
                    {
                        id: 1,
                        type: 'empleado',
                        title: `Empleado: ${query}`,
                        subtitle: 'Resultado de búsqueda',
                        url: '/empleados/1/'
                    },
                    {
                        id: 2,
                        type: 'nomina',
                        title: `Nómina relacionada con: ${query}`,
                        subtitle: 'Gestión de nóminas',
                        url: '/nominas/'
                    }
                ];
                
                this.showSearchResults();
                console.log('🔍 Búsqueda realizada:', query, this.searchResults.length, 'resultados');
            } catch (error) {
                console.error('❌ Error en búsqueda:', error);
            }
        },
        
        // Mostrar resultados de búsqueda
        showSearchResults() {
            const resultsContainer = document.getElementById('search-results');
            if (!resultsContainer) return;
            
            if (this.searchResults.length === 0) {
                resultsContainer.innerHTML = '<div class="p-4 text-gray-500">No se encontraron resultados</div>';
            } else {
                resultsContainer.innerHTML = this.searchResults.map(result => `
                    <a href="${result.url}" class="block p-3 hover:bg-gray-50 border-b border-gray-100">
                        <div class="font-medium text-gray-900">${result.title}</div>
                        <div class="text-sm text-gray-600">${result.subtitle}</div>
                    </a>
                `).join('');
            }
            
            resultsContainer.style.display = 'block';
        },
        
        // Ocultar resultados de búsqueda
        hideSearchResults() {
            const resultsContainer = document.getElementById('search-results');
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
            }
        },
        
        // Configurar menú de usuario
        setupUserMenu() {
            // Cargar información del usuario
            this.loadUserInfo();
        },
        
        // Cargar información del usuario
        async loadUserInfo() {
            try {
                // Simular carga de info del usuario (reemplazar con API real)
                this.userInfo = {
                    name: 'Usuario CorteSec',
                    email: 'usuario@cortesec.com',
                    role: 'Administrador',
                    avatar: null
                };
                
                console.log('👤 Información de usuario cargada');
            } catch (error) {
                console.error('❌ Error cargando info de usuario:', error);
            }
        },
        
        // Toggle menú de usuario
        toggleUserMenu() {
            this.userMenuOpen = !this.userMenuOpen;
            this.notificationsOpen = false;
            
            const userMenu = document.getElementById('user-menu');
            if (userMenu) {
                userMenu.style.display = this.userMenuOpen ? 'block' : 'none';
            }
        },
        
        // Toggle notificaciones
        toggleNotifications() {
            this.notificationsOpen = !this.notificationsOpen;
            this.userMenuOpen = false;
            
            const notificationsMenu = document.getElementById('notifications-menu');
            if (notificationsMenu) {
                notificationsMenu.style.display = this.notificationsOpen ? 'block' : 'none';
                
                if (this.notificationsOpen) {
                    this.renderNotifications();
                }
            }
        },
        
        // Renderizar notificaciones
        renderNotifications() {
            const container = document.getElementById('notifications-container');
            if (!container) return;
            
            if (this.notifications.length === 0) {
                container.innerHTML = '<div class="p-4 text-gray-500 text-center">No hay notificaciones</div>';
            } else {
                container.innerHTML = this.notifications.map(notification => `
                    <div class="p-3 border-b border-gray-100 ${notification.read ? 'bg-gray-50' : 'bg-white'}">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="font-medium text-gray-900">${notification.title}</div>
                                <div class="text-sm text-gray-600 mt-1">${notification.message}</div>
                                <div class="text-xs text-gray-400 mt-2">${this.formatTimestamp(notification.timestamp)}</div>
                            </div>
                            ${!notification.read ? '<div class="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>' : ''}
                        </div>
                    </div>
                `).join('');
            }
        },
        
        // Formatear timestamp
        formatTimestamp(timestamp) {
            const now = new Date();
            const diff = now - timestamp;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return 'Ahora';
            if (minutes < 60) return `${minutes}m`;
            if (hours < 24) return `${hours}h`;
            return `${days}d`;
        },
        
        // Manejar clicks fuera de los menús
        handleOutsideClick(event) {
            const userMenu = document.getElementById('user-menu');
            const userMenuButton = document.getElementById('user-menu-button');
            const notificationsMenu = document.getElementById('notifications-menu');
            const notificationsButton = document.getElementById('notifications-button');
            const searchResults = document.getElementById('search-results');
            const searchInput = document.getElementById('global-search');
            
            // Cerrar menú de usuario si click fuera
            if (this.userMenuOpen && userMenu && !userMenu.contains(event.target) && !userMenuButton.contains(event.target)) {
                this.userMenuOpen = false;
                userMenu.style.display = 'none';
            }
            
            // Cerrar notificaciones si click fuera
            if (this.notificationsOpen && notificationsMenu && !notificationsMenu.contains(event.target) && !notificationsButton.contains(event.target)) {
                this.notificationsOpen = false;
                notificationsMenu.style.display = 'none';
            }
            
            // Cerrar resultados de búsqueda si click fuera
            if (searchResults && !searchResults.contains(event.target) && !searchInput.contains(event.target)) {
                this.hideSearchResults();
            }
        },
        
        // Cerrar todos los menús
        closeAllMenus() {
            this.userMenuOpen = false;
            this.notificationsOpen = false;
            
            const userMenu = document.getElementById('user-menu');
            const notificationsMenu = document.getElementById('notifications-menu');
            
            if (userMenu) userMenu.style.display = 'none';
            if (notificationsMenu) notificationsMenu.style.display = 'none';
            this.hideSearchResults();
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
        
        // Marcar notificación como leída
        markNotificationAsRead(notificationId) {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                this.updateNotificationBadge();
                this.renderNotifications();
            }
        },
        
        // Marcar todas las notificaciones como leídas
        markAllNotificationsAsRead() {
            this.notifications.forEach(n => n.read = true);
            this.updateNotificationBadge();
            this.renderNotifications();
        }
    };
    
    // Inicializar sistema de header
    window.headerSystem.init();
});

// Exportar para uso global
window.HeaderAdvanced = window.headerSystem;
