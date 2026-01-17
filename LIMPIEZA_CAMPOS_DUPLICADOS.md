# 🧹 LIMPIEZA DE CAMPOS DUPLICADOS EN CONFIGURACIÓN

## 📋 Resumen

Se eliminaron **8 campos duplicados** de `ConfiguracionGeneral` que ya existían en modelos especializados (`ConfiguracionSeguridad` y `ConfiguracionEmail`).

---

## ❌ Campos Eliminados de ConfiguracionGeneral

### 🔒 Campos de Seguridad (movidos a ConfiguracionSeguridad)
1. `sesion_timeout_minutos` → Ahora usar `ConfiguracionSeguridad.tiempo_sesion`
2. `max_intentos_login` → Ahora usar `ConfiguracionSeguridad.max_intentos_login`
3. `requiere_cambio_password` → Lógica completa en `ConfiguracionSeguridad`
4. `dias_cambio_password` → Ahora usar `ConfiguracionSeguridad.dias_expiracion_password`

### 📧 Campos de Email (movidos a ConfiguracionEmail)
5. `servidor_email` → Ahora usar `ConfiguracionEmail.servidor_smtp`
6. `puerto_email` → Ahora usar `ConfiguracionEmail.puerto_smtp`
7. `email_usuario` → Ahora usar `ConfiguracionEmail.usuario_smtp`
8. `usar_tls` → Ahora usar `ConfiguracionEmail.usar_tls`

---

## ✅ Campos que Permanecen en ConfiguracionGeneral

ConfiguracionGeneral ahora contiene **solo** información de la empresa y preferencias generales:

### 🏢 Información de la Empresa
- `nombre_empresa`
- `nit`
- `direccion`
- `telefono`
- `email`
- `sitio_web`
- `logo`

### 💰 Configuración de Moneda
- `moneda` (por defecto: 'COP')
- `simbolo_moneda` (por defecto: '$')

### 🕐 Configuración de Fechas y Horarios
- `zona_horaria` (por defecto: 'America/Bogota')
- `formato_fecha` (por defecto: '%d/%m/%Y')

### 📅 Configuración de Nómina
- `dia_pago_nomina` (por defecto: 30)
- `periodo_nomina` (por defecto: 'mensual')

### 💳 Configuración Contable
- `cuenta_efectivo_defecto`
- `cuenta_nomina_defecto`

### 📝 Auditoría
- `fecha_modificacion`
- `modificado_por`
- `organization` (multi-tenant)

---

## 🔧 Cambios Realizados

### 1. Backend - Modelo
**Archivo:** `backend/configuracion/models.py`
- ✅ Eliminados 8 campos de `ConfiguracionGeneral`
- ✅ Modelo limpio y enfocado en datos empresariales

### 2. Backend - Serializer
**Archivo:** `backend/configuracion/serializers.py`
- ✅ Actualizado `ConfiguracionGeneralSerializer`
- ✅ Eliminados campos de seguridad y email

### 3. Backend - Migración
**Archivo:** `backend/configuracion/migrations/0004_remove_duplicate_fields.py`
- ✅ Migración creada y aplicada exitosamente
- ✅ Campos eliminados de la base de datos

### 4. Frontend - Componente
**Archivo:** `frontend/src/pages/configuracion/ConfiguracionGeneralPage.jsx`
- ✅ Eliminado tab "Seguridad"
- ✅ Eliminados campos del formulario:
  - `sesion_timeout_minutos`
  - `max_intentos_login`
  - `requiere_cambio_password`
  - `dias_cambio_password`
- ✅ Eliminada función `handleTestEmail()`
- ✅ Eliminado state `testingEmail`
- ✅ Limpiados imports innecesarios (`ShieldIcon`, `MailIcon`, `SendIcon`)

---

## 📊 Verificación

### ✅ Modelo Python
```bash
python verify_cleanup.py
```
**Resultado:** ✅ Todos los campos eliminados correctamente

### ✅ Base de Datos
**Tabla:** `configuracion_configuraciongeneral`
- Antes: 27 columnas
- Después: 19 columnas (-8 campos)

### ✅ Datos Existentes
- ConfiguracionGeneral ID: 18 ✅ Carga correctamente
- Organization: CorteSec S.A.S. ✅ Asignada

---

## 🔄 Módulos Especializados

### ConfiguracionSeguridad
**Ubicación:** `backend/configuracion/models.py` (líneas 511-600)
**Endpoint:** `/api/configuracion/seguridad/`
**Página:** `frontend/src/pages/configuracion/ConfiguracionSeguridadPage.jsx`

**Campos (30+):**
- ✅ Sesiones: `tiempo_sesion`, `max_intentos_login`, `tiempo_bloqueo`, `permitir_multiples_sesiones`
- ✅ Contraseñas: `longitud_minima_password`, `requiere_mayusculas`, `requiere_minusculas`, `requiere_numeros`, `requiere_simbolos`, `dias_expiracion_password`, `historial_passwords`
- ✅ Auditoría: `habilitar_auditoria`, `dias_retencion_logs`, `registrar_accesos`, `registrar_cambios`
- ✅ Acceso: `habilitar_whitelist_ip`, `ips_permitidas`, `habilitar_2fa`, `forzar_2fa_admin`

### ConfiguracionEmail
**Ubicación:** `backend/configuracion/models.py` (líneas 225-310)
**Endpoint:** `/api/configuracion/email/`
**Página:** Pendiente crear página específica

**Campos:**
- ✅ SMTP: `servidor_smtp`, `puerto_smtp`, `usuario_smtp`, `password_smtp`, `usar_tls`, `usar_ssl`
- ✅ Configuración: `email_from`, `nombre_from`, `timeout`

---

## 🚀 Migración para Código Existente

### ⚠️ Si tienes código que usa campos eliminados:

#### Backend (Python)
```python
# ❌ ANTES
config = ConfiguracionGeneral.objects.first()
timeout = config.sesion_timeout_minutos
intentos = config.max_intentos_login

# ✅ DESPUÉS
config_general = ConfiguracionGeneral.objects.first()
config_seguridad = ConfiguracionSeguridad.objects.first()
timeout = config_seguridad.tiempo_sesion
intentos = config_seguridad.max_intentos_login
```

#### Frontend (React/JavaScript)
```javascript
// ❌ ANTES
const { sesion_timeout_minutos, max_intentos_login } = configuracionGeneral;

// ✅ DESPUÉS
const configuracionSeguridad = await configuracionService.getConfiguracionSeguridad();
const { tiempo_sesion, max_intentos_login } = configuracionSeguridad;
```

---

## 📝 Siguiente Paso Recomendado

### Crear página específica para ConfiguracionEmail
Actualmente los campos de email están mezclados en ConfiguracionGeneral, pero ya existe el modelo `ConfiguracionEmail`.

**Acción sugerida:**
1. Crear `ConfiguracionEmailPage.jsx` (similar a ConfiguracionSeguridadPage)
2. Migrar configuración SMTP a la página nueva
3. Actualizar menú de navegación

---

## ✅ Estado Final

| Módulo | Estado | Campos | Endpoint |
|--------|--------|--------|----------|
| **ConfiguracionGeneral** | ✅ Limpio | 19 (solo empresa) | `/api/configuracion/general/` |
| **ConfiguracionSeguridad** | ✅ Funcional | 30+ (solo seguridad) | `/api/configuracion/seguridad/` |
| **ConfiguracionEmail** | ⚠️ Falta página | 10 (solo email) | `/api/configuracion/email/` |

---

## 🎯 Beneficios

1. **Separación de responsabilidades:** Cada modelo tiene una función clara
2. **Mantenibilidad:** Más fácil encontrar y actualizar configuraciones
3. **Escalabilidad:** Cada módulo puede crecer independientemente
4. **Multi-tenant:** Cada configuración tiene su `organization`
5. **Sin duplicación:** Datos consistentes en un solo lugar

---

## 📞 Soporte

Si encuentras código que aún usa los campos eliminados:
1. Identifica el módulo que usa el campo
2. Actualiza para usar `ConfiguracionSeguridad` o `ConfiguracionEmail`
3. Si tienes dudas, pregunta qué campo reemplaza el antiguo
