import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAppStore();

  // Usuario por defecto si no hay usuario logueado
  const currentUser = user || {
    name: 'Usuario Admin',
    email: 'admin@cortesec.com',
    role: 'Administrador',
    avatar: null,
    department: 'Sistemas',
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    status: 'online'
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target) &&
        buttonRef.current && 
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    console.log('🚪 Iniciando proceso de logout...');
    setIsOpen(false);
    
    try {
      // Llamar la función logout del store (que incluye la limpieza completa)
      if (logout) {
        await logout();
        console.log('✅ Logout completado exitosamente');
      }
      
      // Redirigir usando React Router
      navigate('/auth/login', { replace: true });
      
    } catch (error) {
      console.error('❌ Error durante logout:', error);
      // Incluso si hay error, redirigir al login
      navigate('/auth/login', { replace: true });
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') {
      return 'UA'; // Usuario Admin por defecto
    }
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastLogin = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Hace unos minutos'; // Valor por defecto
    }
    
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Hace unos minutos';
    if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days !== 1 ? 's' : ''}`;
  };

  const menuItems = [
    {
      icon: 'ti-user',
      label: 'Mi Perfil',
      shortcut: '⌘P',
      action: () => console.log('Ir a perfil')
    },
    {
      icon: 'ti-settings',
      label: 'Configuración',
      shortcut: '⌘,',
      action: () => console.log('Ir a configuración')
    },
    {
      icon: 'ti-bell',
      label: 'Notificaciones',
      action: () => console.log('Ir a notificaciones')
    },
    {
      icon: 'ti-help',
      label: 'Ayuda y Soporte',
      shortcut: '⌘?',
      action: () => console.log('Ir a ayuda')
    },
    { divider: true },
    {
      icon: 'ti-logout',
      label: 'Cerrar Sesión',
      shortcut: '⌘Q',
      action: handleLogout,
      danger: true
    }
  ];

  return (
    <div className="relative">
      {/* Botón del usuario */}
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-label="Menú de usuario"
        aria-expanded={isOpen}
      >
        {/* Avatar */}
        <div className="relative">
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-zinc-600 group-hover:border-blue-300 dark:group-hover:border-blue-500 transition-colors duration-300"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-gray-200 dark:border-zinc-600 group-hover:border-blue-300 dark:group-hover:border-blue-500 transition-all duration-300 group-hover:scale-105">
              {getInitials(currentUser.name)}
            </div>
          )}
          
          {/* Indicador de estado */}
          <div className={`
            absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 transition-colors duration-300
            ${currentUser.status === 'online' ? 'bg-emerald-500' : 
              currentUser.status === 'away' ? 'bg-amber-500' : 'bg-gray-400'}
          `}></div>
        </div>

        {/* Información del usuario (solo en pantallas grandes) */}
        <div className="hidden lg:block text-left">
          <div className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
            {currentUser.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {currentUser.role}
          </div>
        </div>

        {/* Icono de flecha */}
        <div className="hidden lg:block">
          <i className={`ti ti-chevron-down text-sm text-gray-400 transition-all duration-300 ${
            isOpen ? 'rotate-180 text-blue-500' : 'group-hover:text-gray-600 dark:group-hover:text-gray-300'
          }`}></i>
        </div>
      </button>

      {/* Menú desplegable */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200/50 dark:border-zinc-600/50 backdrop-blur-xl z-50 overflow-hidden"
        >
          {/* Header del menú */}
          <div className="p-4 border-b border-gray-100 dark:border-zinc-700/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-center space-x-3">
              {/* Avatar grande */}
              <div className="relative">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-12 h-12 rounded-full border-2 border-white dark:border-zinc-700 shadow-lg"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-base border-2 border-white dark:border-zinc-700 shadow-lg">
                    {getInitials(currentUser.name)}
                  </div>
                )}
                
                {/* Indicador de estado grande */}
                <div className={`
                  absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-800 flex items-center justify-center
                  ${currentUser.status === 'online' ? 'bg-emerald-500' : 
                    currentUser.status === 'away' ? 'bg-amber-500' : 'bg-gray-400'}
                `}>
                  {currentUser.status === 'online' && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>

              {/* Información detallada */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {currentUser.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {currentUser.email}
                </p>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                    {currentUser.role}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {currentUser.department}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Última conexión */}
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
              <i className="ti ti-clock text-xs"></i>
              <span>Último acceso: {formatLastLogin(currentUser.lastLogin)}</span>
            </div>
          </div>

          {/* Items del menú */}
          <div className="py-2">
            {menuItems.map((item, index) => {
              if (item.divider) {
                return (
                  <div key={index} className="my-2 border-t border-gray-100 dark:border-zinc-700/50"></div>
                );
              }

              return (
                <button
                  key={index}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-200 group
                    ${item.danger 
                      ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400' 
                      : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`
                      p-2 rounded-lg transition-colors duration-200
                      ${item.danger 
                        ? 'bg-red-100 dark:bg-red-900/30 group-hover:bg-red-200 dark:group-hover:bg-red-900/50' 
                        : 'bg-gray-100 dark:bg-zinc-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                      }
                    `}>
                      <i className={`${item.icon} text-sm ${
                        item.danger 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}></i>
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  
                  {item.shortcut && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded-md font-mono">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-zinc-700/50 bg-gray-50/50 dark:bg-zinc-900/50">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              CorteSec Enterprise v2.1.0 - © 2024
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
