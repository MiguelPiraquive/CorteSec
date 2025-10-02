import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Smartphone, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Shield, 
  LogOut,
  RefreshCw,
  CheckCircle,
  X
} from 'lucide-react';

const SecuritySessionManager = ({ 
  sessions = [], 
  onRefresh, 
  onTerminateSession,
  onTerminateAllOther,
  loading = false,
  error = null 
}) => {
  const [terminating, setTerminating] = useState(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
      case 'tablet':
        return <Smartphone className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getLocationString = (session) => {
    if (session.city && session.country) {
      return `${session.city}, ${session.country}`;
    }
    if (session.country) {
      return session.country;
    }
    return 'Ubicación desconocida';
  };

  const formatLastActive = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Activo ahora';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleTerminateSession = async (sessionId) => {
    setTerminating(prev => new Set(prev).add(sessionId));
    try {
      await onTerminateSession(sessionId);
    } catch (err) {
      // Error manejado por el componente padre
    } finally {
      setTerminating(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
      setShowConfirmDialog(null);
    }
  };

  const handleTerminateAllOther = async () => {
    setTerminating(prev => new Set(prev).add('all-other'));
    try {
      await onTerminateAllOther();
    } catch (err) {
      // Error manejado por el componente padre
    } finally {
      setTerminating(prev => {
        const newSet = new Set(prev);
        newSet.delete('all-other');
        return newSet;
      });
      setShowConfirmDialog(null);
    }
  };

  const getSuspiciousIndicators = (session) => {
    const indicators = [];
    
    // Ubicación inusual
    if (session.isNewLocation) {
      indicators.push('Nueva ubicación');
    }
    
    // Dispositivo nuevo
    if (session.isNewDevice) {
      indicators.push('Dispositivo nuevo');
    }
    
    // Múltiples intentos de login
    if (session.failedAttempts > 2) {
      indicators.push('Múltiples intentos fallidos');
    }
    
    // IP sospechosa
    if (session.isSuspiciousIP) {
      indicators.push('IP sospechosa');
    }

    return indicators;
  };

  const activeSession = sessions.find(s => s.isCurrent);
  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sesiones Activas</h3>
          <p className="text-sm text-gray-600">
            Gestiona los dispositivos que tienen acceso a tu cuenta
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Sesión actual */}
      {activeSession && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="text-green-600">
                {getDeviceIcon(activeSession.deviceType)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-green-900">
                    {activeSession.deviceName || activeSession.userAgent}
                  </h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sesión actual
                  </span>
                </div>
                
                <div className="space-y-1 mt-2 text-sm text-green-700">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{getLocationString(activeSession)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatLastActive(activeSession.lastActive)}</span>
                  </div>
                  <div className="text-xs text-green-600">
                    IP: {activeSession.ipAddress}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Otras sesiones */}
      {otherSessions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Otras sesiones</h4>
            {otherSessions.length > 1 && (
              <button
                onClick={() => setShowConfirmDialog('all-other')}
                disabled={terminating.has('all-other')}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Cerrar todas las demás
              </button>
            )}
          </div>

          <div className="space-y-3">
            {otherSessions.map((session) => {
              const suspiciousIndicators = getSuspiciousIndicators(session);
              const isSuspicious = suspiciousIndicators.length > 0;
              
              return (
                <div 
                  key={session.id}
                  className={`border rounded-lg p-4 ${
                    isSuspicious 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={isSuspicious ? 'text-red-600' : 'text-gray-600'}>
                        {getDeviceIcon(session.deviceType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className={`font-medium ${
                            isSuspicious ? 'text-red-900' : 'text-gray-900'
                          }`}>
                            {session.deviceName || session.userAgent}
                          </h5>
                          {isSuspicious && (
                            <Shield className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        
                        <div className={`space-y-1 mt-2 text-sm ${
                          isSuspicious ? 'text-red-700' : 'text-gray-600'
                        }`}>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{getLocationString(session)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatLastActive(session.lastActive)}</span>
                          </div>
                          <div className="text-xs">
                            IP: {session.ipAddress}
                          </div>
                        </div>

                        {/* Indicadores de sospecha */}
                        {suspiciousIndicators.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {suspiciousIndicators.map((indicator, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-1"
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {indicator}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowConfirmDialog(session.id)}
                      disabled={terminating.has(session.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isSuspicious
                          ? 'text-red-600 hover:bg-red-100'
                          : 'text-gray-600 hover:bg-gray-100'
                      } disabled:opacity-50`}
                    >
                      {terminating.has(session.id) ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estado sin sesiones */}
      {sessions.length === 1 && activeSession && (
        <div className="text-center py-8 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">Solo tienes una sesión activa</p>
        </div>
      )}

      {/* Dialog de confirmación */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmar acción
                </h3>
                <p className="text-sm text-gray-600">
                  {showConfirmDialog === 'all-other'
                    ? 'Se cerrarán todas las demás sesiones'
                    : 'Se cerrará esta sesión'}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (showConfirmDialog === 'all-other') {
                    handleTerminateAllOther();
                  } else {
                    handleTerminateSession(showConfirmDialog);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySessionManager;
