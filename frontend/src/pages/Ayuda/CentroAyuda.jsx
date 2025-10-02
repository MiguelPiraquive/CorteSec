import React from 'react';
import { Link } from 'react-router-dom';
import { useEstadisticasAyuda, useCategorias, useContenidoDestacado } from '../../hooks/useAyuda.js';

const CentroAyuda = () => {
  const { data: estadisticas, loading: loadingStats } = useEstadisticasAyuda();
  const { data: categorias = [], loading: loadingCategorias } = useCategorias();
  const { data: contenidoDestacado, loading: loadingDestacado } = useContenidoDestacado();

  // Datos de fallback mientras se cargan los reales
  const estadisticasFallback = {
    total_articulos: 0,
    total_faqs: 0,
    total_videos: 0,
    total_tutoriales: 0
  };

  const categoriasFallback = [
    { id: 1, nombre: 'Empleados', icono: 'fas fa-users', color: 'primary', descripcion: 'Gestión de empleados' },
    { id: 2, nombre: 'Nómina', icono: 'fas fa-money-bill', color: 'success', descripcion: 'Procesamiento de nómina' },
    { id: 3, nombre: 'Reportes', icono: 'fas fa-chart-bar', color: 'info', descripcion: 'Generación de reportes' },
    { id: 4, nombre: 'Seguridad', icono: 'fas fa-shield-alt', color: 'warning', descripcion: 'Configuración de seguridad' }
  ];

  const stats = estadisticas || estadisticasFallback;
  const cats = categorias.length > 0 ? categorias : categoriasFallback;

  const accesosRapidos = [
    {
      titulo: 'Artículos de Ayuda',
      descripcion: 'Guías paso a paso para usar el sistema',
      icono: 'fas fa-file-alt',
      color: 'primary',
      enlace: '/ayuda/articulos',
      count: stats.total_articulos
    },
    {
      titulo: 'Preguntas Frecuentes',
      descripcion: 'Respuestas a las dudas más comunes',
      icono: 'fas fa-question-circle',
      color: 'success',
      enlace: '/ayuda/faq',
      count: stats.total_faqs
    },
    {
      titulo: 'Videos Tutoriales',
      descripcion: 'Aprende viendo tutoriales en video',
      icono: 'fas fa-video',
      color: 'danger',
      enlace: '/ayuda/videos',
      count: stats.total_videos
    },
    {
      titulo: 'Tutoriales Interactivos',
      descripcion: 'Practica con tutoriales paso a paso',
      icono: 'fas fa-play-circle',
      color: 'info',
      enlace: '/ayuda/tutoriales',
      count: stats.total_tutoriales
    }
  ];

  const herramientasSoporte = [
    {
      titulo: 'Crear Ticket',
      descripcion: 'Reporta problemas o solicita ayuda',
      icono: 'fas fa-ticket-alt',
      color: 'warning',
      enlace: '/ayuda/tickets'
    },
    {
      titulo: 'Contactar Soporte',
      descripcion: 'Habla directamente con nuestro equipo',
      icono: 'fas fa-headset',
      color: 'info',
      enlace: '/ayuda/contacto'
    },
    {
      titulo: 'Enviar Feedback',
      descripcion: 'Comparte tu experiencia con nosotros',
      icono: 'fas fa-comment-alt',
      color: 'success',
      enlace: '/ayuda/feedback'
    }
  ];

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-gradient-primary text-white">
            <div className="card-body py-5">
              <div className="text-center">
                <h1 className="display-4 mb-3">
                  <i className="fas fa-life-ring me-3"></i>
                  Centro de Ayuda
                </h1>
                <p className="lead mb-4">
                  Encuentra respuestas, aprende nuevas funcionalidades y obtén soporte
                </p>
                <div className="col-lg-6 mx-auto">
                  <div className="input-group input-group-lg">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="¿Qué necesitas ayuda hoy?"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          window.location.href = `/ayuda/busqueda?q=${encodeURIComponent(e.target.value)}`;
                        }
                      }}
                    />
                    <button 
                      className="btn btn-light"
                      onClick={(e) => {
                        const input = e.target.parentElement.querySelector('input');
                        window.location.href = `/ayuda/busqueda?q=${encodeURIComponent(input.value)}`;
                      }}
                    >
                      <i className="fas fa-search text-primary"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="row mb-4">
        <div className="col-12">
          <h3 className="mb-3">
            <i className="fas fa-bolt text-warning me-2"></i>
            Accesos Rápidos
          </h3>
        </div>
        {accesosRapidos.map((acceso, index) => (
          <div key={index} className="col-lg-3 col-md-6 mb-3">
            <Link to={acceso.enlace} className="text-decoration-none">
              <div className="card h-100 border-0 shadow-sm card-hover">
                <div className="card-body text-center">
                  <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-3 bg-${acceso.color}`} 
                       style={{ width: '60px', height: '60px' }}>
                    <i className={`${acceso.icono} fa-lg text-white`}></i>
                  </div>
                  <h5 className="card-title">{acceso.titulo}</h5>
                  <p className="card-text text-muted">{acceso.descripcion}</p>
                  {!loadingStats && (
                    <span className={`badge bg-${acceso.color} fs-6`}>
                      {acceso.count} disponibles
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Categorías */}
      <div className="row mb-4">
        <div className="col-12">
          <h3 className="mb-3">
            <i className="fas fa-tags text-info me-2"></i>
            Explorar por Categorías
          </h3>
        </div>
        {cats.map((categoria) => (
          <div key={categoria.id} className="col-lg-3 col-md-6 mb-3">
            <Link to={`/ayuda/articulos?categoria=${categoria.id}`} className="text-decoration-none">
              <div className="card h-100 border-0 shadow-sm card-hover">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 bg-${categoria.color}`}
                         style={{ width: '50px', height: '50px' }}>
                      <i className={`${categoria.icono} text-white`}></i>
                    </div>
                    <div>
                      <h6 className="card-title mb-1">{categoria.nombre}</h6>
                      <small className="text-muted">{categoria.descripcion}</small>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="row">
        {/* Contenido destacado */}
        <div className="col-lg-8">
          <h3 className="mb-3">
            <i className="fas fa-star text-warning me-2"></i>
            Contenido Destacado
          </h3>
          
          {loadingDestacado ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : (
            <div className="row">
              {/* Artículos destacados */}
              {contenidoDestacado?.articulos?.slice(0, 3).map((articulo) => (
                <div key={articulo.id} className="col-md-4 mb-3">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <span className="badge bg-primary mb-2">Artículo</span>
                      <h6 className="card-title">
                        <Link to={`/ayuda/articulos/${articulo.id}`} className="text-decoration-none">
                          {articulo.titulo}
                        </Link>
                      </h6>
                      <p className="card-text small text-muted">
                        {articulo.descripcion?.substring(0, 80)}...
                      </p>
                      <small className="text-muted">
                        <i className="fas fa-eye me-1"></i>
                        {articulo.vistas || 0} vistas
                      </small>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Videos destacados */}
              {contenidoDestacado?.videos?.slice(0, 2).map((video) => (
                <div key={video.id} className="col-md-6 mb-3">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <span className="badge bg-danger mb-2">Video</span>
                      <h6 className="card-title">
                        <Link to={`/ayuda/videos`} className="text-decoration-none">
                          {video.titulo}
                        </Link>
                      </h6>
                      <p className="card-text small text-muted">
                        {video.descripcion?.substring(0, 80)}...
                      </p>
                      <small className="text-muted">
                        <i className="fas fa-clock me-1"></i>
                        {video.duracion} • {video.vistas || 0} vistas
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Herramientas de soporte */}
        <div className="col-lg-4">
          <h3 className="mb-3">
            <i className="fas fa-tools text-success me-2"></i>
            Herramientas de Soporte
          </h3>
          
          {herramientasSoporte.map((herramienta, index) => (
            <div key={index} className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <Link to={herramienta.enlace} className="text-decoration-none">
                  <div className="d-flex align-items-center">
                    <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 bg-${herramienta.color}`}
                         style={{ width: '40px', height: '40px' }}>
                      <i className={`${herramienta.icono} text-white`}></i>
                    </div>
                    <div>
                      <h6 className="mb-1">{herramienta.titulo}</h6>
                      <small className="text-muted">{herramienta.descripcion}</small>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          ))}

          {/* Contacto rápido */}
          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body text-center">
              <h6 className="mb-3">¿Necesitas ayuda inmediata?</h6>
              <div className="d-grid gap-2">
                <Link to="/ayuda/contacto" className="btn btn-primary">
                  <i className="fas fa-phone me-2"></i>
                  Contactar ahora
                </Link>
                <small className="text-muted">
                  Tiempo de respuesta: 2-4 horas
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .card-hover:hover {
          transform: translateY(-5px);
          transition: transform 0.3s ease;
        }
        
        .bg-gradient-primary {
          background: linear-gradient(45deg, #007bff, #0056b3);
        }
      `}</style>
    </div>
  );
};

export default CentroAyuda;
