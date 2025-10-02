import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJerarquia, useEstadisticasCargos } from '../../hooks/useCargos';

const Jerarquia = () => {
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [vistaActiva, setVistaActiva] = useState('niveles'); // niveles, distribución, métricas

  // Hooks personalizados
  const { 
    jerarquia, 
    loading: jerarquiaLoading,
    error: jerarquiaError 
  } = useJerarquia();

  const { 
    estadisticas, 
    loading: estadisticasLoading 
  } = useEstadisticasCargos();

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getProgressColor = (nivel) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-indigo-500', 'bg-yellow-500', 'bg-purple-500'];
    return colors[nivel - 1] || 'bg-gray-500';
  };

  const getNiveles = () => {
    if (!jerarquia) return [];
    
    const niveles = {};
    jerarquia.forEach(cargo => {
      const nivel = cargo.nivel_jerarquico;
      if (!niveles[nivel]) {
        niveles[nivel] = [];
      }
      niveles[nivel].push(cargo);
    });

    return Object.keys(niveles)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(nivel => ({
        nivel: parseInt(nivel),
        cargos: niveles[nivel]
      }));
  };

  const filtrarCargos = (cargos) => {
    return cargos.filter(cargo => {
      const pasaNivel = !filtroNivel || cargo.nivel_jerarquico.toString() === filtroNivel;
      const pasaEstado = filtroEstado === 'todos' || 
                        (filtroEstado === 'activo' && cargo.activo) ||
                        (filtroEstado === 'inactivo' && !cargo.activo);
      return pasaNivel && pasaEstado;
    });
  };

  const renderVistaResumen = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {estadisticas && (
        <>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-2xl font-bold text-gray-900">{estadisticas.total_cargos}</h4>
                <p className="text-gray-600">Total Cargos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-2xl font-bold text-gray-900">{estadisticas.cargos_activos}</h4>
                <p className="text-gray-600">Cargos Activos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-full">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-2xl font-bold text-gray-900">{estadisticas.empleados_asignados}</h4>
                <p className="text-gray-600">Empleados Asignados</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-2xl font-bold text-gray-900">{estadisticas.niveles_jerarquicos}</h4>
                <p className="text-gray-600">Niveles Jerárquicos</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderVistaNiveles = () => {
    const niveles = getNiveles();
    const nivelesFiltrados = niveles.map(nivel => ({
      ...nivel,
      cargos: filtrarCargos(nivel.cargos)
    })).filter(nivel => nivel.cargos.length > 0);

    return (
      <div className="space-y-6">
        {nivelesFiltrados.map((nivel) => (
          <div key={nivel.nivel} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${getProgressColor(nivel.nivel)}`}></div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Nivel {nivel.nivel}
                  </h3>
                  <span className="bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded-full">
                    {nivel.cargos.length} cargos
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nivel.cargos.map((cargo) => (
                  <div key={cargo.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                        <p className="text-sm text-gray-600 mt-1">{cargo.codigo}</p>
                        
                        {cargo.cargo_superior_nombre && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reporta a: {cargo.cargo_superior_nombre}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                          <span>{cargo.empleados_count || 0} empleados</span>
                          {cargo.subordinados_count > 0 && (
                            <span>{cargo.subordinados_count} subordinados</span>
                          )}
                        </div>
                        
                        {cargo.salario_base_minimo && (
                          <div className="mt-2 text-xs text-gray-600">
                            Salario: {formatCurrency(cargo.salario_base_minimo)} 
                            {cargo.salario_base_maximo && 
                              ` - ${formatCurrency(cargo.salario_base_maximo)}`
                            }
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <Link
                          to={`/cargos/${cargo.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Ver detalle
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderVistaDistribucion = () => {
    if (!estadisticas?.distribucion_por_nivel) return null;

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Distribución por Nivel Jerárquico
        </h3>
        <div className="space-y-4">
          {estadisticas.distribucion_por_nivel.map((nivel) => (
            <div key={nivel.nivel_jerarquico} className="flex items-center space-x-4">
              <div className="w-20 text-sm font-medium text-gray-700">
                Nivel {nivel.nivel_jerarquico}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div 
                  className={`${getProgressColor(nivel.nivel_jerarquico)} h-4 rounded-full flex items-center justify-center`}
                  style={{ 
                    width: `${(nivel.total_cargos / estadisticas.total_cargos) * 100}%`,
                    minWidth: '2rem'
                  }}
                >
                  <span className="text-white text-xs font-medium">
                    {nivel.total_cargos}
                  </span>
                </div>
              </div>
              <div className="w-16 text-sm text-gray-600">
                {Math.round((nivel.total_cargos / estadisticas.total_cargos) * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderVistaMetricas = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {estadisticas?.metricas_salariales && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Métricas Salariales
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Salario Promedio Mínimo:</span>
              <span className="font-semibold">
                {formatCurrency(estadisticas.metricas_salariales.salario_promedio_minimo)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Salario Promedio Máximo:</span>
              <span className="font-semibold">
                {formatCurrency(estadisticas.metricas_salariales.salario_promedio_maximo)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Rango Salarial Total:</span>
              <span className="font-semibold">
                {formatCurrency(estadisticas.metricas_salariales.rango_salarial_total)}
              </span>
            </div>
          </div>
        </div>
      )}

      {estadisticas?.cargos_con_aprobacion && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Estructura de Aprobaciones
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cargos que pueden aprobar:</span>
              <span className="font-semibold">{estadisticas.cargos_con_aprobacion}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cargos que requieren aprobación:</span>
              <span className="font-semibold">{estadisticas.cargos_requieren_aprobacion}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cargos temporales:</span>
              <span className="font-semibold">{estadisticas.cargos_temporales}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (jerarquiaLoading || estadisticasLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 mt-2">Cargando estructura jerárquica...</p>
        </div>
      </div>
    );
  }

  if (jerarquiaError) {
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
                  Error al cargar jerarquía
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{jerarquiaError}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  <h1 className="text-2xl font-bold text-gray-900">Estructura Jerárquica</h1>
                  <p className="text-sm text-gray-600">
                    Visualización y análisis de la estructura organizacional
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
        {/* Navegación de Vistas */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'niveles', name: 'Por Niveles', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
              { id: 'distribución', name: 'Distribución', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { id: 'métricas', name: 'Métricas', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
            ].map((vista) => (
              <button
                key={vista.id}
                onClick={() => setVistaActiva(vista.id)}
                className={`${
                  vistaActiva === vista.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={vista.icon} />
                </svg>
                <span>{vista.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center space-x-4">
            <div>
              <label htmlFor="filtro-nivel" className="block text-sm font-medium text-gray-700 mb-1">
                Nivel Jerárquico
              </label>
              <select
                id="filtro-nivel"
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los niveles</option>
                {[1, 2, 3, 4, 5].map(nivel => (
                  <option key={nivel} value={nivel}>Nivel {nivel}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filtro-estado" className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                id="filtro-estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todos</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resumen */}
        {renderVistaResumen()}

        {/* Contenido Principal */}
        {vistaActiva === 'niveles' && renderVistaNiveles()}
        {vistaActiva === 'distribución' && renderVistaDistribucion()}
        {vistaActiva === 'métricas' && renderVistaMetricas()}
      </div>
    </div>
  );
};

export default Jerarquia;
