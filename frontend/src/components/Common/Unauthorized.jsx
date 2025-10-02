import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100">
      <div className="text-center">
        <div className="mb-4">
          <i className="fas fa-lock fa-5x text-danger"></i>
        </div>
        <h1 className="display-1 fw-bold text-muted">403</h1>
        <h2 className="mb-3">Acceso no autorizado</h2>
        <p className="text-muted mb-4">
          No tienes permisos suficientes para acceder a esta página.
          <br />
          Contacta al administrador si crees que esto es un error.
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

export default Unauthorized;
