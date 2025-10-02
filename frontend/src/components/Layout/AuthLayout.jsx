import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div style={{ minHeight: '100vh', width: '100vw' }}>
      {/* Renderizar directamente las páginas de auth sin wrapper adicional */}
      <Outlet />
    </div>
  );
};

export default AuthLayout;
