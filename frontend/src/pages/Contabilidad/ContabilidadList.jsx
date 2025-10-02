import React, { useState, useEffect } from 'react';
import { useComprobantes, useCuentas, useFlujoCaja } from '../../hooks/useContabilidad';

const ContabilidadList = () => {
  const { comprobantes, loading: loadingComprobantes, fetchAll: fetchComprobantes, fetchEstadisticas: fetchEstadisticasComp } = useComprobantes();
  const { cuentas, loading: loadingCuentas, fetchAll: fetchCuentas, fetchEstadisticas: fetchEstadisticasCtas } = useCuentas();
  const { flujoCaja, loading: loadingFlujo, fetchAll: fetchFlujoCaja, fetchResumen } = useFlujoCaja();
  
  const [filtro, setFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState(null);
  const [estadisticas, setEstadisticas] = useState({});
  const [resumenFlujo, setResumenFlujo] = useState({});

  const loading = loadingComprobantes || loadingCuentas || loadingFlujo;

  useEffect(() => {
    fetchComprobantes();
    fetchCuentas();
    fetchFlujoCaja();
    cargarEstadisticas();
  }, [fetchComprobantes, fetchCuentas, fetchFlujoCaja]);

  const cargarEstadisticas = async () => {
    try {
      const [statsComp, statsCtas, resumenFlujoCaja] = await Promise.all([
        fetchEstadisticasComp(),
        fetchEstadisticasCtas(),
        fetchResumen()
      ]);
      setEstadisticas({ comprobantes: statsComp, cuentas: statsCtas });
      setResumenFlujo(resumenFlujoCaja);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const comprobantesFiltrados = comprobantes.filter(comp => {
    const coincideFiltro = comp.numero.toLowerCase().includes(filtro.toLowerCase()) ||
                          comp.descripcion.toLowerCase().includes(filtro.toLowerCase());
    const coincideTipo = tipoFiltro === 'todos' || comp.tipo_comprobante === tipoFiltro;
    return coincideFiltro && coincideTipo;
  });

  const totalComprobantes = comprobantes.length;
  const comprobantesContabilizados = comprobantes.filter(c => c.estado === 'contabilizado').length;
  const comprobantesPendientes = comprobantes.filter(c => c.estado === 'borrador').length;
  const tiposComprobante = [...new Set(comprobantes.map(c => c.tipo_comprobante))];

  const getEstadoBadge = (estado) => {
    const badges = {
      'borrador': 'bg-warning',
      'contabilizado': 'bg-success',
      'anulado': 'bg-danger'
    };
    return badges[estado] || 'bg-secondary';
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      'ingreso': 'fas fa-arrow-up',
      'egreso': 'fas fa-arrow-down',
      'traspaso': 'fas fa-exchange-alt',
      'ajuste': 'fas fa-tools'
    };
    return icons[tipo] || 'fas fa-file-alt';
  };

  const formatearValor = (valor) => {
    return `$${parseFloat(valor).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
  };

  const editarComprobante = (comprobante) => {
    setComprobanteSeleccionado(comprobante);
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
                    <i className="fas fa-calculator text-primary me-2"></i>
                    Sistema de Contabilidad
                  </h4>
                  <p className="text-muted mb-0">Gestión integral de comprobantes, cuentas y flujo de caja</p>
                </div>
                <div className="btn-group">
                  <button className="btn btn-outline-secondary" onClick={cargarEstadisticas}>
                    <i className="fas fa-sync me-2"></i>
                    Recargar
                  </button>
                  <button className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>
                    Nuevo Comprobante
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
                <i className="fas fa-file-invoice fa-2x text-primary"></i>
              </div>
              <h5 className="card-title">Total Comprobantes</h5>
              <h3 className="text-primary mb-0">{totalComprobantes}</h3>
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
              <h5 className="card-title">Contabilizados</h5>
              <h3 className="text-success mb-0">{comprobantesContabilizados}</h3>
              <small className="text-muted">Procesados</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-clock fa-2x text-warning"></i>
              </div>
              <h5 className="card-title">Pendientes</h5>
              <h3 className="text-warning mb-0">{comprobantesPendientes}</h3>
              <small className="text-muted">Por procesar</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-chart-line fa-2x text-info"></i>
              </div>
              <h5 className="card-title">Cuentas Activas</h5>
              <h3 className="text-info mb-0">{estadisticas?.cuentas?.cuentas_activas || 0}</h3>
              <small className="text-muted">Plan de cuentas</small>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen Flujo de Caja */}
      <div className="row mb-4">
        <div className="col-lg-4 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title text-success">
                <i className="fas fa-arrow-up me-2"></i>
                Total Ingresos
              </h6>
              <h4 className="text-success mb-0">{formatearValor(resumenFlujo.total_ingresos || 0)}</h4>
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title text-danger">
                <i className="fas fa-arrow-down me-2"></i>
                Total Egresos
              </h6>
              <h4 className="text-danger mb-0">{formatearValor(resumenFlujo.total_egresos || 0)}</h4>
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title text-primary">
                <i className="fas fa-balance-scale me-2"></i>
                Flujo Neto
              </h6>
              <h4 className={`mb-0 ${(resumenFlujo.flujo_neto || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatearValor(resumenFlujo.flujo_neto || 0)}
              </h4>
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
                  <label className="form-label">Buscar comprobantes</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por número o descripción..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select"
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value)}
                  >
                    <option value="todos">Todos los tipos</option>
                    {tiposComprobante.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Acciones</label>
                  <div className="d-grid">
                    <button className="btn btn-outline-primary">
                      <i className="fas fa-file-export me-2"></i>
                      Exportar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Comprobantes */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <i className="fas fa-file-invoice text-primary me-2"></i>
                Comprobantes Contables
                <span className="badge bg-primary ms-2">{comprobantesFiltrados.length}</span>
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Número</th>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Valor</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprobantesFiltrados.map(comprobante => (
                      <tr key={comprobante.id}>
                        <td>
                          <code className="small">{comprobante.numero}</code>
                        </td>
                        <td>
                          <i className={`${getTipoIcon(comprobante.tipo_comprobante)} me-2`}></i>
                          {comprobante.tipo_comprobante}
                        </td>
                        <td>
                          <small>{new Date(comprobante.fecha).toLocaleDateString('es-CO')}</small>
                        </td>
                        <td>
                          <small className="text-muted">{comprobante.descripcion}</small>
                        </td>
                        <td>
                          <strong>{formatearValor(comprobante.total_debito)}</strong>
                        </td>
                        <td>
                          <span className={`badge ${getEstadoBadge(comprobante.estado)}`}>
                            {comprobante.estado}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => editarComprobante(comprobante)}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-secondary">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-info">
                              <i className="fas fa-print"></i>
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

      {comprobantesFiltrados.length === 0 && (
        <div className="text-center py-5">
          <i className="fas fa-search fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No se encontraron comprobantes</h5>
          <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}

      {/* Modal de Detalle */}
      {showModal && comprobanteSeleccionado && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-file-invoice me-2"></i>
                  Comprobante {comprobanteSeleccionado.numero}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Número</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={comprobanteSeleccionado.numero} 
                      readOnly 
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Tipo</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={comprobanteSeleccionado.tipo_comprobante} 
                      readOnly 
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Fecha</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={comprobanteSeleccionado.fecha} 
                      readOnly 
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Estado</label>
                    <span className={`badge ${getEstadoBadge(comprobanteSeleccionado.estado)} ms-2`}>
                      {comprobanteSeleccionado.estado}
                    </span>
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label">Descripción</label>
                    <textarea 
                      className="form-control" 
                      rows="3" 
                      value={comprobanteSeleccionado.descripcion} 
                      readOnly
                    ></textarea>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Total Débito</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formatearValor(comprobanteSeleccionado.total_debito)} 
                      readOnly 
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Total Crédito</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formatearValor(comprobanteSeleccionado.total_credito)} 
                      readOnly 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cerrar
                </button>
                <button type="button" className="btn btn-primary">
                  <i className="fas fa-print me-2"></i>
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContabilidadList;
