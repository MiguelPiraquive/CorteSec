import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/auth.css';

const PasswordResetDone = () => {
  return (
    <div className="login-bg-hero">
      {/* Figuras y círculos animados de fondo */}
      <div className="bg-shapes">
        <div className="circle c1"></div>
        <div className="circle c2"></div>
        <div className="circle c3"></div>
        <div className="circle c4"></div>
        <div className="circle c5"></div>
        <div className="waves w1"></div>
        <div className="waves w2"></div>
        <div className="dots"></div>
      </div>

      <div className="login-panel">
        {/* Lado izquierdo: branding */}
        <div className="login-panel-left">
          <div className="brand-logo-area">
            <div className="brand-logo">
              <i className="fas fa-cut"></i>
            </div>
            <span className="brand-title">CorteSec</span>
          </div>
          <h2 className="brand-welcome">¡Email enviado!</h2>
          <div className="brand-slogan">Revisa tu correo electrónico</div>
          <div className="brand-desc">
            Te hemos enviado un correo con las instrucciones para restablecer tu contraseña. 
            Si no lo encuentras, revisa tu carpeta de spam.
          </div>
        </div>

        {/* Lado derecho: confirmación */}
        <div className="login-panel-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="login-form" style={{ width: '100%', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem' }}>
              <i className="fas fa-envelope-open" style={{ fontSize: '4rem', color: '#2563eb', marginBottom: '1rem' }}></i>
            </div>
            <h2 style={{ color: '#2563eb', fontWeight: '800', marginBottom: '0.7rem' }}>
              ¡Correo enviado!
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Hemos enviado un enlace para restablecer tu contraseña a tu correo electrónico.<br />
              Sigue las instrucciones del email para crear una nueva contraseña.
            </p>
            <div className="login-form-actions">
              <Link to="/auth/login" className="login-btn" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>
                Volver al Login
              </Link>
              <button 
                onClick={() => window.open('https://gmail.com', '_blank')} 
                className="signup-btn" 
                style={{ display: 'block', width: '100%' }}
              >
                Abrir Gmail
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '1rem' }}>
              ¿No recibiste el email? Revisa tu carpeta de spam o 
              <Link to="/auth/forgot-password" style={{ color: '#2563eb', textDecoration: 'none' }}> intenta de nuevo</Link>
            </p>
          </div>

          <div className="login-social" style={{ marginTop: '2.5rem' }}>
            <span>Síguenos</span>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="7" fill="#1877F3"/>
                <path d="M21 16.02h-3v8h-3v-8h-2v-2.5h2v-1.6c0-2.1 1.1-3.4 3.5-3.4h2.5v2.5h-2c-0.6 0-1 .2-1 1v1.5h3l-0.5 2.5z" fill="#fff"/>
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="7" fill="#1DA1F2"/>
                <path d="M25 11.5a6.7 6.7 0 0 1-1.9.5 3.3 3.3 0 0 0 1.5-1.8 6.7 6.7 0 0 1-2.1.8 3.3 3.3 0 0 0-5.7 3c-2.7-.1-5-1.4-6.6-3.3a3.3 3.3 0 0 0 1 4.4 3.3 3.3 0 0 1-1.5-.4v.1a3.3 3.3 0 0 0 2.7 3.2 3.3 3.3 0 0 1-1.5.1 3.3 3.3 0 0 0 3.1 2.3A6.7 6.7 0 0 1 9 23.1a9.4 9.4 0 0 0 5.1 1.5c6.1 0 9.5-5 9.5-9.5v-.4a6.7 6.7 0 0 0 1.6-1.7z" fill="#fff"/>
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="7" fill="url(#ig-gradient)"/>
                <defs>
                  <linearGradient id="ig-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fbc2eb"/>
                    <stop offset="1" stopColor="#a18cd1"/>
                  </linearGradient>
                </defs>
                <rect x="8" y="8" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="2"/>
                <circle cx="16" cy="16" r="4" fill="none" stroke="#fff" strokeWidth="2"/>
                <circle cx="21.5" cy="10.5" r="1" fill="#fff"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetDone;
