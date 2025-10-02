import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';

const Footer = () => {
  const { sidebarCollapsed } = useAppStore();
  const [currentYear] = useState(new Date().getFullYear());
  const [hoveredSection, setHoveredSection] = useState(null);
  const [footerVisible, setFooterVisible] = useState(false);

  // Información de contacto premium
  const contactInfo = {
    email: 'soporte@cortesec.com',
    phone: '+1 (555) 123-4567',
    address: 'Enterprise Tower, Silicon Valley'
  };

  // Links sociales premium
  const socialLinks = [
    { name: 'LinkedIn', icon: 'fab fa-linkedin', url: '#', color: 'text-blue-600' },
    { name: 'Twitter', icon: 'fab fa-twitter', url: '#', color: 'text-sky-500' },
    { name: 'GitHub', icon: 'fab fa-github', url: '#', color: 'text-gray-800 dark:text-white' }
  ];

  // Estadísticas del sistema
  const stats = {
    uptime: '99.9%',
    users: '1,250+',
    companies: '150+'
  };

  // Links rápidos
  const quickLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: 'fas fa-tachometer-alt', color: 'blue' },
    { name: 'Empleados', href: '/payroll/empleados', icon: 'fas fa-users', color: 'green' },
    { name: 'Reportes', href: '/reportes', icon: 'fas fa-chart-bar', color: 'purple' },
    { name: 'Configuración', href: '/configuracion', icon: 'fas fa-cog', color: 'amber' },
    { name: 'Ayuda', href: '/ayuda', icon: 'fas fa-question-circle', color: 'emerald' },
    { name: 'Privacidad', href: '#', icon: 'fas fa-shield-alt', color: 'red' }
  ];

  useEffect(() => {
    // Observer para animación de entrada
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setFooterVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    const footerElement = document.querySelector('#main-footer');
    if (footerElement) {
      observer.observe(footerElement);
    }

    return () => {
      if (footerElement) {
        observer.unobserve(footerElement);
      }
    };
  }, []);

  return (
    <footer 
      id="main-footer"
      className={`
        bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-zinc-700/50 
        mt-auto relative overflow-hidden transition-all duration-300
        ${footerVisible ? 'animate-fade-in-up' : ''}
      `}
      role="contentinfo"
    >
      {/* Efectos de fondo premium */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-50/20 via-transparent to-transparent dark:from-blue-900/10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.1),transparent)] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.05),transparent)]"></div>
      
      {/* Contenido principal */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Sección principal del footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Columna izquierda: Branding y descripción */}
          <div 
            className="space-y-4"
            onMouseEnter={() => setHoveredSection('brand')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            
            {/* Logo y título premium */}
            <div className="flex items-center space-x-3 group">
              <div className="relative h-12 w-12 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-500 group-hover:scale-110">
                <i className="fas fa-shield-alt text-white text-xl group-hover:text-yellow-200 transition-colors duration-300"></i>
                
                {/* Anillo de carga sutil */}
                <div className="absolute inset-0 rounded-xl border-2 border-blue-400/30 animate-pulse"></div>
                
                {/* Efecto de brillo */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:translate-x-8 transition-transform duration-700"></div>
              </div>
              
              <div className="flex flex-col">
                <span className="text-2xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-500">
                  CorteSec
                </span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors duration-300">
                  Enterprise Suite
                </span>
              </div>
            </div>
            
            {/* Descripción premium */}
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm">
              Plataforma líder en gestión empresarial con tecnología de vanguardia, diseñada para optimizar procesos y maximizar la productividad de tu organización.
            </p>
            
            {/* Estadísticas en tiempo real */}
            <div className="flex items-center space-x-4 pt-2">
              <div className="flex items-center space-x-1.5 group">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-emerald-600 transition-colors">
                  {stats.uptime} Disponibilidad
                </span>
              </div>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {stats.users} Usuarios activos
              </span>
            </div>
          </div>
          
          {/* Columna central: Enlaces rápidos */}
          <div 
            className="space-y-4"
            onMouseEnter={() => setHoveredSection('links')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
              Enlaces Rápidos
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link, index) => (
                <a 
                  key={index}
                  href={link.href}
                  className={`
                    flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 
                    hover:text-${link.color}-600 dark:hover:text-${link.color}-400 
                    hover:bg-${link.color}-50/50 dark:hover:bg-${link.color}-900/20 
                    rounded-lg transition-all duration-200 group
                  `}
                >
                  <i className={`${link.icon} text-xs group-hover:animate-pulse`}></i>
                  <span>{link.name}</span>
                </a>
              ))}
            </div>
          </div>
          
          {/* Columna derecha: Contacto y redes sociales */}
          <div 
            className="space-y-4"
            onMouseEnter={() => setHoveredSection('contact')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
              Contacto
            </h3>
            
            {/* Información de contacto premium */}
            <div className="space-y-3">
              <a 
                href={`mailto:${contactInfo.email}`}
                className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-zinc-600/50 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <i className="fas fa-envelope text-white text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {contactInfo.email}
                  </p>
                </div>
                <i className="fas fa-external-link-alt text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"></i>
              </a>
              
              <div className="flex items-center space-x-3 p-3 bg-white/30 dark:bg-zinc-800/30 backdrop-blur-sm rounded-xl border border-gray-200/30 dark:border-zinc-600/30">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-phone text-white text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {contactInfo.phone}
                  </p>
                </div>
              </div>
              
              {/* Redes sociales */}
              <div className="flex items-center space-x-2 pt-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-2">Síguenos:</span>
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    className={`
                      w-8 h-8 ${social.color} hover:bg-white dark:hover:bg-zinc-800 
                      rounded-lg flex items-center justify-center transition-all duration-200 
                      hover:scale-110 hover:shadow-lg group
                    `}
                    aria-label={`Síguenos en ${social.name}`}
                  >
                    <i className={`${social.icon} text-sm group-hover:animate-pulse`}></i>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Línea divisoria elegante */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mb-6"></div>
        
        {/* Footer bottom */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          
          {/* Copyright */}
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-copyright text-xs"></i>
            <span>
              {currentYear} CorteSec Enterprise. Todos los derechos reservados.
            </span>
          </div>
          
          {/* Versión y estado */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                v2.0 Enterprise
              </span>
            </div>
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
            
            <div className="flex items-center space-x-1">
              <i className="fas fa-server text-xs text-emerald-500"></i>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Estado: Operativo
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
