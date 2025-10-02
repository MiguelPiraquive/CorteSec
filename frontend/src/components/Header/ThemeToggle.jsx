import React from 'react';
import { useAppStore } from '../../store';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useAppStore();
  const darkMode = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative p-3 text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-amber-50 dark:focus:bg-amber-900/30 rounded-2xl transition-all duration-150 ease-out group overflow-hidden"
      aria-label={`Cambiar a tema ${darkMode ? 'claro' : 'oscuro'}`}
    >
      {/* Background glow effect fluido */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-200/0 via-amber-200/15 to-amber-200/0 dark:from-amber-400/0 dark:via-amber-400/15 dark:to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      
      {/* Sol - aparece cuando darkMode = TRUE (ilumina el modo oscuro) */}
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${darkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-180 scale-90'}`}>
        <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
      
      {/* Luna - aparece cuando darkMode = FALSE (representa la noche) */}
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${darkMode ? 'opacity-0 -rotate-180 scale-90' : 'opacity-100 rotate-0 scale-100'}`}>
        <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </div>
      
      {/* Ring effect suave */}
      <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/0 group-hover:border-amber-400/25 transition-all duration-300"></div>
      
      {/* Particles effect ultra sutil */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute top-1 right-1 w-1 h-1 bg-amber-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-1 left-1 w-1 h-1 bg-amber-400 rounded-full animate-ping animation-delay-75"></div>
      </div>
      
      {/* Resplandor central premium */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-radial from-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${darkMode ? 'from-blue-400/10' : 'from-amber-400/10'}`}></div>
    </button>
  );
};

export default ThemeToggle;
