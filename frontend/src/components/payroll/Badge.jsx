// Componente Badge - Estados y etiquetas
import React from 'react';
import { clsx } from 'clsx';

const variantStyles = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const Badge = ({
  variant = 'default',
  children,
  className,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

// Badge específico para estados de nómina
export const EstadoNominaBadge = ({ estado, className }) => {
  const variants = {
    borrador: 'warning',
    aprobada: 'info',
    pagada: 'success',
    anulada: 'error',
  };

  const labels = {
    borrador: 'Borrador',
    aprobada: 'Aprobada',
    pagada: 'Pagada',
    anulada: 'Anulada',
  };

  return (
    <Badge variant={variants[estado]} className={className}>
      {labels[estado]}
    </Badge>
  );
};

// Badge específico para estados de nómina electrónica
export const EstadoNominaElectronicaBadge = ({
  estado,
  className,
}) => {
  const variants = {
    borrador: 'default',
    generado: 'warning',
    firmado: 'info',
    enviado: 'info',
    aceptado: 'success',
    rechazado: 'error',
  };

  const labels = {
    borrador: 'Borrador',
    generado: 'XML Generado',
    firmado: 'Firmado',
    enviado: 'Enviado a DIAN',
    aceptado: '✓ Aceptado DIAN',
    rechazado: '✗ Rechazado DIAN',
  };

  return (
    <Badge variant={variants[estado]} className={className}>
      {labels[estado]}
    </Badge>
  );
};
