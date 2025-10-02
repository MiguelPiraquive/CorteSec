import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const PasswordStrengthIndicator = ({ password }) => {
  const [strength, setStrength] = useState({ score: 0, feedback: [] });

  useEffect(() => {
    const calculateStrength = (pwd) => {
      let score = 0;
      const feedback = [];

      if (pwd.length >= 8) {
        score += 1;
      } else {
        feedback.push('Mínimo 8 caracteres');
      }

      if (pwd.length >= 12) {
        score += 1;
      } else if (pwd.length >= 8) {
        feedback.push('Se recomienda 12+ caracteres');
      }

      if (/[a-z]/.test(pwd)) {
        score += 1;
      } else {
        feedback.push('Incluir minúsculas');
      }

      if (/[A-Z]/.test(pwd)) {
        score += 1;
      } else {
        feedback.push('Incluir mayúsculas');
      }

      if (/[0-9]/.test(pwd)) {
        score += 1;
      } else {
        feedback.push('Incluir números');
      }

      if (/[^a-zA-Z0-9]/.test(pwd)) {
        score += 1;
      } else {
        feedback.push('Incluir símbolos (!@#$%^&*)');
      }

      // Penalty for common patterns
      if (/(.)\1{2,}/.test(pwd)) {
        score -= 1;
        feedback.push('Evitar caracteres repetidos');
      }

      if (/123|abc|qwe|password|admin/i.test(pwd)) {
        score -= 2;
        feedback.push('Evitar patrones comunes');
      }

      return { score: Math.max(0, Math.min(5, score)), feedback };
    };

    setStrength(calculateStrength(password));
  }, [password]);

  const getStrengthColor = () => {
    if (strength.score <= 2) return 'bg-red-500';
    if (strength.score <= 3) return 'bg-yellow-500';
    if (strength.score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength.score <= 2) return 'Débil';
    if (strength.score <= 3) return 'Regular';
    if (strength.score <= 4) return 'Buena';
    return 'Muy Fuerte';
  };

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Barra de fortaleza */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${
          strength.score <= 2 ? 'text-red-600' :
          strength.score <= 3 ? 'text-yellow-600' :
          strength.score <= 4 ? 'text-blue-600' : 'text-green-600'
        }`}>
          {getStrengthText()}
        </span>
      </div>

      {/* Feedback de mejoras */}
      {strength.feedback.length > 0 && (
        <div className="text-xs text-gray-600 space-y-1">
          {strength.feedback.map((item, index) => (
            <div key={index} className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Criterios de seguridad */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className={`flex items-center space-x-1 ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
          <CheckCircle className="w-3 h-3" />
          <span>8+ caracteres</span>
        </div>
        <div className={`flex items-center space-x-1 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
          <CheckCircle className="w-3 h-3" />
          <span>Mayúsculas</span>
        </div>
        <div className={`flex items-center space-x-1 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
          <CheckCircle className="w-3 h-3" />
          <span>Minúsculas</span>
        </div>
        <div className={`flex items-center space-x-1 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
          <CheckCircle className="w-3 h-3" />
          <span>Números</span>
        </div>
        <div className={`flex items-center space-x-1 ${/[^a-zA-Z0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
          <CheckCircle className="w-3 h-3" />
          <span>Símbolos</span>
        </div>
        <div className={`flex items-center space-x-1 ${password.length >= 12 ? 'text-green-600' : 'text-gray-400'}`}>
          <CheckCircle className="w-3 h-3" />
          <span>12+ caracteres</span>
        </div>
      </div>
    </div>
  );
};

const SecurePasswordInput = ({ 
  label, 
  name, 
  value, 
  onChange, 
  placeholder,
  showStrengthIndicator = false,
  error,
  disabled = false
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            block w-full px-4 py-3 border rounded-lg shadow-sm pr-12
            transition-colors duration-200 focus:ring-2 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            dark:focus:border-blue-400 dark:focus:ring-blue-400
          `}
        />
        
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-1 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {showStrengthIndicator && (
        <PasswordStrengthIndicator password={value} />
      )}
    </div>
  );
};

export default SecurePasswordInput;
export { PasswordStrengthIndicator };
