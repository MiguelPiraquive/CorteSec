import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFAQs, useMarcarUtil } from '../../hooks/useAyuda.js';

const FAQ = () => {
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [faqsAbiertas, setFaqsAbiertas] = useState(new Set());

  const {
    data: faqs = [],
    loading,
    error
  } = useFAQs({
    categoria: categoriaFiltro !== 'todas' ? categoriaFiltro : '',
    search: busqueda
  });

  const { ejecutarOperacion: marcarUtil } = useMarcarUtil();

  const categorias = [
    { id: 'todas', nombre: 'Todas las categorías', icono: 'fas fa-list' },
    { id: 'empleados', nombre: 'Empleados', icono: 'fas fa-users' },
    { id: 'nomina', nombre: 'Nómina', icono: 'fas fa-money-bill' },
    { id: 'reportes', nombre: 'Reportes', icono: 'fas fa-chart-bar' },
    { id: 'seguridad', nombre: 'Seguridad', icono: 'fas fa-shield-alt' },
    { id: 'configuracion', nombre: 'Configuración', icono: 'fas fa-cogs' },
    { id: 'general', nombre: 'General', icono: 'fas fa-question-circle' }
  ];

  const toggleFAQ = (faqId) => {
    const nuevasFaqsAbiertas = new Set(faqsAbiertas);
    if (nuevasFaqsAbiertas.has(faqId)) {
      nuevasFaqsAbiertas.delete(faqId);
    } else {
      nuevasFaqsAbiertas.add(faqId);
    }
    setFaqsAbiertas(nuevasFaqsAbiertas);
  };

  const handleMarcarUtil = async (faqId, esUtil) => {
    try {
      await marcarUtil(faqId, 'faq', { util: esUtil });
    } catch (err) {
      console.error('Error marcando FAQ como útil:', err);
    }
  };

  const faqsFiltradas = faqs.filter(faq => {
    const cumpleBusqueda = busqueda === '' || 
      faq.pregunta?.toLowerCase().includes(busqueda.toLowerCase()) ||
      faq.respuesta?.toLowerCase().includes(busqueda.toLowerCase()) ||
      faq.tags?.some(tag => tag.toLowerCase().includes(busqueda.toLowerCase()));
    
    const cumpleCategoria = categoriaFiltro === 'todas' || faq.categoria === categoriaFiltro;
    
    return cumpleBusqueda && cumpleCategoria;
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
            Preguntas Frecuentes
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-gradient-success text-white">
            <div className="card-body py-4">
              <div className="text-center">
                <h1 className="display-5 mb-3">
                  <i className="fas fa-question-circle me-3"></i>
                  Preguntas Frecuentes
                </h1>
                <p className="lead mb-0">
                  Encuentra respuestas rápidas a las dudas más comunes
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
                <div className="col-lg-6 mb-3">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar en preguntas y respuestas..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-6 mb-3">
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
              <i className="fas fa-question-circle fa-2x text-success mb-2"></i>
              <h4 className="mb-1">{faqs.length}</h4>
              <small className="text-muted">Preguntas</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-search fa-2x text-info mb-2"></i>
              <h4 className="mb-1">{faqsFiltradas.length}</h4>
              <small className="text-muted">Resultados</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-tags fa-2x text-warning mb-2"></i>
              <h4 className="mb-1">{categorias.length - 1}</h4>
              <small className="text-muted">Categorías</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body">
              <i className="fas fa-thumbs-up fa-2x text-primary mb-2"></i>
              <h4 className="mb-1">
                {faqs.reduce((total, faq) => total + (faq.votos_utiles || 0), 0)}
              </h4>
              <small className="text-muted">Votos útiles</small>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de FAQs */}
      <div className="row">
        <div className="col-12">
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="text-muted mt-2">Cargando preguntas...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <h5>Error al cargar las preguntas</h5>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && faqsFiltradas.length === 0 && (
            <div className="text-center py-5">
              <i className="fas fa-search fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No se encontraron preguntas</h5>
              <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}

          {!loading && !error && faqsFiltradas.length > 0 && (
            <div className="accordion" id="faqAccordion">
              {faqsFiltradas.map((faq, index) => {
                const isOpen = faqsAbiertas.has(faq.id);
                return (
                  <div key={faq.id} className="accordion-item border-0 shadow-sm mb-3">
                    <h2 className="accordion-header">
                      <button
                        className={`accordion-button ${isOpen ? '' : 'collapsed'}`}
                        type="button"
                        onClick={() => toggleFAQ(faq.id)}
                        aria-expanded={isOpen}
                      >
                        <div className="d-flex align-items-center w-100">
                          <div className="me-3">
                            <span className="badge bg-success">
                              {faq.categoria || 'General'}
                            </span>
                          </div>
                          <div className="flex-grow-1">
                            <strong>{faq.pregunta}</strong>
                          </div>
                          <div className="ms-3">
                            <small className="text-muted">
                              <i className="fas fa-thumbs-up me-1"></i>
                              {faq.votos_utiles || 0}
                            </small>
                          </div>
                        </div>
                      </button>
                    </h2>
                    <div
                      className={`accordion-collapse collapse ${isOpen ? 'show' : ''}`}
                    >
                      <div className="accordion-body">
                        <div className="row">
                          <div className="col-lg-10">
                            <div className="faq-content">
                              {faq.respuesta ? (
                                <div dangerouslySetInnerHTML={{ __html: faq.respuesta }} />
                              ) : (
                                <p>Respuesta no disponible.</p>
                              )}
                            </div>
                            
                            {faq.tags && faq.tags.length > 0 && (
                              <div className="mt-3">
                                <small className="text-muted me-2">Etiquetas:</small>
                                {faq.tags.map((tag, tagIndex) => (
                                  <span key={tagIndex} className="badge bg-light text-dark me-1">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="col-lg-2">
                            <div className="text-center">
                              <p className="mb-2"><strong>¿Te fue útil?</strong></p>
                              <div className="btn-group" role="group">
                                <button
                                  type="button"
                                  className="btn btn-outline-success btn-sm"
                                  onClick={() => handleMarcarUtil(faq.id, true)}
                                >
                                  <i className="fas fa-thumbs-up"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleMarcarUtil(faq.id, false)}
                                >
                                  <i className="fas fa-thumbs-down"></i>
                                </button>
                              </div>
                              <div className="mt-2">
                                <small className="text-muted">
                                  {faq.fecha_actualizacion}
                                </small>
                              </div>
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
              <h5 className="mb-3">¿No encontraste lo que buscabas?</h5>
              <p className="text-muted mb-4">
                Nuestro equipo de soporte está listo para ayudarte
              </p>
              <div className="d-flex justify-content-center gap-3">
                <Link to="/ayuda/contacto" className="btn btn-primary">
                  <i className="fas fa-envelope me-2"></i>
                  Contactar Soporte
                </Link>
                <Link to="/ayuda/tickets" className="btn btn-outline-info">
                  <i className="fas fa-ticket-alt me-2"></i>
                  Crear Ticket
                </Link>
                <Link to="/ayuda/articulos" className="btn btn-outline-secondary">
                  <i className="fas fa-file-alt me-2"></i>
                  Ver Artículos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .accordion-button:not(.collapsed) {
          background-color: #f8f9fa;
          border-color: #dee2e6;
        }
        
        .accordion-button:focus {
          box-shadow: none;
          border-color: #dee2e6;
        }
        
        .faq-content {
          line-height: 1.6;
        }
        
        .faq-content h4, .faq-content h5 {
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        
        .faq-content p {
          margin-bottom: 1rem;
        }
        
        .bg-gradient-success {
          background: linear-gradient(45deg, #28a745, #20c997);
        }
      `}</style>
    </div>
  );
};

export default FAQ;
