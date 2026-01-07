# ✅ Checklist de Verificación - Sistema de Autenticación CorteSec

Este checklist te ayudará a verificar que el sistema de autenticación esté completamente funcional.

## 📋 Pre-Requisitos

### Backend
- [ ] PostgreSQL instalado y corriendo
- [ ] Python 3.8+ instalado
- [ ] Dependencias de backend instaladas (`pip install -r requirements.txt`)
- [ ] Migraciones aplicadas (`python manage.py migrate`)
- [ ] Base de datos creada
- [ ] Al menos una organización creada en la BD

### Frontend
- [ ] Node.js 18+ instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Archivo `.env` creado y configurado

## 🔧 Configuración Inicial

### Backend Configuration
- [ ] `SECRET_KEY` configurada
- [ ] `DEBUG` configurado apropiadamente
- [ ] `ALLOWED_HOSTS` incluye localhost
- [ ] `CORS_ALLOWED_ORIGINS` incluye http://localhost:5173
- [ ] Base de datos configurada correctamente
- [ ] `FRONTEND_URL` apunta a http://localhost:5173

### Frontend Configuration
- [ ] `.env` existe con `VITE_API_BASE_URL=http://localhost:8000`
- [ ] Todas las variables de entorno están configuradas
- [ ] Puerto 5173 está libre (o configurado alternativo)

### Email Configuration (Opcional para desarrollo)
- [ ] `DEBUG_EMAIL=True` para modo consola, o
- [ ] Credenciales SMTP configuradas si usarás emails reales
- [ ] `EMAIL_HOST_USER` y `EMAIL_HOST_PASSWORD` configurados (si aplica)

## 🏢 Organización Multitenant

### Crear Organización de Prueba
- [ ] Organización "cortesec" existe en la BD
- [ ] Código de organización: `cortesec`
- [ ] Estado activa: `True`

Crear desde Django shell:
```python
from core.models import Organizacion
org = Organizacion.objects.create(
    nombre="CorteSec",
    codigo="cortesec",
    activa=True
)
```

## 🚀 Servicios en Ejecución

### Verificar Servicios Activos
- [ ] Backend corriendo en http://localhost:8000
  - Verificar: Abrir http://localhost:8000/admin/
- [ ] Frontend corriendo en http://localhost:5173
  - Verificar: Abrir http://localhost:5173/login
- [ ] PostgreSQL activo
  - Verificar: `pg_ctl status` (Windows)

## 🔐 Pruebas de Funcionalidad

### 1. Login
- [ ] Página carga correctamente en `/login`
- [ ] Todos los campos son visibles
- [ ] Campo de organización está presente
- [ ] Validación funciona (emails inválidos, campos vacíos)
- [ ] Puedes iniciar sesión con credenciales de prueba:
  - Código: `cortesec`
  - Email: `admin@cortesec.com`
  - Password: `admin123`
- [ ] Después del login, redirige a `/dashboard`
- [ ] Error de credenciales incorrectas muestra mensaje apropiado
- [ ] Error de organización incorrecta muestra mensaje apropiado

### 2. Registro
- [ ] Página carga en `/register`
- [ ] Todos los campos son visibles
- [ ] Validación en tiempo real funciona
- [ ] Validación de contraseña funciona (12+ caracteres, mayúsculas, etc.)
- [ ] Mensajes de error aparecen bajo cada campo
- [ ] Banner informativo sobre multitenant es visible
- [ ] Checkbox de términos es obligatorio
- [ ] Al registrar usuario nuevo:
  - [ ] Muestra pantalla de éxito
  - [ ] Mensaje sobre verificación de email
  - [ ] Redirige a login después de 3 segundos
- [ ] Email de verificación se envía (o se muestra en consola backend si DEBUG_EMAIL=True)

### 3. Verificación de Email
- [ ] Link de verificación funciona
- [ ] Página de verificación muestra loader inicialmente
- [ ] Al verificar, muestra éxito con checkmark verde
- [ ] Redirige a login automáticamente
- [ ] Con link expirado/inválido, muestra error apropiado

### 4. Recuperación de Contraseña
- [ ] Link "¿Olvidaste tu contraseña?" funciona en login
- [ ] Página de forgot password carga en `/forgot-password`
- [ ] Requiere código de organización + email
- [ ] Al enviar, muestra pantalla de éxito
- [ ] Email de recuperación se envía (o consola)
- [ ] Link de recuperación funciona
- [ ] Página de reset password carga con uid y token
- [ ] Nueva contraseña tiene mismas validaciones que registro
- [ ] Al cambiar contraseña, muestra éxito
- [ ] Redirige a login
- [ ] Puede iniciar sesión con nueva contraseña

### 5. Dashboard
- [ ] Después del login, carga dashboard
- [ ] Muestra nombre del usuario
- [ ] Muestra información completa:
  - [ ] Username
  - [ ] Email
  - [ ] Estado de verificación de email
  - [ ] Nombre completo
  - [ ] Teléfono (si existe)
  - [ ] Organización
  - [ ] Rol (si existe)
- [ ] Botón de logout funciona
- [ ] Después de logout, redirige a login
- [ ] No puede acceder a dashboard sin estar autenticado

### 6. Protección de Rutas
- [ ] Sin autenticación, `/dashboard` redirige a `/login`
- [ ] Con autenticación, `/login` redirige a `/dashboard`
- [ ] Con autenticación, `/register` redirige a `/dashboard`
- [ ] Rutas inválidas redirigen a `/login`

## 🔒 Seguridad

### Headers de Petición
- [ ] Peticiones incluyen `Authorization: Token <token>`
- [ ] Peticiones incluyen `X-Tenant-Codigo: <codigo>`
- [ ] Backend valida ambos headers

### Validaciones
- [ ] Contraseña débil es rechazada
- [ ] Email duplicado es rechazado
- [ ] Username duplicado es rechazado
- [ ] Organización incorrecta es rechazada
- [ ] Token expirado causa logout automático

### Manejo de Errores
- [ ] Errores 401 causan logout + redirect a login
- [ ] Errores 403 muestran mensaje de acceso denegado
- [ ] Errores 500 muestran mensaje genérico
- [ ] Errores de red muestran mensaje apropiado
- [ ] Errores de validación muestran mensajes específicos

## 📧 Emails (Si SMTP está configurado)

### Verificar Emails
- [ ] Email de verificación llega a la bandeja
- [ ] Email tiene formato profesional
- [ ] Link en email funciona
- [ ] Email de recuperación llega
- [ ] Link de recuperación funciona
- [ ] Emails vienen del remitente correcto

## 🎨 UI/UX

### Diseño
- [ ] Todos los formularios se ven profesionales
- [ ] Colores son consistentes
- [ ] Iconos se muestran correctamente
- [ ] Botones tienen estados hover
- [ ] Loading spinners aparecen durante cargas
- [ ] Toasts de notificación funcionan
- [ ] Animaciones son suaves

### Responsividad
- [ ] Se ve bien en desktop (1920px)
- [ ] Se ve bien en laptop (1366px)
- [ ] Se ve bien en tablet (768px)
- [ ] Se ve bien en mobile (375px)

### Validación Visual
- [ ] Campos con error tienen borde rojo
- [ ] Mensajes de error son visibles
- [ ] Iconos de error aparecen
- [ ] Campos obligatorios están marcados con *

## 🚦 Estados de la Aplicación

### Loading States
- [ ] Login muestra "Iniciando sesión..."
- [ ] Registro muestra "Creando cuenta..."
- [ ] Forgot password muestra "Enviando..."
- [ ] Reset password muestra "Guardando..."
- [ ] Verify email muestra "Verificando..."

### Success States
- [ ] Login exitoso → Dashboard
- [ ] Registro exitoso → Pantalla de éxito
- [ ] Email enviado → Pantalla de confirmación
- [ ] Email verificado → Pantalla de éxito
- [ ] Contraseña cambiada → Pantalla de éxito

### Error States
- [ ] Credenciales incorrectas → Mensaje de error
- [ ] Email ya existe → Mensaje específico
- [ ] Token expirado → Mensaje y opciones
- [ ] Organización no existe → Mensaje claro

## 📱 Funcionalidades Específicas

### Multitenant
- [ ] Usuarios de diferentes organizaciones están aislados
- [ ] Intentar login con org incorrecta falla
- [ ] Header X-Tenant-Codigo se envía en cada petición
- [ ] Backend valida pertenencia a organización

### Remember Me
- [ ] Checkbox "Recordarme" funciona
- [ ] Estado se mantiene después de cerrar browser (si implementado)

### Password Visibility Toggle
- [ ] Icono de ojo funciona en login
- [ ] Icono de ojo funciona en registro
- [ ] Icono de ojo funciona en reset password
- [ ] Muestra/oculta contraseña correctamente

## 🔍 Consola del Navegador

### Sin Errores JavaScript
- [ ] No hay errores en consola de Chrome/Firefox
- [ ] No hay warnings críticos
- [ ] Network requests tienen status 200/201/401/403 apropiados

### Network Tab
- [ ] POST a `/api/auth/login/` funciona
- [ ] POST a `/api/auth/register/` funciona
- [ ] POST a `/api/auth/logout/` funciona
- [ ] Headers incluyen Authorization y X-Tenant-Codigo
- [ ] Responses tienen formato esperado

## 🧪 Casos de Prueba Adicionales

### Edge Cases
- [ ] ¿Qué pasa si ingreso espacios en username? (Debe rechazar)
- [ ] ¿Qué pasa si ingreso email en mayúsculas? (Debe normalizar)
- [ ] ¿Qué pasa si backend está down? (Mensaje de error)
- [ ] ¿Qué pasa si pierdo conexión a internet? (Mensaje apropiado)
- [ ] ¿Qué pasa si intento acceder a URL directa sin auth? (Redirect a login)

### Security Tests
- [ ] ¿Puedo acceder a dashboard sin token? (No)
- [ ] ¿Puedo acceder a datos de otra organización? (No - 403)
- [ ] ¿El token se invalida al logout? (Sí)
- [ ] ¿Contraseñas se muestran en Network tab? (No - están hasheadas)

## 📊 Performance

### Tiempos de Carga
- [ ] Login page carga en < 1 segundo
- [ ] Dashboard carga en < 2 segundos
- [ ] Transiciones son suaves
- [ ] No hay lag visible en formularios

## 📚 Documentación

### Archivos de Documentación
- [ ] README.md del frontend existe y es completo
- [ ] FEATURES.md documenta todas las características
- [ ] GETTING_STARTED.md tiene instrucciones claras
- [ ] SMTP_SETUP.md explica configuración de email
- [ ] Comentarios en código son claros

## ✨ Extras

### Mejoras Opcionales (No requeridas pero recomendadas)
- [ ] Implementar refresh tokens
- [ ] Agregar tests unitarios
- [ ] Implementar 2FA
- [ ] Agregar analytics
- [ ] Implementar rate limiting visual
- [ ] Agregar modo oscuro
- [ ] Implementar i18n (internacionalización)

---

## 🎯 Resultado Final

### Checklist Principal
- [ ] ✅ Puedo registrar un nuevo usuario
- [ ] ✅ Recibo email de verificación
- [ ] ✅ Puedo verificar mi email
- [ ] ✅ Puedo iniciar sesión
- [ ] ✅ Veo mi dashboard con datos
- [ ] ✅ Puedo cerrar sesión
- [ ] ✅ Puedo recuperar mi contraseña
- [ ] ✅ El sistema es multitenant (aislamiento entre organizaciones)
- [ ] ✅ La UI es profesional y responsiva
- [ ] ✅ No hay errores críticos

### Si Todo Está ✅
**¡Felicidades! Tu sistema de autenticación está completo y funcional.** 🎉

### Si Algo Falla
1. Revisa la consola del navegador
2. Revisa logs del backend
3. Verifica configuración (`.env`, `settings.py`)
4. Consulta la documentación
5. Verifica que todos los servicios estén corriendo

---

## 📞 Soporte

¿Algo no funciona? Revisa:
1. [GETTING_STARTED.md](./GETTING_STARTED.md) - Guía de inicio
2. [SMTP_SETUP.md](./SMTP_SETUP.md) - Configuración de email
3. [frontend/README.md](./frontend/README.md) - Documentación técnica
4. Logs del backend y frontend

---

© 2025 CorteSec - Checklist de Verificación v1.0
