import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCargoForm, useCargos } from '../../hooks/useCargos';

const CargoForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // Estados
  const [initialData, setInitialData] = useState({});
  const [cargoSuperiorOptions, setCargoSuperiorOptions] = useState([]);

  // Hooks
  const { cargos: allCargos, loading: cargosLoading } = useCargos();
  const {
    formData,
    loading,
    error,
    success,
    handleChange,
    handleSubmit,
    resetForm,
    setFormData
  } = useCargoForm(initialData);

  // Efectos
  useEffect(() => {
    if (isEdit && id) {
      // Cargar datos del cargo a editar
      const loadCargoData = async () => {
        try {
          // Aquí deberías cargar los datos del cargo específico
          // Por ahora uso datos mock
          const cargoData = {
            nombre: '',
            codigo: '',
            descripcion: '',
            cargo_superior: '',
            nivel_jerarquico: 1,
            salario_base_minimo: '',
            salario_base_maximo: '',
            requiere_aprobacion: false,
            activo: true
          };
          setInitialData(cargoData);
          setFormData(cargoData);
        } catch (error) {
          console.error('Error cargando cargo:', error);
        }
      };
      loadCargoData();
    }
  }, [id, isEdit, setFormData]);

  useEffect(() => {
    // Configurar opciones de cargo superior
    if (allCargos && allCargos.length > 0) {
      const options = allCargos
        .filter(cargo => cargo.activo && (!isEdit || cargo.id !== parseInt(id)))
        .sort((a, b) => {
          if (a.nivel_jerarquico !== b.nivel_jerarquico) {
            return a.nivel_jerarquico - b.nivel_jerarquico;
          }
          return a.nombre.localeCompare(b.nombre);
        });
      setCargoSuperiorOptions(options);
    }
  }, [allCargos, isEdit, id]);

  // Manejadores
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    handleChange(name, type === 'checkbox' ? checked : value);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await handleSubmit(id);
      if (result.success) {
        navigate('/cargos');
      }
    } catch (error) {
      console.error('Error al guardar cargo:', error);
    }
  };

  const handleCancel = () => {
    navigate('/cargos');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {isEdit ? 'Editar Cargo' : 'Crear Nuevo Cargo'}
              </h1>
              <p className="mt-2 opacity-90">
                {isEdit ? 'Modifica la información del cargo' : 'Completa el formulario para crear un nuevo cargo'}
              </p>
            </div>
            <Link
              to="/cargos"
              className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-30 transition-colors"
            >
              Volver
            </Link>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
            {/* Error general */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {isEdit ? 'Cargo actualizado exitosamente' : 'Cargo creado exitosamente'}
              </div>
            )}

            {/* Grid principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Cargo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Gerente de Ventas"
                  required
                />
              </div>

              {/* Código */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: GER-VEN-001"
                  required
                />
              </div>

              {/* Cargo Superior */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargo Superior
                </label>
                <select
                  name="cargo_superior"
                  value={formData.cargo_superior || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={cargosLoading}
                >
                  <option value="">-- Sin cargo superior --</option>
                  {cargoSuperiorOptions.map(cargo => (
                    <option key={cargo.id} value={cargo.id}>
                      {cargo.nombre} (Nivel {cargo.nivel_jerarquico})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nivel Jerárquico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel Jerárquico <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="nivel_jerarquico"
                  value={formData.nivel_jerarquico || 1}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="10"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Nivel 1 = más alto en la jerarquía
                </p>
              </div>

              {/* Salario Mínimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salario Base Mínimo <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="salario_base_minimo"
                  value={formData.salario_base_minimo || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 1500000"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              {/* Salario Máximo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salario Base Máximo
                </label>
                <input
                  type="number"
                  name="salario_base_maximo"
                  value={formData.salario_base_maximo || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 2500000"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Descripción - Full width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion || ''}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción del cargo y sus responsabilidades..."
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="requiere_aprobacion"
                  id="requiere_aprobacion"
                  checked={formData.requiere_aprobacion || false}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requiere_aprobacion" className="ml-2 block text-sm text-gray-900">
                  Este cargo requiere aprobaciones especiales
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="activo"
                  id="activo"
                  checked={formData.activo !== undefined ? formData.activo : true}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                  Cargo activo
                </label>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              
              {!isEdit && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Limpiar
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEdit ? 'Actualizando...' : 'Creando...'}
                  </div>
                ) : (
                  isEdit ? 'Actualizar Cargo' : 'Crear Cargo'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CargoForm;
