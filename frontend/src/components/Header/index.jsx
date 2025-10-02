import React, { memo, useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';
import Notifications from './Notifications';
import SearchGlobal from './SearchGlobal';
import SystemStatus from './SystemStatus';
import LanguageSelector from './LanguageSelector';
import OrganizationSelector from './OrganizationSelector';

const Header = memo(() => {
  const { user, theme, sidebarOpen, setSidebarOpen, toggleTheme } = useAppStore();
  const darkMode = theme === 'dark';
  const [currentTime, setCurrentTime] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Actualizar reloj cada segundo
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Detectar scroll
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    // Detectar conectividad
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timeInterval);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-ES', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <header 
      className={`
        bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border-b border-gray-200/40 dark:border-zinc-700/40
        fixed top-0 left-0 right-0 z-[9999] w-full transition-all duration-200 ease-out
        ${scrolled ? 'bg-white/90 dark:bg-zinc-900/90 shadow-2xl border-gray-300/60 dark:border-zinc-600/60' : 'shadow-lg'}
        ${sidebarOpen ? 'lg:ml-80' : ''}
      `}
      style={{ 
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: scrolled 
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
          : '0 4px 24px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
      }}
      role="banner"
      aria-label="Navegación principal"
    >
      
      {/* Gradient overlay ultra sutil */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10 pointer-events-none"></div>
      
      <div className="relative max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y Título Ultra Profesional */}
          <div className="flex items-center space-x-4">
            
            {/* Hamburger Button Premium - SIEMPRE VISIBLE */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="relative p-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-blue-50 dark:focus:bg-blue-900/30 rounded-2xl transition-all duration-200 ease-out group overflow-hidden"
              aria-label="Abrir/Cerrar menú de navegación"
            >
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl"></div>
              
              {sidebarOpen ? (
                <svg className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200 relative z-10" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5 group-hover:scale-110 transition-transform duration-200 relative z-10" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
              
              {/* Ring effect */}
              <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/0 group-hover:border-blue-400/20 transition-colors duration-200"></div>
            </button>

            <div className="flex-shrink-0">
              <div className="flex items-center space-x-3">
                <Link to="/dashboard" className="flex items-center space-x-3 group">
                  {/* Logo Premium con Shield mejorado */}
                  <div className="relative h-11 w-11 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25 group-hover:shadow-blue-500/40 group-hover:shadow-2xl transition-all duration-300 group-hover:scale-105 overflow-hidden">
                    {/* Inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl"></div>
                    
                    <svg className="w-6 h-6 text-white drop-shadow-sm relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    
                    {/* Anillo de carga mejorado */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-blue-300/40 animate-pulse"></div>
                    {/* Ring outer glow */}
                    <div className="absolute -inset-1 rounded-2xl border border-blue-400/20 group-hover:border-blue-400/40 transition-colors duration-300"></div>
                  </div>
                  
                  {/* Título con gradiente profesional mejorado */}
                  <div className="flex flex-col">
                    <span className="text-2xl font-black bg-gradient-to-r from-gray-900 via-blue-700 to-indigo-800 dark:from-white dark:via-blue-100 dark:to-indigo-200 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:via-indigo-600 group-hover:to-purple-600 dark:group-hover:from-blue-200 dark:group-hover:via-indigo-200 dark:group-hover:to-purple-200 transition-all duration-300">
                      CorteSec
                    </span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-300">
                      Enterprise Suite
                    </span>
                  </div>
                </Link>
                
                {/* Badge de versión premium mejorado - ahora al lado derecho */}
                <div className="hidden lg:flex">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-700/40 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 cursor-default">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse shadow-sm shadow-emerald-500/50"></div>
                    v2.1.0
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda Premium */}
          <div className="flex-1 max-w-2xl mx-8">
            <SearchGlobal />
          </div>

          {/* Controles Premium del lado derecho */}
          <div className="flex items-center space-x-3">
            
            {/* Estado del sistema premium mejorado */}
            <div className="hidden xl:flex items-center space-x-4 px-4 py-2.5 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/40 dark:border-zinc-600/40 shadow-lg hover:shadow-xl transition-all duration-200">
              {/* Estado de conexión mejorado con ícono */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  {/* Ícono de servidor/sistema */}
                  <div className="relative">
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    {/* Indicador de estado como badge */}
                    <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-zinc-800 shadow-lg ${online ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'}`}>
                      <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping ${online ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {online ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {/* Divisor */}
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              
              {/* Reloj digital premium mejorado */}
              <div className="flex items-center space-x-2">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 tracking-wide">
                  {formatTime(currentTime)}
                </span>
              </div>
            </div>

            {/* Organization Selector Premium */}
            <div className="hidden lg:block">
              <OrganizationSelector />
            </div>

            {/* Language Selector Premium */}
            <div className="hidden lg:block">
              <LanguageSelector />
            </div>

            {/* Notificaciones Premium */}
            <Notifications />

            {/* Toggle Dark Mode Premium - ULTRA FLUIDO Y LÓGICA CORREGIDA */}
            <button 
              onClick={toggleTheme} 
              className="relative p-3 text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-amber-50 dark:focus:bg-amber-900/30 rounded-2xl transition-colors duration-200 ease-out group overflow-hidden"
              aria-label="Cambiar tema"
            >
              {/* Background glow effect fluido */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-200/0 via-amber-200/15 to-amber-200/0 dark:from-amber-400/0 dark:via-amber-400/15 dark:to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              
              {/* Sol - aparece cuando darkMode = TRUE (ilumina el modo oscuro) */}
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${darkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-180 scale-90'}`}>
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              
              {/* Luna - aparece cuando darkMode = FALSE (representa la noche) */}
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${darkMode ? 'opacity-0 -rotate-180 scale-90' : 'opacity-100 rotate-0 scale-100'}`}>
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              
              {/* Ring effect suave */}
              <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/0 group-hover:border-amber-400/25 transition-all duration-300"></div>
              
              {/* Particles effect muy sutil */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute top-1.5 right-1.5 w-0.5 h-0.5 bg-amber-400 rounded-full animate-ping animation-delay-200"></div>
                <div className="absolute bottom-1.5 left-1.5 w-0.5 h-0.5 bg-amber-400 rounded-full animate-ping animation-delay-500"></div>
              </div>
            </button>

            {/* Ayuda/Soporte Premium con animaciones ultra mejoradas */}
            <Link
              to="/ayuda" 
              className="relative p-3 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-emerald-50 dark:focus:bg-emerald-900/30 rounded-2xl transition-all duration-200 ease-out group overflow-hidden"
              aria-label="Ayuda y soporte"
            >
              {/* Background glow effect mejorado */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/0 via-emerald-200/20 to-emerald-200/0 dark:from-emerald-400/0 dark:via-emerald-400/20 dark:to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl"></div>
              
              <svg className="w-5 h-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200 drop-shadow-sm relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              
              {/* Ring effect mejorado */}
              <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/0 group-hover:border-emerald-400/30 transition-colors duration-200"></div>
              
              {/* Pulse indicator */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </Link>

            {/* System Status Premium */}
            <div className="hidden lg:block">
              <SystemStatus />
            </div>

            {/* Menú de Usuario Premium */}
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Indicador de carga cinematográfico ultra sutil */}
      <div 
        className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-500 ${
          scrolled 
            ? 'bg-gradient-to-r from-transparent via-blue-400/20 to-transparent opacity-30' 
            : 'bg-gradient-to-r from-transparent via-blue-300/15 to-transparent opacity-20'
        }`}
      ></div>
      
      {/* Efectos de glassmorphism adicionales mejorados */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent pointer-events-none"></div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
