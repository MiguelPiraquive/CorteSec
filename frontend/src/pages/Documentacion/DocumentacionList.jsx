import React, { useState, useEffect } from 'react';

const DocumentacionList = () => {
  const [documentos, setDocumentos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [loading, setLoading] = useState(true);

  // Datos simulados de documentación
  const datosDocumentacion = [
    {
      id: 1,
      titulo: 'Manual de Usuario - Sistema CorteSec',
      categoria: 'manuales',
      tipo: 'manual_usuario',
      descripcion: 'Guía completa para el uso del sistema por parte de usuarios finales',
      version: '2.0.0',
      fecha_creacion: '2024-01-15',
      fecha_actualizacion: '2024-01-22',
      autor: 'Equipo Desarrollo',
      estado: 'publicado',
      tamaño: '15.2 MB',
      formato: 'PDF',
      descargas: 156,
      idioma: 'español',
      tags: ['usuario', 'manual', 'tutorial', 'completo']
    },
    {
      id: 2,
      titulo: 'Documentación Técnica - API REST',
      categoria: 'tecnica',
      tipo: 'api_docs',
      descripcion: 'Documentación completa de la API REST del sistema',
      version: '1.5.0',
      fecha_creacion: '2024-01-10',
      fecha_actualizacion: '2024-01-25',
      autor: 'Desarrollador Principal',
      estado: 'publicado',
      tamaño: '8.7 MB',
      formato: 'HTML',
      descargas: 89,
      idioma: 'español',
      tags: ['api', 'rest', 'endpoints', 'desarrollo']
    },
    {
      id: 3,
      titulo: 'Políticas de Seguridad',
      categoria: 'politicas',
      tipo: 'politicas',
      descripcion: 'Documento de políticas y procedimientos de seguridad',
      version: '1.2.0',
      fecha_creacion: '2024-01-05',
      fecha_actualizacion: '2024-01-20',
      autor: 'Oficial de Seguridad',
      estado: 'publicado',
      tamaño: '3.4 MB',
      formato: 'PDF',
      descargas: 234,
      idioma: 'español',
      tags: ['seguridad', 'politicas', 'procedimientos', 'compliance']
    },
    {
      id: 4,
      titulo: 'Guía de Instalación',
      categoria: 'instalacion',
      tipo: 'guia_instalacion',
      descripcion: 'Instrucciones detalladas para la instalación del sistema',
      version: '2.0.0',
      fecha_creacion: '2024-01-12',
      fecha_actualizacion: '2024-01-18',
      autor: 'DevOps Team',
      estado: 'publicado',
      tamaño: '5.8 MB',
      formato: 'PDF',
      descargas: 67,
      idioma: 'español',
      tags: ['instalacion', 'setup', 'configuracion', 'deployment']
    },
    {
      id: 5,
      titulo: 'Procedimientos de Backup',
      categoria: 'procedimientos',
      tipo: 'procedimientos',
      descripcion: 'Procedimientos para realizar copias de seguridad',
      version: '1.0.0',
      fecha_creacion: '2024-01-08',
      fecha_actualizacion: '2024-01-16',
      autor: 'Administrador de Sistema',
      estado: 'revision',
      tamaño: '2.1 MB',
      formato: 'DOCX',
      descargas: 34,
      idioma: 'español',
      tags: ['backup', 'procedimientos', 'recuperacion', 'seguridad']
    },
    {
      id: 6,
      titulo: 'Arquitectura del Sistema',
      categoria: 'tecnica',
      tipo: 'arquitectura',
      descripcion: 'Documentación de la arquitectura y diseño del sistema',
      version: '1.8.0',
      fecha_creacion: '2024-01-01',
      fecha_actualizacion: '2024-01-24',
      autor: 'Arquitecto de Software',
      estado: 'publicado',
      tamaño: '12.5 MB',
      formato: 'PDF',
      descargas: 45,
      idioma: 'español',
      tags: ['arquitectura', 'diseño', 'diagramas', 'tecnico']
    },
    {
      id: 7,
      titulo: 'Manual de Administrador',
      categoria: 'manuales',
      tipo: 'manual_admin',
      descripcion: 'Guía completa para administradores del sistema',
      version: '2.0.0',
      fecha_creacion: '2024-01-14',
      fecha_actualizacion: '2024-01-21',
      autor: 'Equipo Desarrollo',
      estado: 'publicado',
      tamaño: '18.9 MB',
      formato: 'PDF',
      descargas: 78,
      idioma: 'español',
      tags: ['administrador', 'manual', 'configuracion', 'gestion']
    },
    {
      id: 8,
      titulo: 'Casos de Uso del Sistema',
      categoria: 'analisis',
      tipo: 'casos_uso',
      descripcion: 'Documentación de casos de uso y flujos de trabajo',
      version: '1.3.0',
      fecha_creacion: '2024-01-06',
      fecha_actualizacion: '2024-01-19',
      autor: 'Analista de Sistemas',
      estado: 'borrador',
      tamaño: '6.2 MB',
      formato: 'DOCX',
      descargas: 23,
      idioma: 'español',
      tags: ['casos_uso', 'flujos', 'analisis', 'requisitos']
    },
    {
      id: 9,
      titulo: 'FAQ - Preguntas Frecuentes',
      categoria: 'soporte',
      tipo: 'faq',
      descripcion: 'Respuestas a las preguntas más comunes del sistema',
      version: '1.1.0',
      fecha_creacion: '2024-01-11',
      fecha_actualizacion: '2024-01-23',
      autor: 'Equipo Soporte',
      estado: 'publicado',
      tamaño: '1.8 MB',
      formato: 'HTML',
      descargas: 267,
      idioma: 'español',
      tags: ['faq', 'preguntas', 'soporte', 'ayuda']
    },
    {
      id: 10,
      titulo: 'Changelog - Historial de Cambios',
      categoria: 'release_notes',
      tipo: 'changelog',
      descripcion: 'Registro detallado de cambios y mejoras por versión',
      version: '2.0.0',
      fecha_creacion: '2024-01-09',
      fecha_actualizacion: '2024-01-25',
      autor: 'Product Manager',
      estado: 'publicado',
      tamaño: '4.3 MB',
      formato: 'HTML',
      descargas: 145,
      idioma: 'español',
      tags: ['changelog', 'versiones', 'cambios', 'release']
    }
  ];

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setDocumentos(datosDocumentacion);
      setLoading(false);
    }, 1000);
  }, []);

  const documentosFiltrados = documentos.filter(doc => {
    const coincideFiltro = doc.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
                          doc.descripcion.toLowerCase().includes(filtro.toLowerCase()) ||
                          doc.tags.some(tag => tag.toLowerCase().includes(filtro.toLowerCase()));
    const coincideCategoria = categoriaFiltro === 'todas' || doc.categoria === categoriaFiltro;
    const coincideTipo = tipoFiltro === 'todos' || doc.tipo === tipoFiltro;
    return coincideFiltro && coincideCategoria && coincideTipo;
  });

  const totalDocumentos = documentos.length;
  const documentosPublicados = documentos.filter(d => d.estado === 'publicado').length;
  const categorias = [...new Set(documentos.map(d => d.categoria))];
  const totalDescargas = documentos.reduce((sum, d) => sum + d.descargas, 0);

  const getEstadoBadge = (estado) => {
    const badges = {
      'publicado': 'bg-success',
      'revision': 'bg-warning',
      'borrador': 'bg-secondary'
    };
    return badges[estado] || 'bg-secondary';
  };

  const getFormatoBadge = (formato) => {
    const badges = {
      'PDF': 'bg-danger',
      'HTML': 'bg-primary',
      'DOCX': 'bg-info'
    };
    return badges[formato] || 'bg-secondary';
  };

  const getCategoriaIcon = (categoria) => {
    const icons = {
      'manuales': 'fas fa-book',
      'tecnica': 'fas fa-code',
      'politicas': 'fas fa-shield-alt',
      'instalacion': 'fas fa-download',
      'procedimientos': 'fas fa-list-ol',
      'analisis': 'fas fa-chart-line',
      'soporte': 'fas fa-question-circle',
      'release_notes': 'fas fa-tag'
    };
    return icons[categoria] || 'fas fa-file-alt';
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO');
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">
                    <i className="fas fa-file-alt text-primary me-2"></i>
                    Centro de Documentación
                  </h4>
                  <p className="text-muted mb-0">Biblioteca de documentos técnicos y manuales del sistema</p>
                </div>
                <div className="btn-group">
                  <button className="btn btn-outline-secondary">
                    <i className="fas fa-sync me-2"></i>
                    Actualizar
                  </button>
                  <button className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>
                    Nuevo Documento
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Estadísticas */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-file-alt fa-2x text-primary"></i>
              </div>
              <h5 className="card-title">Total Documentos</h5>
              <h3 className="text-primary mb-0">{totalDocumentos}</h3>
              <small className="text-muted">En la biblioteca</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-check-circle fa-2x text-success"></i>
              </div>
              <h5 className="card-title">Publicados</h5>
              <h3 className="text-success mb-0">{documentosPublicados}</h3>
              <small className="text-muted">Disponibles públicamente</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-download fa-2x text-info"></i>
              </div>
              <h5 className="card-title">Total Descargas</h5>
              <h3 className="text-info mb-0">{totalDescargas.toLocaleString()}</h3>
              <small className="text-muted">Descargas totales</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <i className="fas fa-layer-group fa-2x text-warning"></i>
              </div>
              <h5 className="card-title">Categorías</h5>
              <h3 className="text-warning mb-0">{categorias.length}</h3>
              <small className="text-muted">Diferentes tipos</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Buscar documentos</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por título, descripción o tags..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-select"
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                  >
                    <option value="todas">Todas las categorías</option>
                    {categorias.map(categoria => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Tipo de documento</label>
                  <select
                    className="form-select"
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value)}
                  >
                    <option value="todos">Todos los tipos</option>
                    <option value="manual_usuario">Manual de Usuario</option>
                    <option value="manual_admin">Manual de Administrador</option>
                    <option value="api_docs">Documentación API</option>
                    <option value="politicas">Políticas</option>
                    <option value="procedimientos">Procedimientos</option>
                    <option value="arquitectura">Arquitectura</option>
                    <option value="faq">FAQ</option>
                    <option value="changelog">Changelog</option>
                  </select>
                </div>
                <div className="col-md-2 mb-3">
                  <label className="form-label">Acciones</label>
                  <div className="d-grid">
                    <button className="btn btn-outline-primary">
                      <i className="fas fa-upload me-2"></i>
                      Subir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Documentos */}
      <div className="row">
        {documentosFiltrados.map(documento => (
          <div key={documento.id} className="col-lg-6 col-xl-4 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center">
                    <i className={`${getCategoriaIcon(documento.categoria)} text-primary me-2`}></i>
                    <span className="badge bg-light text-dark">{documento.categoria}</span>
                  </div>
                  <div className="d-flex gap-1">
                    <span className={`badge ${getEstadoBadge(documento.estado)}`}>
                      {documento.estado}
                    </span>
                    <span className={`badge ${getFormatoBadge(documento.formato)}`}>
                      {documento.formato}
                    </span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <h6 className="card-title mb-2">{documento.titulo}</h6>
                <p className="text-muted small mb-3">{documento.descripcion}</p>
                
                <div className="mb-3">
                  <div className="row text-center">
                    <div className="col-4">
                      <div className="text-info">
                        <i className="fas fa-download"></i>
                      </div>
                      <small className="d-block text-muted">{documento.descargas}</small>
                    </div>
                    <div className="col-4">
                      <div className="text-success">
                        <i className="fas fa-code-branch"></i>
                      </div>
                      <small className="d-block text-muted">v{documento.version}</small>
                    </div>
                    <div className="col-4">
                      <div className="text-warning">
                        <i className="fas fa-file"></i>
                      </div>
                      <small className="d-block text-muted">{documento.tamaño}</small>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="d-flex flex-wrap gap-1">
                    {documento.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="badge bg-light text-dark small">
                        #{tag}
                      </span>
                    ))}
                    {documento.tags.length > 3 && (
                      <span className="badge bg-secondary small">
                        +{documento.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <small className="text-muted">
                    <i className="fas fa-user me-1"></i>
                    {documento.autor}
                  </small>
                  <br />
                  <small className="text-muted">
                    <i className="fas fa-calendar me-1"></i>
                    Actualizado: {formatFecha(documento.fecha_actualizacion)}
                  </small>
                </div>
              </div>
              <div className="card-footer bg-white border-top-0">
                <div className="btn-group w-100" role="group">
                  <button className="btn btn-outline-primary btn-sm">
                    <i className="fas fa-eye"></i>
                  </button>
                  <button className="btn btn-outline-success btn-sm">
                    <i className="fas fa-download"></i>
                  </button>
                  <button className="btn btn-outline-secondary btn-sm">
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="btn btn-outline-info btn-sm">
                    <i className="fas fa-share"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {documentosFiltrados.length === 0 && (
        <div className="text-center py-5">
          <i className="fas fa-search fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No se encontraron documentos</h5>
          <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}
    </div>
  );
};

export default DocumentacionList;
