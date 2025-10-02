import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ParametroForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    codigo: '',
    valor: '',
    descripcion: '',
    tipo_dato: 'string',
    es_sistema: false,
    activo: true,
    validacion_regex: '',
    valor_defecto: '',
    categoria: '',
    orden: 0,
    ayuda: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit) {
      fetchParametro();
    }
  }, [id, isEdit]);

  const fetchParametro = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/configuracion/parametros/${id}/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setFormData(data);
      }
    } catch (error) {
      console.error('Error fetching parametro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const url = isEdit 
        ? `/api/configuracion/parametros/${id}/`
        : '/api/configuracion/parametros/';
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        navigate('/configuracion/parametros');
      } else {
        const errorData = await response.json();
        setErrors(errorData);
      }
    } catch (error) {
      console.error('Error saving parametro:', error);
      setErrors({ general: 'Error al guardar el parámetro' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading && isEdit) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {isEdit ? 'Editar Parámetro' : 'Nuevo Parámetro'}
            </h1>
            <p className="mt-2 opacity-90">
              {isEdit ? 'Modifica la configuración del parámetro' : 'Crea un nuevo parámetro del sistema'}
            </p>
          </div>
          <button
            onClick={() => navigate('/configuracion/parametros')}
            className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-30 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error general */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {errors.general}
            </div>
          )}

          {/* Grid principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Código */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código del Parámetro *
              </label>
              <input
                type="text"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                required
                disabled={formData.es_sistema}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="CODIGO_PARAMETRO"
              />
              {errors.codigo && (
                <p className="mt-1 text-sm text-red-600">{errors.codigo}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Identificador único del parámetro (mayúsculas y guiones bajos)
              </p>
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción *
              </label>
              <input
                type="text"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción del parámetro"
              />
              {errors.descripcion && (
                <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>
              )}
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor *
              </label>
              {formData.tipo_dato === 'boolean' ? (
                <select
                  name="valor"
                  value={formData.valor}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="true">Verdadero</option>
                  <option value="false">Falso</option>
                </select>
              ) : formData.tipo_dato === 'text' ? (
                <textarea
                  name="valor"
                  value={formData.valor}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Valor del parámetro"
                />
              ) : (
                <input
                  type={formData.tipo_dato === 'integer' || formData.tipo_dato === 'decimal' ? 'number' : 'text'}
                  name="valor"
                  value={formData.valor}
                  onChange={handleChange}
                  step={formData.tipo_dato === 'decimal' ? '0.01' : undefined}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Valor del parámetro"
                />
              )}
              {errors.valor && (
                <p className="mt-1 text-sm text-red-600">{errors.valor}</p>
              )}
            </div>

            {/* Tipo de Dato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Dato
              </label>
              <select
                name="tipo_dato"
                value={formData.tipo_dato}
                onChange={handleChange}
                disabled={formData.es_sistema}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="string">Texto</option>
                <option value="integer">Número Entero</option>
                <option value="decimal">Número Decimal</option>
                <option value="boolean">Booleano</option>
                <option value="text">Texto Largo</option>
                <option value="url">URL</option>
                <option value="email">Email</option>
              </select>
              {errors.tipo_dato && (
                <p className="mt-1 text-sm text-red-600">{errors.tipo_dato}</p>
              )}
            </div>

            {/* Valor por Defecto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor por Defecto
              </label>
              <input
                type="text"
                name="valor_defecto"
                value={formData.valor_defecto}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Valor por defecto"
              />
              {errors.valor_defecto && (
                <p className="mt-1 text-sm text-red-600">{errors.valor_defecto}</p>
              )}
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <input
                type="text"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Categoría del parámetro"
              />
              {errors.categoria && (
                <p className="mt-1 text-sm text-red-600">{errors.categoria}</p>
              )}
            </div>

            {/* Validación Regex */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expresión Regular de Validación
              </label>
              <input
                type="text"
                name="validacion_regex"
                value={formData.validacion_regex}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="^[a-zA-Z0-9]+$"
              />
              {errors.validacion_regex && (
                <p className="mt-1 text-sm text-red-600">{errors.validacion_regex}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Expresión regular para validar el valor del parámetro (opcional)
              </p>
            </div>

            {/* Ayuda */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto de Ayuda
              </label>
              <textarea
                name="ayuda"
                value={formData.ayuda}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Información adicional sobre el parámetro"
              />
              {errors.ayuda && (
                <p className="mt-1 text-sm text-red-600">{errors.ayuda}</p>
              )}
            </div>

            {/* Orden */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orden
              </label>
              <input
                type="number"
                name="orden"
                value={formData.orden}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              {errors.orden && (
                <p className="mt-1 text-sm text-red-600">{errors.orden}</p>
              )}
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="es_sistema"
                  id="es_sistema"
                  checked={formData.es_sistema}
                  onChange={handleChange}
                  disabled={isEdit}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <label htmlFor="es_sistema" className="ml-2 block text-sm text-gray-900">
                  Parámetro del Sistema
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="activo"
                  id="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                  Activo
                </label>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/configuracion/parametros')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParametroForm;
