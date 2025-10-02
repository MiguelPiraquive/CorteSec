import React from 'react';

const NominasList = () => {
  return (
    <div className="container-fluid">
      {/* Header de la página */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1 text-gray-800 dark:text-white">
            <i className="ti ti-clipboard-list me-2 text-indigo-500"></i>
            Nóminas
          </h1>
          <p className="text-muted mb-0">Gestión de nóminas y pagos de empleados</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-success">
            <i className="ti ti-file-excel me-2"></i>
            Exportar Excel
          </button>
          <button className="btn btn-outline-primary">
            <i className="ti ti-calculator me-2"></i>
            Calcular Nómina
          </button>
          <button className="btn btn-primary">
            <i className="ti ti-plus me-2"></i>
            Nueva Nómina
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
                  <h4 className="mb-1">$850M</h4>
                  <p className="text-muted mb-0">Total Nómina Mes</p>
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
                  <h4 className="mb-1">230</h4>
                  <p className="text-muted mb-0">Empleados Pagados</p>
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
                  <h4 className="mb-1">15</h4>
                  <p className="text-muted mb-0">Pendientes</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-clock text-warning fs-2"></i>
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
                  <h4 className="mb-1">$125M</h4>
                  <p className="text-muted mb-0">Deducciones</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-minus-circle text-info fs-2"></i>
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
              <label className="form-label">Periodo de nómina</label>
              <select className="form-select">
                <option value="">Seleccionar periodo</option>
                <option value="2024-07">Julio 2024</option>
                <option value="2024-06">Junio 2024</option>
                <option value="2024-05">Mayo 2024</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Departamento</label>
              <select className="form-select">
                <option value="">Todos</option>
                <option value="1">Recursos Humanos</option>
                <option value="2">Finanzas</option>
                <option value="3">Operaciones</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado</label>
              <select className="form-select">
                <option value="">Todos</option>
                <option value="generada">Generada</option>
                <option value="pagada">Pagada</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Tipo</label>
              <select className="form-select">
                <option value="">Todos</option>
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
                <option value="especial">Especial</option>
              </select>
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

      {/* Tabla de nóminas */}
      <div className="card shadow-sm">
        <div className="card-header bg-white border-bottom-0">
          <h6 className="card-title mb-0">Registro de Nóminas</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Periodo</th>
                  <th scope="col">Empleado</th>
                  <th scope="col">Cargo</th>
                  <th scope="col">Salario Base</th>
                  <th scope="col">Deducciones</th>
                  <th scope="col">Neto a Pagar</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div>
                      <span className="fw-semibold">Julio 2024</span>
                      <br />
                      <small className="text-muted">01 - 31 Jul</small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src="https://ui-avatars.com/api/?name=Juan+Pérez&background=007bff&color=fff" 
                           alt="Juan Pérez" 
                           className="avatar-sm rounded-circle me-3" />
                      <div>
                        <h6 className="mb-0">Juan Pérez García</h6>
                        <small className="text-muted">CC: 12345678</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-primary-subtle text-primary">Gerente de Proyectos</span>
                  </td>
                  <td>
                    <span className="fw-semibold text-success">$4,500,000</span>
                  </td>
                  <td>
                    <div className="text-sm">
                      <span className="text-danger">-$675,000</span>
                      <br />
                      <small className="text-muted">Salud, Pensión, ARL</small>
                    </div>
                  </td>
                  <td>
                    <span className="fw-bold text-primary fs-6">$3,825,000</span>
                  </td>
                  <td>
                    <span className="badge bg-success">Pagada</span>
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-sm btn-outline-primary" title="Ver detalle">
                        <i className="ti ti-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-info" title="Descargar comprobante">
                        <i className="ti ti-download"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-warning" title="Editar">
                        <i className="ti ti-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" title="Enviar por email">
                        <i className="ti ti-mail"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div>
                      <span className="fw-semibold">Julio 2024</span>
                      <br />
                      <small className="text-muted">01 - 31 Jul</small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src="https://ui-avatars.com/api/?name=María+González&background=28a745&color=fff" 
                           alt="María González" 
                           className="avatar-sm rounded-circle me-3" />
                      <div>
                        <h6 className="mb-0">María González López</h6>
                        <small className="text-muted">CC: 87654321</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-success-subtle text-success">Analista Financiero</span>
                  </td>
                  <td>
                    <span className="fw-semibold text-success">$3,200,000</span>
                  </td>
                  <td>
                    <div className="text-sm">
                      <span className="text-danger">-$480,000</span>
                      <br />
                      <small className="text-muted">Salud, Pensión, ARL</small>
                    </div>
                  </td>
                  <td>
                    <span className="fw-bold text-primary fs-6">$2,720,000</span>
                  </td>
                  <td>
                    <span className="badge bg-warning">Pendiente</span>
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-sm btn-outline-primary" title="Ver detalle">
                        <i className="ti ti-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-success" title="Procesar pago">
                        <i className="ti ti-credit-card"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-warning" title="Editar">
                        <i className="ti ti-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Cancelar">
                        <i className="ti ti-x"></i>
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
            <small className="text-muted">Mostrando 1-10 de 245 registros de nómina</small>
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

export default NominasList;
