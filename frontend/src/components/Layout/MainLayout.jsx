import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/index';
import { OrganizationProvider } from '../../contexts/OrganizationContext.jsx';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Footer from '../Footer';

const MainLayout = () => {
  const { theme } = useAppStore();
  const [searchMobile, setSearchMobile] = useState(false);

  // Effect para manejar ESC key para cerrar modales
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSearchMobile(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <OrganizationProvider>
      {/* Layout Principal */}
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        
        {/* Sidebar - Ahora tipo drawer hamburguesa */}
        <Sidebar />
        
        {/* Contenido Principal - Ahora ocupa todo el ancho */}
        <div className="flex-1 flex flex-col min-h-screen">
          
          {/* Header - Ahora ocupa todo el ancho */}
          <Header />
          
          {/* Main Content */}
          <main 
            className="flex-1 pt-16 px-4 py-6 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 overflow-x-hidden"
          >
            <div className="w-full max-w-full">
              <Outlet />
            </div>
          </main>
          
          {/* Footer */}
          <Footer />
        </div>
      </div>

      {/* MODAL: Buscador móvil */}
      {searchMobile && (
        <div 
          className="search-modal-backdrop"
          onClick={() => setSearchMobile(false)}
        >
          <div 
            className="search-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center px-4 py-3 border-bottom">
              <i className="fas fa-search text-muted me-3"></i>
              <input
                type="text"
                placeholder="Buscar en todo el sistema..."
                className="flex-fill bg-transparent border-0 text-dark"
                style={{ outline: 'none' }}
                autoFocus
              />
              <button
                onClick={() => setSearchMobile(false)}
                className="btn btn-sm btn-outline-secondary"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="p-4">
              <div className="text-muted small mb-3">
                Búsquedas recientes
              </div>
              <div>
                {['Empleados activos', 'Reportes mensuales', 'Configuración'].map((item, index) => (
                  <div key={index} className="d-flex align-items-center p-2 rounded text-decoration-none text-dark" style={{ cursor: 'pointer', transition: 'all 0.3s' }}>
                    <i className="fas fa-clock text-muted small me-3"></i>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </OrganizationProvider>
  );
};

export default MainLayout;
