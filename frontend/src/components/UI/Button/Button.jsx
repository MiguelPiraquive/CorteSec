import React from 'react';

export function Button({ children, variant = 'primary', icon: Icon, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition';
  const variants = {
    primary: 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 border border-indigo-200 hover:shadow-lg hover:brightness-105',
    light: 'text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100',
    danger: 'text-white bg-gradient-to-r from-rose-600 to-red-600 border border-rose-200 hover:shadow-lg',
    ghost: 'text-gray-700 bg-white border border-gray-200 hover:shadow',
  };
  const cls = `${base} ${variants[variant] || variants.primary} ${className}`;
  return (
    <button className={cls} {...props}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function IconButton({ title, variant = 'ghost', icon: Icon, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center p-2 rounded-full border transition';
  const variants = {
    ghost: 'text-gray-700 bg-white border-gray-200 hover:shadow',
    primary: 'text-white bg-indigo-600 border-indigo-600 hover:brightness-110',
  };
  const cls = `${base} ${variants[variant] || variants.ghost} ${className}`;
  return (
    <button className={cls} title={title} aria-label={title} {...props}>
      {Icon && <Icon className="w-4 h-4" />}
    </button>
  );
}
