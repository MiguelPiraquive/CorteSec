import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../store';
import '../../styles/auth.css';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateProfile, logout, loading, error } = useStore();
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
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
          <h2 className="brand-welcome">Mi Perfil</h2>
          <div className="brand-slogan">Gestiona tu información personal</div>
          <div className="brand-desc">
            Mantén actualizada tu información de perfil para una mejor experiencia en la plataforma.
          </div>
          <div style={{ marginTop: '2rem' }}>
            <Link to="/dashboard" className="signup-btn" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>
              <i className="fas fa-arrow-left me-2"></i>
              Volver al Dashboard
            </Link>
          </div>
        </div>

        {/* Lado derecho: formulario de perfil */}
        <div className="login-panel-right">
          <form onSubmit={handleSubmit} className="login-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#2563eb', fontWeight: '800', letterSpacing: '1px' }}>
                Información Personal
              </h2>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  background: 'none',
                  border: '2px solid #2563eb',
                  color: '#2563eb',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                <i className={`fas ${isEditing ? 'fa-times' : 'fa-edit'} me-2`}></i>
                {isEditing ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            
            {error && (
              <div className="login-error" style={{ marginBottom: '1rem', padding: '0.8rem', background: '#fee2e2', borderRadius: '0.5rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="login-form-group">
                <label htmlFor="firstName">Nombre</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Tu nombre"
                />
              </div>

              <div className="login-form-group">
                <label htmlFor="lastName">Apellido</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <div className="login-form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="tu@email.com"
              />
            </div>

            <div className="login-form-group">
              <label htmlFor="phone">Teléfono</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="+57 123 456 7890"
              />
            </div>

            <div className="login-form-group">
              <label htmlFor="bio">Biografía</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Cuéntanos un poco sobre ti..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '1rem 1.2rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.8rem',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  background: isEditing ? '#fff' : '#f9fafb',
                  resize: 'vertical'
                }}
              />
            </div>

            {isEditing && (
              <div className="login-form-actions">
                <button type="submit" className="login-btn" disabled={isSubmitting || loading}>
                  {isSubmitting || loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '2rem' }}>
              <h3 style={{ color: '#374151', fontSize: '1.1rem', marginBottom: '1rem' }}>Configuración de Cuenta</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/auth/change-password" className="signup-btn" style={{ textDecoration: 'none', flex: '1', minWidth: '150px' }}>
                  <i className="fas fa-key me-2"></i>
                  Cambiar Contraseña
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '0.8rem 2rem',
                    borderRadius: '0.8rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    flex: '1',
                    minWidth: '150px'
                  }}
                >
                  <i className="fas fa-sign-out-alt me-2"></i>
                  Cerrar Sesión
                </button>
              </div>
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

export default Profile;
