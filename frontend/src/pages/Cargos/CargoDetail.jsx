import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  useCargo, 
  useSubordinados, 
  useHistorialCargo, 
  useCargoForm 
} from '../../hooks/useCargos';

const CargoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Hooks personalizados
  const { 
    cargo, 
    loading: cargoLoading, 
    error: cargoError, 
    refresh: refreshCargo 
  } = useCargo(id);

  const { 
    subordinados, 
    loading: subordinadosLoading 
  } = useSubordinados(id);

  const { 
    historial, 
    loading: historialLoading 
  } = useHistorialCargo(id, { page_size: 10 });

  const { 
    loading: actionLoading, 
    toggleActivo, 
    deleteCargo 
  } = useCargoForm(id);

  // Funciones auxiliares
  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Funciones de manejo
  const handleToggleCargo = async () => {
    try {
      const result = await toggleActivo();
      refreshCargo();
      console.log(result.message);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const handleDeleteCargo = async () => {
    try {
      await deleteCargo();
      navigate('/cargos');
    } catch (error) {
      console.error('Error al eliminar cargo:', error);
    } finally {
      setShowDeleteModal(false);
    }
  };

  // Manejo de errores
  if (cargoError) {
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
                  Error al cargar cargo
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{cargoError}</p>
                </div>
                <div className="mt-4">
                  <Link
                    to="/cargos"
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Volver a la lista
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Estado de carga
  if (cargoLoading || !cargo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 mt-2">Cargando información del cargo...</p>
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
                  <h1 className="text-2xl font-bold text-gray-900">
                    {cargo.codigo} - {cargo.nombre}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Detalle del cargo y gestión
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleToggleCargo}
                  disabled={actionLoading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    cargo.activo 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {cargo.activo ? 'Desactivar' : 'Activar'}
                </button>
                <Link
                  to={`/cargos/${id}/editar`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </Link>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información Principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Detalles del Cargo */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Información del Cargo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Código</dt>
                    <dd className="mt-1 text-sm text-gray-900">{cargo.codigo}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                    <dd className="mt-1 text-sm text-gray-900">{cargo.nombre}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nivel Jerárquico</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Nivel {cargo.nivel_jerarquico}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cargo Superior</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {cargo.cargo_superior_nombre || 'No tiene'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Estado</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cargo.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cargo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Empleados Asignados</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {cargo.empleados_count || 0} empleados
                      </span>
                    </dd>
                  </div>
                </div>

                {cargo.descripcion && (
                  <div className="mt-6">
                    <dt className="text-sm font-medium text-gray-500">Descripción</dt>
                    <dd className="mt-1 text-sm text-gray-900">{cargo.descripcion}</dd>
                  </div>
                )}
              </div>
            </div>

            {/* Información Salarial */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Información Salarial
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Salario Mínimo</dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">
                      {formatCurrency(cargo.salario_base_minimo)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Salario Máximo</dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">
                      {formatCurrency(cargo.salario_base_maximo)}
                    </dd>
                  </div>
                  {cargo.limite_aprobacion && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Límite de Aprobación</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {formatCurrency(cargo.limite_aprobacion)}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Puede Aprobar</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cargo.puede_aprobar 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {cargo.puede_aprobar ? 'Sí' : 'No'}
                      </span>
                    </dd>
                  </div>
                </div>
              </div>
            </div>

            {/* Subordinados */}
            {!subordinadosLoading && subordinados && subordinados.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Cargos Subordinados
                  </h3>
                  <div className="space-y-3">
                    {subordinados.map((subordinado) => (
                      <div key={subordinado.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {subordinado.codigo} - {subordinado.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            Nivel {subordinado.nivel_jerarquico} • {subordinado.empleados_count || 0} empleados
                          </div>
                        </div>
                        <Link
                          to={`/cargos/${subordinado.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Ver detalle
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Historial */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Historial Reciente
                  </h3>
                  <Link
                    to={`/cargos/historial?cargo=${id}`}
                    className="text-sm text-blue-600 hover:text-blue-900"
                  >
                    Ver todo el historial
                  </Link>
                </div>
                
                {historialLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-white">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cargando historial...
                    </div>
                  </div>
                ) : (!historial || historial.length === 0) ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Sin historial</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No hay registros de historial para este cargo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historial.map((registro) => (
                      <div key={registro.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {registro.empleado_nombre}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {registro.cargo_anterior_nombre && (
                                <span>De: {registro.cargo_anterior_nombre} → </span>
                              )}
                              <span>A: {registro.cargo_nuevo_nombre}</span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Salario: {formatCurrency(registro.salario_asignado)}
                            </div>
                            {registro.motivo_cambio && (
                              <div className="text-sm text-gray-600 mt-2">
                                {registro.motivo_cambio}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div>{formatDate(registro.fecha_inicio)}</div>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              registro.esta_activo 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {registro.esta_activo ? 'Activo' : 'Finalizado'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Jerarquía */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Jerarquía Completa
                </h3>
                <div className="text-sm text-gray-900">
                  {cargo.jerarquia_completa || cargo.nombre}
                </div>
              </div>
            </div>

            {/* Fechas */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Información Temporal
                </h3>
                <div className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Fecha de Creación</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(cargo.fecha_creacion)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Última Modificación</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(cargo.fecha_modificacion)}
                    </dd>
                  </div>
                  {cargo.es_temporal && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                      <dd className="mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Temporal
                        </span>
                      </dd>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Acciones Rápidas
                </h3>
                <div className="space-y-3">
                  <Link
                    to={`/cargos/${id}/subordinados`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Ver Subordinados
                  </Link>
                  <Link
                    to={`/cargos/${id}/empleados`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Ver Empleados
                  </Link>
                  <Link
                    to={`/cargos/historial?cargo=${id}`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Historial Completo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-5">
                Confirmar Eliminación
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  ¿Está seguro de que desea eliminar el cargo "{cargo.nombre}"? Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-5">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteCargo}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CargoDetail;