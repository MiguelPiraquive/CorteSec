import React from 'react';

const ItemsList = () => {
  return (
    <div className="container-fluid">
      {/* Header de la página */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1 text-gray-800 dark:text-white">
            <i className="ti ti-package me-2 text-amber-500"></i>
            Inventario de Ítems
          </h1>
          <p className="text-muted mb-0">Gestión de productos y materiales</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-success">
            <i className="ti ti-file-export me-2"></i>
            Exportar
          </button>
          <button className="btn btn-outline-warning">
            <i className="ti ti-scan me-2"></i>
            Escanear QR
          </button>
          <button className="btn btn-primary">
            <i className="ti ti-plus me-2"></i>
            Nuevo Ítem
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
                  <h4 className="mb-1">1,245</h4>
                  <p className="text-muted mb-0">Total Ítems</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-package text-primary fs-2"></i>
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
                  <h4 className="mb-1">890</h4>
                  <p className="text-muted mb-0">En Stock</p>
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
                  <h4 className="mb-1">125</h4>
                  <p className="text-muted mb-0">Stock Bajo</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-alert-triangle text-warning fs-2"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card border-start border-danger border-3">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="mb-1">30</h4>
                  <p className="text-muted mb-0">Sin Stock</p>
                </div>
                <div className="flex-shrink-0">
                  <i className="ti ti-x-circle text-danger fs-2"></i>
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
              <label className="form-label">Buscar ítem</label>
              <input type="text" className="form-control" placeholder="Nombre, código o descripción..." />
            </div>
            <div className="col-md-2">
              <label className="form-label">Categoría</label>
              <select className="form-select">
                <option value="">Todas</option>
                <option value="1">Herramientas</option>
                <option value="2">Materiales</option>
                <option value="3">Equipos</option>
                <option value="4">Suministros</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado Stock</label>
              <select className="form-select">
                <option value="">Todos</option>
                <option value="disponible">Disponible</option>
                <option value="bajo">Stock Bajo</option>
                <option value="agotado">Agotado</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Ubicación</label>
              <select className="form-select">
                <option value="">Todas</option>
                <option value="1">Almacén Principal</option>
                <option value="2">Bodega Norte</option>
                <option value="3">Área de Trabajo</option>
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

      {/* Vista de inventario */}
      <div className="card shadow-sm">
        <div className="card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center">
          <h6 className="card-title mb-0">Inventario de Ítems</h6>
          <div className="btn-group" role="group">
            <input type="radio" className="btn-check" name="view" id="table-view" defaultChecked />
            <label className="btn btn-outline-secondary btn-sm" htmlFor="table-view">
              <i className="ti ti-table"></i>
            </label>
            <input type="radio" className="btn-check" name="view" id="grid-view" />
            <label className="btn btn-outline-secondary btn-sm" htmlFor="grid-view">
              <i className="ti ti-layout-grid"></i>
            </label>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Ítem</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Stock Actual</th>
                  <th scope="col">Stock Mínimo</th>
                  <th scope="col">Precio Unitario</th>
                  <th scope="col">Ubicación</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="avatar-sm bg-amber-100 rounded me-3 d-flex align-items-center justify-content-center">
                        <i className="ti ti-hammer text-amber-600"></i>
                      </div>
                      <div>
                        <h6 className="mb-0">Martillo Industrial</h6>
                        <small className="text-muted">Código: HER-001</small>
                        <br />
                        <small className="text-muted">Marca: Stanley</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-primary-subtle text-primary">Herramientas</span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <span className="fw-semibold text-success me-2">45</span>
                      <span className="text-muted">unidades</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted">10 unidades</span>
                  </td>
                  <td>
                    <span className="fw-semibold">$125,000</span>
                  </td>
                  <td>
                    <small className="text-muted">
                      <i className="ti ti-map-pin me-1"></i>
                      Almacén Principal - A2-15
                    </small>
                  </td>
                  <td>
                    <span className="badge bg-success">Disponible</span>
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-sm btn-outline-primary" title="Ver detalles">
                        <i className="ti ti-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-warning" title="Editar">
                        <i className="ti ti-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-info" title="Movimientos">
                        <i className="ti ti-history"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-success" title="Agregar stock">
                        <i className="ti ti-plus"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="avatar-sm bg-blue-100 rounded me-3 d-flex align-items-center justify-content-center">
                        <i className="ti ti-screwdriver text-blue-600"></i>
                      </div>
                      <div>
                        <h6 className="mb-0">Destornillador Eléctrico</h6>
                        <small className="text-muted">Código: HER-015</small>
                        <br />
                        <small className="text-muted">Marca: Bosch</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-primary-subtle text-primary">Herramientas</span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <span className="fw-semibold text-warning me-2">8</span>
                      <span className="text-muted">unidades</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted">15 unidades</span>
                  </td>
                  <td>
                    <span className="fw-semibold">$450,000</span>
                  </td>
                  <td>
                    <small className="text-muted">
                      <i className="ti ti-map-pin me-1"></i>
                      Bodega Norte - B1-08
                    </small>
                  </td>
                  <td>
                    <span className="badge bg-warning">Stock Bajo</span>
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-sm btn-outline-primary" title="Ver detalles">
                        <i className="ti ti-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-warning" title="Editar">
                        <i className="ti ti-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-info" title="Movimientos">
                        <i className="ti ti-history"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Solicitar reposición">
                        <i className="ti ti-shopping-cart"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="avatar-sm bg-green-100 rounded me-3 d-flex align-items-center justify-content-center">
                        <i className="ti ti-package text-green-600"></i>
                      </div>
                      <div>
                        <h6 className="mb-0">Cemento Portland</h6>
                        <small className="text-muted">Código: MAT-203</small>
                        <br />
                        <small className="text-muted">Marca: Argos</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-success-subtle text-success">Materiales</span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <span className="fw-semibold text-danger me-2">0</span>
                      <span className="text-muted">bultos</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted">50 bultos</span>
                  </td>
                  <td>
                    <span className="fw-semibold">$32,500</span>
                  </td>
                  <td>
                    <small className="text-muted">
                      <i className="ti ti-map-pin me-1"></i>
                      Almacén Principal - C3-22
                    </small>
                  </td>
                  <td>
                    <span className="badge bg-danger">Agotado</span>
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-sm btn-outline-primary" title="Ver detalles">
                        <i className="ti ti-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-warning" title="Editar">
                        <i className="ti ti-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-info" title="Movimientos">
                        <i className="ti ti-history"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Compra urgente">
                        <i className="ti ti-urgent"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="avatar-sm bg-purple-100 rounded me-3 d-flex align-items-center justify-content-center">
                        <i className="ti ti-device-laptop text-purple-600"></i>
                      </div>
                      <div>
                        <h6 className="mb-0">Laptop Dell Inspiron</h6>
                        <small className="text-muted">Código: EQU-089</small>
                        <br />
                        <small className="text-muted">Marca: Dell</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-info-subtle text-info">Equipos</span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <span className="fw-semibold text-success me-2">12</span>
                      <span className="text-muted">unidades</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted">5 unidades</span>
                  </td>
                  <td>
                    <span className="fw-semibold">$2,800,000</span>
                  </td>
                  <td>
                    <small className="text-muted">
                      <i className="ti ti-map-pin me-1"></i>
                      Área de Trabajo - T1-05
                    </small>
                  </td>
                  <td>
                    <span className="badge bg-success">Disponible</span>
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-sm btn-outline-primary" title="Ver detalles">
                        <i className="ti ti-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-warning" title="Editar">
                        <i className="ti ti-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-info" title="Asignar a empleado">
                        <i className="ti ti-user-plus"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" title="Mantenimiento">
                        <i className="ti ti-tool"></i>
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
            <small className="text-muted">Mostrando 1-10 de 1,245 ítems</small>
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

export default ItemsList;
