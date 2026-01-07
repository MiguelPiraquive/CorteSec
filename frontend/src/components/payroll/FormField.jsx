// Componente FormField - Campo de formulario reutilizable
import React from 'react';
import { clsx } from 'clsx';

export const FormField = ({
  label,
  error,
  helper,
  helpText, // Agregar para capturarlo y evitar que se pase al DOM
  required,
  className,
  ...props
}) => {
  // Usar helper o helpText (son el mismo concepto)
  const helperText = helper || helpText;
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={clsx(
          'block w-full rounded-md shadow-sm border-gray-300',
          'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export const SelectField = ({
  label,
  error,
  helper,
  helpText, // Agregar para capturarlo
  required,
  options,
  className,
  ...props
}) => {
  const helperText = helper || helpText;
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={clsx(
          'block w-full rounded-md shadow-sm border-gray-300',
          'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      >
        <option value="">Seleccionar...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export const TextAreaField = ({
  label,
  error,
  helper,
  helpText, // Agregar para capturarlo
  required,
  className,
  ...props
}) => {
  const helperText = helper || helpText;
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={clsx(
          'block w-full rounded-md shadow-sm border-gray-300',
          'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
