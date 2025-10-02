import React, { useEffect } from 'react';
import { debugAuthState, setUnauthorizedHandler } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

/**
 * Componente para debug y manejo global de autenticación
 * Debe ir en App.jsx o en el layout principal
 */
const AuthDebugger = () => {
  const navigate = useNavigate();
  const { logout } = useStore();

  useEffect(() => {
    // Handler global para 401/403 - auto logout y redirect
    setUnauthorizedHandler((error) => {
      console.warn('🚫 Unauthorized access detected:', error.message);
      logout();
      navigate('/auth/login', { replace: true });
    });

    // Debug inicial del estado de auth
    if (import.meta.env.DEV) {
      setTimeout(() => {
        console.log('🔍 Initial auth state check:');
        debugAuthState();
      }, 1000);
    }
  }, [logout, navigate]);

  // En desarrollo, mostrar botón de debug
  if (!import.meta.env.DEV) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      zIndex: 9999,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <button 
        onClick={debugAuthState}
        style={{
          background: 'transparent',
          border: '1px solid #666',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '11px'
        }}
      >
        🔍 Debug Auth
      </button>
    </div>
  );
};

export default AuthDebugger;
