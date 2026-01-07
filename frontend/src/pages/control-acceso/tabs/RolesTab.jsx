/**
 * Tab de Gestión de Roles
 * Vista profesional con tabla, árbol jerárquico y modal multi-tab
 */

import React, { useState, useEffect } from 'react';
import {
  Shield, Plus, Edit2, Trash2, Copy, CheckCircle, XCircle,
  Search, Filter, Download, Upload, TreePine, List, Users,
  ChevronRight, ChevronDown, AlertCircle, Clock, Calendar
} from 'lucide-react';
import rolesService from '../../../services/rolesService';
import tiposRolService from '../../../services/tiposRolService';
import RolModal from '../../../components/administracion/RolModal';

const RolesTab = () => {
  // ============================================================================
  // ESTADO
  // ============================================================================
  
  const [roles, setRoles] = useState([]);
  const [tiposRol, setTiposRol] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRol, setEditingRol] = useState(null);
  const [activeTab, setActiveTab] = useState('basico');
  const [viewMode, setViewMode] = useState('tabla'); // 'tabla' o 'jerarquia'
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterNivel, setFilterNivel] = useState('all');
  
  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    sistema: 0
  });
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Formulario
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo_rol: '',
    rol_padre: '',
    categoria: '',
    hereda_permisos: true,
    activo: true,
    es_publico: false,
    requiere_aprobacion: false,
    tiene_restriccion_horario: false,
    hora_inicio: '',
    hora_fin: '',
    dias_semana: '1234567',
    fecha_inicio_vigencia: '',
    fecha_fin_vigencia: '',
    prioridad: 0,
    peso: 1,
    color: '#4F46E5',
    icono: 'shield',
    metadatos: {},
    configuracion: {}
  });
  
  const [errors, setErrors] = useState({});
  
  // Árbol jerárquico
  const [treeData, setTreeData] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // ============================================================================
  // EFECTOS
  // ============================================================================
  
  useEffect(() => {
    loadInitialData();
  }, []);
  
  useEffect(() => {
    filterRoles();
  }, [searchTerm, filterTipo, filterEstado, filterNivel, roles]);
  
  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================
  
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [rolesData, tiposData, statsData] = await Promise.all([
        rolesService.getAllRoles(),
        tiposRolService.getActiveTiposRol(),
        rolesService.getEstadisticas()
      ]);
      
      // Extraer results si viene paginado
      const roles = rolesData.results || rolesData;
      const tipos = tiposData.results || tiposData;
      
      setRoles(Array.isArray(roles) ? roles : []);
      setTiposRol(Array.isArray(tipos) ? tipos : []);
      setStats(statsData);
      
      // Cargar jerarquía si está en modo árbol
      if (viewMode === 'jerarquia') {
        loadTreeData();
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      alert('Error al cargar los roles: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  const loadTreeData = async () => {
    try {
      const data = await rolesService.getJerarquia();
      setTreeData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading jerarquía:', error);
    }
  };
  
  // ============================================================================
  // FILTRADO Y BÚSQUEDA
  // ============================================================================
  
  const filterRoles = () => {
    let filtered = [...roles];
    
    // Búsqueda
    if (searchTerm) {
      filtered = filtered.filter(rol =>
        rol.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rol.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rol.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rol.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtro por tipo
    if (filterTipo !== 'all') {
      filtered = filtered.filter(rol => rol.tipo_rol === filterTipo);
    }
    
    // Filtro por estado
    if (filterEstado === 'active') {
      filtered = filtered.filter(rol => rol.activo);
    } else if (filterEstado === 'inactive') {
      filtered = filtered.filter(rol => !rol.activo);
    }
    
    // Filtro por nivel
    if (filterNivel !== 'all') {
      filtered = filtered.filter(rol => rol.nivel_jerarquico === parseInt(filterNivel));
    }
    
    setFilteredRoles(filtered);
    setCurrentPage(1);
  };
  
  // ============================================================================
  // PAGINACIÓN
  // ============================================================================
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRoles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  
  // ============================================================================
  // MANEJO DE FORMULARIO
  // ============================================================================
  
  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      tipo_rol: '',
      rol_padre: '',
      categoria: '',
      hereda_permisos: true,
      activo: true,
      es_publico: false,
      requiere_aprobacion: false,
      tiene_restriccion_horario: false,
      hora_inicio: '',
      hora_fin: '',
      dias_semana: '1234567',
      fecha_inicio_vigencia: '',
      fecha_fin_vigencia: '',
      prioridad: 0,
      peso: 1,
      color: '#4F46E5',
      icono: 'shield',
      metadatos: {},
      configuracion: {}
    });
    setErrors({});
    setActiveTab('basico');
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.codigo) {
      newErrors.codigo = 'El código es requerido';
    } else if (!/^[A-Z0-9_]{2,50}$/.test(formData.codigo)) {
      newErrors.codigo = 'El código debe contener solo letras mayúsculas, números y guiones bajos';
    }
    
    if (!formData.nombre) {
      newErrors.nombre = 'El nombre es requerido';
    }
    
    if (formData.tiene_restriccion_horario) {
      if (!formData.hora_inicio) {
        newErrors.hora_inicio = 'La hora de inicio es requerida';
      }
      if (!formData.hora_fin) {
        newErrors.hora_fin = 'La hora de fin es requerida';
      }
    }
    
    if (formData.fecha_inicio_vigencia && formData.fecha_fin_vigencia) {
      if (new Date(formData.fecha_inicio_vigencia) > new Date(formData.fecha_fin_vigencia)) {
        newErrors.fecha_fin_vigencia = 'La fecha de fin debe ser posterior a la de inicio';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Por favor corrija los errores en el formulario');
      return;
    }
    
    try {
      // Preparar datos - convertir strings vacíos a null
      const dataToSend = {
        ...formData,
        tipo_rol: formData.tipo_rol || null,
        rol_padre: formData.rol_padre || null,
        hora_inicio: formData.hora_inicio || null,
        hora_fin: formData.hora_fin || null,
        fecha_inicio_vigencia: formData.fecha_inicio_vigencia || null,
        fecha_fin_vigencia: formData.fecha_fin_vigencia || null,
      };
      
      if (editingRol) {
        await rolesService.updateRol(editingRol.id, dataToSend);
        alert('Rol actualizado exitosamente');
      } else {
        await rolesService.createRol(dataToSend);
        alert('Rol creado exitosamente');
      }
      
      setShowModal(false);
      resetForm();
      loadInitialData();
    } catch (error) {
      console.error('Error saving rol:', error);
      alert('Error al guardar: ' + (error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message));
    }
  };
  
  // ============================================================================
  // ACCIONES
  // ============================================================================
  
  const handleEdit = async (rol) => {
    try {
      console.log('📝 Editando rol (datos de tabla):', rol);
      
      // IMPORTANTE: Obtener datos completos del backend
      const rolCompleto = await rolesService.getRolById(rol.id);
      console.log('📥 Datos completos del backend:', rolCompleto);
      
      setEditingRol(rolCompleto);
      
      // Convertir dias_semana de array a string si es necesario
      let diasSemanaStr = '1234567';
      if (rolCompleto.dias_semana) {
        if (Array.isArray(rolCompleto.dias_semana)) {
          diasSemanaStr = rolCompleto.dias_semana.join('');
        } else if (typeof rolCompleto.dias_semana === 'string') {
          diasSemanaStr = rolCompleto.dias_semana;
        }
      }
      
      // Convertir fechas ISO a formato date input (YYYY-MM-DD)
      const formatearFecha = (fecha) => {
        if (!fecha) return '';
        // Si viene con hora, tomar solo la parte de la fecha
        return fecha.split('T')[0];
      };
      
      // Convertir horas si vienen con segundos (HH:MM:SS -> HH:MM)
      const formatearHora = (hora) => {
        if (!hora) return '';
        // Si viene con segundos, tomar solo HH:MM
        return hora.substring(0, 5);
      };
      
      const formDataCargado = {
        codigo: rolCompleto.codigo || '',
        nombre: rolCompleto.nombre || '',
        descripcion: rolCompleto.descripcion || '',
        tipo_rol: rolCompleto.tipo_rol || '',
        rol_padre: rolCompleto.rol_padre || '',
        categoria: rolCompleto.categoria || '',
        hereda_permisos: rolCompleto.hereda_permisos ?? true,
        activo: rolCompleto.activo ?? true,
        es_publico: rolCompleto.es_publico ?? false,
        requiere_aprobacion: rolCompleto.requiere_aprobacion ?? false,
        tiene_restriccion_horario: rolCompleto.tiene_restriccion_horario ?? false,
        hora_inicio: formatearHora(rolCompleto.hora_inicio),
        hora_fin: formatearHora(rolCompleto.hora_fin),
        dias_semana: diasSemanaStr,
        fecha_inicio_vigencia: formatearFecha(rolCompleto.fecha_inicio_vigencia),
        fecha_fin_vigencia: formatearFecha(rolCompleto.fecha_fin_vigencia),
        prioridad: rolCompleto.prioridad || 0,
        peso: rolCompleto.peso || 1,
        color: rolCompleto.color || '#4F46E5',
        icono: rolCompleto.icono || 'shield',
        metadatos: typeof rolCompleto.metadatos === 'object' ? rolCompleto.metadatos : {},
        configuracion: typeof rolCompleto.configuracion === 'object' ? rolCompleto.configuracion : {}
      };
      
      setFormData(formDataCargado);
      console.log('✅ FormData cargado:', formDataCargado);
      setShowModal(true);
    } catch (error) {
      console.error('❌ Error al cargar datos del rol:', error);
      alert('Error al cargar los datos del rol: ' + (error.response?.data?.detail || error.message));
    }
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este rol?')) return;
    
    try {
      await rolesService.deleteRol(id);
      alert('Rol eliminado exitosamente');
      loadInitialData();
    } catch (error) {
      console.error('Error deleting rol:', error);
      alert('Error al eliminar: ' + (error.response?.data?.error || error.message));
    }
  };
  
  const handleActivar = async (rol) => {
    try {
      await rolesService.activarRol(rol.id);
      alert('Rol activado exitosamente');
      loadInitialData();
    } catch (error) {
      console.error('Error activando rol:', error);
      alert('Error al activar: ' + (error.response?.data?.error || error.message));
    }
  };
  
  const handleDesactivar = async (rol) => {
    if (rol.es_sistema) {
      alert('No se pueden desactivar roles del sistema');
      return;
    }
    
    if (!window.confirm('¿Está seguro de desactivar este rol?')) return;
    
    try {
      await rolesService.desactivarRol(rol.id);
      alert('Rol desactivado exitosamente');
      loadInitialData();
    } catch (error) {
      console.error('Error desactivando rol:', error);
      alert('Error al desactivar: ' + (error.response?.data?.error || error.message));
    }
  };
  
  const handleDuplicar = async (rol) => {
    const nuevoCodigo = prompt('Ingrese el código para el nuevo rol:', `${rol.codigo}_COPY`);
    if (!nuevoCodigo) return;
    
    const nuevoNombre = prompt('Ingrese el nombre para el nuevo rol:', `${rol.nombre} (Copia)`);
    if (!nuevoNombre) return;
    
    try {
      await rolesService.duplicarRol(rol.id, {
        codigo: nuevoCodigo,
        nombre: nuevoNombre
      });
      alert('Rol duplicado exitosamente');
      loadInitialData();
    } catch (error) {
      console.error('Error duplicando rol:', error);
      alert('Error al duplicar: ' + (error.response?.data?.error || error.message));
    }
  };
  
  // ============================================================================
  // COMPONENTES DE UI
  // ============================================================================
  
  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };
  
  const getRolBadgeClass = (rol) => {
    if (!rol.activo) return 'bg-gray-100 text-gray-800';
    if (rol.es_sistema) return 'bg-blue-100 text-blue-800';
    if (rol.es_publico) return 'bg-green-100 text-green-800';
    return 'bg-emerald-100 text-emerald-800';
  };
  
  const getRolBadgeText = (rol) => {
    if (!rol.activo) return 'Inactivo';
    if (rol.es_sistema) return 'Sistema';
    if (rol.es_publico) return 'Público';
    return 'Activo';
  };

  // ============================================================================
  // RENDERIZADO: VISTA DE TABLA
  // ============================================================================
  
  const renderTablaView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
              Código
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
              Nombre
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
              Tipo / Categoría
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
              Nivel
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
              Asignaciones
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center">
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <span className="ml-3 text-gray-600">Cargando roles...</span>
                </div>
              </td>
            </tr>
          ) : currentItems.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                <Shield className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                No se encontraron roles
              </td>
            </tr>
          ) : (
            currentItems.map((rol, index) => (
              <tr key={rol.id} className={`${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              } hover:bg-cyan-50 transition-colors`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: rol.color || '#4F46E5' }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">{rol.codigo}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{rol.nombre}</div>
                  {rol.descripcion && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {rol.descripcion}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {rol.tipo_rol_nombre || 'Sin tipo'}
                  </div>
                  {rol.categoria && (
                    <div className="text-xs text-gray-500">{rol.categoria}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    Nivel {rol.nivel_jerarquico}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1 text-gray-400" />
                    {rol.asignaciones_activas || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRolBadgeClass(rol)}`}>
                    {getRolBadgeText(rol)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleEdit(rol)}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    
                    {rol.activo ? (
                      <button
                        onClick={() => handleDesactivar(rol)}
                        className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Desactivar"
                        disabled={rol.es_sistema}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivar(rol)}
                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                        title="Activar"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDuplicar(rol)}
                      className="p-2 bg-cyan-100 text-cyan-600 rounded-lg hover:bg-cyan-200 transition-colors"
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    
                    {!rol.es_sistema && (
                      <button
                        onClick={() => handleDelete(rol.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // ============================================================================
  // RENDERIZADO: VISTA DE JERARQUÍA (continuará en siguiente mensaje...)
  // ============================================================================
  
  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };
  
  const renderTreeNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    
    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors ${
            level > 0 ? 'ml-' + (level * 6) : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.id)}
              className="mr-2 focus:outline-none"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-6 mr-2"></div>}
          
          <div
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: node.color || '#4F46E5' }}
          ></div>
          
          <Shield className="h-4 w-4 mr-2 text-gray-400" />
          
          <div className="flex-1">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-900 mr-2">
                {node.nombre}
              </span>
              <span className="text-xs text-gray-500">({node.codigo})</span>
              
              {node.es_sistema && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Sistema
                </span>
              )}
              
              {!node.activo && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  Inactivo
                </span>
              )}
            </div>
            
            {node.descripcion && (
              <div className="text-xs text-gray-500 truncate max-w-md">
                {node.descripcion}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              <Users className="h-3 w-3 inline mr-1" />
              {node.total_asignaciones || 0}
            </span>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(node);
              }}
              className="text-indigo-600 hover:text-indigo-900"
              title="Editar"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  const renderJerarquiaView = () => (
    <div className="bg-white rounded-lg p-6">
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Cargando jerarquía...</span>
        </div>
      ) : treeData.length === 0 ? (
        <div className="text-center py-12">
          <TreePine className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No hay roles para mostrar en la jerarquía</p>
        </div>
      ) : (
        <div className="space-y-1">
          {treeData.map(node => renderTreeNode(node))}
        </div>
      )}
    </div>
  );

  // Este archivo continuará en el siguiente mensaje debido a su longitud...
  // Ahora renderizaré el componente principal y el modal
  
  // ============================================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================================
  
  return (
    <div className="space-y-6">
      {/* Botón Nuevo Rol */}
      <div className="flex justify-end">
        <button onClick={() => { resetForm(); setEditingRol(null); setShowModal(true) }} className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg">
          <Plus className="w-5 h-5" />
          <span>Nuevo Rol</span>
        </button>
      </div>
        
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Total Roles</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <Shield className="w-16 h-16 text-white/30" />
          </div>
        </div>
        
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Activos</p>
              <p className="text-3xl font-bold">{stats.activos}</p>
            </div>
            <CheckCircle className="w-16 h-16 text-white/30" />
          </div>
        </div>
        
        <div className="backdrop-blur-xl bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-100 text-sm">Inactivos</p>
              <p className="text-3xl font-bold">{stats.inactivos}</p>
            </div>
            <XCircle className="w-16 h-16 text-white/30" />
          </div>
        </div>
        
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Sistema</p>
              <p className="text-3xl font-bold">{stats.sistema}</p>
            </div>
            <AlertCircle className="w-16 h-16 text-white/30" />
          </div>
        </div>
      </div>
        
      {/* Filtros */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por código, nombre o categoría..." className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all" />
            </div>
          </div>
          
          <div>
            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all">
              <option value="all">Todos los tipos</option>
              {tiposRol.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all">
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          
          <div>
            <select value={filterNivel} onChange={(e) => setFilterNivel(e.target.value)} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all">
              <option value="all">Todos los niveles</option>
              {[0, 1, 2, 3, 4, 5].map(nivel => (
                <option key={nivel} value={nivel}>Nivel {nivel}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
        
      {/* Toggle View */}
      <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setViewMode('tabla');
              }}
              className={`flex items-center px-4 py-2 rounded-xl transition-colors ${
                viewMode === 'tabla'
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <List className="h-5 w-5 mr-2" />
              Tabla
            </button>
            
            <button
              onClick={() => {
                setViewMode('jerarquia');
                if (treeData.length === 0) {
                  loadTreeData();
                }
              }}
              className={`flex items-center px-4 py-2 rounded-xl transition-colors ${
                viewMode === 'jerarquia'
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <TreePine className="h-5 w-5 mr-2" />
              Jerarquía
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            Mostrando {currentItems.length} de {filteredRoles.length} roles
          </div>
      </div>
      
      {/* Content */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50">
        {viewMode === 'tabla' ? renderTablaView() : renderJerarquiaView()}
      </div>
      
      {/* Pagination */}
      {viewMode === 'tabla' && totalPages > 1 && (
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 px-4 py-3 flex items-center justify-between sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Página <span className="font-medium">{currentPage}</span> de{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Anterior
                </button>
                {[...Array(totalPages)].map((_, idx) => {
                  const pageNum = idx + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg mx-1 transition-colors ${
                          currentPage === pageNum
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return (
                      <span
                        key={pageNum}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Siguiente
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal continuará en el siguiente mensaje... */}
      
      {/* Modal */}
      <RolModal
        show={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRol(null);
          resetForm();
        }}
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSubmit={handleSubmit}
        editingRol={editingRol}
        tiposRol={tiposRol}
        rolesDisponibles={roles}
      />
    </div>
  );
};

export default RolesTab;