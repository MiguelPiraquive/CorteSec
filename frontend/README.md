# CorteSec Frontend - Sistema de Autenticación

Frontend completo y profesional para el sistema CorteSec con soporte **multitenant**, desarrollado con React + Vite.

## 🚀 Características Principales

### ✅ Sistema de Autenticación Completo
- **Login** con validación y seguridad avanzada
- **Registro** de usuarios con validación robusta
- **Recuperación de contraseña** con envío de email SMTP
- **Verificación de email** obligatoria
- **Manejo de sesiones** con tokens
- **Rate limiting** y protección contra ataques

### 🏢 Soporte Multitenant
- Cada organización tiene su **espacio aislado**
- Header `X-Tenant-Codigo` en todas las peticiones
- Validación de tenant en login y registro
- Contexto de tenant global en la aplicación

### 🎨 UI/UX Profesional
- Diseño moderno con **Tailwind CSS**
- Componentes responsivos
- Validación en tiempo real con **Formik + Yup**
- Notificaciones toast con **React Toastify**
- Iconos con **Lucide React**

### 🔒 Seguridad
- Validación de contraseñas robustas (12+ caracteres)
- Tokens de autenticación seguros
- Headers de seguridad configurados
- Protección CSRF
- Rate limiting en backend

## 📋 Requisitos Previos

- **Node.js** 18+ y npm
- **Backend** CorteSec corriendo en `http://localhost:8000`
- Variables de entorno configuradas

## 🛠️ Instalación

### 1. Clonar e instalar dependencias

```bash
cd frontend
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
copy .env.example .env
```

Edita `.env` con tu configuración:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000

# Frontend Configuration
VITE_APP_NAME=CorteSec
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_2FA=true
VITE_ENABLE_EMAIL_VERIFICATION=true
```

### 3. Iniciar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: `http://localhost:5173`

## 🏗️ Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   └── auth/           # Componentes de autenticación
│   │       ├── PrivateRoute.jsx
│   │       └── PublicRoute.jsx
│   ├── context/            # Contextos de React
│   │   ├── AuthContext.jsx
│   │   └── TenantContext.jsx
│   ├── pages/              # Páginas principales
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   └── VerifyEmailPage.jsx
│   │   └── DashboardPage.jsx
│   ├── services/           # Servicios API
│   │   ├── api.js
│   │   └── authService.js
│   ├── App.jsx             # Componente principal
│   ├── main.jsx            # Punto de entrada
│   └── index.css           # Estilos globales
├── public/                 # Archivos estáticos
├── .env                    # Variables de entorno
├── .env.example            # Ejemplo de variables
├── index.html              # HTML principal
├── package.json            # Dependencias
├── vite.config.js          # Configuración Vite
├── tailwind.config.js      # Configuración Tailwind
└── postcss.config.js       # Configuración PostCSS
```

## 🔐 Flujo de Autenticación Multitenant

### 1. Login
```
Usuario ingresa:
  - Código de Organización (ej: "cortesec")
  - Email
  - Contraseña
    ↓
Frontend almacena tenant code
    ↓
Todas las peticiones incluyen header: X-Tenant-Codigo
    ↓
Backend valida que el usuario pertenece a esa organización
    ↓
Login exitoso → Redirige a dashboard
```

### 2. Registro
```
Usuario ingresa:
  - Código de Organización
  - Datos personales
  - Email
  - Contraseña (validación robusta)
    ↓
Backend crea usuario asociado a la organización
    ↓
Email de verificación enviado vía SMTP
    ↓
Usuario debe verificar email antes de poder usar el sistema
```

### 3. Recuperación de Contraseña
```
Usuario ingresa:
  - Código de Organización
  - Email
    ↓
Backend envía email con enlace de recuperación
    ↓
Usuario hace clic en enlace
    ↓
Define nueva contraseña
    ↓
Puede iniciar sesión nuevamente
```

## 🌐 Endpoints API Utilizados

### Autenticación
- `POST /api/auth/login/` - Iniciar sesión
- `POST /api/auth/logout/` - Cerrar sesión
- `POST /api/auth/register/` - Registrar usuario
- `GET /api/auth/profile/` - Obtener perfil
- `PUT /api/auth/profile/update/` - Actualizar perfil

### Recuperación
- `POST /api/auth/password-reset/` - Solicitar recuperación
- `POST /api/auth/password-reset/confirm/` - Confirmar nueva contraseña

### Verificación
- `POST /api/auth/verify-email/<uid>/<token>/` - Verificar email
- `POST /api/auth/resend-verification/` - Reenviar email

## 🎯 Credenciales de Prueba

Para testing en desarrollo:

```
Código Organización: cortesec
Email: admin@cortesec.com
Password: admin123
```

## 🚀 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo

# Producción
npm run build        # Construye para producción
npm run preview      # Preview de build de producción

# Linting
npm run lint         # Ejecuta ESLint
```

## 🔧 Configuración de Producción

### Variables de Entorno (Producción)

```env
VITE_API_BASE_URL=https://api.tu-dominio.com
VITE_API_TIMEOUT=30000
```

### Build para Producción

```bash
npm run build
```

Los archivos optimizados estarán en `dist/`

### Deploy (Ejemplo con Netlify)

1. Conecta tu repositorio
2. Configura build command: `npm run build`
3. Configura publish directory: `dist`
4. Configura variables de entorno
5. Deploy 🚀

## 📱 Responsividad

La aplicación es completamente responsiva:
- ✅ Desktop (1920px+)
- ✅ Laptop (1024px+)
- ✅ Tablet (768px+)
- ✅ Mobile (320px+)

## 🔒 Seguridad Implementada

### Frontend
- ✅ Validación de inputs con Yup
- ✅ Sanitización de datos
- ✅ Protección contra XSS
- ✅ Headers de seguridad
- ✅ Token en localStorage (puede mejorarse con httpOnly cookies)

### Backend Integration
- ✅ CORS configurado
- ✅ CSRF tokens
- ✅ Rate limiting
- ✅ Headers multitenant obligatorios
- ✅ Validación de tenant en cada request

## 🐛 Troubleshooting

### Problema: Error de CORS
**Solución:** Verifica que el backend tenga configurado:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    # ... otros orígenes
]
```

### Problema: 403 Forbidden
**Solución:** Asegúrate de que el código de organización sea correcto y que el usuario pertenezca a esa organización.

### Problema: Email no llega
**Solución:** 
1. Verifica configuración SMTP en backend
2. Revisa carpeta de spam
3. En desarrollo, usa `DEBUG_EMAIL=True` para ver emails en consola

### Problema: Token expirado
**Solución:** El backend tiene tokens con duración limitada. Reloguea o implementa refresh tokens.

## 📚 Tecnologías Utilizadas

- **React 18** - Framework UI
- **Vite** - Build tool y dev server
- **React Router DOM** - Enrutamiento
- **Axios** - Cliente HTTP
- **Formik** - Manejo de formularios
- **Yup** - Validación de esquemas
- **Tailwind CSS** - Framework CSS
- **React Toastify** - Notificaciones
- **Lucide React** - Iconos

## 🤝 Integración con Backend

Este frontend está diseñado específicamente para integrarse con el backend CorteSec Django.

### Headers Requeridos
```javascript
{
  'Authorization': 'Token <auth-token>',
  'X-Tenant-Codigo': '<organization-code>',
  'Content-Type': 'application/json'
}
```

### Formato de Respuestas
```javascript
// Success
{
  "success": true,
  "message": "Mensaje de éxito",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "Mensaje de error",
  "errors": { ... }
}
```

## 📝 Próximas Mejoras

- [ ] Implementar 2FA (Two-Factor Authentication)
- [ ] Refresh tokens automáticos
- [ ] Modo offline con service workers
- [ ] Internacionalización (i18n)
- [ ] Temas claro/oscuro
- [ ] Tests unitarios y E2E
- [ ] Analytics y tracking

## 📄 Licencia

© 2025 CorteSec. Todos los derechos reservados.

## 👥 Soporte

Para soporte técnico o preguntas, contacta al equipo de desarrollo.

---

**Nota:** Este es un sistema multitenant profesional. Cada organización debe tener su código único configurado en el backend antes de poder registrar usuarios.
