# 🚀 Guía de Inicio Rápido - CorteSec Frontend

Esta guía te ayudará a poner en marcha el sistema de autenticación completo de CorteSec.

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener:

- ✅ **Node.js 18+** instalado ([Descargar](https://nodejs.org/))
- ✅ **Python 3.8+** instalado
- ✅ **PostgreSQL** instalado y corriendo
- ✅ **Backend CorteSec** configurado y funcional

## 🔥 Inicio Rápido (5 minutos)

### Paso 1: Instalar Dependencias del Frontend

```powershell
cd frontend
npm install
```

### Paso 2: Configurar Variables de Entorno

```powershell
# Copiar archivo de ejemplo
copy .env.example .env
```

El archivo `.env` ya viene con la configuración por defecto para desarrollo local. No necesitas modificarlo si el backend corre en `localhost:8000`.

### Paso 3: Iniciar Frontend

```powershell
npm run dev
```

✅ El frontend estará disponible en: **http://localhost:5173**

### Paso 4: Iniciar Backend (en otra terminal)

```powershell
cd backend
python manage.py runserver
```

✅ El backend estará disponible en: **http://localhost:8000**

## 🎯 Probar el Sistema

### Opción 1: Usar Credenciales de Prueba

1. Abre http://localhost:5173/login
2. Ingresa:
   - **Código Organización:** `cortesec`
   - **Email:** `admin@cortesec.com`
   - **Password:** `admin123`
3. ¡Listo! Deberías estar en el dashboard

### Opción 2: Crear Nueva Cuenta

1. Abre http://localhost:5173/register
2. Completa el formulario:
   - **Código Organización:** `cortesec` (o el de tu organización)
   - **Nombre de Usuario:** Tu username único
   - **Email:** Tu email
   - **Nombre y Apellido**
   - **Teléfono** (opcional)
   - **Contraseña:** Mínimo 12 caracteres con mayúsculas, minúsculas, números y símbolos
3. Acepta términos y condiciones
4. Haz clic en "Crear Cuenta"
5. **Importante:** Revisa tu email para verificar tu cuenta

## 📧 Configurar SMTP (Para emails reales)

Por defecto, el backend está en modo `DEBUG_EMAIL=True`, lo que significa que los emails se imprimen en la consola del backend en lugar de enviarse.

### Para Enviar Emails Reales:

1. Lee la guía completa en [SMTP_SETUP.md](./SMTP_SETUP.md)
2. Edita `backend/.env`:

```env
DEBUG_EMAIL=False
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-contraseña-de-aplicacion
```

3. Reinicia el backend

## 🏢 Configuración Multitenant

### ¿Qué es Multitenant?

Cada organización tiene su propio espacio aislado. Los usuarios de una organización no pueden acceder a los datos de otra.

### Crear una Nueva Organización

Desde el backend Django admin o shell:

```python
python manage.py shell

from core.models import Organizacion

org = Organizacion.objects.create(
    nombre="Mi Empresa",
    codigo="mi-empresa",  # Este es el código que usarán en el login
    activa=True
)
```

### Usar la Organización en el Frontend

Los usuarios deben ingresar el **código de organización** en:
- Login
- Registro
- Recuperación de contraseña

Ejemplo: Si creaste una org con código `"mi-empresa"`, los usuarios deben usar ese código.

## 📱 Estructura de Rutas

| Ruta | Descripción | Requiere Auth |
|------|-------------|---------------|
| `/login` | Página de inicio de sesión | No |
| `/register` | Página de registro | No |
| `/forgot-password` | Solicitar recuperación | No |
| `/reset-password/:uid/:token` | Restablecer contraseña | No |
| `/verificar-email/:uid/:token` | Verificar email | No |
| `/dashboard` | Panel principal | Sí |

## 🔒 Flujo de Autenticación

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ├──> Login (con código org) ──────────────┐
       │                                          │
       ├──> Register (con código org) ────┐      │
       │                                    │     │
       └──> Forgot Password ───────────────┤     │
                                            │     │
                                            ▼     ▼
                                    ┌──────────────┐
                                    │   Backend    │
                                    │  (Django)    │
                                    └──────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            ┌───────────┐          ┌───────────┐         ┌──────────┐
            │  Valida   │          │  Envía    │         │  Genera  │
            │  Tenant   │          │  Email    │         │  Token   │
            └───────────┘          └───────────┘         └──────────┘
                    │                      │                      │
                    └──────────────────────┴──────────────────────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │   Frontend   │
                                    │ (Dashboard)  │
                                    └──────────────┘
```

## 🛠️ Comandos Útiles

### Frontend

```powershell
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview

# Lint
npm run lint
```

### Backend

```powershell
# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Shell de Django
python manage.py shell

# Ejecutar tests
python manage.py test
```

## 🔍 Verificar que Todo Funciona

### Checklist de Verificación

- [ ] Frontend carga en http://localhost:5173
- [ ] Backend corre en http://localhost:8000
- [ ] Puedes ver la página de login
- [ ] Puedes registrar un nuevo usuario
- [ ] Recibes/ves el email de verificación
- [ ] Puedes verificar el email
- [ ] Puedes iniciar sesión
- [ ] Ves el dashboard con tu información
- [ ] Puedes cerrar sesión

## 🐛 Solución de Problemas Comunes

### Error: "Cannot find module"
```powershell
cd frontend
rm -rf node_modules
npm install
```

### Error: CORS / 403 Forbidden
Verifica que el backend tenga configurado:
```python
# backend/contractor_management/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

### Error: "Organization not found"
Crea la organización en el backend:
```python
python manage.py shell
from core.models import Organizacion
Organizacion.objects.create(nombre="CorteSec", codigo="cortesec", activa=True)
```

### Error: Puerto 5173 en uso
```powershell
# Cambia el puerto en vite.config.js
server: {
  port: 5174, // o cualquier otro puerto
}
```

### Backend no conecta a la base de datos
Verifica que PostgreSQL esté corriendo:
```powershell
# Windows
pg_ctl status

# Si no está corriendo
pg_ctl start
```

## 📚 Documentación Adicional

- [Frontend README](./frontend/README.md) - Documentación completa del frontend
- [SMTP Setup](./SMTP_SETUP.md) - Configuración de email
- [Backend API](http://localhost:8000/api/docs/) - Documentación de APIs (cuando el backend esté corriendo)

## 🎨 Personalización

### Cambiar Colores del Tema

Edita `frontend/tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#eff6ff',
        // ... cambia estos valores
        600: '#2563eb', // Color principal
      },
    },
  },
}
```

### Cambiar Logo

Reemplaza el componente de icono en las páginas de auth con tu logo:

```jsx
// En LoginPage.jsx, RegisterPage.jsx, etc.
<img src="/tu-logo.png" alt="Logo" className="w-20 h-20 mb-4" />
```

## 🚀 Deploy a Producción

### Frontend (Netlify/Vercel)

1. Conecta tu repositorio
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Variables de entorno:
   ```
   VITE_API_BASE_URL=https://tu-api.com
   ```

### Backend (Render/Railway)

1. Configura variables de entorno
2. Ejecuta migraciones
3. Crea superusuario
4. Actualiza `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS`

## 💡 Consejos Pro

1. **Usa Redux o Zustand** para un state management más robusto
2. **Implementa refresh tokens** para mejor seguridad
3. **Agrega tests** con Jest y React Testing Library
4. **Usa React Query** para mejor manejo de cache
5. **Implementa lazy loading** para mejor performance

## 🤝 Contribuir

¿Encontraste un bug o tienes una mejora?

1. Crea un issue
2. Haz un fork
3. Crea una rama (`git checkout -b feature/mejora`)
4. Commit tus cambios (`git commit -am 'Agrega mejora'`)
5. Push a la rama (`git push origin feature/mejora`)
6. Crea un Pull Request

## 📞 Soporte

¿Necesitas ayuda? Contacta al equipo de desarrollo.

---

**¡Listo!** Ya tienes un sistema de autenticación completo y profesional funcionando. 🎉

© 2025 CorteSec
