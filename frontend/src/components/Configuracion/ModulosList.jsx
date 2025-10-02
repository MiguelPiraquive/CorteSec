import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModulos } from '../../hooks/useConfiguracion';

const ModulosList = () => {
  const { modulos, loading, error, fetchAll, toggle, remove } = useModulos();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchModulos = async () => {
    try {
      const response = await fetch('/api/configuracion/modulos/', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setModulos(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching modulos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = async (moduloId, currentStatus) => {
    try {
      const response = await fetch(`/api/configuracion/modulos/${moduloId}/toggle/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ activo: !currentStatus }),
      });
      
      if (response.ok) {
        setModulos(modulos.map(modulo => 
          modulo.id === moduloId ? { ...modulo, activo: !currentStatus } : modulo
        ));
      }
    } catch (error) {
      console.error('Error toggling module:', error);
    }
  };

  const handleUpdateOrder = async (moduloId, newOrder) => {
    try {
      const response = await fetch(`/api/configuracion/modulos/${moduloId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ orden_menu: newOrder }),
      });
      
      if (response.ok) {
        fetchModulos(); // Refrescar la lista
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  // Filtrar módulos
  const filteredModulos = modulos.filter(modulo => {
    const matchesSearch = modulo.modulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         modulo.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && modulo.activo) ||
                         (filterStatus === 'inactive' && !modulo.activo);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Módulos</h1>
            <p className="mt-2 opacity-90">Configuración y activación de módulos del sistema</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">Total de módulos</p>
            <p className="text-2xl font-bold">{modulos.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Módulos
            </label>
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Módulos Activos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {modulos.filter(m => m.activo).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Módulos Inactivos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {modulos.filter(m => !m.activo).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Módulos</p>
              <p className="text-2xl font-semibold text-gray-900">{modulos.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModulos.map((modulo) => (
          <div
            key={modulo.id}
            className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 ${
              modulo.activo 
                ? 'border-green-200 hover:border-green-300' 
                : 'border-gray-200 hover:border-gray-300 opacity-75'
            }`}
          >
            <div className="p-6">
              {/* Header del módulo */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    modulo.activo ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{modulo.modulo}</h3>
                    <p className="text-sm text-gray-500">v{modulo.version || '1.0'}</p>
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggleModule(modulo.id, modulo.activo)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    modulo.activo ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      modulo.activo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Descripción */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {modulo.descripcion || 'Sin descripción disponible'}
              </p>

              {/* Información adicional */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">URL:</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {modulo.url_patron || '/'}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Orden:</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={modulo.orden_menu || 0}
                      onChange={(e) => handleUpdateOrder(modulo.id, parseInt(e.target.value))}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  modulo.activo
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {modulo.activo ? 'Activo' : 'Inactivo'}
                </span>

                {/* Acciones */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate(`/configuracion/modulos/${modulo.id}`)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Configurar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredModulos.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay módulos</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all'
              ? 'No se encontraron módulos con los filtros aplicados.'
              : 'No hay módulos configurados en el sistema.'
            }
          </p>
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Información sobre la gestión de módulos
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                • Los módulos pueden activarse o desactivarse usando el interruptor.<br/>
                • El orden determina la posición en el menú principal.<br/>
                • Los cambios se aplican inmediatamente en el sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModulosList;
