import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useArticuloDetalle, useArticulosRelacionados, useMarcarUtil } from '../../hooks/useAyuda.js';

const ArticuloDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [valoracion, setValoracion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [valoracionEnviada, setValoracionEnviada] = useState(false);

  const { data: articulo, loading, error } = useArticuloDetalle(id);
  const { data: articulosRelacionados = [] } = useArticulosRelacionados(id);
  const { ejecutarOperacion: marcarUtil } = useMarcarUtil();

  useEffect(() => {
    // Marcar como visto cuando se carga el artículo
    if (articulo && articulo.id) {
      marcarUtil(articulo.id, 'visto');
    }
  }, [articulo]);

  const handleValoracion = async (puntuacion) => {
    try {
      await marcarUtil(id, 'valoracion', { 
        puntuacion, 
        comentario: comentario.trim() 
      });
      setValoracion(puntuacion);
      setValoracionEnviada(true);
      setTimeout(() => setValoracionEnviada(false), 3000);
    } catch (err) {
      console.error('Error enviando valoración:', err);
    }
  };

  const renderEstrellas = (puntuacion, interactivo = false) => {
    const estrellas = [];
    for (let i = 1; i <= 5; i++) {
      estrellas.push(
        <i
          key={i}
          className={`fas fa-star ${i <= puntuacion ? 'text-warning' : 'text-muted'} ${interactivo ? 'cursor-pointer' : ''}`}
          onClick={interactivo ? () => setValoracion(i) : undefined}
        ></i>
      );
    }
    return estrellas;
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
          <p className="text-muted mt-2">Cargando artículo...</p>
        </div>
      </div>
    );
  }

  if (error || !articulo) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          <h5>Error al cargar el artículo</h5>
          <p>{error || 'Artículo no encontrado'}</p>
          <Link to="/ayuda/articulos" className="btn btn-primary">
            Volver a artículos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/ayuda" className="text-decoration-none">Centro de Ayuda</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/ayuda/articulos" className="text-decoration-none">Artículos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {articulo.titulo}
          </li>
        </ol>
      </nav>

      <div className="row">
        {/* Contenido principal */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h1 className="h3 mb-2">{articulo.titulo}</h1>
                  <div className="d-flex align-items-center text-muted small">
                    {articulo.categoria && (
                      <span className={`badge bg-${articulo.categoria.color || 'primary'} me-2`}>
                        <i className={`${articulo.categoria.icono || 'fas fa-tag'} me-1`}></i>
                        {articulo.categoria.nombre}
                      </span>
                    )}
                    <span className="me-3">
                      <i className="fas fa-calendar me-1"></i>
                      {articulo.fecha_publicacion}
                    </span>
                    <span className="me-3">
                      <i className="fas fa-eye me-1"></i>
                      {articulo.vistas || 0} vistas
                    </span>
                    <span className="me-3">
                      <i className="fas fa-clock me-1"></i>
                      {articulo.tiempo_lectura || '5'} min lectura
                    </span>
                  </div>
                </div>
                <div className="dropdown">
                  <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                    <i className="fas fa-share-alt me-1"></i>
                    Compartir
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <button className="dropdown-item" onClick={() => navigator.share?.({ 
                        title: articulo.titulo, 
                        url: window.location.href 
                      })}>
                        <i className="fas fa-share me-2"></i>Compartir
                      </button>
                    </li>
                    <li>
                      <button className="dropdown-item" onClick={() => window.print()}>
                        <i className="fas fa-print me-2"></i>Imprimir
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="card-body">
              {/* Contenido del artículo */}
              <div className="article-content mb-4">
                {articulo.contenido ? (
                  <div dangerouslySetInnerHTML={{ __html: articulo.contenido }} />
                ) : (
                  <div>
                    <h3>Introducción</h3>
                    <p>En esta guía aprenderás sobre este tema paso a paso.</p>
                    
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      <strong>Tip:</strong> Asegúrate de tener los permisos necesarios.
                    </div>
                    
                    <h4>Paso 1: Procedimiento inicial</h4>
                    <p>Descripción del primer paso a seguir.</p>
                    
                    <div className="alert alert-warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <strong>Importante:</strong> Información relevante a tener en cuenta.
                    </div>
                    
                    <h4>Paso 2: Continuación</h4>
                    <p>Descripción del segundo paso del proceso.</p>
                  </div>
                )}
              </div>

              {/* Tags */}
              {articulo.tags && articulo.tags.length > 0 && (
                <div className="mb-4">
                  <h6 className="text-muted mb-2">Etiquetas:</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {articulo.tags.map((tag, index) => (
                      <span key={index} className="badge bg-light text-dark">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <hr />

              {/* Valoración */}
              <div className="mb-4">
                <h6>¿Te resultó útil este artículo?</h6>
                {valoracionEnviada && (
                  <div className="alert alert-success py-2">
                    <i className="fas fa-check-circle me-2"></i>
                    ¡Gracias por tu valoración!
                  </div>
                )}
                
                <div className="d-flex align-items-center mb-3">
                  <span className="me-3">Tu valoración:</span>
                  <div className="me-3">
                    {renderEstrellas(valoracion, true)}
                  </div>
                  {valoracion > 0 && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleValoracion(valoracion)}
                    >
                      Enviar valoración
                    </button>
                  )}
                </div>

                <div className="mb-3">
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Comparte tu experiencia o sugerencias..."
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                  ></textarea>
                </div>

                {/* Estadísticas de valoración */}
                {articulo.valoracion_promedio && (
                  <div className="d-flex align-items-center text-muted small">
                    <span className="me-3">
                      Valoración promedio: {renderEstrellas(Math.round(articulo.valoracion_promedio))} 
                      ({articulo.valoracion_promedio.toFixed(1)})
                    </span>
                    <span>
                      {articulo.total_valoraciones || 0} valoraciones
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Tabla de contenidos */}
          <div className="card border-0 shadow-sm mb-4 sticky-top" style={{ top: '20px' }}>
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="fas fa-list text-primary me-2"></i>
                Tabla de contenidos
              </h6>
            </div>
            <div className="card-body">
              <nav className="nav nav-pills flex-column">
                <a className="nav-link py-2" href="#introduccion">
                  <i className="fas fa-chevron-right me-2"></i>Introducción
                </a>
                <a className="nav-link py-2" href="#paso1">
                  <i className="fas fa-chevron-right me-2"></i>Paso 1
                </a>
                <a className="nav-link py-2" href="#paso2">
                  <i className="fas fa-chevron-right me-2"></i>Paso 2
                </a>
                <a className="nav-link py-2" href="#conclusion">
                  <i className="fas fa-chevron-right me-2"></i>Conclusión
                </a>
              </nav>
            </div>
          </div>

          {/* Artículos relacionados */}
          {articulosRelacionados.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white">
                <h6 className="mb-0">
                  <i className="fas fa-link text-info me-2"></i>
                  Artículos relacionados
                </h6>
              </div>
              <div className="card-body">
                {articulosRelacionados.slice(0, 5).map(art => (
                  <div key={art.id} className="mb-3">
                    <Link 
                      to={`/ayuda/articulos/${art.id}`}
                      className="text-decoration-none"
                    >
                      <h6 className="mb-1">{art.titulo}</h6>
                    </Link>
                    <small className="text-muted">
                      {art.categoria?.nombre} • {art.tiempo_lectura || '5'} min
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ayuda adicional */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="fas fa-question-circle text-warning me-2"></i>
                ¿Necesitas más ayuda?
              </h6>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/ayuda/contacto" className="btn btn-outline-primary btn-sm">
                  <i className="fas fa-envelope me-2"></i>
                  Contactar soporte
                </Link>
                <Link to="/ayuda/tickets" className="btn btn-outline-info btn-sm">
                  <i className="fas fa-ticket-alt me-2"></i>
                  Crear ticket
                </Link>
                <Link to="/ayuda/faq" className="btn btn-outline-success btn-sm">
                  <i className="fas fa-question me-2"></i>
                  Ver FAQs
                </Link>
              </div>
              
              <hr />
              
              <small className="text-muted">
                <i className="fas fa-clock me-1"></i>
                Tiempo de respuesta promedio: 2-4 horas
              </small>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .article-content {
          line-height: 1.6;
        }
        
        .article-content h3, 
        .article-content h4 {
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        
        .article-content p {
          margin-bottom: 1rem;
        }
        
        .article-content .alert {
          margin: 1.5rem 0;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .cursor-pointer:hover {
          transform: scale(1.1);
          transition: transform 0.2s;
        }
        
        .nav-link {
          border: none !important;
          color: #6c757d;
        }
        
        .nav-link:hover {
          background-color: #f8f9fa;
          color: #0d6efd;
        }
      `}</style>
    </div>
  );
};

export default ArticuloDetalle;
