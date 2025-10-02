import React, { useState, useEffect } from 'react';

const ReportesList = () => {
  const [reportes, setReportes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [loading, setLoading] = useState(true);

  // Datos simulados de reportes
  const datosReportes = [
    {
      id: 1,
      nombre: 'Reporte de Nómina Mensual',
      descripcion: 'Detalle completo de la nómina procesada del mes actual',
      categoria: 'nomina',
      tipo: 'automatico',
      formato: 'PDF',
      estado: 'completado',
      fecha_generacion: '2024-01-25T10:30:00',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-01-31',
      tamaño: '2.5 MB',
      registros: 150,
      generado_por: 'Sistema Automático',
      parametros: {
        departamento: 'Todos',
        tipo_empleado: 'Todos',
        incluir_deducciones: true
      }
    },
    {
      id: 2,
      nombre: 'Balance Contable Trimestral',
      descripcion: 'Estado financiero y balance contable del trimestre',
      categoria: 'contabilidad',
      tipo: 'manual',
      formato: 'Excel',
      estado: 'en_proceso',
      fecha_generacion: '2024-01-25T14:20:00',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-03-31',
      tamaño: null,
      registros: null,
      generado_por: 'Contador Principal',
      parametros: {
        incluir_movimientos: true,
        detalle_cuentas: true,
        comparativo_anterior: true
      }
    },
    {
      id: 3,
      nombre: 'Inventario de Items',
      descripcion: 'Listado completo del inventario actual con stock',
      categoria: 'inventario',
      tipo: 'programado',
      formato: 'PDF',
      estado: 'completado',
      fecha_generacion: '2024-01-24T08:00:00',
      fecha_inicio: '2024-01-24',
      fecha_fin: '2024-01-24',
      tamaño: '1.8 MB',
      registros: 320,
      generado_por: 'Sistema Programado',
      parametros: {
        incluir_agotados: false,
        agrupar_por_categoria: true,
        mostrar_valoracion: true
      }
    },
    {
      id: 4,
      nombre: 'Reporte de Empleados por Departamento',
      descripcion: 'Distribución de empleados organizados por departamentos',
      categoria: 'empleados',
      tipo: 'manual',
      formato: 'Excel',
      estado: 'completado',
      fecha_generacion: '2024-01-23T16:45:00',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-01-23',
      tamaño: '890 KB',
      registros: 150,
      generado_por: 'Gerente RRHH',
      parametros: {
        incluir_inactivos: false,
        mostrar_cargos: true,
        incluir_fechas_ingreso: true
      }
    },
    {
      id: 5,
      nombre: 'Análisis de Préstamos',
      descripcion: 'Estado actual de préstamos y cronograma de pagos',
      categoria: 'prestamos',
      tipo: 'programado',
      formato: 'PDF',
      estado: 'fallido',
      fecha_generacion: '2024-01-25T06:00:00',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-01-25',
      tamaño: null,
      registros: null,
      generado_por: 'Sistema Programado',
      parametros: {
        incluir_vencidos: true,
        mostrar_proyecciones: true,
        detalle_empleados: true
      }
    },
    {
      id: 6,
      nombre: 'Dashboard Ejecutivo',
      descripcion: 'Métricas principales y KPIs del sistema',
      categoria: 'dashboard',
      tipo: 'automatico',
      formato: 'PDF',
      estado: 'completado',
      fecha_generacion: '2024-01-25T07:00:00',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-01-25',
      tamaño: '3.2 MB',
      registros: 0,
      generado_por: 'Sistema Automático',
      parametros: {
        incluir_graficos: true,
        periodo_comparacion: '6_meses',
        nivel_detalle: 'ejecutivo'
      }
    },
    {
      id: 7,
      nombre: 'Auditoria de Sistema',
      descripcion: 'Log de actividades y cambios en el sistema',
      categoria: 'auditoria',
      tipo: 'programado',
      formato: 'Excel',
      estado: 'programado',
      fecha_generacion: '2024-01-26T02:00:00',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-01-25',
      tamaño: null,
      registros: null,
      generado_por: 'Sistema Programado',
      parametros: {
        incluir_logins: true,
        incluir_cambios_datos: true,
        filtrar_por_usuario: false
      }
    },
    {
      id: 8,
      nombre: 'Carga de Trabajo por Empleado',
      descripcion: 'Análisis de productividad y carga laboral',
      categoria: 'productividad',
      tipo: 'manual',
      formato: 'PDF',
      estado: 'completado',
      fecha_generacion: '2024-01-22T11:15:00',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-01-22',
      tamaño: '1.4 MB',
      registros: 150,
      generado_por: 'Supervisor General',
      parametros: {
        incluir_tiempos: true,
        mostrar_eficiencia: true,
        comparar_periodos: true
      }
    }
  ];

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setReportes(datosReportes);
      setLoading(false);
    }, 1000);
  }, []);

  const reportesFiltrados = reportes.filter(reporte => {
    const coincideFiltro = reporte.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
                          reporte.descripcion.toLowerCase().includes(filtro.toLowerCase()) ||
                          reporte.generado_por.toLowerCase().includes(filtro.toLowerCase());
    const coincideCategoria = categoriaFiltro === 'todas' || reporte.categoria === categoriaFiltro;
    const coincideEstado = estadoFiltro === 'todos' || reporte.estado === estadoFiltro;
    return coincideFiltro && coincideCategoria && coincideEstado;
  });

  const totalReportes = reportes.length;
  const reportesCompletados = reportes.filter(r => r.estado === 'completado').length;
  const categorias = [...new Set(reportes.map(r => r.categoria))];
  const reportesEnProceso = reportes.filter(r => r.estado === 'en_proceso').length;

  const getEstadoBadge = (estado) => {
    const badges = {
      'completado': 'bg-success',
      'en_proceso': 'bg-warning',
      'programado': 'bg-info',
      'fallido': 'bg-danger'
    };
    return badges[estado] || 'bg-secondary';
  };

  const getTipoBadge = (tipo) => {
    const badges = {
      'automatico': 'bg-primary',
      'manual': 'bg-secondary',
      'programado': 'bg-info'
    };
    return badges[tipo] || 'bg-secondary';
  };

  const getCategoriaIcon = (categoria) => {
    const icons = {
      'nomina': 'fas fa-calculator',
      'contabilidad': 'fas fa-chart-line',
      'inventario': 'fas fa-boxes',
      'empleados': 'fas fa-users',
      'prestamos': 'fas fa-hand-holding-usd',
      'dashboard': 'fas fa-tachometer-alt',
      'auditoria': 'fas fa-shield-alt',
      'productividad': 'fas fa-chart-bar'
    };
    return icons[categoria] || 'fas fa-file-alt';
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-CO');
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
                    <i className="fas fa-chart-bar text-primary me-2"></i>
                    Sistema de Reportes
                  </h4>
                  <p className="text-muted mb-0">Generación y gestión de reportes del sistema</p>
                </div>
                <div className="btn-group">
                  <button className="btn btn-outline-secondary">
                    <i className="fas fa-sync me-2"></i>
                    Actualizar
                  </button>
                  <button className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>
                    Generar Reporte
                  </button>
                </div>
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
                <i className="fas fa-file-alt fa-2x text-primary"></i>
              </div>
              <h5 className="card-title">Total Reportes</h5>
              <h3 className="text-primary mb-0">{totalReportes}</h3>
              <small className="text-muted">Generados</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-check-circle fa-2x text-success"></i>
              </div>
              <h5 className="card-title">Completados</h5>
              <h3 className="text-success mb-0">{reportesCompletados}</h3>
              <small className="text-muted">Listos para descargar</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-clock fa-2x text-warning"></i>
              </div>
              <h5 className="card-title">En Proceso</h5>
              <h3 className="text-warning mb-0">{reportesEnProceso}</h3>
              <small className="text-muted">Generándose</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-layer-group fa-2x text-info"></i>
              </div>
              <h5 className="card-title">Categorías</h5>
              <h3 className="text-info mb-0">{categorias.length}</h3>
              <small className="text-muted">Diferentes tipos</small>
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
                  <label className="form-label">Buscar reportes</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por nombre, descripción o usuario..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-select"
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                  >
                    <option value="todas">Todas las categorías</option>
                    {categorias.map(categoria => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Estado</label>
                  <select
                    className="form-select"
                    value={estadoFiltro}
                    onChange={(e) => setEstadoFiltro(e.target.value)}
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="completado">Completado</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="programado">Programado</option>
                    <option value="fallido">Fallido</option>
                  </select>
                </div>
                <div className="col-md-2 mb-3">
                  <label className="form-label">Acciones</label>
                  <div className="d-grid">
                    <button className="btn btn-outline-primary">
                      <i className="fas fa-calendar me-2"></i>
                      Programar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Reportes */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Lista de Reportes ({reportesFiltrados.length})
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Reporte</th>
                      <th>Categoría</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th>Formato</th>
                      <th>Generado</th>
                      <th>Tamaño</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportesFiltrados.map(reporte => (
                      <tr key={reporte.id}>
                        <td>
                          <div>
                            <div className="fw-bold">{reporte.nombre}</div>
                            <small className="text-muted">{reporte.descripcion}</small>
                            <div className="mt-1">
                              <small className="text-muted">
                                <i className="fas fa-user me-1"></i>
                                {reporte.generado_por}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">
                            <i className={`${getCategoriaIcon(reporte.categoria)} me-1`}></i>
                            {reporte.categoria}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getTipoBadge(reporte.tipo)}`}>
                            {reporte.tipo}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getEstadoBadge(reporte.estado)}`}>
                            {reporte.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-secondary">{reporte.formato}</span>
                        </td>
                        <td>
                          <small>{formatFecha(reporte.fecha_generacion)}</small>
                        </td>
                        <td>
                          {reporte.tamaño ? (
                            <span className="text-muted">{reporte.tamaño}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                          {reporte.registros && (
                            <div>
                              <small className="text-muted">{reporte.registros} registros</small>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            {reporte.estado === 'completado' && (
                              <button className="btn btn-sm btn-outline-success">
                                <i className="fas fa-download"></i>
                              </button>
                            )}
                            <button className="btn btn-sm btn-outline-primary">
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-secondary">
                              <i className="fas fa-copy"></i>
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

      {reportesFiltrados.length === 0 && (
        <div className="text-center py-5">
          <i className="fas fa-search fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No se encontraron reportes</h5>
          <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}
    </div>
  );
};

export default ReportesList;
