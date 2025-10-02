import React from 'react';

const PrestamosList = () => {
  return (
    <div className="container-fluid">
      {/* Header de la página */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1 text-gray-800 dark:text-white">
            <i className="ti ti-piggy-bank me-2 text-yellow-500"></i>
            Préstamos
          </h1>
          <p className="text-muted mb-0">Gestión de préstamos a empleados</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info">
            <i className="ti ti-file-analytics me-2"></i>
            Reporte
          </button>
          <button className="btn btn-outline-warning">
            <i className="ti ti-clock me-2"></i>
            Vencimientos
          </button>
          <button className="btn btn-primary">
            <i className="ti ti-plus me-2"></i>
            Nuevo Préstamo
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card border-start border-primary border-3">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="mb-1">$125M</h4>
                  <p className="text-muted mb-0">Total Prestado</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-currency-dollar text-primary fs-2"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card border-start border-success border-3">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="mb-1">45</h4>
                  <p className="text-muted mb-0">Préstamos Activos</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-check-circle text-success fs-2"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card border-start border-warning border-3">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="mb-1">8</h4>
                  <p className="text-muted mb-0">Vencidos</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-alert-triangle text-warning fs-2"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card border-start border-info border-3">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="mb-1">$85M</h4>
                  <p className="text-muted mb-0">Saldo Pendiente</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-clock text-info fs-2"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Buscar empleado</label>
              <input type="text" className="form-control" placeholder="Nombre o cédula..." />
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado</label>
              <select className="form-select">
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="pagado">Pagado</option>
                <option value="vencido">Vencido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Tipo</label>
              <select className="form-select">
                <option value="">Todos</option>
                <option value="personal">Personal</option>
                <option value="vivienda">Vivienda</option>
                <option value="educacion">Educación</option>
                <option value="emergencia">Emergencia</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Fecha desde</label>
              <input type="date" className="form-control" />
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button className="btn btn-outline-primary me-2">
                <i className="ti ti-search me-2"></i>
                Buscar
              </button>
              <button className="btn btn-outline-secondary">
                <i className="ti ti-refresh me-2"></i>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Préstamos por vencer (alerta) */}
      <div className="alert alert-warning d-flex align-items-center mb-4" role="alert">
        <i className="ti ti-alert-triangle me-3 fs-4"></i>
        <div>
          <strong>¡Atención!</strong> Tienes 3 préstamos que vencen en los próximos 7 días.
          <a href="#" className="alert-link ms-2">Ver detalles</a>
        </div>
      </div>

      {/* Tabla de préstamos */}
      <div className="card shadow-sm">
        <div className="card-header bg-white border-bottom-0">
          <h6 className="card-title mb-0">Registro de Préstamos</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Empleado</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Cuotas</th>
                  <th scope="col">Progreso</th>
                  <th scope="col">Próximo Pago</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src="https://ui-avatars.com/api/?name=Juan+Pérez&background=007bff&color=fff" 
                           alt="Juan Pérez" 
                           className="avatar-sm rounded-circle me-3" />
                      <div>
                        <h6 className="mb-0">Juan Pérez García</h6>
                        <small className="text-muted">CC: 12345678</small>
                        <br />
                        <small className="text-muted">Gerente de Proyectos</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-primary-subtle text-primary">
                      <i className="ti ti-home me-1"></i>
                      Vivienda
                    </span>
                  </td>
                  <td>
                    <div>
                      <span className="fw-semibold text-success">$15,000,000</span>
                      <br />
                      <small className="text-muted">Saldo: $8,500,000</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className="fw-semibold">18 / 36</span>
                      <br />
                      <small className="text-muted">$416,667 c/u</small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="progress flex-grow-1 me-2" style={{height: '8px'}}>
                        <div className="progress-bar bg-success" role="progressbar" style={{width: '50%'}}></div>
                      </div>
                      <small className="text-muted">50%</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className="fw-semibold">15 Ago 2024</span>
                      <br />
                      <small className="text-success">
                        <i className="ti ti-calendar-check me-1"></i>
                        En tiempo
                      </small>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-success">Activo</span>
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-sm btn-outline-primary" title="Ver detalle">
                        <i className="ti ti-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-success" title="Registrar pago">
                        <i className="ti ti-cash"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-info" title="Cronograma">
                        <i className="ti ti-calendar"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-warning" title="Modificar">
                        <i className="ti ti-edit"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src="https://ui-avatars.com/api/?name=María+González&background=28a745&color=fff" 
                           alt="María González" 
                           className="avatar-sm rounded-circle me-3" />
                      <div>
                        <h6 className="mb-0">María González López</h6>
                        <small className="text-muted">CC: 87654321</small>
                        <br />
                        <small className="text-muted">Analista Financiero</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-info-subtle text-info">
                      <i className="ti ti-school me-1"></i>
                      Educación
                    </span>
                  </td>
                  <td>
                    <div>
                      <span className="fw-semibold text-success">$5,000,000</span>
                      <br />
                      <small className="text-muted">Saldo: $1,800,000</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className="fw-semibold">8 / 12</span>
                      <br />
                      <small className="text-muted">$416,667 c/u</small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="progress flex-grow-1 me-2" style={{height: '8px'}}>
                        <div className="progress-bar bg-info" role="progressbar" style={{width: '67%'}}></div>
                      </div>
                      <small className="text-muted">67%</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className="fw-semibold text-danger">10 Jul 2024</span>
                      <br />
                      <small className="text-danger">
                        <i className="ti ti-alert-circle me-1"></i>
                        Vencido (5 días)
                      </small>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-danger">Vencido</span>
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-sm btn-outline-primary" title="Ver detalle">
                        <i className="ti ti-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Pago urgente">
                        <i className="ti ti-urgent"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-warning" title="Notificar">
                        <i className="ti ti-bell"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" title="Renegociar">
                        <i className="ti ti-refresh"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src="https://ui-avatars.com/api/?name=Carlos+Rodríguez&background=6f42c1&color=fff" 
                           alt="Carlos Rodríguez" 
                           className="avatar-sm rounded-circle me-3" />
                      <div>
                        <h6 className="mb-0">Carlos Rodríguez Martín</h6>
                        <small className="text-muted">CC: 45678912</small>
                        <br />
                        <small className="text-muted">Supervisor de Campo</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-warning-subtle text-warning">
                      <i className="ti ti-heart me-1"></i>
                      Emergencia
                    </span>
                  </td>
                  <td>
                    <div>
                      <span className="fw-semibold text-success">$2,500,000</span>
                      <br />
                      <small className="text-muted">Saldo: $250,000</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className="fw-semibold">9 / 10</span>
                      <br />
                      <small className="text-muted">$250,000 c/u</small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="progress flex-grow-1 me-2" style={{height: '8px'}}>
                        <div className="progress-bar bg-warning" role="progressbar" style={{width: '90%'}}></div>
                      </div>
                      <small className="text-muted">90%</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className="fw-semibold">25 Ago 2024</span>
                      <br />
                      <small className="text-warning">
                        <i className="ti ti-clock me-1"></i>
                        Próximo a vencer
                      </small>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-warning">Próximo Pago</span>
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-sm btn-outline-primary" title="Ver detalle">
                        <i className="ti ti-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-success" title="Pagar">
                        <i className="ti ti-cash"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-info" title="Recordatorio">
                        <i className="ti ti-bell"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" title="Finalizar">
                        <i className="ti ti-check"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Más filas pueden ir aquí */}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer bg-white border-top">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">Mostrando 1-10 de 45 préstamos activos</small>
            <nav aria-label="Page navigation">
              <ul className="pagination pagination-sm mb-0">
                <li className="page-item disabled">
                  <span className="page-link">Anterior</span>
                </li>
                <li className="page-item active">
                  <span className="page-link">1</span>
                </li>
                <li className="page-item">
                  <a className="page-link" href="#">2</a>
                </li>
                <li className="page-item">
                  <a className="page-link" href="#">3</a>
                </li>
                <li className="page-item">
                  <a className="page-link" href="#">Siguiente</a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrestamosList;
