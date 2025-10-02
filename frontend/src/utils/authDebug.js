/**
 * Script de debug para verificar el estado de autenticación
 * Ejecutar en la consola del navegador
 */

window.debugAuth = () => {
  console.group('🔐 CorteSec Auth Debug');
  
  // Verificar tokens en localStorage
  const authToken = localStorage.getItem('authToken');
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('📦 LocalStorage:');
  console.log('  authToken:', authToken ? `✅ ${authToken.substring(0, 20)}...` : '❌ No presente');
  console.log('  token:', token ? `✅ ${token.substring(0, 20)}...` : '❌ No presente');
  console.log('  user:', user ? '✅ Presente' : '❌ No presente');
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      console.log('  user data:', userData);
    } catch (e) {
      console.log('  user data: ❌ Formato inválido');
    }
  }
  
  // Verificar cookies
  console.log('🍪 Cookies relevantes:');
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && (key.includes('csrf') || key.includes('token') || key.includes('auth'))) {
      acc[key] = value;
    }
    return acc;
  }, {});
  console.log(cookies);
  
  // Probar request con token actual
  const testToken = authToken || token;
  if (testToken) {
    console.log('🧪 Probando token actual...');
    
    fetch('http://localhost:8000/api/dashboard/metrics/', {
      headers: {
        'Authorization': `Token ${testToken}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
    .then(response => {
      console.log(`📡 Test API Response: ${response.status} ${response.statusText}`);
      if (response.ok) {
        console.log('✅ Token funciona correctamente');
        return response.json();
      } else {
        console.log('❌ Token no funciona');
        return response.text();
      }
    })
    .then(data => {
      console.log('📄 Response data:', data);
    })
    .catch(error => {
      console.log('❌ Error en test:', error);
    });
  } else {
    console.log('❌ No hay token para probar');
  }
  
  console.groupEnd();
};

// También agregar al objeto global CorteSec si existe
if (window.CorteSec) {
  window.CorteSec.debugAuth = window.debugAuth;
}

console.log('🔧 Debug de autenticación cargado. Ejecuta debugAuth() en la consola.');
