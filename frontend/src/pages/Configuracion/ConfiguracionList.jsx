import React, { useState, useEffect } from 'react';
import { useParametros } from '../../hooks/useConfiguracion';

const ConfiguracionList = () => {
  const { parametros: configuraciones, loading, error, fetchAll, create, update, remove } = useParametros();
  const [filtro, setFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [showModal, setShowModal] = useState(false);
  const [configSeleccionada, setConfigSeleccionada] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const configFiltradas = configuraciones.filter(config => {
    const coincideFiltro = config.clave.toLowerCase().includes(filtro.toLowerCase()) ||
                          config.descripcion.toLowerCase().includes(filtro.toLowerCase()) ||
                          config.valor.toLowerCase().includes(filtro.toLowerCase());
    const coincideCategoria = categoriaFiltro === 'todas' || config.categoria === categoriaFiltro;
    return coincideFiltro && coincideCategoria;
  });

  const totalConfiguraciones = configuraciones.length;
  const configuracionesEditables = configuraciones.filter(c => c.editable).length;
  const categorias = [...new Set(configuraciones.map(c => c.categoria))];
  const configuracionesRequeridas = configuraciones.filter(c => c.requerido).length;

  const getTipoBadge = (tipo) => {
    const badges = {
      'texto': 'bg-primary',
      'numero': 'bg-success',
      'boolean': 'bg-warning',
      'tiempo': 'bg-info'
    };
    return badges[tipo] || 'bg-secondary';
  };

  const getCategoriaIcon = (categoria) => {
    const icons = {
      'aplicacion': 'fas fa-desktop',
      'email': 'fas fa-envelope',
      'seguridad': 'fas fa-shield-alt',
      'backup': 'fas fa-save',
      'notificaciones': 'fas fa-bell',
      'nomina': 'fas fa-calculator',
      'empresa': 'fas fa-building'
    };
    return icons[categoria] || 'fas fa-cog';
  };

  const formatearValor = (valor, tipo) => {
    if (tipo === 'boolean') {
      return valor === 'true' ? '✓ Activado' : '✗ Desactivado';
    }
    return valor;
  };

  const editarConfiguracion = (config) => {
    setConfigSeleccionada(config);
    setShowModal(true);
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
                    <i className="fas fa-cogs text-primary me-2"></i>
                    Configuración del Sistema
                  </h4>
                  <p className="text-muted mb-0">Administración de parámetros y configuraciones globales</p>
                </div>
                <div className="btn-group">
                  <button className="btn btn-outline-secondary">
                    <i className="fas fa-sync me-2"></i>
                    Recargar
                  </button>
                  <button className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>
                    Nueva Configuración
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
                <i className="fas fa-sliders-h fa-2x text-primary"></i>
              </div>
              <h5 className="card-title">Total Configuraciones</h5>
              <h3 className="text-primary mb-0">{totalConfiguraciones}</h3>
              <small className="text-muted">En el sistema</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-edit fa-2x text-success"></i>
              </div>
              <h5 className="card-title">Editables</h5>
              <h3 className="text-success mb-0">{configuracionesEditables}</h3>
              <small className="text-muted">Pueden modificarse</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-exclamation-triangle fa-2x text-warning"></i>
              </div>
              <h5 className="card-title">Requeridas</h5>
              <h3 className="text-warning mb-0">{configuracionesRequeridas}</h3>
              <small className="text-muted">Obligatorias</small>
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
              <small className="text-muted">Diferentes grupos</small>
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
                  <label className="form-label">Buscar configuraciones</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por clave, descripción o valor..."
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
                  <label className="form-label">Acciones</label>
                  <div className="d-grid">
                    <button className="btn btn-outline-primary">
                      <i className="fas fa-download me-2"></i>
                      Exportar Config
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuraciones por Categoría */}
      {categorias.map(categoria => {
        const configsCategoria = configFiltradas.filter(c => c.categoria === categoria);
        if (configsCategoria.length === 0) return null;

        return (
          <div key={categoria} className="row mb-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-light">
                  <h5 className="mb-0">
                    <i className={`${getCategoriaIcon(categoria)} text-primary me-2`}></i>
                    {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                    <span className="badge bg-primary ms-2">{configsCategoria.length}</span>
                  </h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Clave</th>
                          <th>Valor</th>
                          <th>Tipo</th>
                          <th>Descripción</th>
                          <th>Estado</th>
                          <th>Última Modificación</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {configsCategoria.map(config => (
                          <tr key={config.id}>
                            <td>
                              <code className="small">{config.clave}</code>
                              {config.requerido && (
                                <span className="text-danger ms-1" title="Requerido">*</span>
                              )}
                            </td>
                            <td>
                              <span className={config.tipo === 'boolean' ? 
                                (config.valor === 'true' ? 'text-success' : 'text-danger') : ''}>
                                {formatearValor(config.valor, config.tipo)}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${getTipoBadge(config.tipo)}`}>
                                {config.tipo}
                              </span>
                            </td>
                            <td>
                              <small className="text-muted">{config.descripcion}</small>
                            </td>
                            <td>
                              <span className={`badge ${config.editable ? 'bg-success' : 'bg-secondary'}`}>
                                {config.editable ? 'Editable' : 'Solo lectura'}
                              </span>
                            </td>
                            <td>
                              <div>
                                <small className="d-block">
                                  {new Date(config.fecha_modificacion).toLocaleDateString('es-CO')}
                                </small>
                                <small className="text-muted">por {config.usuario_modificacion}</small>
                              </div>
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => editarConfiguracion(config)}
                                  disabled={!config.editable}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-info">
                                  <i className="fas fa-history"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-secondary">
                                  <i className="fas fa-copy"></i>
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
        );
      })}

      {configFiltradas.length === 0 && (
        <div className="text-center py-5">
          <i className="fas fa-search fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No se encontraron configuraciones</h5>
          <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}

      {/* Modal de Edición */}
      {showModal && configSeleccionada && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>
                  Editar Configuración
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Clave</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={configSeleccionada.clave} 
                    readOnly 
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Descripción</label>
                  <textarea 
                    className="form-control" 
                    rows="2" 
                    value={configSeleccionada.descripcion} 
                    readOnly
                  ></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label">Valor</label>
                  {configSeleccionada.tipo === 'boolean' ? (
                    <select className="form-select">
                      <option value="true">Activado</option>
                      <option value="false">Desactivado</option>
                    </select>
                  ) : (
                    <input 
                      type={configSeleccionada.tipo === 'numero' ? 'number' : 
                            configSeleccionada.tipo === 'tiempo' ? 'time' : 'text'} 
                      className="form-control" 
                      defaultValue={configSeleccionada.valor}
                    />
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionList;
