import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEnviarContacto } from '../../hooks/useAyuda.js';

const Contacto = () => {
  const [formulario, setFormulario] = useState({
    nombre: '',
    email: '',
    empresa: '',
    telefono: '',
    asunto: '',
    categoria: '',
    prioridad: 'media',
    mensaje: '',
    adjuntos: []
  });
  const [enviado, setEnviado] = useState(false);

  const { ejecutarOperacion: enviarContacto, loading: enviando, error } = useEnviarContacto();

  const categorias = [
    { id: '', nombre: 'Selecciona una categoría' },
    { id: 'tecnico', nombre: 'Soporte Técnico', icono: 'fas fa-cogs' },
    { id: 'facturacion', nombre: 'Facturación', icono: 'fas fa-file-invoice' },
    { id: 'funcionalidad', nombre: 'Nueva Funcionalidad', icono: 'fas fa-lightbulb' },
    { id: 'bug', nombre: 'Reporte de Error', icono: 'fas fa-bug' },
    { id: 'capacitacion', nombre: 'Capacitación', icono: 'fas fa-graduation-cap' },
    { id: 'general', nombre: 'Consulta General', icono: 'fas fa-question-circle' }
  ];

  const prioridades = [
    { id: 'baja', nombre: 'Baja', color: 'success', descripcion: 'No urgente, puede esperar' },
    { id: 'media', nombre: 'Media', color: 'warning', descripcion: 'Respuesta en 24-48 horas' },
    { id: 'alta', nombre: 'Alta', color: 'danger', descripcion: 'Requiere atención inmediata' },
    { id: 'critica', nombre: 'Crítica', color: 'dark', descripcion: 'Sistema no funcional' }
  ];

  const canalesContacto = [
    {
      id: 'email',
      nombre: 'Email',
      icono: 'fas fa-envelope',
      valor: 'soporte@cortesec.com',
      descripcion: 'Respuesta en 24 horas',
      disponible: true
    },
    {
      id: 'telefono',
      nombre: 'Teléfono',
      icono: 'fas fa-phone',
      valor: '+57 (1) 234-5678',
      descripcion: 'Lun-Vie 8:00-18:00',
      disponible: true
    },
    {
      id: 'whatsapp',
      nombre: 'WhatsApp',
      icono: 'fab fa-whatsapp',
      valor: '+57 321 123 4567',
      descripcion: 'Respuesta inmediata',
      disponible: true
    },
    {
      id: 'chat',
      nombre: 'Chat en vivo',
      icono: 'fas fa-comments',
      valor: 'chat.cortesec.com',
      descripcion: 'Lun-Vie 8:00-18:00',
      disponible: false
    }
  ];

  const horariosAtencion = [
    { dia: 'Lunes - Viernes', horario: '8:00 AM - 6:00 PM' },
    { dia: 'Sábados', horario: '9:00 AM - 1:00 PM' },
    { dia: 'Domingos', horario: 'Cerrado' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await enviarContacto(formulario);
      
      setEnviado(true);
      setFormulario({
        nombre: '',
        email: '',
        empresa: '',
        telefono: '',
        asunto: '',
        categoria: '',
        prioridad: 'media',
        mensaje: '',
        adjuntos: []
      });
      
      setTimeout(() => setEnviado(false), 5000);
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    }
  };

  const getPrioridadColor = (prioridad) => {
    const prio = prioridades.find(p => p.id === prioridad);
    return prio ? prio.color : 'secondary';
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
            Contacto
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
                  <i className="fas fa-headset me-3"></i>
                  Centro de Contacto
                </h1>
                <p className="lead mb-0">
                  Estamos aquí para ayudarte. Contáctanos de la forma que prefieras
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Formulario de contacto */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                <i className="fas fa-envelope text-info me-2"></i>
                Enviar Mensaje
              </h5>
            </div>
            <div className="card-body">
              {enviado && (
                <div className="alert alert-success">
                  <i className="fas fa-check-circle me-2"></i>
                  ¡Mensaje enviado exitosamente! Te responderemos pronto.
                </div>
              )}

              {error && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Error: {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Información personal */}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="nombre" className="form-label">
                      Nombre completo <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="nombre"
                      name="nombre"
                      value={formulario.nombre}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="email" className="form-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formulario.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="empresa" className="form-label">
                      Empresa
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="empresa"
                      name="empresa"
                      value={formulario.empresa}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="telefono" className="form-label">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      id="telefono"
                      name="telefono"
                      value={formulario.telefono}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Detalles del mensaje */}
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label htmlFor="asunto" className="form-label">
                      Asunto <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="asunto"
                      name="asunto"
                      value={formulario.asunto}
                      onChange={handleInputChange}
                      placeholder="Describe brevemente tu consulta"
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

                <div className="mb-3">
                  <label htmlFor="prioridad" className="form-label">
                    Prioridad
                  </label>
                  <div className="row">
                    {prioridades.map(prioridad => (
                      <div key={prioridad.id} className="col-md-3 mb-2">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="prioridad"
                            id={`prioridad-${prioridad.id}`}
                            value={prioridad.id}
                            checked={formulario.prioridad === prioridad.id}
                            onChange={handleInputChange}
                          />
                          <label className="form-check-label" htmlFor={`prioridad-${prioridad.id}`}>
                            <span className={`badge bg-${prioridad.color} me-2`}>
                              {prioridad.nombre}
                            </span>
                            <small className="text-muted d-block">
                              {prioridad.descripcion}
                            </small>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="mensaje" className="form-label">
                    Mensaje <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    id="mensaje"
                    name="mensaje"
                    rows="6"
                    value={formulario.mensaje}
                    onChange={handleInputChange}
                    placeholder="Describe detalladamente tu consulta o problema..."
                    required
                  ></textarea>
                  <div className="form-text">
                    Incluye toda la información relevante para poder ayudarte mejor.
                  </div>
                </div>

                <div className="text-end">
                  <button
                    type="button"
                    className="btn btn-secondary me-2"
                    onClick={() => setFormulario({
                      nombre: '',
                      email: '',
                      empresa: '',
                      telefono: '',
                      asunto: '',
                      categoria: '',
                      prioridad: 'media',
                      mensaje: '',
                      adjuntos: []
                    })}
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-info"
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
                        Enviar Mensaje
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar con información de contacto */}
        <div className="col-lg-4">
          {/* Canales de contacto */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="fas fa-phone text-info me-2"></i>
                Otros canales de contacto
              </h6>
            </div>
            <div className="card-body">
              {canalesContacto.map(canal => (
                <div key={canal.id} className={`d-flex align-items-center mb-3 ${!canal.disponible ? 'opacity-50' : ''}`}>
                  <div className="me-3">
                    <i className={`${canal.icono} fa-lg text-info`}></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1">{canal.nombre}</h6>
                    <p className="mb-0 small text-muted">{canal.valor}</p>
                    <small className="text-muted">{canal.descripcion}</small>
                    {!canal.disponible && (
                      <span className="badge bg-secondary ms-2">Próximamente</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Horarios de atención */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="fas fa-clock text-warning me-2"></i>
                Horarios de atención
              </h6>
            </div>
            <div className="card-body">
              {horariosAtencion.map((horario, index) => (
                <div key={index} className="d-flex justify-content-between mb-2">
                  <span className="text-muted">{horario.dia}</span>
                  <span className="fw-bold">{horario.horario}</span>
                </div>
              ))}
              <hr />
              <small className="text-muted">
                <i className="fas fa-info-circle me-1"></i>
                Horario GMT-5 (Colombia)
              </small>
            </div>
          </div>

          {/* Tiempo de respuesta */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="fas fa-stopwatch text-success me-2"></i>
                Tiempo de respuesta
              </h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6 mb-3">
                  <div className="badge bg-success p-2 mb-2">
                    <i className="fas fa-bolt"></i>
                  </div>
                  <h6 className="mb-1">Crítica</h6>
                  <small className="text-muted">&lt; 2 horas</small>
                </div>
                <div className="col-6 mb-3">
                  <div className="badge bg-warning p-2 mb-2">
                    <i className="fas fa-clock"></i>
                  </div>
                  <h6 className="mb-1">Normal</h6>
                  <small className="text-muted">24-48 horas</small>
                </div>
              </div>
              <hr />
              <small className="text-muted">
                Los tiempos pueden variar según la complejidad de la consulta.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacto;
