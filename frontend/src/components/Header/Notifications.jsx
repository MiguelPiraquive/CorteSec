import React, { useState, useRef, useEffect } from 'react';

const Notifications = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'info',
      title: 'Nueva asignación de equipo',
      message: 'Se te ha asignado el MacBook Pro M3 para el proyecto CRM.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
      icon: 'ti-device-laptop',
      category: 'Asignaciones'
    },
    {
      id: 2,
      type: 'warning',
      title: 'Revisión pendiente urgente',
      message: 'Tienes 3 elementos pendientes de revisión que vencen hoy.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: false,
      icon: 'ti-clock-exclamation',
      category: 'Revisiones'
    },
    {
      id: 3,
      type: 'success',
      title: 'Mantenimiento completado',
      message: 'El servidor principal fue actualizado exitosamente.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      icon: 'ti-check-circle',
      category: 'Mantenimiento'
    }
  ]);

  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

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

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Ahora mismo';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const getNotificationTypeConfig = (type) => {
    const configs = {
      info: {
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        borderColor: 'border-blue-200 dark:border-blue-700'
      },
      warning: {
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        textColor: 'text-amber-600 dark:text-amber-400',
        borderColor: 'border-amber-200 dark:border-amber-700'
      },
      success: {
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        borderColor: 'border-emerald-200 dark:border-emerald-700'
      },
      error: {
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-600 dark:text-red-400',
        borderColor: 'border-red-200 dark:border-red-700'
      }
    };
    
    return configs[type] || configs.info;
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-xl transition-all duration-300 group"
        aria-label="Notificaciones"
      >
        <i className="fas fa-bell text-base transition-transform duration-300 group-hover:scale-110"></i>
        
        {/* Badge de notificaciones no leídas */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200/50 dark:border-zinc-600/50 backdrop-blur-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-4 border-b border-gray-100 dark:border-zinc-700/50 bg-gray-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notificaciones
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                  >
                    Marcar todo como leído
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors duration-200"
                >
                  <i className="ti ti-x text-sm"></i>
                </button>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Tienes {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
              </p>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="space-y-1">
                {notifications.map((notification) => {
                  const typeConfig = getNotificationTypeConfig(notification.type);
                  
                  return (
                    <div
                      key={notification.id}
                      className={`
                        px-4 py-4 border-l-4 ${typeConfig.borderColor} transition-all duration-200 cursor-pointer group
                        ${!notification.read 
                          ? 'bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50'
                        }
                      `}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Icono de la notificación */}
                        <div className={`
                          p-2 ${typeConfig.bgColor} rounded-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-105
                        `}>
                          <i className={`${notification.icon} ${typeConfig.textColor} text-lg`}></i>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className={`
                              text-sm font-semibold truncate transition-colors duration-200
                              ${!notification.read 
                                ? 'text-gray-900 dark:text-white' 
                                : 'text-gray-700 dark:text-gray-300'
                              }
                            `}>
                              {notification.title}
                            </h4>
                            
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0 animate-pulse"></div>
                            )}
                          </div>

                          <p className={`
                            text-sm mb-2 line-clamp-2 transition-colors duration-200
                            ${!notification.read 
                              ? 'text-gray-600 dark:text-gray-300' 
                              : 'text-gray-500 dark:text-gray-400'
                            }
                          `}>
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded-md">
                              {notification.category}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {formatRelativeTime(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-zinc-700 rounded-full mb-4">
                  <i className="ti ti-bell-off text-2xl text-gray-400 dark:text-gray-500"></i>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Sin notificaciones
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No tienes notificaciones pendientes
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-zinc-700/50 bg-gray-50/50 dark:bg-zinc-900/50">
              <button className="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200">
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
