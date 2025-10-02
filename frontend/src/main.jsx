import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import App from './App'; // Usar App original

// Import styles - ORDEN CORRECTO: Bootstrap primero, luego compatibilidad
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/tailwind.css';  // ⚡ ARCHIVO PRINCIPAL CON @tailwind directives
import './styles/layout.css';  // ✅ Estilos del layout
import './styles/tailwind-bootstrap-compat.css';  // ✅ Compatibilidad al final

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Variable para almacenar el root y evitar duplicados
let reactRoot = null;

// Initialize React app
function initializeApp() {
  const container = document.getElementById('react-root');
  
  if (container && !reactRoot) {
    reactRoot = createRoot(container);
    
    reactRoot.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <App />
          </BrowserRouter>
          {window.CorteSec?.debug && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </React.StrictMode>
    );
    
    // Hide loading spinner
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
      setTimeout(() => {
        loadingSpinner.style.display = 'none';
      }, 500);
    }
  }
}

// Initialize when DOM is ready - solo una vez
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Hot module replacement para desarrollo - evitar duplicados
if (import.meta.hot) {
  import.meta.hot.accept('./App', () => {
    // Solo reload si es necesario, sin recrear el root
    if (reactRoot) {
      reactRoot.render(
        <React.StrictMode>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <App />
            </BrowserRouter>
            {window.CorteSec?.debug && <ReactQueryDevtools initialIsOpen={false} />}
          </QueryClientProvider>
        </React.StrictMode>
      );
    }
  });
}

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
