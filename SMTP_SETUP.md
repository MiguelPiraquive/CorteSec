# Configuración SMTP para CorteSec Backend

## 🚨 ACTUALIZACIÓN IMPORTANTE

### ✅ Problema de Organización SOLUCIONADO

**Problema original:** El backend NO validaba que el usuario perteneciera a la organización especificada.

**Solución implementada:** Ahora el login valida:
1. ✅ Organización existe y está activa
2. ✅ Credenciales correctas
3. ✅ **Usuario pertenece a esa organización** ← NUEVO

Ver [GMAIL_SETUP_FIXED.md](./GMAIL_SETUP_FIXED.md) para más detalles.

---

## 📧 Configuración de Email para Producción

Para que el sistema de registro y recuperación de contraseña funcione correctamente, debes configurar el servidor SMTP en el backend.

## 🔧 Variables de Entorno del Backend

Edita el archivo `.env` en la carpeta `backend/` o configura las siguientes variables de entorno:

### Gmail (Recomendado para desarrollo/pruebas)

```env
# Email Configuration
DEBUG_EMAIL=False
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-contraseña-de-aplicacion

# Frontend URL (para enlaces en emails)
FRONTEND_URL=http://localhost:5173
```

### ⚠️ Importante para Gmail

Gmail requiere **contraseña de aplicación** (no tu contraseña normal):

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Seguridad → Verificación en dos pasos (debe estar activada)
3. Contraseñas de aplicaciones
4. Genera una nueva para "CorteSec"
5. Usa esa contraseña en `EMAIL_HOST_PASSWORD`

### Otros Proveedores SMTP

#### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=tu-api-key-de-sendgrid
```

#### Mailgun
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_HOST_USER=postmaster@tu-dominio.mailgun.org
EMAIL_HOST_PASSWORD=tu-contraseña-mailgun
```

#### AWS SES
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu-smtp-username
EMAIL_HOST_PASSWORD=tu-smtp-password
```

#### Office 365 / Outlook
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu-email@outlook.com
EMAIL_HOST_PASSWORD=tu-contraseña
```

## 🧪 Modo Desarrollo (Console Backend)

Para desarrollo local sin configurar SMTP real:

```env
DEBUG_EMAIL=True
```

Esto hará que los emails se impriman en la consola del backend en lugar de enviarse.

## 📝 Configuración en settings.py (Ya configurado)

El backend ya tiene la siguiente configuración en `contractor_management/settings.py`:

```python
# Email Configuration
DEBUG_EMAIL = os.environ.get('DEBUG_EMAIL', 'True').lower() == 'true'

if DEBUG_EMAIL:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_HOST_USER', 'CorteSec <no-reply@cortesec.com>')

# Frontend URL para enlaces
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
```

## 🔍 Verificar Configuración

### 1. Crear archivo .env en backend/

```bash
cd backend
# Crea el archivo .env con tu configuración
```

### 2. Ejemplo de .env completo

```env
# Django
SECRET_KEY=tu-secret-key-super-segura
DEBUG=True

# Database (ya configurado)
DATABASE_URL=postgresql://usuario:password@localhost:5432/cortesec

# Email SMTP
DEBUG_EMAIL=False
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=cortesec@gmail.com
EMAIL_HOST_PASSWORD=abcd efgh ijkl mnop
DEFAULT_FROM_EMAIL=CorteSec <no-reply@cortesec.com>

# Frontend
FRONTEND_URL=http://localhost:5173

# Cors
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3. Reiniciar el servidor backend

```bash
cd backend
python manage.py runserver
```

## ✅ Probar que funciona

### Desde Django Shell

```python
python manage.py shell

from django.core.mail import send_mail
from django.conf import settings

send_mail(
    'Test Email',
    'Este es un email de prueba desde CorteSec',
    settings.DEFAULT_FROM_EMAIL,
    ['tu-email@ejemplo.com'],
    fail_silently=False,
)
```

Si funciona correctamente, deberías recibir el email.

### Desde el Frontend

1. Ve a `http://localhost:5173/register`
2. Completa el formulario de registro
3. Revisa tu email (y la carpeta de spam)
4. Deberías recibir el email de verificación

## 🚨 Troubleshooting

### Error: SMTPAuthenticationError

**Causa:** Credenciales incorrectas

**Solución:**
- Verifica que `EMAIL_HOST_USER` y `EMAIL_HOST_PASSWORD` sean correctos
- Para Gmail, usa contraseña de aplicación, no tu contraseña normal
- Verifica que la verificación en dos pasos esté activada (Gmail)

### Error: SMTPServerDisconnected

**Causa:** Configuración de puerto o host incorrecta

**Solución:**
- Verifica `EMAIL_HOST` y `EMAIL_PORT`
- Para TLS usa puerto 587
- Para SSL usa puerto 465

### Emails no llegan

**Solución:**
1. Revisa carpeta de spam
2. Verifica que `FRONTEND_URL` sea correcto
3. Revisa logs del backend para errores
4. Prueba con `DEBUG_EMAIL=True` para ver el contenido en consola

### Error: Connection refused

**Causa:** Firewall o red bloqueando SMTP

**Solución:**
- Verifica que tu firewall permita conexiones al puerto 587
- Algunas redes corporativas bloquean SMTP
- Usa un servicio de email API como SendGrid o Mailgun

## 📊 Emails que se envían en el sistema

| Acción | Trigger | Template |
|--------|---------|----------|
| **Verificación de Email** | Usuario se registra | Link para verificar email |
| **Recuperación de Contraseña** | Usuario olvida contraseña | Link para resetear password |
| **Bienvenida** | Email verificado (opcional) | Mensaje de bienvenida |
| **Cambio de Contraseña** | Usuario cambia password (opcional) | Notificación de cambio |

## 🔐 Seguridad

### ⚠️ NUNCA subas credenciales a Git

```bash
# Asegúrate de que .env esté en .gitignore
echo ".env" >> .gitignore
```

### ✅ Mejores Prácticas

1. **Usa contraseñas de aplicación** (no contraseñas reales)
2. **Limita permisos** a solo envío de emails
3. **Monitorea uso** de tu cuenta SMTP
4. **Rota credenciales** periódicamente
5. **Usa servicios dedicados** en producción (SendGrid, Mailgun, etc.)

## 🚀 Producción

Para producción, se recomienda usar servicios profesionales:

### SendGrid (Recomendado)
- ✅ 100 emails/día gratis
- ✅ Alta deliverability
- ✅ Analytics incluido
- ✅ API REST disponible

### Mailgun
- ✅ 5,000 emails/mes gratis (primeros 3 meses)
- ✅ Excelente para desarrollo
- ✅ API REST y SMTP

### AWS SES
- ✅ 62,000 emails/mes gratis (desde EC2)
- ✅ Muy económico
- ✅ Escalable

## 📞 Soporte

Si tienes problemas con la configuración SMTP:

1. Revisa los logs del backend
2. Prueba primero en modo `DEBUG_EMAIL=True`
3. Verifica credenciales
4. Consulta documentación del proveedor SMTP

---

© 2025 CorteSec - Configuración SMTP
