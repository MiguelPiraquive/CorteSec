import React, { useState, useEffect } from 'react';

const PermisosList = () => {
  const [permisos, setPermisos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [moduloFiltro, setModuloFiltro] = useState('todos');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [loading, setLoading] = useState(true);

  // Datos simulados de permisos
  const datosPermisos = [
    {
      id: 1,
      codigo: 'usuarios.crear',
      nombre: 'Crear Usuarios',
      descripcion: 'Permite crear nuevos usuarios en el sistema',
      modulo: 'usuarios',
      tipo: 'crear',
      activo: true,
      roles_asignados: ['Super Administrador', 'Administrador'],
      fecha_creacion: '2024-01-01',
      criticidad: 'alta'
    },
    {
      id: 2,
      codigo: 'usuarios.editar',
      nombre: 'Editar Usuarios',
      descripcion: 'Permite modificar información de usuarios existentes',
      modulo: 'usuarios',
      tipo: 'editar',
      activo: true,
      roles_asignados: ['Super Administrador', 'Administrador', 'Gerente de RRHH'],
      fecha_creacion: '2024-01-01',
      criticidad: 'alta'
    },
    {
      id: 3,
      codigo: 'usuarios.eliminar',
      nombre: 'Eliminar Usuarios',
      descripcion: 'Permite eliminar usuarios del sistema',
      modulo: 'usuarios',
      tipo: 'eliminar',
      activo: true,
      roles_asignados: ['Super Administrador'],
      fecha_creacion: '2024-01-01',
      criticidad: 'critica'
    },
    {
      id: 4,
      codigo: 'empleados.gestionar',
      nombre: 'Gestionar Empleados',
      descripcion: 'Permite administrar información de empleados',
      modulo: 'empleados',
      tipo: 'gestionar',
      activo: true,
      roles_asignados: ['Super Administrador', 'Administrador', 'Gerente de RRHH'],
      fecha_creacion: '2024-01-02',
      criticidad: 'media'
    },
    {
      id: 5,
      codigo: 'nomina.gestionar',
      nombre: 'Gestionar Nómina',
      descripcion: 'Permite administrar procesos de nómina',
      modulo: 'nomina',
      tipo: 'gestionar',
      activo: true,
      roles_asignados: ['Super Administrador', 'Gerente de RRHH', 'Contador'],
      fecha_creacion: '2024-01-02',
      criticidad: 'alta'
    },
    {
      id: 6,
      codigo: 'contabilidad.gestionar',
      nombre: 'Gestionar Contabilidad',
      descripcion: 'Permite administrar movimientos contables',
      modulo: 'contabilidad',
      tipo: 'gestionar',
      activo: true,
      roles_asignados: ['Super Administrador', 'Contador'],
      fecha_creacion: '2024-01-03',
      criticidad: 'alta'
    },
    {
      id: 7,
      codigo: 'reportes.generar',
      nombre: 'Generar Reportes',
      descripcion: 'Permite generar reportes del sistema',
      modulo: 'reportes',
      tipo: 'leer',
      activo: true,
      roles_asignados: ['Super Administrador', 'Administrador', 'Gerente de RRHH', 'Contador'],
      fecha_creacion: '2024-01-04',
      criticidad: 'media'
    },
    {
      id: 8,
      codigo: 'sistema.configurar',
      nombre: 'Configurar Sistema',
      descripcion: 'Permite modificar configuraciones del sistema',
      modulo: 'sistema',
      tipo: 'configurar',
      activo: true,
      roles_asignados: ['Super Administrador'],
      fecha_creacion: '2024-01-01',
      criticidad: 'critica'
    },
    {
      id: 9,
      codigo: 'dashboard.ver',
      nombre: 'Ver Dashboard',
      descripcion: 'Permite acceder al panel principal',
      modulo: 'dashboard',
      tipo: 'leer',
      activo: true,
      roles_asignados: ['Super Administrador', 'Administrador', 'Gerente de RRHH', 'Contador', 'Supervisor', 'Empleado'],
      fecha_creacion: '2024-01-01',
      criticidad: 'baja'
    },
    {
      id: 10,
      codigo: 'items.gestionar',
      nombre: 'Gestionar Inventario',
      descripcion: 'Permite administrar el inventario de items',
      modulo: 'inventario',
      tipo: 'gestionar',
      activo: true,
      roles_asignados: ['Super Administrador', 'Administrador', 'Supervisor'],
      fecha_creacion: '2024-01-05',
      criticidad: 'media'
    },
    {
      id: 11,
      codigo: 'solicitudes.crear',
      nombre: 'Crear Solicitudes',
      descripcion: 'Permite crear nuevas solicitudes',
      modulo: 'solicitudes',
      tipo: 'crear',
      activo: true,
      roles_asignados: ['Super Administrador', 'Administrador', 'Gerente de RRHH', 'Empleado'],
      fecha_creacion: '2024-01-06',
      criticidad: 'baja'
    },
    {
      id: 12,
      codigo: 'backup.sistema',
      nombre: 'Backup del Sistema',
      descripcion: 'Permite realizar copias de seguridad',
      modulo: 'sistema',
      tipo: 'configurar',
      activo: false,
      roles_asignados: ['Super Administrador'],
      fecha_creacion: '2024-01-10',
      criticidad: 'critica'
    }
  ];

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setPermisos(datosPermisos);
      setLoading(false);
    }, 1000);
  }, []);

  const permisosFiltrados = permisos.filter(permiso => {
    const coincideFiltro = permiso.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
                          permiso.codigo.toLowerCase().includes(filtro.toLowerCase()) ||
                          permiso.descripcion.toLowerCase().includes(filtro.toLowerCase());
    const coincideModulo = moduloFiltro === 'todos' || permiso.modulo === moduloFiltro;
    const coincideTipo = tipoFiltro === 'todos' || permiso.tipo === tipoFiltro;
    return coincideFiltro && coincideModulo && coincideTipo;
  });

  const totalPermisos = permisos.length;
  const permisosActivos = permisos.filter(p => p.activo).length;
  const modulos = [...new Set(permisos.map(p => p.modulo))];
  const permisosCriticos = permisos.filter(p => p.criticidad === 'critica').length;

  const getCriticidadBadge = (criticidad) => {
    const badges = {
      'critica': 'bg-danger',
      'alta': 'bg-warning',
      'media': 'bg-primary',
      'baja': 'bg-success'
    };
    return badges[criticidad] || 'bg-secondary';
  };

  const getTipoBadge = (tipo) => {
    const badges = {
      'crear': 'bg-success',
      'leer': 'bg-info',
      'editar': 'bg-warning',
      'eliminar': 'bg-danger',
      'gestionar': 'bg-primary',
      'configurar': 'bg-dark'
    };
    return badges[tipo] || 'bg-secondary';
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      'crear': 'fas fa-plus',
      'leer': 'fas fa-eye',
      'editar': 'fas fa-edit',
      'eliminar': 'fas fa-trash',
      'gestionar': 'fas fa-cogs',
      'configurar': 'fas fa-sliders-h'
    };
    return icons[tipo] || 'fas fa-key';
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">
                    <i className="fas fa-key text-primary me-2"></i>
                    Gestión de Permisos
                  </h4>
                  <p className="text-muted mb-0">Administración de permisos y controles de acceso del sistema</p>
                </div>
                <button className="btn btn-primary">
                  <i className="fas fa-plus me-2"></i>
                  Crear Permiso
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Estadísticas */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-key fa-2x text-primary"></i>
              </div>
              <h5 className="card-title">Total Permisos</h5>
              <h3 className="text-primary mb-0">{totalPermisos}</h3>
              <small className="text-muted">En el sistema</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-check-circle fa-2x text-success"></i>
              </div>
              <h5 className="card-title">Permisos Activos</h5>
              <h3 className="text-success mb-0">{permisosActivos}</h3>
              <small className="text-muted">Habilitados</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-puzzle-piece fa-2x text-info"></i>
              </div>
              <h5 className="card-title">Módulos</h5>
              <h3 className="text-info mb-0">{modulos.length}</h3>
              <small className="text-muted">Diferentes módulos</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-exclamation-triangle fa-2x text-danger"></i>
              </div>
              <h5 className="card-title">Críticos</h5>
              <h3 className="text-danger mb-0">{permisosCriticos}</h3>
              <small className="text-muted">Alta seguridad</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Buscar permisos</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por nombre, código o descripción..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Módulo</label>
                  <select
                    className="form-select"
                    value={moduloFiltro}
                    onChange={(e) => setModuloFiltro(e.target.value)}
                  >
                    <option value="todos">Todos los módulos</option>
                    {modulos.map(modulo => (
                      <option key={modulo} value={modulo}>{modulo}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Tipo de acción</label>
                  <select
                    className="form-select"
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value)}
                  >
                    <option value="todos">Todos los tipos</option>
                    <option value="crear">Crear</option>
                    <option value="leer">Leer</option>
                    <option value="editar">Editar</option>
                    <option value="eliminar">Eliminar</option>
                    <option value="gestionar">Gestionar</option>
                    <option value="configurar">Configurar</option>
                  </select>
                </div>
                <div className="col-md-2 mb-3">
                  <label className="form-label">Acciones</label>
                  <div className="d-grid">
                    <button className="btn btn-outline-primary">
                      <i className="fas fa-sync me-2"></i>
                      Sincronizar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Permisos */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Lista de Permisos ({permisosFiltrados.length})
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Módulo</th>
                      <th>Tipo</th>
                      <th>Criticidad</th>
                      <th>Estado</th>
                      <th>Roles Asignados</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permisosFiltrados.map(permiso => (
                      <tr key={permiso.id}>
                        <td>
                          <code className="small">{permiso.codigo}</code>
                        </td>
                        <td>
                          <div>
                            <div className="fw-bold">{permiso.nombre}</div>
                            <small className="text-muted">{permiso.descripcion}</small>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">
                            {permiso.modulo}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getTipoBadge(permiso.tipo)}`}>
                            <i className={`${getTipoIcon(permiso.tipo)} me-1`}></i>
                            {permiso.tipo}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getCriticidadBadge(permiso.criticidad)}`}>
                            {permiso.criticidad}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${permiso.activo ? 'bg-success' : 'bg-secondary'}`}>
                            {permiso.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {permiso.roles_asignados.slice(0, 2).map((rol, index) => (
                              <span key={index} className="badge bg-primary small">
                                {rol}
                              </span>
                            ))}
                            {permiso.roles_asignados.length > 2 && (
                              <span className="badge bg-secondary small">
                                +{permiso.roles_asignados.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button className="btn btn-sm btn-outline-primary">
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-secondary">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-info">
                              <i className="fas fa-users"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {permisosFiltrados.length === 0 && (
        <div className="text-center py-5">
          <i className="fas fa-search fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No se encontraron permisos</h5>
          <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}
    </div>
  );
};

export default PermisosList;
