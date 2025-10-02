import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEnviarFeedback, useFeedback } from '../../hooks/useAyuda.js';

const Feedback = () => {
  const [tipoFeedback, setTipoFeedback] = useState('general');
  const [formulario, setFormulario] = useState({
    titulo: '',
    descripcion: '',
    categoria: '',
    satisfaccion: 5,
    recomendacion: 5,
    facilidad_uso: 5,
    funcionalidades: '',
    mejoras: '',
    comentarios_adicionales: '',
    tipo: 'general'
  });
  const [enviado, setEnviado] = useState(false);

  const { ejecutarOperacion: enviarFeedback, loading: enviando, error } = useEnviarFeedback();
  const { data: feedbackEnviados = [] } = useFeedback();

  const tiposFeedback = [
    {
      id: 'general',
      nombre: 'Feedback General',
      icono: 'fas fa-star',
      descripcion: 'Comparte tu experiencia general con CorteSec'
    },
    {
      id: 'mejora',
      nombre: 'Sugerencia de Mejora',
      icono: 'fas fa-lightbulb',
      descripcion: 'Propón mejoras o nuevas funcionalidades'
    },
    {
      id: 'problema',
      nombre: 'Reporte de Problema',
      icono: 'fas fa-exclamation-triangle',
      descripcion: 'Reporta errores o problemas encontrados'
    },
    {
      id: 'felicitacion',
      nombre: 'Felicitación',
      icono: 'fas fa-heart',
      descripcion: 'Reconoce el buen trabajo del equipo'
    }
  ];

  const categorias = [
    { id: '', nombre: 'Selecciona una categoría' },
    { id: 'empleados', nombre: 'Gestión de Empleados', icono: 'fas fa-users' },
    { id: 'nomina', nombre: 'Nómina y Pagos', icono: 'fas fa-money-bill' },
    { id: 'reportes', nombre: 'Reportes', icono: 'fas fa-chart-bar' },
    { id: 'seguridad', nombre: 'Seguridad', icono: 'fas fa-shield-alt' },
    { id: 'interfaz', nombre: 'Interfaz de Usuario', icono: 'fas fa-desktop' },
    { id: 'rendimiento', nombre: 'Rendimiento', icono: 'fas fa-tachometer-alt' },
    { id: 'integraciones', nombre: 'Integraciones', icono: 'fas fa-plug' },
    { id: 'general', nombre: 'General', icono: 'fas fa-cog' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTipoChange = (tipo) => {
    setTipoFeedback(tipo);
    setFormulario(prev => ({
      ...prev,
      tipo: tipo
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await enviarFeedback({
        ...formulario,
        tipo: tipoFeedback
      });
      
      setEnviado(true);
      setFormulario({
        titulo: '',
        descripcion: '',
        categoria: '',
        satisfaccion: 5,
        recomendacion: 5,
        facilidad_uso: 5,
        funcionalidades: '',
        mejoras: '',
        comentarios_adicionales: '',
        tipo: tipoFeedback
      });
      
      setTimeout(() => setEnviado(false), 5000);
    } catch (err) {
      console.error('Error enviando feedback:', err);
    }
  };

  const renderEscalaCalificacion = (nombre, valor, onChange) => (
    <div className="mb-3">
      <label className="form-label">
        {nombre} <span className="text-danger">*</span>
      </label>
      <div className="d-flex align-items-center">
        <span className="me-3 small text-muted">1</span>
        <div className="flex-grow-1">
          <input
            type="range"
            className="form-range"
            min="1"
            max="10"
            value={valor}
            onChange={onChange}
          />
        </div>
        <span className="ms-3 small text-muted">10</span>
        <span className="ms-3 badge bg-primary">{valor}</span>
      </div>
    </div>
  );

  return (
    <div className="container-fluid py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/ayuda" className="text-decoration-none">Centro de Ayuda</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Feedback
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
                  <i className="fas fa-comments me-3"></i>
                  Centro de Feedback
                </h1>
                <p className="lead mb-0">
                  Tu opinión nos ayuda a mejorar CorteSec
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Formulario de Feedback */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                <i className="fas fa-comment-alt text-success me-2"></i>
                Enviar Feedback
              </h5>
            </div>
            <div className="card-body">
              {enviado && (
                <div className="alert alert-success">
                  <i className="fas fa-check-circle me-2"></i>
                  ¡Gracias por tu feedback! Lo hemos recibido correctamente.
                </div>
              )}

              {error && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Error: {error}
                </div>
              )}

              {/* Selección de tipo de feedback */}
              <div className="mb-4">
                <h6 className="mb-3">Tipo de Feedback</h6>
                <div className="row">
                  {tiposFeedback.map(tipo => (
                    <div key={tipo.id} className="col-md-6 mb-3">
                      <div
                        className={`card h-100 cursor-pointer ${tipoFeedback === tipo.id ? 'border-success bg-light' : ''}`}
                        onClick={() => handleTipoChange(tipo.id)}
                      >
                        <div className="card-body text-center">
                          <i className={`${tipo.icono} fa-2x ${tipoFeedback === tipo.id ? 'text-success' : 'text-muted'} mb-2`}></i>
                          <h6 className="card-title">{tipo.nombre}</h6>
                          <p className="card-text small text-muted">{tipo.descripcion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Información básica */}
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label htmlFor="titulo" className="form-label">
                      Título <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="titulo"
                      name="titulo"
                      value={formulario.titulo}
                      onChange={handleInputChange}
                      placeholder="Describe brevemente tu feedback"
                      required
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label htmlFor="categoria" className="form-label">
                      Categoría <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="categoria"
                      name="categoria"
                      value={formulario.categoria}
                      onChange={handleInputChange}
                      required
                    >
                      {categorias.map(categoria => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="descripcion" className="form-label">
                    Descripción detallada <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    id="descripcion"
                    name="descripcion"
                    rows="4"
                    value={formulario.descripcion}
                    onChange={handleInputChange}
                    placeholder="Explica detalladamente tu feedback..."
                    required
                  ></textarea>
                </div>

                {/* Calificaciones */}
                {tipoFeedback === 'general' && (
                  <div className="border rounded p-3 mb-4">
                    <h6 className="mb-3">Calificaciones</h6>
                    
                    {renderEscalaCalificacion(
                      'Satisfacción general',
                      formulario.satisfaccion,
                      (e) => handleInputChange({ target: { name: 'satisfaccion', value: e.target.value } })
                    )}
                    
                    {renderEscalaCalificacion(
                      '¿Recomendarías CorteSec?',
                      formulario.recomendacion,
                      (e) => handleInputChange({ target: { name: 'recomendacion', value: e.target.value } })
                    )}
                    
                    {renderEscalaCalificacion(
                      'Facilidad de uso',
                      formulario.facilidad_uso,
                      (e) => handleInputChange({ target: { name: 'facilidad_uso', value: e.target.value } })
                    )}
                  </div>
                )}

                {/* Preguntas adicionales */}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="funcionalidades" className="form-label">
                      ¿Qué funcionalidades usas más?
                    </label>
                    <textarea
                      className="form-control"
                      id="funcionalidades"
                      name="funcionalidades"
                      rows="3"
                      value={formulario.funcionalidades}
                      onChange={handleInputChange}
                      placeholder="Menciona las funcionalidades que más utilizas..."
                    ></textarea>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="mejoras" className="form-label">
                      ¿Qué mejorarías?
                    </label>
                    <textarea
                      className="form-control"
                      id="mejoras"
                      name="mejoras"
                      rows="3"
                      value={formulario.mejoras}
                      onChange={handleInputChange}
                      placeholder="Sugerencias de mejora..."
                    ></textarea>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="comentarios_adicionales" className="form-label">
                    Comentarios adicionales
                  </label>
                  <textarea
                    className="form-control"
                    id="comentarios_adicionales"
                    name="comentarios_adicionales"
                    rows="3"
                    value={formulario.comentarios_adicionales}
                    onChange={handleInputChange}
                    placeholder="Cualquier comentario adicional que quieras compartir..."
                  ></textarea>
                </div>

                <div className="text-end">
                  <button
                    type="button"
                    className="btn btn-secondary me-2"
                    onClick={() => setFormulario({
                      titulo: '',
                      descripcion: '',
                      categoria: '',
                      satisfaccion: 5,
                      recomendacion: 5,
                      facilidad_uso: 5,
                      funcionalidades: '',
                      mejoras: '',
                      comentarios_adicionales: '',
                      tipo: tipoFeedback
                    })}
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={enviando}
                  >
                    {enviando ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Enviar Feedback
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar con información */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="fas fa-info-circle text-info me-2"></i>
                ¿Por qué es importante tu feedback?
              </h6>
            </div>
            <div className="card-body">
              <div className="d-flex mb-3">
                <i className="fas fa-rocket text-primary me-3 mt-1"></i>
                <div>
                  <h6 className="mb-1">Innovación continua</h6>
                  <small className="text-muted">Nos ayuda a desarrollar nuevas funcionalidades</small>
                </div>
              </div>
              <div className="d-flex mb-3">
                <i className="fas fa-bug text-warning me-3 mt-1"></i>
                <div>
                  <h6 className="mb-1">Corrección de errores</h6>
                  <small className="text-muted">Identificamos y solucionamos problemas</small>
                </div>
              </div>
              <div className="d-flex mb-3">
                <i className="fas fa-user-friends text-success me-3 mt-1"></i>
                <div>
                  <h6 className="mb-1">Experiencia de usuario</h6>
                  <small className="text-muted">Mejoramos la usabilidad del sistema</small>
                </div>
              </div>
              <div className="d-flex">
                <i className="fas fa-chart-line text-info me-3 mt-1"></i>
                <div>
                  <h6 className="mb-1">Evolución del producto</h6>
                  <small className="text-muted">Dirigimos el desarrollo hacia tus necesidades</small>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="fas fa-clock text-warning me-2"></i>
                Feedback reciente
              </h6>
            </div>
            <div className="card-body">
              {feedbackEnviados.length > 0 ? (
                feedbackEnviados.slice(0, 3).map((fb, index) => (
                  <div key={index} className="border-bottom py-2">
                    <small className="text-muted">{fb.fecha}</small>
                    <p className="mb-1 small">{fb.titulo}</p>
                    <span className={`badge bg-${fb.estado === 'procesado' ? 'success' : 'warning'} small`}>
                      {fb.estado}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted small">No has enviado feedback aún</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cursor-pointer {
          cursor: pointer;
        }
        
        .cursor-pointer:hover {
          transform: translateY(-2px);
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default Feedback;
