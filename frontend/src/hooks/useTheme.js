import { useCallback, useEffect } from 'react';
import { useAppStore } from '../store';

export const useTheme = () => {
  const { theme, setTheme } = useAppStore();

  // Aplicar el tema al documento
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // También actualizar el atributo data-bs-theme para Bootstrap
    root.setAttribute('data-bs-theme', theme);
    
    // Guardar en localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Función para alternar entre temas
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Función para establecer un tema específico
  const setSpecificTheme = useCallback((newTheme) => {
    setTheme(newTheme);
  }, [setTheme]);

  // Detectar preferencia del sistema
  const getSystemTheme = useCallback(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  return {
    theme,
    toggleTheme,
    setTheme: setSpecificTheme,
    getSystemTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };
};
