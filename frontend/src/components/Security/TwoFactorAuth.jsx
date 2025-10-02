import React, { useState, useEffect, useRef } from 'react';
import { Shield, Smartphone, Mail, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const TwoFactorAuth = ({ 
  isEnabled = false, 
  onEnable, 
  onDisable, 
  onVerify, 
  loading = false,
  error = null
}) => {
  const [step, setStep] = useState('setup'); // setup, verify, success
  const [method, setMethod] = useState('email'); // email, sms, app
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (step === 'verify' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, timeLeft]);

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Solo números

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Solo el último dígito
    setCode(newCode);

    // Auto-focus al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verificar cuando esté completo
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (verificationCode) => {
    try {
      await onVerify(verificationCode, method);
      setStep('success');
    } catch (err) {
      // El error se maneja en el componente padre
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await onEnable(method);
      setTimeLeft(300);
      setCode(['', '', '', '', '', '']);
    } catch (err) {
      // Error manejado por el padre
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isEnabled && step !== 'setup') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">
            Autenticación de dos factores activada
          </span>
        </div>
        <p className="text-green-700 text-sm mt-1">
          Tu cuenta está protegida con verificación adicional.
        </p>
        <button
          onClick={onDisable}
          disabled={loading}
          className="mt-3 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Desactivar 2FA
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          Autenticación de Dos Factores
        </h3>
        <p className="text-gray-600 text-sm mt-2">
          Agrega una capa extra de seguridad a tu cuenta
        </p>
      </div>

      {step === 'setup' && (
        <>
          {/* Métodos de verificación */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Elige tu método de verificación:</h4>
            
            <div className="grid gap-3">
              <button
                onClick={() => setMethod('email')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  method === 'email' 
                    ? 'border-blue-500 bg-blue-50 text-blue-900' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Correo electrónico</div>
                    <div className="text-sm text-gray-600">
                      Recibe códigos de verificación por email
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMethod('sms')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  method === 'sms' 
                    ? 'border-blue-500 bg-blue-50 text-blue-900' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5" />
                  <div>
                    <div className="font-medium">SMS</div>
                    <div className="text-sm text-gray-600">
                      Recibe códigos por mensaje de texto
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Botón de activación */}
          <button
            onClick={() => {
              onEnable(method);
              setStep('verify');
            }}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Enviando código...</span>
              </div>
            ) : (
              'Activar 2FA'
            )}
          </button>
        </>
      )}

      {step === 'verify' && (
        <>
          {/* Instrucciones */}
          <div className="text-center">
            <p className="text-gray-600">
              Hemos enviado un código de 6 dígitos a tu {method === 'email' ? 'correo' : 'teléfono'}.
              Ingrésalo a continuación:
            </p>
          </div>

          {/* Inputs del código */}
          <div className="flex justify-center space-x-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              />
            ))}
          </div>

          {/* Timer y reenvío */}
          <div className="text-center space-y-2">
            {timeLeft > 0 ? (
              <p className="text-sm text-gray-600">
                El código expira en: <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
              </p>
            ) : (
              <p className="text-sm text-red-600">El código ha expirado</p>
            )}

            <button
              onClick={handleResendCode}
              disabled={isResending || timeLeft > 240} // Permitir reenvío después de 1 minuto
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <div className="flex items-center justify-center space-x-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Reenviando...</span>
                </div>
              ) : (
                'Reenviar código'
              )}
            </button>
          </div>
        </>
      )}

      {step === 'success' && (
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-green-900">¡2FA Activado!</h4>
            <p className="text-green-700 text-sm mt-1">
              Tu cuenta ahora está protegida con autenticación de dos factores.
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth;
