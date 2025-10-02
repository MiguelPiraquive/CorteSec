import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ===== UI STATE =====
      theme: 'dark', // Cambio temporal para probar
      sidebarCollapsed: typeof window !== 'undefined' ? localStorage.getItem('sidebarCollapsed') === 'true' : false, // ✅ Leer del localStorage
      sidebarOpen: typeof window !== 'undefined' ? localStorage.getItem('sidebarCollapsed') !== 'true' : false, // ✅ Sincronizado
      loading: false,  // ✅ CAMBIO: Empezar con loading = false por defecto
      
      // ===== USER STATE =====
      user: null,
      isAuthenticated: false,
      error: null,
      
      // ===== DASHBOARD STATE =====
      currentPeriod: 'mes',
      autoRefresh: true,
      refreshInterval: 30,
      
      // ===== SEARCH STATE =====
      searchQuery: '',
      searchResults: [],
      showAdvancedFilters: false,
      
      // ===== NOTIFICATIONS STATE =====
      notifications: [],
      unreadCount: 0,
      showNotifications: false,
      
      // ===== ACTIONS =====
      
      // Variable para evitar múltiples inicializaciones
      _isStoreInitialized: false,
      
      // Initialize app - SIMPLIFICADO para no interferir con persist
      initializeStore: () => {
        const state = get();
        
        // ✅ PROTECCIÓN: Evitar múltiples inicializaciones
        if (state._isStoreInitialized) {
          console.log('Store already initialized, skipping...');
          return;
        }
        
        console.log('Initializing store...'); // Debug
        
        // ✅ LIMPIAR localStorage residual que puede causar conflictos (pero NO el theme ni sidebar)
        localStorage.removeItem('user_session');
        
        // ✅ CARGAR ESTADO DE AUTENTICACIÓN MANUALMENTE (no desde Zustand persist)
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('user');
        let user = null;
        
        try {
          user = userStr ? JSON.parse(userStr) : null;
        } catch (e) {
          console.warn('Invalid user data in localStorage, clearing...');
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
        }
        
        const isAuthenticated = !!(token && user);
        
        console.log('Auth state from localStorage:', { 
          hasToken: !!token,
          hasUser: !!user,
          isAuthenticated,
          sidebarCollapsed: state.sidebarCollapsed
        }); // Debug
        
        // ✅ SIEMPRE terminar el loading, independientemente del estado
        console.log('Setting loading to false and marking as initialized');
        set({
          loading: false,
          _isStoreInitialized: true,
          error: null,
          // ✅ CARGAR ESTADO DE AUTH DESDE LOCALSTORAGE
          user,
          isAuthenticated
        });
        
        // Apply theme immediately - lee del localStorage si existe
        const savedTheme = localStorage.getItem('theme');
        const currentTheme = savedTheme || state.theme;
        
        // Si hay un tema guardado diferente al actual, actualizar el state
        if (savedTheme && savedTheme !== state.theme) {
          set({ theme: savedTheme });
        }
        
        document.documentElement.classList.toggle('dark', currentTheme === 'dark');
        document.documentElement.setAttribute('data-bs-theme', currentTheme);
      },
      
      // Theme actions - ULTRA FLUIDO Y ANTI-CRASH
      toggleTheme: () => {
        const state = get();
        
        // Prevenir múltiples clicks rápidos
        if (state._isTogglingTheme) return;
        
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        
        // Marcar que estamos cambiando tema
        set({ _isTogglingTheme: true });
        
        // CAMBIO SUAVE DEL DOM
        const htmlElement = document.documentElement;
        
        // Aplicar cambios de manera fluida
        htmlElement.classList.toggle('dark', newTheme === 'dark');
        htmlElement.setAttribute('data-bs-theme', newTheme);
        
        // Actualizar estado inmediatamente
        set({ theme: newTheme });
        
        // Guardar en localStorage de manera segura
        requestAnimationFrame(() => {
          try {
            localStorage.setItem('theme', newTheme);
          } catch (e) {
            console.warn('Could not save theme to localStorage:', e);
          }
          
          // Liberar el lock después de que la animación termine
          setTimeout(() => {
            set({ _isTogglingTheme: false });
          }, 350); // Slightly longer than CSS transition
        });
      },
      
      // Estado para prevenir spam clicks
      _isTogglingTheme: false,
      
      setTheme: (theme) => {
        const htmlElement = document.documentElement;
        
        // Aplicar cambios con máxima optimización
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            htmlElement.classList.toggle('dark', theme === 'dark');
            htmlElement.setAttribute('data-bs-theme', theme);
            
            // Hardware acceleration boost
            htmlElement.style.transform = 'translateZ(0)';
            setTimeout(() => {
              htmlElement.style.transform = '';
            }, 0);
          });
        });
        
        setTimeout(() => {
          set({ theme });
          localStorage.setItem('theme', theme);
        }, 0);
      },
      
      // Sidebar actions - SISTEMA PROFESIONAL Y ROBUSTO
      setSidebarCollapsed: (collapsed) => {
        const state = get();
        
        console.log('📝 Set Sidebar Collapsed:', { 
          current: state.sidebarCollapsed, 
          new: collapsed 
        });
        
        if (state.sidebarCollapsed === collapsed) return;
        
        // Actualización INMEDIATA
        set({ 
          sidebarCollapsed: collapsed,
          sidebarOpen: !collapsed
        });
        
        localStorage.setItem('sidebarCollapsed', collapsed.toString());
      },
      
      toggleSidebar: () => {
        const state = get();
        const newCollapsed = !state.sidebarCollapsed;
        
        console.log('🔄 Toggle Sidebar:', { 
          current: state.sidebarCollapsed, 
          new: newCollapsed 
        });
        
        // Actualización INMEDIATA sin async
        set({ 
          sidebarCollapsed: newCollapsed,
          sidebarOpen: !newCollapsed
        });
        
        // Persistir inmediatamente
        localStorage.setItem('sidebarCollapsed', newCollapsed.toString());
      },
      
      setSidebarOpen: (open) => {
        const state = get();
        
        // En desktop: sincronizar con collapsed state
        // En mobile: manejar solo el overlay
        const isMobile = window.innerWidth < 992;
        
        if (isMobile) {
          // En mobile, solo controlar el overlay
          set({ sidebarOpen: open });
        } else {
          // En desktop, sincronizar ambos estados
          set({ 
            sidebarOpen: open,
            sidebarCollapsed: !open
          });
          
          setTimeout(() => {
            localStorage.setItem('sidebarCollapsed', (!open).toString());
          }, 0);
        }
      },
      
      setLoading: (loading) => set({ loading }),
      
      // User actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),
      
      login: async (email, password, remember = false) => {
        set({ loading: true, error: null });
        try {
          const res = await authService.login({ email, password, remember });
          if (res?.success && res.user && res.token) {
            // Guardado ya lo hace authService; reflejar en store
            set({
              user: res.user,
              isAuthenticated: true,
              loading: false,
              error: null,
            });
            return { success: true, message: res.message || 'Login exitoso' };
          }
          const message = res?.message || 'Credenciales inválidas';
          set({ loading: false, error: message, isAuthenticated: false, user: null });
          return { success: false, message };
        } catch (e) {
          const message = e?.message || 'Error de conexión';
          set({ loading: false, error: message, isAuthenticated: false, user: null });
          return { success: false, message };
        }
      },
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      logout: async () => {
        try { 
          await authService.logout(); 
        } catch (_) {
          console.warn('API logout failed, continuing with local cleanup');
        }
        
        // Limpiar TODA la información de autenticación
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('authToken');
        
        // Actualizar estado de Zustand
        set({ 
          user: null, 
          isAuthenticated: false,
          error: null,
          loading: false
        });
        
        console.log('🚪 Logout completed - user should be logged out');
      },
      
      // Search actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setSearchResults: (results) => set({ searchResults: results }),
      
      toggleAdvancedFilters: () => {
        const state = get();
        set({ showAdvancedFilters: !state.showAdvancedFilters });
      },
      
      // Notification actions
      addNotification: (notification) => {
        const state = get();
        const newNotification = {
          id: Date.now(),
          timestamp: new Date(),
          read: false,
          ...notification
        };
        
        set({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1
        });
      },
      
      markNotificationAsRead: (notificationId) => {
        const state = get();
        const updatedNotifications = state.notifications.map(notification =>
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        );
        
        const unreadCount = updatedNotifications.filter(n => !n.read).length;
        
        set({
          notifications: updatedNotifications,
          unreadCount: unreadCount
        });
      },
      
      clearAllNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0
        });
      },
      
      // Dashboard actions
      setCurrentPeriod: (period) => set({ currentPeriod: period }),
      
      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),
      
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
      
      toggleNotifications: () => {
        const state = get();
        set({ showNotifications: !state.showNotifications });
      }
    }),
    {
      name: 'cortesec-app-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        currentPeriod: state.currentPeriod,
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval,
        // ✅ CAMBIO CRÍTICO: NO persistir datos de autenticación
        // user y isAuthenticated se manejan dinámicamente desde localStorage
      }),
      // ✅ CRÍTICO: Callback cuando Zustand termine de hidratar
      onRehydrateStorage: () => {
        console.log('Zustand rehydration started...');
        return (state, error) => {
          if (error) {
            console.error('Zustand rehydration failed:', error);
          } else {
            console.log('Zustand rehydration completed successfully');
            // ✅ No necesitamos hacer nada aquí, loading ya es false por defecto
          }
        };
      }
    }
  )
);

// Export both named and default
export const useStore = useAppStore;
export default useAppStore;
