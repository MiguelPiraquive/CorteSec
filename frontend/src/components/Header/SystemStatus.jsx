import React, { useState, useEffect } from 'react';

const SystemStatus = () => {
  const [status, setStatus] = useState({
    connection: 'connected',
    server: 'online',
    database: 'operational',
    lastUpdate: new Date(),
    responseTime: 42,
    uptime: '99.9%',
    activeUsers: 127,
    cpuUsage: 23,
    memoryUsage: 67
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Simulación de verificación de estado del sistema mejorada
    const checkSystemStatus = () => {
      // Simular valores dinámicos
      const newResponseTime = Math.floor(Math.random() * 50) + 20;
      const newActiveUsers = Math.floor(Math.random() * 50) + 100;
      const newCpuUsage = Math.floor(Math.random() * 30) + 15;
      const newMemoryUsage = Math.floor(Math.random() * 40) + 50;
      
      setStatus(prev => ({
        ...prev,
        lastUpdate: new Date(),
        responseTime: newResponseTime,
        activeUsers: newActiveUsers,
        cpuUsage: newCpuUsage,
        memoryUsage: newMemoryUsage,
        connection: navigator.onLine ? 'connected' : 'disconnected'
      }));
    };

    // Verificar estado cada 30 segundos
    const interval = setInterval(checkSystemStatus, 30000);
    
    // Verificación inicial
    checkSystemStatus();

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (type, value) => {
    const configs = {
      connection: {
        connected: 'text-emerald-500',
        disconnected: 'text-red-500',
        connecting: 'text-amber-500'
      },
      server: {
        online: 'text-emerald-500',
        offline: 'text-red-500',
        maintenance: 'text-amber-500'
      },
      database: {
        operational: 'text-emerald-500',
        slow: 'text-amber-500',
        error: 'text-red-500'
      }
    };
    
    return configs[type]?.[value] || 'text-gray-500';
  };

  const getStatusIcon = (type, value) => {
    const configs = {
      connection: {
        connected: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        ),
        disconnected: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364L18.364 5.636" />
          </svg>
        ),
        connecting: (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      },
      server: {
        online: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        ),
        offline: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ),
        maintenance: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      },
      database: {
        operational: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        ),
        slow: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        error: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      }
    };
    
    return configs[type]?.[value] || (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
      </svg>
    );
  };

  const getResponseTimeColor = (time) => {
    if (time < 50) return 'text-emerald-500';
    if (time < 100) return 'text-amber-500';
    return 'text-red-500';
  };

  const getUsageColor = (percentage) => {
    if (percentage < 50) return 'text-emerald-500';
    if (percentage < 80) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="relative">
      {/* Botón de estado del sistema */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-xl transition-all duration-300 group overflow-hidden"
        aria-label="Estado del sistema"
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"></div>
        
        {/* Ícono de actividad/monitoreo más pequeño */}
        <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        
        {/* Indicador de estado más visible */}
        <span className={`
          absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-zinc-800 shadow-sm transition-colors duration-300
          ${status.server === 'online' && status.connection === 'connected' 
            ? 'bg-emerald-500 animate-pulse shadow-emerald-500/50' 
            : 'bg-red-500 shadow-red-500/50'
          }
        `}></span>
        
        {/* Ring effect */}
        <div className="absolute inset-0 rounded-xl border-2 border-emerald-400/0 group-hover:border-emerald-400/20 transition-colors duration-200"></div>
      </button>

      {/* Panel de estado del sistema */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200/50 dark:border-zinc-600/50 backdrop-blur-xl z-50 overflow-hidden">
          
          {/* Header */}
          <div className="px-4 py-4 border-b border-gray-100 dark:border-zinc-700/50 bg-gray-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Estado del Sistema
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Última actualización: {status.lastUpdate.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Estados principales */}
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              
              {/* Estado del servidor */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${status.server === 'online' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <div className={`${getStatusColor('server', status.server)}`}>
                      {getStatusIcon('server', status.server)}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Servidor</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{status.server}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${status.server === 'online' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
              </div>

              {/* Estado de la base de datos */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${status.database === 'operational' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <div className={`${getStatusColor('database', status.database)}`}>
                      {getStatusIcon('database', status.database)}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Base de Datos</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{status.database}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${status.database === 'operational' ? 'bg-blue-500' : 'bg-red-500'} animate-pulse`}></div>
              </div>

              {/* Estado de conexión */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${status.connection === 'connected' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <div className={`${getStatusColor('connection', status.connection)}`}>
                      {getStatusIcon('connection', status.connection)}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Conexión</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{status.connection}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${status.connection === 'connected' ? 'bg-purple-500' : 'bg-red-500'} animate-pulse`}></div>
              </div>
            </div>

            {/* Métricas de rendimiento */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">Métricas de Rendimiento</h4>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Tiempo de respuesta */}
                <div className="p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Respuesta</span>
                    <span className={`text-xs font-bold ${getResponseTimeColor(status.responseTime)}`}>
                      {status.responseTime}ms
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-600 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        status.responseTime < 50 ? 'bg-emerald-500' : 
                        status.responseTime < 100 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(status.responseTime, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Uptime */}
                <div className="p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Uptime</span>
                    <span className="text-xs font-bold text-emerald-500">
                      {status.uptime}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-600 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: '99.9%' }}></div>
                  </div>
                </div>

                {/* CPU */}
                <div className="p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">CPU</span>
                    <span className={`text-xs font-bold ${getUsageColor(status.cpuUsage)}`}>
                      {status.cpuUsage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-600 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        status.cpuUsage < 50 ? 'bg-emerald-500' : 
                        status.cpuUsage < 80 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${status.cpuUsage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Memoria */}
                <div className="p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">RAM</span>
                    <span className={`text-xs font-bold ${getUsageColor(status.memoryUsage)}`}>
                      {status.memoryUsage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-600 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        status.memoryUsage < 50 ? 'bg-emerald-500' : 
                        status.memoryUsage < 80 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${status.memoryUsage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Usuarios activos */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Usuarios Activos</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">En línea ahora</p>
                </div>
              </div>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {status.activeUsers}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-zinc-700/50 bg-gray-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Sistema operativo
                </span>
              </div>
              <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200">
                Ver detalles completos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatus;
