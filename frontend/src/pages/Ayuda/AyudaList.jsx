import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useArticulos } from '../../hooks/useAyuda.js';

const AyudaList = () => {
  const [searchParams] = useSearchParams();
  const categoriaFromUrl = searchParams.get('categoria') || '';
  
  const [filtros, setFiltros] = useState({
    categoria: categoriaFromUrl,
    busqueda: '',
    dificultad: '',
    ordenPor: 'fecha_desc'
  });
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: response,
    loading,
    error
  } = useArticulos({
    ...filtros,
    page: currentPage,
    limit: 12
  });

  const articulos = response?.results || [];
  const totalPages = response ? Math.ceil(response.count / 12) : 0;

  const categorias = [
    { id: '', nombre: 'Todas las categorías' },
    { id: 'empleados', nombre: 'Gestión de Empleados', icono: 'fas fa-users', color: 'primary' },
    { id: 'nomina', nombre: 'Nómina y Pagos', icono: 'fas fa-money-bill', color: 'success' },
    { id: 'reportes', nombre: 'Reportes', icono: 'fas fa-chart-bar', color: 'info' },
    { id: 'seguridad', nombre: 'Seguridad', icono: 'fas fa-shield-alt', color: 'warning' },
    { id: 'configuracion', nombre: 'Configuración', icono: 'fas fa-cogs', color: 'secondary' },
    { id: 'integraciones', nombre: 'Integraciones', icono: 'fas fa-plug', color: 'dark' }
  ];

  const dificultades = [
    { id: '', nombre: 'Todas las dificultades' },
    { id: 'basico', nombre: 'Básico', color: 'success' },
    { id: 'intermedio', nombre: 'Intermedio', color: 'warning' },
    { id: 'avanzado', nombre: 'Avanzado', color: 'danger' }
  ];

  const ordenamientos = [
    { id: 'fecha_desc', nombre: 'Más recientes' },
    { id: 'fecha_asc', nombre: 'Más antiguos' },
    { id: 'popularidad', nombre: 'Más populares' },
    { id: 'titulo', nombre: 'Por título' }
  ];

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
    setCurrentPage(1);
  };

  const getDificultadColor = (dificultad) => {
    const diff = dificultades.find(d => d.id === dificultad);
    return diff ? diff.color : 'secondary';
  };

  const getCategoriaInfo = (categoriaId) => {
    return categorias.find(c => c.id === categoriaId) || { color: 'primary', icono: 'fas fa-tag' };
  };

  const renderPaginacion = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
          <button className="page-link" onClick={() => setCurrentPage(i)}>
            {i}
          </button>
        </li>
      );
    }

    return (
      <nav aria-label="Paginación de artículos">
        <ul className="pagination justify-content-center">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setCurrentPage(1)}>
              <i className="fas fa-angle-double-left"></i>
            </button>
          </li>
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>
              <i className="fas fa-angle-left"></i>
            </button>
          </li>
          {pages}
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>
              <i className="fas fa-angle-right"></i>
            </button>
          </li>
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setCurrentPage(totalPages)}>
              <i className="fas fa-angle-double-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  return (
    <div className="container-fluid py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/ayuda" className="text-decoration-none">Centro de Ayuda</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Artículos
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-file-alt text-primary me-2"></i>
                Artículos de Ayuda
              </h2>
              <p className="text-muted mb-0">
                Guías paso a paso para aprovechar al máximo CorteSec
              </p>
            </div>
            <div>
              <Link to="/ayuda" className="btn btn-outline-primary">
                <i className="fas fa-arrow-left me-2"></i>Volver
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-lg-4 mb-3">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar artículos..."
                      value={filtros.busqueda}
                      onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-3 mb-3">
                  <select
                    className="form-select"
                    value={filtros.categoria}
                    onChange={(e) => handleFiltroChange('categoria', e.target.value)}
                  >
                    {categorias.map(categoria => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-2 mb-3">
                  <select
                    className="form-select"
                    value={filtros.dificultad}
                    onChange={(e) => handleFiltroChange('dificultad', e.target.value)}
                  >
                    {dificultades.map(dificultad => (
                      <option key={dificultad.id} value={dificultad.id}>
                        {dificultad.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-3 mb-3">
                  <select
                    className="form-select"
                    value={filtros.ordenPor}
                    onChange={(e) => handleFiltroChange('ordenPor', e.target.value)}
                  >
                    {ordenamientos.map(orden => (
                      <option key={orden.id} value={orden.id}>
                        {orden.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <p className="text-muted mb-0">
              {loading ? 'Cargando...' : `${response?.count || 0} artículos encontrados`}
            </p>
            {response?.count > 0 && (
              <small className="text-muted">
                Página {currentPage} de {totalPages}
              </small>
            )}
          </div>
        </div>
      </div>

      {/* Lista de artículos */}
      <div className="row">
        <div className="col-12">
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="text-muted mt-2">Cargando artículos...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <h5>Error al cargar artículos</h5>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && articulos.length === 0 && (
            <div className="text-center py-5">
              <i className="fas fa-search fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No se encontraron artículos</h5>
              <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}

          {!loading && !error && articulos.length > 0 && (
            <div className="row">
              {articulos.map(articulo => {
                const categoriaInfo = getCategoriaInfo(articulo.categoria?.id);
                return (
                  <div key={articulo.id} className="col-lg-4 col-md-6 mb-4">
                    <div className="card h-100 border-0 shadow-sm article-card">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <span className={`badge bg-${categoriaInfo.color}`}>
                            <i className={`${categoriaInfo.icono} me-1`}></i>
                            {articulo.categoria?.nombre || 'General'}
                          </span>
                          {articulo.dificultad && (
                            <span className={`badge bg-${getDificultadColor(articulo.dificultad)}`}>
                              {articulo.dificultad}
                            </span>
                          )}
                        </div>
                        
                        <h5 className="card-title">
                          <Link 
                            to={`/ayuda/articulos/${articulo.id}`}
                            className="text-decoration-none"
                          >
                            {articulo.titulo}
                          </Link>
                        </h5>
                        
                        <p className="card-text text-muted">
                          {articulo.descripcion?.substring(0, 120)}
                          {articulo.descripcion?.length > 120 ? '...' : ''}
                        </p>
                        
                        <div className="d-flex justify-content-between align-items-center mt-auto">
                          <small className="text-muted">
                            <i className="fas fa-eye me-1"></i>
                            {articulo.vistas || 0} vistas
                          </small>
                          <small className="text-muted">
                            <i className="fas fa-clock me-1"></i>
                            {articulo.tiempo_lectura || '5'} min
                          </small>
                        </div>
                        
                        {articulo.tags && articulo.tags.length > 0 && (
                          <div className="mt-2">
                            {articulo.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="badge bg-light text-dark me-1">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="card-footer bg-transparent border-top-0">
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            {articulo.fecha_publicacion}
                          </small>
                          <Link 
                            to={`/ayuda/articulos/${articulo.id}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            Leer más <i className="fas fa-arrow-right ms-1"></i>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Paginación */}
      {renderPaginacion()}

      <style jsx>{`
        .article-card:hover {
          transform: translateY(-5px);
          transition: transform 0.3s ease;
        }
        
        .article-card .card-body {
          display: flex;
          flex-direction: column;
        }
        
        .article-card .card-text {
          flex-grow: 1;
        }
      `}</style>
    </div>
  );
};

export default AyudaList;
