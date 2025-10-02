import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTutoriales } from '../../hooks/useAyuda.js';

const Tutoriales = () => {
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [dificultadFiltro, setDificultadFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  const {
    data: tutoriales = [],
    loading,
    error
  } = useTutoriales({
    categoria: categoriaFiltro !== 'todas' ? categoriaFiltro : '',
    dificultad: dificultadFiltro !== 'todas' ? dificultadFiltro : '',
    search: busqueda
  });

  const categorias = [
    { id: 'todas', nombre: 'Todas las categorías', icono: 'fas fa-list' },
    { id: 'introduccion', nombre: 'Introducción', icono: 'fas fa-play-circle' },
    { id: 'empleados', nombre: 'Empleados', icono: 'fas fa-users' },
    { id: 'nomina', nombre: 'Nómina', icono: 'fas fa-money-bill' },
    { id: 'reportes', nombre: 'Reportes', icono: 'fas fa-chart-bar' },
    { id: 'seguridad', nombre: 'Seguridad', icono: 'fas fa-shield-alt' },
    { id: 'configuracion', nombre: 'Configuración', icono: 'fas fa-cogs' },
    { id: 'avanzado', nombre: 'Avanzado', icono: 'fas fa-user-graduate' }
  ];

  const dificultades = [
    { id: 'todas', nombre: 'Todas las dificultades' },
    { id: 'basico', nombre: 'Básico', color: 'success', descripcion: 'Para principiantes' },
    { id: 'intermedio', nombre: 'Intermedio', color: 'warning', descripcion: 'Conocimiento previo' },
    { id: 'avanzado', nombre: 'Avanzado', color: 'danger', descripcion: 'Para expertos' }
  ];

  const getDificultadColor = (dificultad) => {
    const diff = dificultades.find(d => d.id === dificultad);
    return diff ? diff.color : 'secondary';
  };

  const getCategoriaInfo = (categoriaId) => {
    return categorias.find(c => c.id === categoriaId) || { icono: 'fas fa-book', color: 'primary' };
  };

  const tutorialesFiltrados = tutoriales.filter(tutorial => {
    const cumpleBusqueda = busqueda === '' || 
      tutorial.titulo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      tutorial.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      tutorial.tags?.some(tag => tag.toLowerCase().includes(busqueda.toLowerCase()));
    
    const cumpleCategoria = categoriaFiltro === 'todas' || tutorial.categoria === categoriaFiltro;
    const cumpleDificultad = dificultadFiltro === 'todas' || tutorial.dificultad === dificultadFiltro;
    
    return cumpleBusqueda && cumpleCategoria && cumpleDificultad;
  });

  return (
    <div className="container-fluid py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/ayuda" className="text-decoration-none">Centro de Ayuda</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Tutoriales
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-gradient-info text-white">
            <div className="card-body py-4">
              <div className="text-center">
                <h1 className="display-5 mb-3">
                  <i className="fas fa-graduation-cap me-3"></i>
                  Tutoriales Interactivos
                </h1>
                <p className="lead mb-0">
                  Aprende paso a paso con nuestros tutoriales prácticos
                </p>
              </div>
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
                      placeholder="Buscar tutoriales..."
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
                <div className="col-lg-4 mb-3">
                  <select
                    className="form-select"
                    value={dificultadFiltro}
                    onChange={(e) => setDificultadFiltro(e.target.value)}
                  >
                    {dificultades.map(dificultad => (
                      <option key={dificultad.id} value={dificultad.id}>
                        {dificultad.nombre}
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
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-book fa-2x text-info mb-2"></i>
              <h4 className="mb-1">{tutoriales.length}</h4>
              <small className="text-muted">Tutoriales</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-filter fa-2x text-primary mb-2"></i>
              <h4 className="mb-1">{tutorialesFiltrados.length}</h4>
              <small className="text-muted">Filtrados</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-layer-group fa-2x text-success mb-2"></i>
              <h4 className="mb-1">{categorias.length - 1}</h4>
              <small className="text-muted">Categorías</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-signal fa-2x text-warning mb-2"></i>
              <h4 className="mb-1">{dificultades.length - 1}</h4>
              <small className="text-muted">Niveles</small>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de tutoriales */}
      <div className="row">
        <div className="col-12">
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="text-muted mt-2">Cargando tutoriales...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <h5>Error al cargar tutoriales</h5>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && tutorialesFiltrados.length === 0 && (
            <div className="text-center py-5">
              <i className="fas fa-search fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No se encontraron tutoriales</h5>
              <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}

          {!loading && !error && tutorialesFiltrados.length > 0 && (
            <div className="row">
              {tutorialesFiltrados.map(tutorial => {
                const categoriaInfo = getCategoriaInfo(tutorial.categoria);
                return (
                  <div key={tutorial.id} className="col-lg-4 col-md-6 mb-4">
                    <div className="card h-100 border-0 shadow-sm tutorial-card">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <span className="badge bg-info">
                            <i className={`${categoriaInfo.icono} me-1`}></i>
                            {tutorial.categoria || 'General'}
                          </span>
                          <span className={`badge bg-${getDificultadColor(tutorial.dificultad)}`}>
                            {tutorial.dificultad || 'Básico'}
                          </span>
                        </div>
                        
                        <h5 className="card-title mb-3">{tutorial.titulo}</h5>
                        
                        <p className="card-text text-muted">
                          {tutorial.descripcion?.substring(0, 100)}
                          {tutorial.descripcion?.length > 100 ? '...' : ''}
                        </p>
                        
                        <div className="row text-center mb-3">
                          <div className="col-4">
                            <small className="text-muted d-block">Pasos</small>
                            <strong>{tutorial.total_pasos || 0}</strong>
                          </div>
                          <div className="col-4">
                            <small className="text-muted d-block">Duración</small>
                            <strong>{tutorial.duracion_estimada || '15'} min</strong>
                          </div>
                          <div className="col-4">
                            <small className="text-muted d-block">Progreso</small>
                            <strong>{tutorial.progreso_usuario || 0}%</strong>
                          </div>
                        </div>
                        
                        {tutorial.progreso_usuario > 0 && (
                          <div className="progress mb-3" style={{ height: '6px' }}>
                            <div
                              className="progress-bar bg-success"
                              style={{ width: `${tutorial.progreso_usuario}%` }}
                            ></div>
                          </div>
                        )}
                        
                        {tutorial.tags && tutorial.tags.length > 0 && (
                          <div className="mb-3">
                            {tutorial.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="badge bg-light text-dark me-1">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="card-footer bg-transparent border-top-0">
                        <div className="d-grid gap-2">
                          <button className="btn btn-primary">
                            {tutorial.progreso_usuario > 0 ? (
                              <>
                                <i className="fas fa-play me-2"></i>
                                Continuar Tutorial
                              </>
                            ) : (
                              <>
                                <i className="fas fa-rocket me-2"></i>
                                Comenzar Tutorial
                              </>
                            )}
                          </button>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              <i className="fas fa-users me-1"></i>
                              {tutorial.completados || 0} completados
                            </small>
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-secondary" title="Vista previa">
                                <i className="fas fa-eye"></i>
                              </button>
                              <button className="btn btn-outline-secondary" title="Favorito">
                                <i className="far fa-heart"></i>
                              </button>
                            </div>
                          </div>
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

      {/* Ayuda adicional */}
      <div className="row mt-5">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body text-center">
              <h5 className="mb-3">¿Necesitas ayuda con los tutoriales?</h5>
              <p className="text-muted mb-4">
                Nuestro equipo está disponible para guiarte
              </p>
              <div className="d-flex justify-content-center gap-3">
                <Link to="/ayuda/videos" className="btn btn-outline-danger">
                  <i className="fas fa-video me-2"></i>
                  Ver Videos
                </Link>
                <Link to="/ayuda/articulos" className="btn btn-outline-primary">
                  <i className="fas fa-file-alt me-2"></i>
                  Leer Artículos
                </Link>
                <Link to="/ayuda/contacto" className="btn btn-outline-info">
                  <i className="fas fa-headset me-2"></i>
                  Contactar Soporte
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tutorial-card:hover {
          transform: translateY(-5px);
          transition: transform 0.3s ease;
        }
        
        .bg-gradient-info {
          background: linear-gradient(45deg, #17a2b8, #138496);
        }
        
        .progress {
          border-radius: 10px;
        }
        
        .progress-bar {
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default Tutoriales;
