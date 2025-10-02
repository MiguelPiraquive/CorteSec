import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Bell, 
  MapPin, 
  Monitor, 
  Key, 
  Settings,
  X,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

const SecurityAlertsPanel = ({ 
  alerts = [], 
  onMarkAsRead, 
  onDismiss,
  onViewDetails,
  loading = false 
}) => {
  const [filter, setFilter] = useState('all'); // all, unread, high, medium, low
  const [expandedAlert, setExpandedAlert] = useState(null);

  const getAlertIcon = (type) => {
    switch (type) {
      case 'login':
        return <Key className="w-5 h-5" />;
      case 'location':
        return <MapPin className="w-5 h-5" />;
      case 'device':
        return <Monitor className="w-5 h-5" />;
      case 'security':
        return <Shield className="w-5 h-5" />;
      case 'settings':
        return <Settings className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          badge: 'bg-red-100 text-red-800'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: 'text-gray-600',
          badge: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getFilteredAlerts = () => {
    return alerts.filter(alert => {
      if (filter === 'unread') return !alert.isRead;
      if (filter === 'high' || filter === 'medium' || filter === 'low') {
        return alert.severity === filter;
      }
      return true;
    });
  };

  const unreadCount = alerts.filter(alert => !alert.isRead).length;
  const filteredAlerts = getFilteredAlerts();

  const getAlertTitle = (alert) => {
    switch (alert.type) {
      case 'login':
        return alert.data?.isSuccess 
          ? 'Nuevo inicio de sesión' 
          : 'Intento de inicio de sesión fallido';
      case 'location':
        return 'Inicio de sesión desde nueva ubicación';
      case 'device':
        return 'Nuevo dispositivo detectado';
      case 'security':
        return 'Cambio en configuración de seguridad';
      case 'settings':
        return 'Configuración de cuenta modificada';
      default:
        return 'Alerta de seguridad';
    }
  };

  const getAlertDescription = (alert) => {
    switch (alert.type) {
      case 'login':
        return alert.data?.isSuccess
          ? `Sesión iniciada desde ${alert.data?.location || 'ubicación desconocida'}`
          : `Intento fallido desde IP ${alert.data?.ipAddress}`;
      case 'location':
        return `Acceso desde ${alert.data?.city}, ${alert.data?.country}`;
      case 'device':
        return `${alert.data?.deviceType} - ${alert.data?.browser || 'Navegador desconocido'}`;
      case 'security':
        return alert.data?.change || 'Se han modificado las configuraciones de seguridad';
      case 'settings':
        return alert.data?.setting || 'Se han modificado las configuraciones de la cuenta';
      default:
        return alert.message || 'Alerta de seguridad detectada';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Alertas de Seguridad</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600">
            Monitorea la actividad de seguridad de tu cuenta
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Todas', count: alerts.length },
          { key: 'unread', label: 'No leídas', count: unreadCount },
          { key: 'high', label: 'Alta', count: alerts.filter(a => a.severity === 'high').length },
          { key: 'medium', label: 'Media', count: alerts.filter(a => a.severity === 'medium').length },
          { key: 'low', label: 'Baja', count: alerts.filter(a => a.severity === 'low').length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label} {count > 0 && `(${count})`}
          </button>
        ))}
      </div>

      {/* Lista de alertas */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">
              {filter === 'all' 
                ? 'No hay alertas de seguridad' 
                : `No hay alertas ${filter === 'unread' ? 'no leídas' : `de severidad ${filter}`}`
              }
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const colors = getAlertColor(alert.severity);
            const isExpanded = expandedAlert === alert.id;
            
            return (
              <div
                key={alert.id}
                className={`border rounded-lg transition-all ${colors.border} ${colors.bg} ${
                  !alert.isRead ? 'ring-2 ring-blue-500 ring-opacity-20' : ''
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={colors.icon}>
                      {getAlertIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className={`text-sm font-medium ${colors.text}`}>
                              {getAlertTitle(alert)}
                            </h4>
                            {!alert.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          
                          <p className={`text-sm mt-1 ${colors.text} opacity-80`}>
                            {getAlertDescription(alert)}
                          </p>
                          
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-gray-500 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimeAgo(alert.timestamp)}</span>
                            </span>
                            
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                              {alert.severity === 'high' ? 'Alta' : 
                               alert.severity === 'medium' ? 'Media' : 'Baja'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {alert.hasDetails && (
                            <button
                              onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                              className={`p-1 rounded hover:bg-opacity-50 ${colors.icon}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                          
                          {!alert.isRead && (
                            <button
                              onClick={() => onMarkAsRead(alert.id)}
                              className={`p-1 rounded hover:bg-opacity-50 ${colors.icon}`}
                              title="Marcar como leída"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => onDismiss(alert.id)}
                            className={`p-1 rounded hover:bg-opacity-50 ${colors.icon}`}
                            title="Descartar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detalles expandidos */}
                  {isExpanded && alert.details && (
                    <div className={`mt-4 pt-4 border-t ${colors.border}`}>
                      <div className="space-y-2 text-sm">
                        {Object.entries(alert.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium capitalize">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                            </span>
                            <span className={colors.text}>{value}</span>
                          </div>
                        ))}
                      </div>
                      
                      {alert.recommendations && (
                        <div className="mt-3">
                          <h5 className={`text-sm font-medium ${colors.text} mb-2`}>
                            Recomendaciones:
                          </h5>
                          <ul className={`text-sm ${colors.text} space-y-1`}>
                            {alert.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start space-x-1">
                                <span>•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Acciones masivas */}
      {unreadCount > 0 && (
        <div className="flex justify-center pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              const unreadIds = alerts.filter(a => !a.isRead).map(a => a.id);
              unreadIds.forEach(id => onMarkAsRead(id));
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Marcar todas como leídas
          </button>
        </div>
      )}
    </div>
  );
};

export default SecurityAlertsPanel;
