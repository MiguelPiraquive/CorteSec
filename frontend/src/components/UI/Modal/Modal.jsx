import React from 'react';

/*
  Reusable Modal
  Props:
  - isOpen: boolean
  - onClose: () => void
  - title?: string | ReactNode
  - tone?: 'indigo'|'teal'|'amber'|'blue'|'red'
  - size?: 'md'|'lg'|'xl'
  - children: ReactNode (modal body)
  - footer?: ReactNode
*/

const toneMap = {
  indigo: 'from-indigo-600 to-blue-600',
  teal: 'from-teal-600 to-emerald-600',
  amber: 'from-amber-600 to-orange-600',
  blue: 'from-blue-600 to-indigo-600',
  red: 'from-rose-600 to-red-600',
};

const sizeMap = {
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

export default function Modal({ isOpen, onClose, title, tone = 'indigo', size = 'md', children, footer }) {
  if (!isOpen) return null;
  const toneCls = toneMap[tone] || toneMap.indigo;
  const sizeCls = sizeMap[size] || sizeMap.md;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="min-h-full flex items-center justify-center p-4">
        <div className={`relative bg-white dark:bg-zinc-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all w-full ${sizeCls} border border-gray-200 dark:border-zinc-700`}>
          {title !== undefined && (
            <div className={`bg-gradient-to-r ${toneCls} px-6 py-4 text-white font-semibold`}>{title}</div>
          )}
          <div className="px-6 pt-6">
            {children}
          </div>
          {footer && (
            <div className="px-6 pb-6 flex justify-end gap-2">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
