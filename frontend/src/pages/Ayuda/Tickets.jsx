import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSolicitudesSoporte, useCrearSolicitudSoporte } from '../../hooks/useAyuda.js';

const Tickets = () => {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [formulario, setFormulario] = useState({
    asunto: '',
    descripcion: '',
    categoria: '',
    prioridad: 'media',
    adjuntos: []
  });

  const {
    data: tickets = [],
    loading: loadingTickets,
    error: errorTickets,
    refetch: refetchTickets
  } = useSolicitudesSoporte({
    estado: filtroEstado !== 'todas' ? filtroEstado : ''
  });

  const {
    ejecutarOperacion: crearTicket,
    loading: creandoTicket,
    error: errorCreacion
  } = useCrearSolicitudSoporte();

  const categorias = [
    { id: '', nombre: 'Selecciona una categoría' },
    { id: 'tecnico', nombre: 'Soporte Técnico', icono: 'fas fa-cogs' },
    { id: 'funcionalidad', nombre: 'Nueva Funcionalidad', icono: 'fas fa-lightbulb' },
    { id: 'bug', nombre: 'Reporte de Error', icono: 'fas fa-bug' },
    { id: 'acceso', nombre: 'Problemas de Acceso', icono: 'fas fa-key' },
    { id: 'capacitacion', nombre: 'Capacitación', icono: 'fas fa-graduation-cap' },
    { id: 'general', nombre: 'Consulta General', icono: 'fas fa-question-circle' }
  ];

  const prioridades = [
    { id: 'baja', nombre: 'Baja', color: 'success', descripcion: 'No urgente' },
    { id: 'media', nombre: 'Media', color: 'warning', descripcion: 'Respuesta en 24-48h' },
    { id: 'alta', nombre: 'Alta', color: 'danger', descripcion: 'Atención inmediata' },
    { id: 'critica', nombre: 'Crítica', color: 'dark', descripcion: 'Sistema no funcional' }
  ];

  const estados = [
    { id: 'todas', nombre: 'Todos los estados' },
    { id: 'abierto', nombre: 'Abiertos', color: 'primary' },
    { id: 'en_progreso', nombre: 'En Progreso', color: 'warning' },
    { id: 'resuelto', nombre: 'Resueltos', color: 'success' },
    { id: 'cerrado', nombre: 'Cerrados', color: 'secondary' }
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
      await crearTicket(formulario);
      
      // Limpiar formulario
      setFormulario({
        asunto: '',
        descripcion: '',
        categoria: '',
        prioridad: 'media',
        adjuntos: []
      });
      
      setMostrarFormulario(false);
      refetchTickets();
    } catch (err) {
      console.error('Error creando ticket:', err);
    }
  };

  const getEstadoColor = (estado) => {
    const estadoInfo = estados.find(e => e.id === estado);
    return estadoInfo ? estadoInfo.color : 'secondary';
  };

  const getPrioridadColor = (prioridad) => {
    const prioridadInfo = prioridades.find(p => p.id === prioridad);
    return prioridadInfo ? prioridadInfo.color : 'secondary';
  };

  const ticketsFiltrados = filtroEstado === 'todas' 
    ? tickets 
    : tickets.filter(ticket => ticket.estado === filtroEstado);

  return (
    <div className="container-fluid py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/ayuda" className="text-decoration-none">Centro de Ayuda</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Tickets de Soporte
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-ticket-alt text-primary me-2"></i>
                Tickets de Soporte
              </h2>
              <p className="text-muted mb-0">Gestiona tus solicitudes de ayuda</p>
            </div>
            <div>
              <Link to="/ayuda" className="btn btn-outline-secondary me-2">
                <i className="fas fa-arrow-left me-2"></i>Volver
              </Link>
              <button
                className="btn btn-primary"
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
              >
                <i className="fas fa-plus me-2"></i>
                Nuevo Ticket
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de nuevo ticket */}
      {mostrarFormulario && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-plus me-2"></i>
                  Crear Nuevo Ticket
                </h5>
              </div>
              <div className="card-body">
                {errorCreacion && (
                  <div className="alert alert-danger">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Error: {errorCreacion}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
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
                        placeholder="Describe brevemente tu problema o solicitud"
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
                    <label htmlFor="prioridad" className="form-label">Prioridad</label>
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
                      placeholder="Describe detalladamente tu problema, incluyendo pasos para reproducirlo si es aplicable..."
                      required
                    ></textarea>
                  </div>

                  <div className="text-end">
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => setMostrarFormulario(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={creandoTicket}
                    >
                      {creandoTicket ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Creando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane me-2"></i>
                          Crear Ticket
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <label htmlFor="filtroEstado" className="form-label">Filtrar por estado:</label>
                  <select
                    className="form-select"
                    id="filtroEstado"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                  >
                    {estados.map(estado => (
                      <option key={estado.id} value={estado.id}>
                        {estado.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6 text-end">
                  <small className="text-muted">
                    {loadingTickets ? 'Cargando...' : `${ticketsFiltrados.length} tickets`}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de tickets */}
      <div className="row">
        <div className="col-12">
          {loadingTickets && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="text-muted mt-2">Cargando tickets...</p>
            </div>
          )}

          {errorTickets && (
            <div className="alert alert-danger">
              <h5>Error al cargar tickets</h5>
              <p>{errorTickets}</p>
            </div>
          )}

          {!loadingTickets && !errorTickets && ticketsFiltrados.length === 0 && (
            <div className="text-center py-5">
              <i className="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No tienes tickets</h5>
              <p className="text-muted">Crea tu primer ticket para obtener ayuda</p>
              <button
                className="btn btn-primary"
                onClick={() => setMostrarFormulario(true)}
              >
                <i className="fas fa-plus me-2"></i>
                Crear Primer Ticket
              </button>
            </div>
          )}

          {!loadingTickets && !errorTickets && ticketsFiltrados.length > 0 && (
            <div className="row">
              {ticketsFiltrados.map(ticket => (
                <div key={ticket.id} className="col-12 mb-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <div className="row align-items-center">
                        <div className="col-md-8">
                          <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-secondary me-2">
                              #{ticket.id}
                            </span>
                            <span className={`badge bg-${getEstadoColor(ticket.estado)} me-2`}>
                              {ticket.estado?.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className={`badge bg-${getPrioridadColor(ticket.prioridad)}`}>
                              {ticket.prioridad?.toUpperCase()}
                            </span>
                          </div>
                          <h6 className="mb-2">{ticket.asunto}</h6>
                          <p className="text-muted mb-2">
                            {ticket.descripcion?.substring(0, 150)}
                            {ticket.descripcion?.length > 150 ? '...' : ''}
                          </p>
                          <small className="text-muted">
                            <i className="fas fa-calendar me-1"></i>
                            Creado: {ticket.fecha_creacion}
                            {ticket.fecha_actualizacion && (
                              <>
                                <span className="mx-2">•</span>
                                <i className="fas fa-clock me-1"></i>
                                Actualizado: {ticket.fecha_actualizacion}
                              </>
                            )}
                          </small>
                        </div>
                        <div className="col-md-4 text-end">
                          <div className="btn-group">
                            <button className="btn btn-sm btn-outline-primary">
                              <i className="fas fa-eye me-1"></i>
                              Ver
                            </button>
                            {ticket.estado !== 'cerrado' && (
                              <button className="btn btn-sm btn-outline-secondary">
                                <i className="fas fa-comment me-1"></i>
                                Responder
                              </button>
                            )}
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
  );
};

export default Tickets;
