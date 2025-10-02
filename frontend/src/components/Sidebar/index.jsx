import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';

const Sidebar = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const [openSubmenus, setOpenSubmenus] = useState({
    ubicaciones: false,
    rrhh: false
  });

  // Responsive: close on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  const closeDrawer = () => setSidebarOpen(false);
  
  const handleLogout = useCallback(() => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      console.log('Logout');
    }
  }, []);

  // Toggle submenus
  const toggleSubmenu = (menuKey) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Check if submenu should be active
  const isSubmenuActive = (paths) => {
    return paths.some(path => location.pathname === path || location.pathname.startsWith(path + '/'));
  };

  return (
    <>
      {/* Backdrop para TODAS las pantallas */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[35]"
          onClick={closeDrawer}
          aria-label="Cerrar menú"
          style={{ 
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)'
          }}
        />
      )}

      {/* Sidebar Principal */}
      <nav
        className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
          border-r border-gray-200/50 dark:border-gray-700/50
          shadow-xl dark:shadow-2xl
          pt-16 w-80`}
        style={{ backdropFilter: 'blur(20px)' }}
        aria-label="Sidebar navigation"
      >
        <div className="h-full w-full overflow-y-auto">
          
          {/* Branding y perfil ultra profesional con glassmorphism */}
          <div className="relative flex flex-col items-center py-10 px-6 border-b border-gray-200/30 dark:border-gray-700/30 transition-all duration-700">
            {/* Background glassmorphism con gradient mesh */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-purple-50/60 dark:from-gray-800/60 dark:via-gray-700/40 dark:to-gray-600/60 backdrop-blur-sm rounded-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 dark:via-white/5 to-transparent rounded-2xl"></div>
            
            {/* Avatar ultra premium con múltiples efectos */}
            <div className="relative group mb-6">
              {/* Glow rings animados */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-all duration-500 animate-pulse scale-110"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 rounded-full blur-lg opacity-30 group-hover:opacity-60 transition-all duration-700 animate-pulse scale-105"></div>
              
              {/* Avatar container */}
              <div className="relative">
                <img src="https://ui-avatars.com/api/?name=CS&background=4f46e5&color=fff&bold=true&size=128"
                     alt="Avatar de CorteSec"
                     className="w-20 h-20 relative rounded-full border-4 border-white/80 dark:border-gray-700/80 shadow-2xl transition-all duration-700 hover:scale-110 hover:shadow-3xl hover:border-white dark:hover:border-gray-600 group-hover:rotate-3" />
                
                {/* Status indicator */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white dark:border-gray-800 shadow-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            
            {/* Brand text ultra elegante */}
            <div className="relative z-10 text-center transition-all duration-700">
              <h1 className="font-black text-3xl tracking-tight bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-700 dark:from-gray-200 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2 hover:scale-105 transition-transform duration-300 cursor-default">
                CorteSec
              </h1>
              <div className="flex items-center justify-center gap-3 text-sm text-slate-600 dark:text-gray-300 font-medium mb-2">
                <div className="w-2.5 h-2.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                <span className="tracking-wide">Sistema Enterprise</span>
              </div>
              {/* Mini stats */}
              <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-gray-400 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 dark:border-gray-700/30">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Activo</span>
                </div>
                <div className="w-1 h-1 bg-slate-300 dark:bg-gray-600 rounded-full"></div>
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Seguro</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menú principal ultra profesional */}
          <div className="flex-1 py-6 px-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-gray-500">

          {/* Navigation Menu */}
          <ul className="flex flex-col gap-2">
            
            {/* Dashboard */}
            <li className="group relative">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`
                }
                onClick={closeDrawer}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Dashboard</span>
              </NavLink>
            </li>

            {/* Organizaciones */}
            <li className="group relative">
              <NavLink
                to="/organizations"
                className={({ isActive }) =>
                  `flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isActive ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`
                }
                onClick={closeDrawer}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Organizaciones</span>
              </NavLink>
            </li>

            {/* Separador */}
            <li className="my-4">
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-gray-600 to-transparent"></div>
              <div className="text-xs font-semibold text-slate-400 dark:text-gray-500 mt-3 mb-2 px-2 tracking-wider uppercase">Gestión Principal</div>
            </li>

            {/* Ubicaciones con Submenu */}
            <li className="group relative">
              <button
                onClick={() => toggleSubmenu('ubicaciones')}
                className={`flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isSubmenuActive(['/locations/departamentos', '/locations/municipios']) ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-green-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Ubicaciones</span>
                <svg className={`w-5 h-5 relative z-10 transition-transform duration-300 ${openSubmenus.ubicaciones ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Submenu de Ubicaciones */}
              <ul className={`transition-all duration-300 overflow-hidden ${openSubmenus.ubicaciones ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <li className="ml-6">
                  <NavLink
                    to="/locations/departamentos"
                    className={({ isActive }) =>
                      `flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg
                      ${isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-l-4 border-emerald-500' : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'}`
                    }
                    onClick={closeDrawer}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Departamentos
                  </NavLink>
                </li>
                <li className="ml-6 mt-1">
                  <NavLink
                    to="/locations/municipios"
                    className={({ isActive }) =>
                      `flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg
                      ${isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-l-4 border-emerald-500' : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'}`
                    }
                    onClick={closeDrawer}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10.54V17a2 2 0 002 2h12a2 2 0 002-2v-6.46" />
                    </svg>
                    Municipios
                  </NavLink>
                </li>
              </ul>
            </li>

            {/* Otros elementos principales */}
            <li className="group relative">
              <NavLink
                to="/organizations"
                className={({ isActive }) =>
                  `flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isActive ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`
                }
                onClick={closeDrawer}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Organizaciones</span>
              </NavLink>
            </li>

            <li className="group relative">
              <NavLink
                to="/proyectos"
                className={({ isActive }) =>
                  `flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isActive ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`
                }
                onClick={closeDrawer}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-red-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m0 0h2m0 0h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m0 0V3a2 2 0 012-2h2a2 2 0 012 2v2M7 7h.01M7 20h.01" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Proyectos</span>
              </NavLink>
            </li>

            <li className="group relative">
              <NavLink
                to="/pagos"
                className={({ isActive }) =>
                  `flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isActive ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`
                }
                onClick={closeDrawer}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Pagos</span>
              </NavLink>
            </li>

            {/* Separador RR.HH. */}
            <li className="my-4">
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-gray-600 to-transparent"></div>
              <div className="text-xs font-semibold text-slate-400 dark:text-gray-500 mt-3 mb-2 px-2 tracking-wider uppercase">Recursos Humanos</div>
            </li>

            {/* RR.HH. con Submenu */}
            <li className="group relative">
              <button
                onClick={() => toggleSubmenu('rrhh')}
                className={`flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isSubmenuActive(['/payroll/empleados', '/payroll/nominas', '/cargos']) ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">RR.HH.</span>
                <svg className={`w-5 h-5 relative z-10 transition-transform duration-300 ${openSubmenus.rrhh ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Submenu de RR.HH. */}
              <ul className={`transition-all duration-300 overflow-hidden ${openSubmenus.rrhh ? 'max-h-60 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <li className="ml-6">
                  <NavLink
                    to="/payroll/empleados"
                    className={({ isActive }) =>
                      `flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg
                      ${isActive ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-l-4 border-cyan-500' : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'}`
                    }
                    onClick={closeDrawer}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Colaboradores
                  </NavLink>
                </li>
                <li className="ml-6 mt-1">
                  <NavLink
                    to="/payroll/nominas"
                    className={({ isActive }) =>
                      `flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg
                      ${isActive ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-l-4 border-cyan-500' : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'}`
                    }
                    onClick={closeDrawer}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Nóminas
                  </NavLink>
                </li>
                <li className="ml-6 mt-1">
                  <NavLink
                    to="/cargos"
                    className={({ isActive }) =>
                      `flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg
                      ${isActive ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-l-4 border-cyan-500' : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'}`
                    }
                    onClick={closeDrawer}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Cargos
                  </NavLink>
                </li>
              </ul>
            </li>

            {/* Separador Inventario */}
            <li className="my-4">
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-gray-600 to-transparent"></div>
              <div className="text-xs font-semibold text-slate-400 dark:text-gray-500 mt-3 mb-2 px-2 tracking-wider uppercase">Inventario y Finanzas</div>
            </li>

            <li className="group relative">
              <NavLink
                to="/items"
                className={({ isActive }) =>
                  `flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isActive ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`
                }
                onClick={closeDrawer}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Items</span>
              </NavLink>
            </li>

            <li className="group relative">
              <NavLink
                to="/prestamos"
                className={({ isActive }) =>
                  `flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isActive ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg shadow-yellow-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`
                }
                onClick={closeDrawer}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Préstamos</span>
              </NavLink>
            </li>

            <li className="group relative">
              <NavLink
                to="/contabilidad"
                className={({ isActive }) =>
                  `flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isActive ? 'bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-lg shadow-slate-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`
                }
                onClick={closeDrawer}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-gray-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Contabilidad</span>
              </NavLink>
            </li>

            {/* Separador Admin */}
            <li className="my-4">
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-gray-600 to-transparent"></div>
              <div className="text-xs font-semibold text-slate-400 dark:text-gray-500 mt-3 mb-2 px-2 tracking-wider uppercase">Administración</div>
            </li>

            <li className="group relative">
              <NavLink
                to="/roles"
                className={({ isActive }) =>
                  `flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isActive ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`
                }
                onClick={closeDrawer}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Roles</span>
              </NavLink>
            </li>

            <li className="group relative">
              <NavLink
                to="/permisos"
                className={({ isActive }) =>
                  `flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden
                  ${isActive ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25' : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 hover:shadow-md'}`
                }
                onClick={closeDrawer}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Permisos</span>
              </NavLink>
            </li>

          </ul>
          </div>

          {/* Footer del sidebar */}
          <div className="relative p-6 border-t border-gray-200/40 dark:border-gray-700/40 backdrop-blur-sm mt-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-100/60 dark:from-gray-800/60 via-white/40 dark:via-gray-900/40 to-transparent rounded-t-2xl"></div>
            
            <div className="relative z-10">
              <button
                onClick={handleLogout}
                className="group flex items-center w-full px-5 py-4 rounded-xl transition-all duration-300 font-semibold relative overflow-hidden text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white hover:shadow-lg hover:shadow-red-500/25 bg-white/60 dark:bg-gray-800/60"
                aria-label="Cerrar sesión"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                
                <svg className="w-6 h-6 relative z-10 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="ml-4 flex-1 text-left relative z-10">Cerrar sesión</span>
              </button>
            </div>
          </div>

        </div>
      </nav>
    </>
  );
};

export default Sidebar;
