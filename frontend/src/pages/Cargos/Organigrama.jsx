import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJerarquia } from '../../hooks/useCargos';

const Organigrama = () => {
  const [viewMode, setViewMode] = useState('tree'); // tree, compact, table
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedCargo, setSelectedCargo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Hook personalizado para obtener la jerarquía
  const { 
    jerarquia, 
    loading, 
    error 
  } = useJerarquia();

  // Construir árbol jerárquico
  const buildOrgTree = () => {
    if (!jerarquia) return null;

    const cargoMap = new Map();
    const filtered = jerarquia.filter(cargo => {
      const matchesSearch = !searchTerm || 
        cargo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cargo.codigo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActiveFilter = showInactive || cargo.activo;
      return matchesSearch && matchesActiveFilter;
    });

    // Crear mapa de cargos
    filtered.forEach(cargo => {
      cargoMap.set(cargo.id, { ...cargo, subordinados: [] });
    });

    // Construir relaciones padre-hijo
    const roots = [];
    filtered.forEach(cargo => {
      const cargoNode = cargoMap.get(cargo.id);
      if (cargo.cargo_superior && cargoMap.has(cargo.cargo_superior)) {
        const superior = cargoMap.get(cargo.cargo_superior);
        superior.subordinados.push(cargoNode);
      } else {
        roots.push(cargoNode);
      }
    });

    return roots;
  };

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allNodes = new Set();
    const collectNodes = (nodes) => {
      nodes.forEach(node => {
        allNodes.add(node.id);
        if (node.subordinados) {
          collectNodes(node.subordinados);
        }
      });
    };
    
    const roots = buildOrgTree();
    if (roots) {
      collectNodes(roots);
      setExpandedNodes(allNodes);
    }
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderCargoCard = (cargo, level = 0, isLastInLevel = false) => {
    const isExpanded = expandedNodes.has(cargo.id);
    const hasSubordinados = cargo.subordinados && cargo.subordinados.length > 0;

    return (
      <div key={cargo.id} className="relative">
        {/* Líneas de conexión */}
        {level > 0 && (
          <div className="absolute left-0 top-0 w-8 h-6 border-l-2 border-b-2 border-gray-300"></div>
        )}
        
        <div className={`ml-${level * 8} relative`}>
          {/* Nodo del cargo */}
          <div 
            className={`inline-block bg-white border-2 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${
              selectedCargo?.id === cargo.id ? 'border-blue-500' : 'border-gray-200'
            } ${!cargo.activo ? 'opacity-60' : ''}`}
            onClick={() => setSelectedCargo(cargo)}
          >
            <div className="flex items-start space-x-3">
              {/* Botón de expansión */}
              {hasSubordinados && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(cargo.id);
                  }}
                  className="mt-1 p-1 rounded hover:bg-gray-100"
                >
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              
              {/* Información del cargo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {cargo.nombre}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    cargo.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {cargo.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600">{cargo.codigo}</p>
                
                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                  <span>Nivel {cargo.nivel_jerarquico}</span>
                  <span>{cargo.empleados_count || 0} empleados</span>
                  {hasSubordinados && (
                    <span>{cargo.subordinados.length} subordinados</span>
                  )}
                </div>
                
                {cargo.puede_aprobar && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Puede aprobar
                    </span>
                  </div>
                )}
              </div>
              
              {/* Acciones */}
              <div className="flex flex-col space-y-1">
                <Link
                  to={`/cargos/${cargo.id}`}
                  className="text-blue-600 hover:text-blue-900 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ver detalle
                </Link>
                <Link
                  to={`/cargos/${cargo.id}/editar`}
                  className="text-gray-600 hover:text-gray-900 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  Editar
                </Link>
              </div>
            </div>
          </div>
          
          {/* Subordinados */}
          {isExpanded && hasSubordinados && (
            <div className="mt-4 ml-8 space-y-4">
              {cargo.subordinados.map((subordinado, index) => 
                renderCargoCard(subordinado, level + 1, index === cargo.subordinados.length - 1)
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCompactView = () => {
    const roots = buildOrgTree();
    if (!roots || roots.length === 0) return null;

    const allCargos = [];
    const flattenTree = (nodes, level = 0) => {
      nodes.forEach(node => {
        allCargos.push({ ...node, level });
        if (node.subordinados) {
          flattenTree(node.subordinados, level + 1);
        }
      });
    };
    flattenTree(roots);

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Vista Compacta</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {allCargos.map((cargo) => (
            <div 
              key={cargo.id} 
              className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                selectedCargo?.id === cargo.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedCargo(cargo)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div style={{ marginLeft: `${cargo.level * 1.5}rem` }} className="flex items-center space-x-2">
                    {cargo.level > 0 && (
                      <span className="text-gray-400">└─</span>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{cargo.nombre}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          cargo.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {cargo.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{cargo.codigo} • Nivel {cargo.nivel_jerarquico}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{cargo.empleados_count || 0} empleados</span>
                  <Link
                    to={`/cargos/${cargo.id}`}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTableView = () => {
    const roots = buildOrgTree();
    if (!roots || roots.length === 0) return null;

    const allCargos = [];
    const flattenTree = (nodes) => {
      nodes.forEach(node => {
        allCargos.push(node);
        if (node.subordinados) {
          flattenTree(node.subordinados);
        }
      });
    };
    flattenTree(roots);

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cargo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nivel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Superior
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empleados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allCargos.map((cargo) => (
                <tr 
                  key={cargo.id} 
                  className={`hover:bg-gray-50 cursor-pointer ${
                    selectedCargo?.id === cargo.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedCargo(cargo)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{cargo.nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{cargo.codigo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Nivel {cargo.nivel_jerarquico}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {cargo.cargo_superior_nombre || 'Sin superior'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{cargo.empleados_count || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      cargo.activo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {cargo.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/cargos/${cargo.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver
                    </Link>
                    <Link
                      to={`/cargos/${cargo.id}/editar`}
                      className="text-gray-600 hover:text-gray-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 mt-2">Cargando organigrama...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error al cargar organigrama
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const orgTree = buildOrgTree();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  to="/cargos"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Organigrama</h1>
                  <p className="text-sm text-gray-600">
                    Estructura organizacional completa
                  </p>
                </div>
              </div>
              <Link
                to="/cargos/nuevo"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Cargo
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between space-y-4 sm:space-y-0">
            {/* Modos de vista */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Vista:</span>
              {[
                { id: 'tree', name: 'Árbol', icon: 'M7 7h.01M7 3h5c.512 0 .853.5.853 1v4c0 .5-.341 1-.853 1H7s-.5.5-.5 1v4c0 .5.5 1 1 1h5c.512 0 .853.5.853 1v1c0 .5-.341 1-.853 1H8c-.512 0-1-.5-1-1V7s0-.5.5-.5z' },
                { id: 'compact', name: 'Compacta', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
                { id: 'table', name: 'Tabla', icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    viewMode === mode.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mode.icon} />
                  </svg>
                  {mode.name}
                </button>
              ))}
            </div>

            {/* Controles de expansión */}
            {viewMode === 'tree' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={expandAll}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Expandir Todo
                </button>
                <button
                  onClick={collapseAll}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Contraer Todo
                </button>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="mt-4 flex flex-wrap items-center space-x-4">
            <div>
              <input
                type="text"
                placeholder="Buscar cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center">
              <input
                id="show-inactive"
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="show-inactive" className="ml-2 text-sm text-gray-700">
                Mostrar inactivos
              </label>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        {orgTree && orgTree.length > 0 ? (
          <div className="space-y-6">
            {viewMode === 'tree' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="space-y-6">
                  {orgTree.map(root => renderCargoCard(root, 0))}
                </div>
              </div>
            )}
            {viewMode === 'compact' && renderCompactView()}
            {viewMode === 'table' && renderTableView()}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cargos</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza creando un nuevo cargo para construir la estructura organizacional.
            </p>
            <div className="mt-6">
              <Link
                to="/cargos/nuevo"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Cargo
              </Link>
            </div>
          </div>
        )}

        {/* Panel lateral con información del cargo seleccionado */}
        {selectedCargo && (
          <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Información del Cargo</h3>
                <button
                  onClick={() => setSelectedCargo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedCargo.nombre}</h4>
                  <p className="text-sm text-gray-600">{selectedCargo.codigo}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nivel:</span>
                    <span className="ml-2 font-medium">{selectedCargo.nivel_jerarquico}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Empleados:</span>
                    <span className="ml-2 font-medium">{selectedCargo.empleados_count || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Subordinados:</span>
                    <span className="ml-2 font-medium">{selectedCargo.subordinados?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Estado:</span>
                    <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedCargo.activo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedCargo.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                {selectedCargo.descripcion && (
                  <div>
                    <span className="text-gray-500 text-sm">Descripción:</span>
                    <p className="mt-1 text-sm text-gray-900">{selectedCargo.descripcion}</p>
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  <Link
                    to={`/cargos/${selectedCargo.id}`}
                    className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Ver Detalle
                  </Link>
                  <Link
                    to={`/cargos/${selectedCargo.id}/editar`}
                    className="flex-1 bg-gray-200 text-gray-900 text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-300"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Organigrama;
