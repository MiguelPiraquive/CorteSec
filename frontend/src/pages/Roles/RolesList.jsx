import React, { useState, useEffect } from 'react';

const RolesList = () => {
  const [roles, setRoles] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState('todos');
  const [loading, setLoading] = useState(true);

  // Datos simulados de roles
  const datosRoles = [
    {
      id: 1,
      nombre: 'Super Administrador',
      descripcion: 'Acceso completo al sistema, puede realizar cualquier acción',
      nivel: 'sistema',
      activo: true,
      usuarios_asignados: 2,
      permisos_count: 50,
      fecha_creacion: '2024-01-01',
      color: '#dc3545',
      permisos: ['usuarios.crear', 'usuarios.editar', 'usuarios.eliminar', 'sistema.configurar', 'reportes.generar']
    },
    {
      id: 2,
      nombre: 'Administrador',
      descripcion: 'Gestión general del sistema sin acceso a configuración crítica',
      nivel: 'alto',
      activo: true,
      usuarios_asignados: 5,
      permisos_count: 35,
      fecha_creacion: '2024-01-01',
      color: '#fd7e14',
      permisos: ['usuarios.crear', 'usuarios.editar', 'empleados.gestionar', 'nomina.gestionar']
    },
    {
      id: 3,
      nombre: 'Gerente de RRHH',
      descripcion: 'Gestión de recursos humanos, nómina y empleados',
      nivel: 'medio',
      activo: true,
      usuarios_asignados: 8,
      permisos_count: 25,
      fecha_creacion: '2024-01-05',
      color: '#198754',
      permisos: ['empleados.gestionar', 'nomina.gestionar', 'cargos.gestionar', 'reportes.rrhh']
    },
    {
      id: 4,
      nombre: 'Contador',
      descripcion: 'Gestión contable y financiera del sistema',
      nivel: 'medio',
      activo: true,
      usuarios_asignados: 3,
      permisos_count: 20,
      fecha_creacion: '2024-01-08',
      color: '#0d6efd',
      permisos: ['contabilidad.gestionar', 'nomina.ver', 'reportes.financieros']
    },
    {
      id: 5,
      nombre: 'Supervisor',
      descripcion: 'Supervisión de operaciones y seguimiento de tareas',
      nivel: 'medio',
      activo: true,
      usuarios_asignados: 12,
      permisos_count: 15,
      fecha_creacion: '2024-01-10',
      color: '#6610f2',
      permisos: ['empleados.ver', 'reportes.operacionales', 'items.gestionar']
    },
    {
      id: 6,
      nombre: 'Empleado',
      descripcion: 'Acceso básico para empleados regulares',
      nivel: 'bajo',
      activo: true,
      usuarios_asignados: 45,
      permisos_count: 8,
      fecha_creacion: '2024-01-01',
      color: '#6c757d',
      permisos: ['perfil.editar', 'dashboard.ver', 'solicitudes.crear']
    },
    {
      id: 7,
      nombre: 'Invitado',
      descripcion: 'Acceso de solo lectura para consultores externos',
      nivel: 'bajo',
      activo: false,
      usuarios_asignados: 0,
      permisos_count: 3,
      fecha_creacion: '2024-01-15',
      color: '#adb5bd',
      permisos: ['dashboard.ver', 'reportes.publicos']
    }
  ];

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setRoles(datosRoles);
      setLoading(false);
    }, 1000);
  }, []);

  const rolesFiltrados = roles.filter(rol => {
    const coincideFiltro = rol.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
                          rol.descripcion.toLowerCase().includes(filtro.toLowerCase());
    const coincideNivel = nivelFiltro === 'todos' || rol.nivel === nivelFiltro;
    return coincideFiltro && coincideNivel;
  });

  const totalRoles = roles.length;
  const rolesActivos = roles.filter(r => r.activo).length;
  const totalUsuarios = roles.reduce((sum, r) => sum + r.usuarios_asignados, 0);
  const rolesInactivos = totalRoles - rolesActivos;

  const getNivelBadge = (nivel) => {
    const badges = {
      'sistema': 'bg-danger',
      'alto': 'bg-warning',
      'medio': 'bg-primary',
      'bajo': 'bg-secondary'
    };
    return badges[nivel] || 'bg-secondary';
  };

  const getNivelIcon = (nivel) => {
    const icons = {
      'sistema': 'fas fa-crown',
      'alto': 'fas fa-star',
      'medio': 'fas fa-user-tie',
      'bajo': 'fas fa-user'
    };
    return icons[nivel] || 'fas fa-user';
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
                    <i className="fas fa-user-shield text-primary me-2"></i>
                    Gestión de Roles
                  </h4>
                  <p className="text-muted mb-0">Administración de roles y niveles de acceso del sistema</p>
                </div>
                <button className="btn btn-primary">
                  <i className="fas fa-plus me-2"></i>
                  Crear Rol
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
                <i className="fas fa-users-cog fa-2x text-primary"></i>
              </div>
              <h5 className="card-title">Total Roles</h5>
              <h3 className="text-primary mb-0">{totalRoles}</h3>
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
              <h5 className="card-title">Roles Activos</h5>
              <h3 className="text-success mb-0">{rolesActivos}</h3>
              <small className="text-muted">Disponibles</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-users fa-2x text-info"></i>
              </div>
              <h5 className="card-title">Usuarios Asignados</h5>
              <h3 className="text-info mb-0">{totalUsuarios}</h3>
              <small className="text-muted">Total asignaciones</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-times-circle fa-2x text-danger"></i>
              </div>
              <h5 className="card-title">Roles Inactivos</h5>
              <h3 className="text-danger mb-0">{rolesInactivos}</h3>
              <small className="text-muted">Deshabilitados</small>
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
                <div className="col-md-6 mb-3">
                  <label className="form-label">Buscar roles</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por nombre o descripción..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Nivel de acceso</label>
                  <select
                    className="form-select"
                    value={nivelFiltro}
                    onChange={(e) => setNivelFiltro(e.target.value)}
                  >
                    <option value="todos">Todos los niveles</option>
                    <option value="sistema">Sistema</option>
                    <option value="alto">Alto</option>
                    <option value="medio">Medio</option>
                    <option value="bajo">Bajo</option>
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Acciones</label>
                  <div className="d-grid">
                    <button className="btn btn-outline-primary">
                      <i className="fas fa-cog me-2"></i>
                      Configurar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Roles */}
      <div className="row">
        {rolesFiltrados.map(rol => (
          <div key={rol.id} className="col-lg-4 col-md-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header" style={{ backgroundColor: rol.color, color: 'white' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <i className={`${getNivelIcon(rol.nivel)} me-2`}></i>
                    {rol.nombre}
                  </h6>
                  <div>
                    <span className={`badge ${rol.activo ? 'bg-light text-dark' : 'bg-secondary'}`}>
                      {rol.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <p className="text-muted mb-3">{rol.descripcion}</p>
                
                <div className="row mb-3">
                  <div className="col-6 text-center">
                    <div className="mb-1">
                      <i className="fas fa-users text-info"></i>
                    </div>
                    <div className="fw-bold text-info">{rol.usuarios_asignados}</div>
                    <small className="text-muted">Usuarios</small>
                  </div>
                  <div className="col-6 text-center">
                    <div className="mb-1">
                      <i className="fas fa-key text-warning"></i>
                    </div>
                    <div className="fw-bold text-warning">{rol.permisos_count}</div>
                    <small className="text-muted">Permisos</small>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small text-muted">Nivel de acceso</label>
                  <div>
                    <span className={`badge ${getNivelBadge(rol.nivel)}`}>
                      {rol.nivel.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small text-muted">Permisos principales</label>
                  <div className="d-flex flex-wrap gap-1">
                    {rol.permisos.slice(0, 3).map((permiso, index) => (
                      <span key={index} className="badge bg-light text-dark small">
                        {permiso}
                      </span>
                    ))}
                    {rol.permisos.length > 3 && (
                      <span className="badge bg-secondary small">
                        +{rol.permisos.length - 3} más
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <small className="text-muted">
                    <i className="fas fa-calendar me-1"></i>
                    Creado: {new Date(rol.fecha_creacion).toLocaleDateString('es-CO')}
                  </small>
                </div>
              </div>
              <div className="card-footer bg-white border-top-0">
                <div className="btn-group w-100" role="group">
                  <button className="btn btn-outline-primary btn-sm">
                    <i className="fas fa-eye"></i>
                  </button>
                  <button className="btn btn-outline-secondary btn-sm">
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="btn btn-outline-info btn-sm">
                    <i className="fas fa-key"></i>
                  </button>
                  <button className="btn btn-outline-danger btn-sm">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rolesFiltrados.length === 0 && (
        <div className="text-center py-5">
          <i className="fas fa-search fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No se encontraron roles</h5>
          <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}
    </div>
  );
};

export default RolesList;
