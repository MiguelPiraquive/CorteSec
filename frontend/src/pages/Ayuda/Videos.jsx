import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVideos } from '../../hooks/useAyuda.js';

const Videos = () => {
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [duracionFiltro, setDuracionFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [videoActual, setVideoActual] = useState(null);
  
  const {
    data: videos = [],
    loading,
    error
  } = useVideos({
    categoria: categoriaFiltro !== 'todas' ? categoriaFiltro : '',
    search: busqueda
  });

  // Filtrar videos basado en los criterios de búsqueda y filtros
  const videosFiltrados = videos.filter(video => {
    const cumpleBusqueda = busqueda === '' || 
      video.titulo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      video.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      video.tags?.some(tag => tag.toLowerCase().includes(busqueda.toLowerCase()));
    
    const cumpleCategoria = categoriaFiltro === 'todas' || video.categoria === categoriaFiltro;
    
    const cumpleDuracion = duracionFiltro === 'todas' || 
      (duracionFiltro === 'corto' && video.duracion_segundos <= 600) ||
      (duracionFiltro === 'medio' && video.duracion_segundos > 600 && video.duracion_segundos <= 1200) ||
      (duracionFiltro === 'largo' && video.duracion_segundos > 1200);
    
    return cumpleBusqueda && cumpleCategoria && cumpleDuracion;
  });

  const categorias = [
    { id: 'todas', nombre: 'Todas las categorías', icono: 'fas fa-video' },
    { id: 'introduccion', nombre: 'Introducción', icono: 'fas fa-play-circle' },
    { id: 'empleados', nombre: 'Empleados', icono: 'fas fa-users' },
    { id: 'nomina', nombre: 'Nómina', icono: 'fas fa-money-bill' },
    { id: 'seguridad', nombre: 'Seguridad', icono: 'fas fa-shield-alt' },
    { id: 'reportes', nombre: 'Reportes', icono: 'fas fa-chart-bar' },
    { id: 'configuracion', nombre: 'Configuración', icono: 'fas fa-cogs' },
    { id: 'avanzado', nombre: 'Avanzado', icono: 'fas fa-user-graduate' }
  ];

  const duraciones = [
    { id: 'todas', nombre: 'Todas las duraciones' },
    { id: 'corto', nombre: 'Cortos (< 10 min)' },
    { id: 'medio', nombre: 'Medios (10-20 min)' },
    { id: 'largo', nombre: 'Largos (> 20 min)' }
  ];

  const abrirModal = (video) => {
    setVideoActual(video);
  };

  const cerrarModal = () => {
    setVideoActual(null);
  };

  const formatearDuracion = (segundos) => {
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = segundos % 60;
    return `${minutos}:${segundosRestantes.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
          <p className="text-muted mt-2">Cargando videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          <h5>Error al cargar videos</h5>
          <p>{error}</p>
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
          <li className="breadcrumb-item active" aria-current="page">
            Videos
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-gradient-danger text-white">
            <div className="card-body py-4">
              <div className="text-center">
                <h1 className="display-5 mb-3">
                  <i className="fas fa-video me-3"></i>
                  Centro de Videos
                </h1>
                <p className="lead mb-0">
                  Aprende con nuestros tutoriales en video paso a paso
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-lg-5 mb-3">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar videos..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-4 mb-3">
                  <select
                    className="form-select"
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                  >
                    {categorias.map(categoria => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-3 mb-3">
                  <select
                    className="form-select"
                    value={duracionFiltro}
                    onChange={(e) => setDuracionFiltro(e.target.value)}
                  >
                    {duraciones.map(duracion => (
                      <option key={duracion.id} value={duracion.id}>
                        {duracion.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-video fa-2x text-danger mb-2"></i>
              <h4 className="mb-1">{videos.length}</h4>
              <small className="text-muted">Videos Disponibles</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-clock fa-2x text-warning mb-2"></i>
              <h4 className="mb-1">
                {videos.length > 0 ? Math.floor(videos.reduce((total, v) => total + (v.duracion_segundos || 0), 0) / 60) : 0} min
              </h4>
              <small className="text-muted">Contenido Total</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-eye fa-2x text-info mb-2"></i>
              <h4 className="mb-1">
                {videos.length > 0 ? videos.reduce((total, v) => total + (v.vistas || 0), 0).toLocaleString() : '0'}
              </h4>
              <small className="text-muted">Vistas Totales</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-thumbs-up fa-2x text-success mb-2"></i>
              <h4 className="mb-1">
                {videos.length > 0 ? videos.reduce((total, v) => total + (v.likes || 0), 0) : '0'}
              </h4>
              <small className="text-muted">Me Gusta</small>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de videos */}
      <div className="row">
        <div className="col-12">
          {videosFiltrados.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-search fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No se encontraron videos</h5>
              <p className="text-muted">Intenta ajustar los filtros de búsqueda.</p>
            </div>
          ) : (
            <div className="row">
              {videosFiltrados.map(video => (
                <div key={video.id} className="col-lg-4 col-md-6 mb-4">
                  <div className="card h-100 border-0 shadow-sm video-card">
                    <div className="position-relative">
                      <img
                        src={video.thumbnail || `https://via.placeholder.com/300x200/dc3545/ffffff?text=${encodeURIComponent(video.titulo || 'Video')}`}
                        className="card-img-top"
                        alt={video.titulo}
                        style={{ height: '200px', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/300x200/dc3545/ffffff?text=${encodeURIComponent(video.titulo || 'Video')}`;
                        }}
                      />
                      <div className="position-absolute top-50 start-50 translate-middle">
                        <button
                          className="btn btn-danger btn-lg rounded-circle play-button"
                          onClick={() => abrirModal(video)}
                        >
                          <i className="fas fa-play"></i>
                        </button>
                      </div>
                      <div className="position-absolute bottom-0 end-0 m-2">
                        <span className="badge bg-dark">
                          {video.duracion || formatearDuracion(video.duracion_segundos || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="card-body">
                      <h6 className="card-title mb-2">{video.titulo}</h6>
                      <p className="card-text small text-muted mb-3">
                        {video.descripcion?.substring(0, 100)}
                        {video.descripcion?.length > 100 ? '...' : ''}
                      </p>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="text-muted">
                          <i className="fas fa-eye me-1"></i>
                          {(video.vistas || 0).toLocaleString()} vistas
                        </small>
                        <small className="text-muted">
                          {video.fecha_publicacion}
                        </small>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className="badge bg-primary">{video.categoria}</span>
                          {video.calidad?.includes('4K') && (
                            <span className="badge bg-warning ms-1">4K</span>
                          )}
                          {video.subtitulos?.length > 0 && (
                            <span className="badge bg-info ms-1">CC</span>
                          )}
                        </div>
                        <div>
                          <small className="text-success me-2">
                            <i className="fas fa-thumbs-up me-1"></i>
                            {video.likes || 0}
                          </small>
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

      {/* Modal de video */}
      {videoActual && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{videoActual.titulo}</h5>
                <button type="button" className="btn-close" onClick={cerrarModal}></button>
              </div>
              <div className="modal-body p-0">
                <div className="ratio ratio-16x9">
                  <iframe
                    src={videoActual.url_video}
                    title={videoActual.titulo}
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div className="modal-footer">
                <div className="row w-100">
                  <div className="col-md-8">
                    <p className="mb-1">{videoActual.descripcion}</p>
                    <div className="d-flex flex-wrap gap-1">
                      {videoActual.tags?.map((tag, index) => (
                        <span key={index} className="badge bg-secondary">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="col-md-4 text-end">
                    <small className="text-muted d-block">
                      <i className="fas fa-eye me-1"></i>
                      {(videoActual.vistas || 0).toLocaleString()} vistas
                    </small>
                    <small className="text-muted d-block">
                      <i className="fas fa-clock me-1"></i>
                      {videoActual.duracion || formatearDuracion(videoActual.duracion_segundos || 0)}
                    </small>
                    <small className="text-muted d-block">
                      <i className="fas fa-calendar me-1"></i>
                      {videoActual.fecha_publicacion}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .video-card:hover {
          transform: translateY(-5px);
          transition: all 0.3s ease;
        }
        
        .play-button {
          width: 60px;
          height: 60px;
          opacity: 0.9;
        }
        
        .play-button:hover {
          opacity: 1;
          transform: scale(1.1);
        }
        
        .modal.show {
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Videos;
