/**
 * Modal Multi-Tab para Crear/Editar Roles
 * 5 Tabs: Básico, Jerarquía, Control Acceso, Vigencia, Config Avanzada
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Shield, GitBranch, Lock, Calendar, Settings,
  AlertCircle, Info, Clock
} from 'lucide-react';

const RolModal = ({
  show,
  onClose,
  formData,
  setFormData,
  errors,
  activeTab,
  setActiveTab,
  onSubmit,
  editingRol,
  tiposRol,
  rolesDisponibles
}) => {
  // Efecto para cargar datos cuando se abre el modal para editar
  useEffect(() => {
    if (show && editingRol && editingRol.id) {
      console.log('📝 Modal: Cargando datos de editingRol:', editingRol);
      
      // Convertir dias_semana de array a string si es necesario
      let diasSemanaStr = '1234567';
      if (editingRol.dias_semana) {
        if (Array.isArray(editingRol.dias_semana)) {
          diasSemanaStr = editingRol.dias_semana.join('');
        } else if (typeof editingRol.dias_semana === 'string') {
          diasSemanaStr = editingRol.dias_semana;
        }
      }
      
      // Formatear fechas y horas
      const formatearFecha = (fecha) => {
        if (!fecha) return '';
        return fecha.split('T')[0];
      };
      
      const formatearHora = (hora) => {
        if (!hora) return '';
        return hora.substring(0, 5);
      };
      
      const datosFormateados = {
        codigo: editingRol.codigo || '',
        nombre: editingRol.nombre || '',
        descripcion: editingRol.descripcion || '',
        tipo_rol: editingRol.tipo_rol || '',
        rol_padre: editingRol.rol_padre || '',
        categoria: editingRol.categoria || '',
        hereda_permisos: editingRol.hereda_permisos ?? true,
        activo: editingRol.activo ?? true,
        es_publico: editingRol.es_publico ?? false,
        requiere_aprobacion: editingRol.requiere_aprobacion ?? false,
        tiene_restriccion_horario: editingRol.tiene_restriccion_horario ?? false,
        hora_inicio: formatearHora(editingRol.hora_inicio),
        hora_fin: formatearHora(editingRol.hora_fin),
        dias_semana: diasSemanaStr,
        fecha_inicio_vigencia: formatearFecha(editingRol.fecha_inicio_vigencia),
        fecha_fin_vigencia: formatearFecha(editingRol.fecha_fin_vigencia),
        prioridad: editingRol.prioridad || 0,
        peso: editingRol.peso || 1,
        color: editingRol.color || '#4F46E5',
        icono: editingRol.icono || 'shield',
        metadatos: typeof editingRol.metadatos === 'object' ? editingRol.metadatos : {},
        configuracion: typeof editingRol.configuracion === 'object' ? editingRol.configuracion : {}
      };
      
      console.log('✅ Modal: Datos formateados:', datosFormateados);
      setFormData(datosFormateados);
    }
  }, [show, editingRol]);
  
  const tabs = [
    { id: 'basico', label: 'Info Básica', icon: Shield },
    { id: 'jerarquia', label: 'Jerarquía', icon: GitBranch },
    { id: 'acceso', label: 'Control Acceso', icon: Lock },
    { id: 'vigencia', label: 'Vigencia', icon: Calendar },
    { id: 'avanzado', label: 'Config. Avanzada', icon: Settings }
  ];
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // ============================================================================
  // TAB 1: INFO BÁSICA
  // ============================================================================
  
  const renderBasicoTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="codigo"
            value={formData.codigo}
            onChange={handleChange}
            placeholder="ROL_ADMIN"
            className={`w-full rounded-md border ${
              errors.codigo ? 'border-red-300' : 'border-gray-300'
            } shadow-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all uppercase`}
            disabled={editingRol?.es_sistema}
          />
          {errors.codigo && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.codigo}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Letras mayúsculas, números y guiones bajos (2-50 caracteres)
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Administrador"
            className={`w-full rounded-md border ${
              errors.nombre ? 'border-red-300' : 'border-gray-300'
            } shadow-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all`}
          />
          {errors.nombre && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.nombre}
            </p>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          rows="3"
          placeholder="Descripción del rol..."
          className="w-full rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Rol
          </label>
          <select
            name="tipo_rol"
            value={formData.tipo_rol}
            onChange={handleChange}
            className="w-full rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          >
            <option value="">Seleccione...</option>
            {tiposRol.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <input
            type="text"
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            placeholder="Administrativo"
            className="w-full rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              placeholder="#4F46E5"
              className="flex-1 rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Icono
          </label>
          <input
            type="text"
            name="icono"
            value={formData.icono}
            onChange={handleChange}
            placeholder="shield"
            className="w-full rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prioridad
          </label>
          <input
            type="number"
            name="prioridad"
            value={formData.prioridad}
            onChange={handleChange}
            min="0"
            max="100"
            className="w-full rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>
      </div>
    </div>
  );
  
  // ============================================================================
  // TAB 2: JERARQUÍA Y PERMISOS
  // ============================================================================
  
  const renderJerarquiaTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rol Padre
        </label>
        <select
          name="rol_padre"
          value={formData.rol_padre}
          onChange={handleChange}
          className="w-full rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        >
          <option value="">Sin rol padre (Nivel 0)</option>
          {rolesDisponibles
            .filter(r => editingRol ? r.id !== editingRol.id : true)
            .map(rol => (
              <option key={rol.id} value={rol.id}>
                {rol.nombre} (Nivel {rol.nivel_jerarquico})
              </option>
            ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          <Info className="inline h-3 w-3 mr-1" />
          El nivel jerárquico se calcula automáticamente
        </p>
      </div>
      
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <GitBranch className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-indigo-800">
              Herencia de Permisos
            </h3>
            <div className="mt-2 text-sm text-indigo-700">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="hereda_permisos"
                  checked={formData.hereda_permisos}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="ml-2">Heredar permisos del rol padre</span>
              </label>
            </div>
            <p className="mt-2 text-xs text-indigo-600">
              Si está activo, este rol tendrá todos los permisos del rol padre además de los propios.
            </p>
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Peso del Rol
        </label>
        <input
          type="number"
          name="peso"
          value={formData.peso}
          onChange={handleChange}
          min="0"
          step="0.1"
          className="w-full rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />
        <p className="mt-1 text-xs text-gray-500">
          Valor numérico para resolver conflictos cuando un usuario tiene múltiples roles
        </p>
      </div>
    </div>
  );
  
  // ============================================================================
  // TAB 3: CONTROL DE ACCESO
  // ============================================================================
  
  const renderAccesoTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
              className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Rol Activo</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Solo los roles activos pueden ser asignados
          </p>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="es_publico"
              checked={formData.es_publico}
              onChange={handleChange}
              className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Rol Público</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Los usuarios pueden solicitar este rol
          </p>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="requiere_aprobacion"
              checked={formData.requiere_aprobacion}
              onChange={handleChange}
              className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Requiere Aprobación</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Las asignaciones deben ser aprobadas
          </p>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="tiene_restriccion_horario"
              checked={formData.tiene_restriccion_horario}
              onChange={handleChange}
              className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Restricción de Horario</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Activar control de horarios
          </p>
        </div>
      </div>
      
      {formData.tiene_restriccion_horario && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-3 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Configuración de Horarios
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora Inicio
              </label>
              <input
                type="time"
                name="hora_inicio"
                value={formData.hora_inicio}
                onChange={handleChange}
                className={`w-full rounded-md border ${
                  errors.hora_inicio ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all`}
              />
              {errors.hora_inicio && (
                <p className="mt-1 text-sm text-red-600">{errors.hora_inicio}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora Fin
              </label>
              <input
                type="time"
                name="hora_fin"
                value={formData.hora_fin}
                onChange={handleChange}
                className={`w-full rounded-md border ${
                  errors.hora_fin ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all`}
              />
              {errors.hora_fin && (
                <p className="mt-1 text-sm text-red-600">{errors.hora_fin}</p>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días de la Semana
            </label>
            <div className="flex space-x-2">
              {[
                { value: '1', label: 'Lun' },
                { value: '2', label: 'Mar' },
                { value: '3', label: 'Mié' },
                { value: '4', label: 'Jue' },
                { value: '5', label: 'Vie' },
                { value: '6', label: 'Sáb' },
                { value: '7', label: 'Dom' }
              ].map(dia => (
                <label
                  key={dia.value}
                  className={`flex-1 text-center px-2 py-1 rounded cursor-pointer transition-colors ${
                    formData.dias_semana?.includes(dia.value)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.dias_semana?.includes(dia.value)}
                    onChange={(e) => {
                      const dias = formData.dias_semana || '';
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          dias_semana: dias + dia.value
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          dias_semana: dias.replace(dia.value, '')
                        }));
                      }
                    }}
                    className="sr-only"
                  />
                  <span className="text-xs font-medium">{dia.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // ============================================================================
  // TAB 4: VIGENCIA
  // ============================================================================
  
  const renderVigenciaTab = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Control de Vigencia
            </h3>
            <p className="mt-1 text-xs text-blue-700">
              Defina el periodo en el que este rol estará disponible. Dejar vacío para vigencia indefinida.
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Inicio de Vigencia
          </label>
          <input
            type="date"
            name="fecha_inicio_vigencia"
            value={formData.fecha_inicio_vigencia}
            onChange={handleChange}
            className="w-full rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          <p className="mt-1 text-xs text-gray-500">
            El rol estará disponible a partir de esta fecha
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Fin de Vigencia
          </label>
          <input
            type="date"
            name="fecha_fin_vigencia"
            value={formData.fecha_fin_vigencia}
            onChange={handleChange}
            className={`w-full rounded-md border ${
              errors.fecha_fin_vigencia ? 'border-red-300' : 'border-gray-300'
            } shadow-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all`}
          />
          {errors.fecha_fin_vigencia && (
            <p className="mt-1 text-sm text-red-600">{errors.fecha_fin_vigencia}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            El rol dejará de estar disponible después de esta fecha
          </p>
        </div>
      </div>
      
      {formData.fecha_inicio_vigencia && formData.fecha_fin_vigencia && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>Periodo de vigencia:</strong>{' '}
            {new Date(formData.fecha_inicio_vigencia).toLocaleDateString('es-CO')} hasta{' '}
            {new Date(formData.fecha_fin_vigencia).toLocaleDateString('es-CO')}
            {' '}
            ({Math.ceil((new Date(formData.fecha_fin_vigencia) - new Date(formData.fecha_inicio_vigencia)) / (1000 * 60 * 60 * 24))} días)
          </p>
        </div>
      )}
    </div>
  );
  
  // ============================================================================
  // TAB 5: CONFIGURACIÓN AVANZADA
  // ============================================================================
  
  const renderAvanzadoTab = () => (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Settings className="h-5 w-5 text-purple-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">
              Configuración JSON
            </h3>
            <p className="mt-1 text-xs text-purple-700">
              Datos adicionales en formato JSON para extensibilidad del sistema.
            </p>
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Metadatos (JSON)
        </label>
        <textarea
          value={JSON.stringify(formData.metadatos, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setFormData(prev => ({ ...prev, metadatos: parsed }));
            } catch (err) {
              // Mantener el valor actual si no es JSON válido
            }
          }}
          rows="6"
          placeholder='{\n  "clave": "valor"\n}'
          className="w-full rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Información descriptiva adicional del rol
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Configuración (JSON)
        </label>
        <textarea
          value={JSON.stringify(formData.configuracion, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setFormData(prev => ({ ...prev, configuracion: parsed }));
            } catch (err) {
              // Mantener el valor actual si no es JSON válido
            }
          }}
          rows="6"
          placeholder='{\n  "opcion": true\n}'
          className="w-full rounded-xl border-2 border-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Opciones de configuración específicas del rol
        </p>
      </div>
    </div>
  );
  
  // ============================================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================================
  
  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>
        
        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                {editingRol ? 'Editar Rol' : 'Nuevo Rol'}
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex space-x-4 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-cyan-500 text-cyan-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Form */}
          <form onSubmit={onSubmit}>
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              {activeTab === 'basico' && renderBasicoTab()}
              {activeTab === 'jerarquia' && renderJerarquiaTab()}
              {activeTab === 'acceso' && renderAccesoTab()}
              {activeTab === 'vigencia' && renderVigenciaTab()}
              {activeTab === 'avanzado' && renderAvanzadoTab()}
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {editingRol?.es_sistema && (
                  <div className="flex items-center text-yellow-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span>Rol del sistema - Modificaciones limitadas</span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
                >
                  {editingRol ? 'Actualizar' : 'Crear'} Rol
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RolModal;
