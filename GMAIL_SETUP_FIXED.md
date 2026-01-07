# 📧 Configuración de Gmail para CorteSec

## 🚨 PROBLEMA IDENTIFICADO Y SOLUCIONADO

### ❌ Problema Original
El backend **NO estaba validando** que el usuario perteneciera a la organización especificada en el login.

Podías poner **cualquier código de organización** y si tus credenciales eran correctas, te dejaba entrar.

### ✅ Solución Implementada
Ahora el backend valida **3 cosas en el login**:

1. ✅ **Credenciales correctas** (email + contraseña)
2. ✅ **Organización existe y está activa**
3. ✅ **Usuario pertenece a esa organización específica**

Si cualquiera de estas validaciones falla → **403 Forbidden**

---

## 🔧 Configuración de Email SMTP con Gmail

### Paso 1: Activar Verificación en 2 Pasos

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. En el menú lateral, haz clic en **"Seguridad"**
3. Busca **"Verificación en dos pasos"**
4. Si no está activada, **actívala ahora** (es obligatorio para contraseñas de aplicación)

### Paso 2: Generar Contraseña de Aplicación

1. Una vez activada la verificación en 2 pasos, vuelve a **Seguridad**
2. Busca **"Contraseñas de aplicaciones"** (debe aparecer ahora)
3. Selecciona la aplicación: **"Correo"**
4. Selecciona el dispositivo: **"Otro (nombre personalizado)"**
5. Escribe: **"CorteSec Backend"**
6. Haz clic en **"Generar"**
7. Google te dará una **contraseña de 16 caracteres** como: `abcd efgh ijkl mnop`
8. **¡CÓPIALA!** (sin los espacios si prefieres, pero funciona con o sin ellos)

### Paso 3: Configurar en CorteSec

Edita el archivo `backend/.env`:

```env
# Modo de email
DEBUG_EMAIL=False  # ← Cambia a False para envío real

# Tu configuración de Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu-email@gmail.com  # ← Tu email de Gmail
EMAIL_HOST_PASSWORD=abcdefghijklmnop  # ← La contraseña de aplicación (sin espacios)
```

### Paso 4: Reiniciar el Backend

```powershell
# Detén el servidor (Ctrl+C)
# Vuelve a iniciar
python manage.py runserver
```

Deberías ver:
```
📧 EMAIL MODE: SMTP (Production) - Emails se enviarán por Gmail
```

---

## 🧪 Probar el Email

### Opción 1: Desde Django Shell

```powershell
python manage.py shell
```

```python
from django.core.mail import send_mail
from django.conf import settings

send_mail(
    'Test Email CorteSec',
    'Este es un email de prueba desde el backend de CorteSec',
    settings.DEFAULT_FROM_EMAIL,
    ['tu-email-destino@gmail.com'],  # ← Pon tu email aquí
    fail_silently=False,
)
```

Si funciona, verás: `1` (significa 1 email enviado exitosamente)

### Opción 2: Registro en el Frontend

1. Ve a http://localhost:5173/register
2. Regístrate con tus datos
3. **Revisa tu email** (y la carpeta de spam)
4. Deberías recibir el email de verificación

---

## 🐛 Troubleshooting

### Error: SMTPAuthenticationError

**Causa:** Credenciales incorrectas

**Solución:**
- Verifica que `EMAIL_HOST_USER` sea tu email completo
- Verifica que `EMAIL_HOST_PASSWORD` sea la contraseña de aplicación (NO tu contraseña normal)
- Asegúrate de que la verificación en 2 pasos esté activa

### Error: Connection refused

**Causa:** Puerto bloqueado o configuración incorrecta

**Solución:**
- Verifica que uses puerto **587** (no 465 ni 25)
- Verifica que `DEBUG_EMAIL=False`
- Algunos firewalls o redes corporativas bloquean SMTP

### Email no llega

**Solución:**
1. Revisa **carpeta de spam**
2. Verifica que el email en registro sea válido
3. En Django shell, revisa:
   ```python
   from django.conf import settings
   print(settings.EMAIL_HOST_USER)
   print(settings.DEFAULT_FROM_EMAIL)
   ```

### Modo Console (DEBUG_EMAIL=True)

Si `DEBUG_EMAIL=True`, los emails NO se envían, solo se muestran en la **consola del backend**.

Ejemplo de salida en consola:
```
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Subject: Verificar tu cuenta en CorteSec
From: tu-email@gmail.com
To: usuario@ejemplo.com

¡Hola Usuario!

Gracias por registrarte en CorteSec...
```

---

## 🔐 Validación de Organización (CORREGIDA)

### Flujo Completo Ahora:

```
Usuario en Frontend
  ↓
Ingresa: cortesec + admin@example.com + password
  ↓
Frontend envía header: X-Tenant-Codigo: cortesec
  ↓
Backend recibe y valida:
  1. ¿Organización "cortesec" existe? ✅
  2. ¿Organización está activa? ✅
  3. ¿Credenciales correctas? ✅
  4. ¿Usuario pertenece a "cortesec"? ✅  ← NUEVA VALIDACIÓN
  ↓
Si TODO pasa → Login exitoso
Si algo falla → 403 Forbidden
```

### Probar la Validación:

1. Crea dos organizaciones en el backend:
   ```python
   python manage.py shell
   
   from core.models import Organizacion
   
   org1 = Organizacion.objects.create(nombre="Empresa 1", codigo="empresa1", activa=True)
   org2 = Organizacion.objects.create(nombre="Empresa 2", codigo="empresa2", activa=True)
   ```

2. Asigna tu usuario a `empresa1`:
   ```python
   from login.models import CustomUser
   
   user = CustomUser.objects.get(email='admin@cortesec.com')
   user.organization = org1
   user.save()
   ```

3. Intenta hacer login en el frontend:
   - Con código `empresa1` → ✅ Funciona
   - Con código `empresa2` → ❌ **403 Forbidden: "No tienes acceso a esta organización"**

---

## 📝 Resumen de Cambios

### Archivos Modificados:

1. **`backend/login/api_views.py`**
   - ✅ Validación de header `X-Tenant-Codigo`
   - ✅ Validación de que la organización existe
   - ✅ Validación de que el usuario pertenece a esa organización
   - ✅ Mensajes de error específicos

2. **`backend/contractor_management/settings.py`**
   - ✅ Configuración SMTP simplificada
   - ✅ Modo debug para desarrollo
   - ✅ Mensajes de inicio informativos

3. **`backend/.env`**
   - ✅ Variables de entorno documentadas
   - ✅ Instrucciones para Gmail incluidas

---

## ✅ Checklist Final

- [ ] Verificación en 2 pasos activada en Gmail
- [ ] Contraseña de aplicación generada
- [ ] Variables de entorno configuradas en `.env`
- [ ] `DEBUG_EMAIL=False` para envío real
- [ ] Backend reiniciado
- [ ] Email de prueba enviado exitosamente
- [ ] Validación de organización probada

---

## 🎯 Estado del Sistema

### ✅ Funcionando:
- Login con validación de organización
- Registro de usuarios
- Verificación de email (con SMTP configurado)
- Recuperación de contraseña (con SMTP configurado)
- Dashboard
- Logout
- Multitenant (CORREGIDO)

### 🔒 Seguridad:
- ✅ Usuario debe pertenecer a la organización especificada
- ✅ Organización debe existir y estar activa
- ✅ Validación de credenciales
- ✅ Headers multitenant obligatorios

---

© 2025 CorteSec - Sistema de Autenticación Seguro
