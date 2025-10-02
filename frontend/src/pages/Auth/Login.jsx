import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../store';
import '../../styles/auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, error, isAuthenticated, clearError } = useStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated]); // Quitar navigate de dependencias

  // Limpiar errores cuando el componente se monta
  useEffect(() => {
    if (clearError) {
      clearError();
    }
    setLocalError('');
  }, []); // Empty dependency array - run only once

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (error || localError) {
      clearError();
      setLocalError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);

    // Validaciones básicas
    if (!formData.email.trim()) {
      setLocalError('Por favor ingresa tu correo electrónico');
      setIsSubmitting(false);
      return;
    }
    if (!formData.password.trim()) {
      setLocalError('Por favor ingresa tu contraseña');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.password, formData.remember);
      
      if (result.success) {
        console.log('Login exitoso:', result.message);
        // El estado global debería manejar la navegación automáticamente
      } else {
        setLocalError(result.message);
      }
    } catch (error) {
      console.error('Error de login:', error);
      setLocalError(error.message || 'Error de conexión. Por favor intenta de nuevo.');
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
          <h2 className="brand-welcome">¡Bienvenido!</h2>
          <div className="brand-slogan">Sistema de Gestión Empresarial</div>
          <div className="brand-desc">
            Accede a tu cuenta para gestionar de manera eficiente tus procesos empresariales, 
            recursos humanos, finanzas y toda la información crítica de tu organización.
          </div>
        </div>

        {/* Lado derecho: formulario */}
        <div className="login-panel-right">
          <form onSubmit={handleSubmit} className="login-form">
            <h2 style={{ marginBottom: '0.5rem', color: '#2563eb', fontWeight: '800', letterSpacing: '1px' }}>
              Iniciar Sesión
            </h2>
            
            {(error || localError) && (
              <div className="login-error" style={{ marginBottom: '1rem', padding: '0.8rem', background: '#fee2e2', borderRadius: '0.5rem' }}>
                {error || localError}
              </div>
            )}

            <div className="login-form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="login-form-group">
              <label htmlFor="password">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Tu contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleInputChange}
                  style={{ margin: 0 }}
                />
                Recordarme
              </label>
              <Link to="/auth/forgot-password" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.9rem' }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="login-form-actions">
              <button type="submit" className="login-btn" disabled={isSubmitting || loading}>
                {isSubmitting || loading ? (
                  <>
                    <i className="fas fa-spinner spinning" style={{ marginRight: '0.5rem' }}></i>
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt" style={{ marginRight: '0.5rem' }}></i>
                    Iniciar Sesión
                  </>
                )}
              </button>
              <Link to="/auth/register" className="signup-btn">
                <i className="fas fa-user-plus" style={{ marginRight: '0.5rem' }}></i>
                Crear cuenta nueva
              </Link>
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

export default Login;
