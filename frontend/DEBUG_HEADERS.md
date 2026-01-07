# 🔍 Debug: Verificación de Headers de Tenant

## Problema Resuelto
El `payrollService.ts` estaba creando su propia instancia de axios sin los headers de tenant (`X-Tenant-Codigo`, `X-Tenant-Slug`).

## Solución Aplicada
✅ Cambiado `payrollService.ts` para usar `api.js` centralizado que incluye:
- `X-Tenant-Codigo`
- `X-Tenant-Slug`  
- `Authorization: Token`

## Para Verificar que Funciona:

### 1. Recargar navegador (IMPORTANTE)
```
Ctrl + Shift + R  (Chrome/Edge)
Ctrl + F5         (Firefox)
```

### 2. Abrir DevTools Console (F12) y ejecutar:
```javascript
// Verificar localStorage
console.log('🔑 Auth Token:', localStorage.getItem('authToken') ? '✅ Presente' : '❌ Falta');
console.log('🏢 Tenant Code:', localStorage.getItem('tenantCode'));
console.log('🏷️ Tenant Slug:', localStorage.getItem('tenantSlug'));

// Test manual de API
fetch('http://localhost:8000/api/payroll/empleados/?page_size=1', {
  headers: {
    'Authorization': `Token ${localStorage.getItem('authToken')}`,
    'X-Tenant-Codigo': localStorage.getItem('tenantCode'),
    'X-Tenant-Slug': localStorage.getItem('tenantSlug'),
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log('✅ API Response:', d))
.catch(e => console.error('❌ API Error:', e));
```

### 3. Verificar Network Tab
En DevTools → Network → selecciona cualquier request a `/api/payroll/`:
- ✅ Debe mostrar `X-Tenant-Codigo` en Request Headers
- ✅ Debe mostrar `X-Tenant-Slug` en Request Headers
- ✅ Status debe ser 200 (no 400)

## Archivos Modificados:
- ✅ `frontend/src/services/payrollService.ts`
  - Eliminado: `import axios from 'axios'`
  - Eliminado: `const api = axios.create(...)`
  - Agregado: `import api from './api'`
  - Eliminado: Interceptors personalizados (ya están en api.js)

## Estado Actual:
- ✅ Sin errores de compilación TypeScript
- ✅ payrollService.ts usa api.js centralizado
- ✅ api.js incluye headers de tenant automáticamente
- ⏳ Pendiente: Recargar navegador para aplicar cambios

## Si Sigue Fallando:
1. Verificar que el backend esté corriendo: `http://localhost:8000/admin`
2. Verificar que estés logueado con un usuario que tenga organización
3. Hacer logout y login nuevamente para refrescar tokens
4. Verificar en consola del navegador los valores de localStorage

## Logs del Backend a Ignorar:
Los errores "Acceso a API sin organización" que viste son de requests **ANTES** del fix. Después de recargar el navegador, deberían desaparecer.
