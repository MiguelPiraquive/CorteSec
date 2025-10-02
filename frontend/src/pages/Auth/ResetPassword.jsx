import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import '../../styles/auth.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams(); // Para obtener el token de la URL
  const { confirmPasswordReset, loading, error } = useStore();
  const [formData, setFormData] = useState({
    new_password1: '',
    new_password2: ''
  });
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.new_password1) {
      errors.new_password1 = 'La nueva contraseña es requerida';
    } else if (formData.new_password1.length < 6) {
      errors.new_password1 = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (!formData.new_password2) {
      errors.new_password2 = 'Confirma tu nueva contraseña';
    } else if (formData.new_password1 !== formData.new_password2) {
      errors.new_password2 = 'Las contraseñas no coinciden';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      await confirmPasswordReset(token, formData.new_password1, formData.new_password2);
      navigate('/auth/reset-complete');
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
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
          <h2 className="brand-welcome">Nueva Contraseña</h2>
          <div className="brand-slogan">¡Recupera el acceso a tu cuenta!</div>
          <div className="brand-desc">
            Ingresa tu nueva contraseña dos veces para confirmarla.<br />
            Recuerda usar una contraseña segura y fácil de recordar.
          </div>
        </div>

        {/* Lado derecho: formulario */}
        <div className="login-panel-right">
          <form onSubmit={handleSubmit} className="login-form">
            <h2 style={{ marginBottom: '0.5rem', color: '#2563eb', fontWeight: '800', letterSpacing: '1px' }}>
              Nueva Contraseña
            </h2>
            
            {error && (
              <div className="login-error" style={{ marginBottom: '1rem', padding: '0.8rem', background: '#fee2e2', borderRadius: '0.5rem' }}>
                {error}
              </div>
            )}

            <div className="login-form-group">
              <label htmlFor="new_password1">Nueva contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword1 ? 'text' : 'password'}
                  id="new_password1"
                  name="new_password1"
                  value={formData.new_password1}
                  onChange={handleInputChange}
                  placeholder="Nueva contraseña"
                  required
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword1(!showPassword1)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  <i className={`fas ${showPassword1 ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {validationErrors.new_password1 && (
                <div className="login-error">{validationErrors.new_password1}</div>
              )}
            </div>

            <div className="login-form-group">
              <label htmlFor="new_password2">Confirmar nueva contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword2 ? 'text' : 'password'}
                  id="new_password2"
                  name="new_password2"
                  value={formData.new_password2}
                  onChange={handleInputChange}
                  placeholder="Confirmar nueva contraseña"
                  required
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2(!showPassword2)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  <i className={`fas ${showPassword2 ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {validationErrors.new_password2 && (
                <div className="login-error">{validationErrors.new_password2}</div>
              )}
            </div>

            <div className="login-form-actions">
              <button type="submit" className="login-btn" disabled={isSubmitting || loading}>
                {isSubmitting || loading ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
              </button>
              <Link to="/auth/login" className="signup-btn">Volver al login</Link>
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

export default ResetPassword;
