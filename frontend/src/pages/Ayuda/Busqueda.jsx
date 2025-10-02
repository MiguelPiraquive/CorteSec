import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBusquedaAyuda } from '../../hooks/useAyuda.js';

const Busqueda = () => {
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';
  
  const {
    query,
    setQuery,
    resultados,
    loading,
    error,
    hasResults
  } = useBusquedaAyuda(queryFromUrl);

  // Actualizar query si viene de URL
  useEffect(() => {
    if (queryFromUrl && queryFromUrl !== query) {
      setQuery(queryFromUrl);
    }
  }, [queryFromUrl]);

  const getTipoIcon = (tipo) => {
    const icons = {
      'articulo': 'fas fa-file-alt text-primary',
      'faq': 'fas fa-question-circle text-success',
      'tutorial': 'fas fa-play-circle text-info',
      'video': 'fas fa-video text-danger'
    };
    return icons[tipo] || 'fas fa-search text-secondary';
  };

  const getTipoColor = (tipo) => {
    const colors = {
      'articulo': 'primary',
      'faq': 'success',
      'tutorial': 'info',
      'video': 'danger'
    };
    return colors[tipo] || 'secondary';
  };

  const getResultadoUrl = (resultado) => {
    const baseUrls = {
      'articulo': '/ayuda/articulos',
      'faq': '/ayuda/faq',
      'tutorial': '/ayuda/tutoriales',
      'video': '/ayuda/videos'
    };
    
    const baseUrl = baseUrls[resultado.tipo] || '/ayuda';
    return resultado.id ? `${baseUrl}/${resultado.id}` : baseUrl;
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
            Búsqueda
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-search text-primary me-2"></i>
                Búsqueda
              </h2>
              <p className="text-muted mb-0">Encuentra contenido de ayuda</p>
            </div>
            <div>
              <Link to="/ayuda" className="btn btn-outline-primary">
                <i className="fas fa-arrow-left me-2"></i>Volver
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row justify-content-center">
                <div className="col-lg-8">
                  <div className="input-group input-group-lg">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar en artículos, FAQs, tutoriales..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoFocus
                    />
                    {query && (
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setQuery('')}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas de búsqueda */}
      {query && !loading && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-md-3 mb-3">
                    <i className="fas fa-search fa-2x text-primary mb-2"></i>
                    <h5 className="mb-1">{hasResults ? resultados.length : 0}</h5>
                    <small className="text-muted">Resultados totales</small>
                  </div>
                  <div className="col-md-3 mb-3">
                    <i className="fas fa-file-alt fa-2x text-info mb-2"></i>
                    <h5 className="mb-1">
                      {hasResults ? resultados.filter(r => r.tipo === 'articulo').length : 0}
                    </h5>
                    <small className="text-muted">Artículos</small>
                  </div>
                  <div className="col-md-3 mb-3">
                    <i className="fas fa-question-circle fa-2x text-success mb-2"></i>
                    <h5 className="mb-1">
                      {hasResults ? resultados.filter(r => r.tipo === 'faq').length : 0}
                    </h5>
                    <small className="text-muted">FAQs</small>
                  </div>
                  <div className="col-md-3 mb-3">
                    <i className="fas fa-play-circle fa-2x text-warning mb-2"></i>
                    <h5 className="mb-1">
                      {hasResults ? resultados.filter(r => r.tipo === 'tutorial').length : 0}
                    </h5>
                    <small className="text-muted">Tutoriales</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                {query ? `Resultados para "${query}"` : 'Resultados'}
                {hasResults && (
                  <span className="badge bg-primary ms-2">{resultados.length}</span>
                )}
              </h5>
            </div>
            <div className="card-body">
              {loading && (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary"></div>
                  <p className="text-muted mt-2">Buscando...</p>
                </div>
              )}

              {error && (
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Error: {error}
                </div>
              )}

              {!loading && !error && query && query.length >= 2 && !hasResults && (
                <div className="text-center py-5">
                  <i className="fas fa-search fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No se encontraron resultados</h5>
                  <p className="text-muted">No hay contenido que coincida con "{query}"</p>
                  <div className="mt-4">
                    <h6 className="text-muted mb-3">Sugerencias:</h6>
                    <ul className="list-unstyled text-muted">
                      <li>• Verifica la ortografía de las palabras</li>
                      <li>• Utiliza términos más generales</li>
                      <li>• Prueba con sinónimos</li>
                      <li>• Usa menos palabras</li>
                    </ul>
                  </div>
                </div>
              )}

              {!query && (
                <div className="text-center py-5">
                  <i className="fas fa-search fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Comienza escribiendo tu búsqueda</h5>
                  <p className="text-muted">Busca en artículos, FAQs, tutoriales y videos</p>
                  
                  <div className="row mt-4">
                    <div className="col-12">
                      <h6 className="text-muted mb-3">Búsquedas populares:</h6>
                      <div className="d-flex flex-wrap justify-content-center gap-2">
                        <button 
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => setQuery('empleados')}
                        >
                          empleados
                        </button>
                        <button 
                          className="btn btn-outline-success btn-sm"
                          onClick={() => setQuery('nómina')}
                        >
                          nómina
                        </button>
                        <button 
                          className="btn btn-outline-info btn-sm"
                          onClick={() => setQuery('reportes')}
                        >
                          reportes
                        </button>
                        <button 
                          className="btn btn-outline-warning btn-sm"
                          onClick={() => setQuery('seguridad')}
                        >
                          seguridad
                        </button>
                        <button 
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setQuery('configuración')}
                        >
                          configuración
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hasResults && !loading && (
                <div className="row">
                  {resultados.map((resultado, index) => (
                    <div key={index} className="col-12 mb-3">
                      <div className="card border h-100">
                        <div className="card-body">
                          <div className="d-flex align-items-start">
                            <div className="me-3">
                              <i className={getTipoIcon(resultado.tipo)}></i>
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="mb-1">
                                  <Link 
                                    to={getResultadoUrl(resultado)} 
                                    className="text-decoration-none"
                                  >
                                    {resultado.titulo}
                                  </Link>
                                </h6>
                                <span className={`badge bg-${getTipoColor(resultado.tipo)}`}>
                                  {resultado.tipo.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-muted mb-2">
                                {resultado.descripcion || resultado.contenido?.substring(0, 150)}
                                {(resultado.descripcion?.length > 150 || resultado.contenido?.length > 150) && '...'}
                              </p>
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  {resultado.categoria && (
                                    <span className="badge bg-light text-dark me-2">
                                      {resultado.categoria}
                                    </span>
                                  )}
                                  {resultado.tags && resultado.tags.slice(0, 2).map((tag, tagIndex) => (
                                    <span key={tagIndex} className="badge bg-outline-secondary me-1">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <small className="text-muted">
                                  {resultado.fecha_publicacion && (
                                    <>
                                      <i className="fas fa-calendar me-1"></i>
                                      {resultado.fecha_publicacion}
                                    </>
                                  )}
                                  {resultado.vistas && (
                                    <>
                                      <span className="mx-2">•</span>
                                      <i className="fas fa-eye me-1"></i>
                                      {resultado.vistas} vistas
                                    </>
                                  )}
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ayuda adicional */}
      {query && hasResults && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm bg-light">
              <div className="card-body text-center">
                <h6 className="mb-3">¿No encontraste lo que buscabas?</h6>
                <div className="d-flex justify-content-center gap-3">
                  <Link to="/ayuda/contacto" className="btn btn-outline-primary btn-sm">
                    <i className="fas fa-envelope me-2"></i>
                    Contactar Soporte
                  </Link>
                  <Link to="/ayuda/tickets" className="btn btn-outline-info btn-sm">
                    <i className="fas fa-ticket-alt me-2"></i>
                    Crear Ticket
                  </Link>
                  <Link to="/ayuda" className="btn btn-outline-secondary btn-sm">
                    <i className="fas fa-home me-2"></i>
                    Ir al Centro de Ayuda
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Busqueda;
