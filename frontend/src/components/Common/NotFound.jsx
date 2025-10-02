import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100">
      <div className="text-center">
        <div className="mb-4">
          <i className="fas fa-exclamation-triangle fa-5x text-warning"></i>
        </div>
        <h1 className="display-1 fw-bold text-muted">404</h1>
        <h2 className="mb-3">Página no encontrada</h2>
        <p className="text-muted mb-4">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>
        <div className="d-flex gap-3 justify-content-center">
          <Link to="/dashboard" className="btn btn-primary">
            <i className="fas fa-home me-2"></i>
            Ir al Dashboard
          </Link>
          <button onClick={() => window.history.back()} className="btn btn-outline-secondary">
            <i className="fas fa-arrow-left me-2"></i>
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
