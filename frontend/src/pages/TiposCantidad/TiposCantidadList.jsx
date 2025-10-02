import React from 'react';

const TiposCantidadList = () => {
  return (
    <div className="container-fluid">
      {/* Header de la página */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1 text-gray-800 dark:text-white">
            <i className="ti ti-calculator me-2 text-teal-500"></i>
            Tipos de Cantidad
          </h1>
          <p className="text-muted mb-0">Gestión de unidades de medida y cantidades</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info">
            <i className="ti ti-file-import me-2"></i>
            Importar
          </button>
          <button className="btn btn-primary">
            <i className="ti ti-plus me-2"></i>
            Nuevo Tipo
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
                  <h4 className="mb-1">45</h4>
                  <p className="text-muted mb-0">Total Tipos</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-calculator text-primary fs-2"></i>
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
                  <h4 className="mb-1">8</h4>
                  <p className="text-muted mb-0">Categorías</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-category text-success fs-2"></i>
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
                  <h4 className="mb-1">42</h4>
                  <p className="text-muted mb-0">En Uso</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-check-circle text-warning fs-2"></i>
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
                  <h4 className="mb-1">1,245</h4>
                  <p className="text-muted mb-0">Ítems Asociados</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-package text-info fs-2"></i>
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
            <div className="col-md-4">
              <label className="form-label">Buscar tipo de cantidad</label>
              <input type="text" className="form-control" placeholder="Nombre, abreviatura o descripción..." />
            </div>
            <div className="col-md-3">
              <label className="form-label">Categoría</label>
              <select className="form-select">
                <option value="">Todas las categorías</option>
                <option value="peso">Peso</option>
                <option value="volumen">Volumen</option>
                <option value="longitud">Longitud</option>
                <option value="area">Área</option>
                <option value="tiempo">Tiempo</option>
                <option value="unidad">Unidad</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado</label>
              <select className="form-select">
                <option value="">Todos</option>
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
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

      {/* Vista de tipos por categoría */}
      <div className="row">
        {/* Peso */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm">
            <div className="card-header bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="card-title mb-0">
                  <i className="ti ti-weight me-2"></i>
                  Peso
                </h6>
                <span className="badge bg-white text-blue-600">8 tipos</span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Tipo</th>
                      <th>Abreviatura</th>
                      <th>Factor</th>
                      <th>Uso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-blue-100 rounded-circle me-3 d-flex align-items-center justify-content-center">
                            <i className="ti ti-weight text-blue-600"></i>
                          </div>
                          <div>
                            <h6 className="mb-0">Kilogramo</h6>
                            <small className="text-muted">Unidad base</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-primary">kg</span></td>
                      <td><span className="text-muted">1.0</span></td>
                      <td><small className="text-success">245 ítems</small></td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-warning" title="Editar">
                            <i className="ti ti-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title="Ver ítems">
                            <i className="ti ti-list"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-blue-100 rounded-circle me-3 d-flex align-items-center justify-content-center">
                            <i className="ti ti-weight text-blue-600"></i>
                          </div>
                          <div>
                            <h6 className="mb-0">Gramo</h6>
                            <small className="text-muted">Submúltiplo</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-info">g</span></td>
                      <td><span className="text-muted">0.001</span></td>
                      <td><small className="text-success">89 ítems</small></td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-warning" title="Editar">
                            <i className="ti ti-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title="Ver ítems">
                            <i className="ti ti-list"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-blue-100 rounded-circle me-3 d-flex align-items-center justify-content-center">
                            <i className="ti ti-weight text-blue-600"></i>
                          </div>
                          <div>
                            <h6 className="mb-0">Tonelada</h6>
                            <small className="text-muted">Múltiplo</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-success">t</span></td>
                      <td><span className="text-muted">1000.0</span></td>
                      <td><small className="text-success">156 ítems</small></td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-warning" title="Editar">
                            <i className="ti ti-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title="Ver ítems">
                            <i className="ti ti-list"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Volumen */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm">
            <div className="card-header bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="card-title mb-0">
                  <i className="ti ti-droplet me-2"></i>
                  Volumen
                </h6>
                <span className="badge bg-white text-green-600">6 tipos</span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Tipo</th>
                      <th>Abreviatura</th>
                      <th>Factor</th>
                      <th>Uso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-green-100 rounded-circle me-3 d-flex align-items-center justify-content-center">
                            <i className="ti ti-droplet text-green-600"></i>
                          </div>
                          <div>
                            <h6 className="mb-0">Litro</h6>
                            <small className="text-muted">Unidad base</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-primary">l</span></td>
                      <td><span className="text-muted">1.0</span></td>
                      <td><small className="text-success">123 ítems</small></td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-warning" title="Editar">
                            <i className="ti ti-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title="Ver ítems">
                            <i className="ti ti-list"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-green-100 rounded-circle me-3 d-flex align-items-center justify-content-center">
                            <i className="ti ti-droplet text-green-600"></i>
                          </div>
                          <div>
                            <h6 className="mb-0">Mililitro</h6>
                            <small className="text-muted">Submúltiplo</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-info">ml</span></td>
                      <td><span className="text-muted">0.001</span></td>
                      <td><small className="text-success">67 ítems</small></td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-warning" title="Editar">
                            <i className="ti ti-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title="Ver ítems">
                            <i className="ti ti-list"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-green-100 rounded-circle me-3 d-flex align-items-center justify-content-center">
                            <i className="ti ti-droplet text-green-600"></i>
                          </div>
                          <div>
                            <h6 className="mb-0">Galón</h6>
                            <small className="text-muted">Unidad imperial</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-warning">gal</span></td>
                      <td><span className="text-muted">3.785</span></td>
                      <td><small className="text-success">45 ítems</small></td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-warning" title="Editar">
                            <i className="ti ti-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title="Ver ítems">
                            <i className="ti ti-list"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Longitud */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm">
            <div className="card-header bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="card-title mb-0">
                  <i className="ti ti-ruler me-2"></i>
                  Longitud
                </h6>
                <span className="badge bg-white text-purple-600">7 tipos</span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Tipo</th>
                      <th>Abreviatura</th>
                      <th>Factor</th>
                      <th>Uso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-purple-100 rounded-circle me-3 d-flex align-items-center justify-content-center">
                            <i className="ti ti-ruler text-purple-600"></i>
                          </div>
                          <div>
                            <h6 className="mb-0">Metro</h6>
                            <small className="text-muted">Unidad base</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-primary">m</span></td>
                      <td><span className="text-muted">1.0</span></td>
                      <td><small className="text-success">178 ítems</small></td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-warning" title="Editar">
                            <i className="ti ti-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title="Ver ítems">
                            <i className="ti ti-list"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-purple-100 rounded-circle me-3 d-flex align-items-center justify-content-center">
                            <i className="ti ti-ruler text-purple-600"></i>
                          </div>
                          <div>
                            <h6 className="mb-0">Centímetro</h6>
                            <small className="text-muted">Submúltiplo</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-info">cm</span></td>
                      <td><span className="text-muted">0.01</span></td>
                      <td><small className="text-success">234 ítems</small></td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-warning" title="Editar">
                            <i className="ti ti-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title="Ver ítems">
                            <i className="ti ti-list"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Unidad */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm">
            <div className="card-header bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="card-title mb-0">
                  <i className="ti ti-hash me-2"></i>
                  Unidad
                </h6>
                <span className="badge bg-white text-orange-600">5 tipos</span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Tipo</th>
                      <th>Abreviatura</th>
                      <th>Factor</th>
                      <th>Uso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-orange-100 rounded-circle me-3 d-flex align-items-center justify-content-center">
                            <i className="ti ti-hash text-orange-600"></i>
                          </div>
                          <div>
                            <h6 className="mb-0">Unidad</h6>
                            <small className="text-muted">Conteo simple</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-primary">und</span></td>
                      <td><span className="text-muted">1.0</span></td>
                      <td><small className="text-success">456 ítems</small></td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-warning" title="Editar">
                            <i className="ti ti-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title="Ver ítems">
                            <i className="ti ti-list"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-orange-100 rounded-circle me-3 d-flex align-items-center justify-content-center">
                            <i className="ti ti-package text-orange-600"></i>
                          </div>
                          <div>
                            <h6 className="mb-0">Caja</h6>
                            <small className="text-muted">Agrupación</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge bg-success">cja</span></td>
                      <td><span className="text-muted">12.0</span></td>
                      <td><small className="text-success">89 ítems</small></td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-warning" title="Editar">
                            <i className="ti ti-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title="Ver ítems">
                            <i className="ti ti-list"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TiposCantidadList;
