import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchGlobal = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  // Función de búsqueda simulada mejorada
  const searchFunction = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      return [];
    }

    // Simulación de resultados de búsqueda más profesional
    const mockResults = [
      // Empleados
      { id: 1, type: 'empleado', title: 'Juan Pérez González', subtitle: 'Desarrollador Senior - IT', category: 'Empleados', url: '/users/1', status: 'Activo' },
      { id: 2, type: 'empleado', title: 'María García López', subtitle: 'Gerente de Proyecto - PMO', category: 'Empleados', url: '/users/2', status: 'Activo' },
      { id: 3, type: 'empleado', title: 'Carlos Rodríguez', subtitle: 'Analista Financiero', category: 'Empleados', url: '/users/3', status: 'Vacaciones' },
      
      // Ubicaciones
      { id: 4, type: 'ubicacion', title: 'Oficina Principal', subtitle: 'Bogotá, Colombia - Sede Central', category: 'Ubicaciones', url: '/locations/1', status: 'Operativa' },
      { id: 5, type: 'ubicacion', title: 'Sala de Juntas Executive', subtitle: 'Piso 5, Ala Norte', category: 'Ubicaciones', url: '/locations/2', status: 'Disponible' },
      { id: 6, type: 'ubicacion', title: 'Data Center', subtitle: 'Nivel B1 - Infraestructura', category: 'Ubicaciones', url: '/locations/3', status: 'Restringido' },
      
      // Elementos/Items
      { id: 7, type: 'item', title: 'MacBook Pro M3', subtitle: 'MBPM3-2024-001 - Asignado a IT', category: 'Elementos', url: '/items/1', status: 'En uso' },
      { id: 8, type: 'item', title: 'Monitor Dell 4K', subtitle: 'DL4K-MON-2024-045', category: 'Elementos', url: '/items/2', status: 'Disponible' },
      { id: 9, type: 'item', title: 'iPhone 15 Pro', subtitle: 'IPH15P-2024-012', category: 'Elementos', url: '/items/3', status: 'Mantenimiento' },
      
      // Proyectos
      { id: 10, type: 'proyecto', title: 'Sistema CRM Enterprise', subtitle: 'Fase 2 - Integración con ERP', category: 'Proyectos', url: '/projects/1', status: 'En progreso' },
      { id: 11, type: 'proyecto', title: 'Migración Cloud AWS', subtitle: 'Infraestructura y DevOps', category: 'Proyectos', url: '/projects/2', status: 'Planificación' },
      
      // Reportes
      { id: 12, type: 'reporte', title: 'Inventario Mensual', subtitle: 'Octubre 2024 - Consolidado', category: 'Reportes', url: '/reports/inventory', status: 'Generado' },
      { id: 13, type: 'reporte', title: 'Análisis de Préstamos', subtitle: 'Q3 2024 - Financiero', category: 'Reportes', url: '/reports/loans', status: 'Pendiente' },
    ];

    // Filtrar resultados con mayor precisión
    return mockResults.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8); // Limitar a 8 resultados
  }, []);

  // Efecto para manejar la búsqueda con debounce
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        try {
          const searchResults = await searchFunction(query);
          setResults(searchResults);
        } catch (error) {
          console.error('Error en búsqueda:', error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchFunction]);

  // Manejar clicks fuera del componente
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atajos de teclado mejorados
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Atajo Ctrl+K o Cmd+K para enfocar la búsqueda
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        if (searchRef.current) {
          const input = searchRef.current.querySelector('input');
          input?.focus();
          setIsOpen(true);
        }
        return;
      }

      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : results.length - 1);
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          if (searchRef.current) {
            const input = searchRef.current.querySelector('input');
            input?.blur();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleResultClick = (result) => {
    navigate(result.url);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const getTypeIcon = (type) => {
    const iconConfig = {
      empleado: {
        icon: 'ti-user',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-600 dark:text-blue-400'
      },
      ubicacion: {
        icon: 'ti-map-pin',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        textColor: 'text-emerald-600 dark:text-emerald-400'
      },
      item: {
        icon: 'ti-package',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        textColor: 'text-purple-600 dark:text-purple-400'
      },
      proyecto: {
        icon: 'ti-briefcase',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        textColor: 'text-orange-600 dark:text-orange-400'
      },
      reporte: {
        icon: 'ti-chart-bar',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
        textColor: 'text-indigo-600 dark:text-indigo-400'
      }
    };

    const config = iconConfig[type] || {
      icon: 'ti-file',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      textColor: 'text-gray-600 dark:text-gray-400'
    };

    return (
      <div className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105`}>
        <i className={`${config.icon} ${config.textColor} text-lg`}></i>
      </div>
    );
  };

  const getStatusBadge = (status, type) => {
    const statusConfig = {
      'Activo': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Vacaciones': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Operativa': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Disponible': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Restringido': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'En uso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Mantenimiento': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'En progreso': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      'Planificación': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'Generado': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      'Pendiente': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    };

    const className = statusConfig[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${className} transition-colors duration-200`}>
        {status}
      </span>
    );
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-lg">
      {/* Input de búsqueda mejorado */}
      <div className={`
        relative transition-all duration-300 rounded-xl overflow-hidden
        ${isOpen && query.trim() 
          ? 'bg-white dark:bg-zinc-800 shadow-2xl ring-2 ring-blue-500/30 dark:ring-blue-400/30' 
          : 'bg-gray-50/80 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-700/80 hover:shadow-lg'
        }
        border border-gray-200/50 dark:border-zinc-600/50
      `}>
        <div className="relative flex items-center">
          {/* Icono de búsqueda */}
          <div className="absolute left-4 flex items-center pointer-events-none">
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            ) : (
              <i className={`ti ti-search text-lg transition-colors duration-200 ${
                isOpen && query.trim() ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
              }`}></i>
            )}
          </div>

          {/* Input */}
          <input
            type="text"
            placeholder="Buscar elementos, ubicaciones, empleados..."
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            className="w-full pl-12 pr-20 py-3.5 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm font-medium"
          />

          {/* Botón limpiar y atajo de teclado */}
          <div className="absolute right-3 flex items-center space-x-2">
            {query && (
              <button
                onClick={clearSearch}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-all duration-200"
                aria-label="Limpiar búsqueda"
              >
                <i className="ti ti-x text-sm"></i>
              </button>
            )}
            
            {/* Atajo de teclado */}
            <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-400 dark:text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded-md border border-gray-300 dark:border-zinc-600 font-mono font-medium">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de resultados mejorado */}
      {isOpen && (query.trim() || results.length > 0) && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200/50 dark:border-zinc-600/50 backdrop-blur-xl z-50 overflow-hidden"
        >
          {/* Header del panel */}
          {query.trim() && (
            <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700/50 bg-gray-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Resultados para "<span className="text-blue-600 dark:text-blue-400 font-semibold">{query}</span>"
                </p>
                {results.length > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-zinc-700 px-2 py-1 rounded-full">
                    {results.length} encontrado{results.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Loading state mejorado */}
          {loading && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Buscando...</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Analizando la base de datos</p>
            </div>
          )}

          {/* Estado sin resultados */}
          {!loading && results.length === 0 && query.trim() && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-zinc-700 rounded-full mb-4">
                <i className="ti ti-search-off text-2xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Sin resultados</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                No encontramos coincidencias para "<span className="font-medium">{query}</span>"
              </p>
              <div className="space-y-1 text-xs text-gray-400 dark:text-gray-500">
                <p>• Verifica la ortografía</p>
                <p>• Intenta con términos más generales</p>
                <p>• Usa sinónimos o palabras relacionadas</p>
              </div>
            </div>
          )}

          {/* Resultados */}
          {!loading && results.length > 0 && (
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`
                    w-full px-4 py-4 text-left transition-all duration-200 border-b border-gray-50 dark:border-zinc-700/30 last:border-b-0 group
                    ${index === selectedIndex 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-r-blue-500' 
                      : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50'
                    }
                  `}
                >
                  <div className="flex items-start space-x-4">
                    {/* Icono del tipo */}
                    {getTypeIcon(result.type)}
                    
                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                          {result.title}
                        </h4>
                        {getStatusBadge(result.status, result.type)}
                      </div>
                      
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                        {result.subtitle}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded-md">
                          {result.category}
                        </span>
                        <i className="ti ti-arrow-right text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200"></i>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Footer con atajos de teclado */}
          {isOpen && !loading && results.length > 0 && (
            <div className="px-4 py-3 bg-gray-50/50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-700/50">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded text-xs font-mono">↑↓</kbd>
                    <span>navegar</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded text-xs font-mono">Enter</kbd>
                    <span>abrir</span>
                  </span>
                </div>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded text-xs font-mono">Esc</kbd>
                  <span>cerrar</span>
                </span>
              </div>
            </div>
          )}

          {/* Sugerencias cuando está vacío */}
          {isOpen && !query.trim() && !loading && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Búsquedas sugeridas
              </p>
              {[
                { label: 'empleados activos', icon: 'ti-users' },
                { label: 'proyectos pendientes', icon: 'ti-briefcase' },
                { label: 'equipos disponibles', icon: 'ti-package' },
                { label: 'reportes mensuales', icon: 'ti-chart-bar' }
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(suggestion.label);
                    performSearch(suggestion.label);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-3">
                    <i className={`${suggestion.icon} text-gray-400 group-hover:text-blue-500 transition-colors duration-200`}></i>
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-200">
                      {suggestion.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchGlobal;
