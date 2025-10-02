import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../store';
import '../../styles/auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { resetPassword, loading, error } = useStore();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      navigate('/auth/password-reset-done');
    } catch (error) {
      console.error('Error enviando email:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h2 className="brand-welcome">¿Olvidaste tu contraseña?</h2>
          <div className="brand-slogan">Recupera el acceso a tu cuenta fácilmente.</div>
          <div className="brand-desc">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña de forma segura.
          </div>
        </div>

        {/* Lado derecho: formulario */}
        <div className="login-panel-right">
          <form onSubmit={handleSubmit} className="login-form">
            <h2 style={{ marginBottom: '0.5rem', color: '#2563eb', fontWeight: '800', letterSpacing: '1px' }}>
              Recuperar Contraseña
            </h2>
            
            {error && (
              <div className="login-error" style={{ marginBottom: '1rem', padding: '0.8rem', background: '#fee2e2', borderRadius: '0.5rem' }}>
                {error}
              </div>
            )}

            <div className="login-form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={handleInputChange}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="login-form-actions">
              <button type="submit" className="login-btn" disabled={isSubmitting || loading}>
                {isSubmitting || loading ? 'Enviando enlace...' : 'Enviar enlace'}
              </button>
              <Link to="/auth/login" className="signup-btn">Volver a iniciar sesión</Link>
            </div>
          </form>

          <div className="login-social">
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

export default ForgotPassword;
