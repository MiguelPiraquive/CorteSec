# Plan de Acción: Módulo de Notificaciones Completo

**Fecha:** 2026-02-26  
**Estado:** ✅ IMPLEMENTADO COMPLETAMENTE  
**Prioridad:** Alta  
**Fecha de implementación:** 2026-02-26

---

## 📋 Índice

1. [Diagnóstico del Estado Actual](#1-diagnóstico-del-estado-actual)
2. [Problemas Críticos Identificados](#2-problemas-críticos-identificados)
3. [Arquitectura Propuesta](#3-arquitectura-propuesta)
4. [Plan de Implementación](#4-plan-de-implementación)
5. [Detalle por Fase](#5-detalle-por-fase)
6. [Endpoints API](#6-endpoints-api)
7. [Esquema de Base de Datos Final](#7-esquema-de-base-de-datos-final)
8. [Diseño Frontend](#8-diseño-frontend)
9. [Seguridad y Multi-tenant](#9-seguridad-y-multi-tenant)
10. [Entregables y Checklist](#10-entregables-y-checklist)

---

## 1. Diagnóstico del Estado Actual

### 1.1 Lo que EXISTE y FUNCIONA ✅

| Componente | Ubicación | Estado |
|---|---|---|
| **Modelo `Notificacion`** | `core/models.py` L638-746 | ✅ Funcional — PK integer, campos: usuario, titulo, mensaje, tipo, leida, fecha, url_accion, icono, datos_adicionales |
| **`NotificacionViewSet`** REST API | `core/notification_views.py` | ✅ Funcional — List, Retrieve, Delete, mark_read, mark_all_read, stats |
| **`NotificacionSerializer`** | `core/serializers.py` L95-106 | ✅ Funcional |
| **Servicio frontend** | `frontend/src/services/notificationsService.js` | ✅ Funcional — 6 métodos: list, getById, markRead, markAllRead, delete, stats |
| **Página `NotificacionesPage`** | `frontend/src/pages/core/NotificacionesPage.jsx` | ✅ Funcional — Filtros, paginación, mark read/delete, stats cards |
| **Bell icon + dropdown** | `DashboardLayout.jsx` L330-405 | ✅ Funcional — Badge con contador, polling cada 60s, muestra 4 recientes |
| **Preferencias de notificaciones** | `perfil/models.py` L473-560 | ✅ Modelo + API + UI en PerfilPage — Toggles por tipo/canal/horario |
| **Ruta** | `/dashboard/notificaciones` | ✅ Registrada en App.jsx, `public: true` |
| **Email service** | `core/email_service.py` | ✅ Funcional — SMTP Gmail con rate limiting |
| **Toast system** | `react-toastify` en App.jsx | ✅ Global, usado en ~15 archivos |

### 1.2 Lo que EXISTE pero NO FUNCIONA ❌

| Componente | Ubicación | Problema |
|---|---|---|
| **Modelo `Notification` (v2)** | `core/models.py` L903-1020 | UUID PK, multi-tenant, categorías, expiración — **NUNCA usado por ninguna vista, serializer o API** |
| **`NotificationTemplate`** | `dashboard/push_notifications.py` | Modelo para plantillas email/push/SMS — **Sin datos seed, sin admin UI** |
| **`NotificationSubscription`** | `dashboard/push_notifications.py` | Web Push subscriptions — **Sin flujo de suscripción en frontend** |
| **`NotificationLog`** | `dashboard/push_notifications.py` | Log de envíos — **Solo usado por PushNotificationService que no se ejecuta** |
| **`PushNotificationService`** | `dashboard/push_notifications.py` | Web Push via pywebpush — **VAPID keys no configuradas, pywebpush no en requirements.txt** |
| **`SMSNotificationService`** | `dashboard/push_notifications.py` | SMS via API externa — **Sin proveedor configurado** |
| **`NotificationManager` (facade)** | `dashboard/push_notifications.py` | Unified send — **Ningún código de la app lo llama** |
| **`NotificationConsumer` WS** | `dashboard/websocket_consumer.py` L282-370 | WebSocket para notificaciones en tiempo real — **channels no en INSTALLED_APPS** |
| **8 rutas WebSocket** | `dashboard/routing.py` | Notifications, dashboard, chat, metrics, etc. — **Todas inactivas** |
| **ASGI config** | `contractor_management/asgi.py` | ProtocolTypeRouter configurado — **Falta `ASGI_APPLICATION` y `CHANNEL_LAYERS` en settings** |
| **`schedule_notification()`** | `dashboard/push_notifications.py` | Notificaciones programadas — **django_q no instalado** |

### 1.3 Lo que FALTA completamente 🚫

| Característica | Impacto |
|---|---|
| **Creación automática de notificaciones** | No hay signals/hooks que creen notificaciones al procesar nómina, aprobar préstamo, etc. |
| **Enforcement de preferencias** | `ConfiguracionNotificaciones` se guarda pero NUNCA se consulta antes de enviar |
| **Notificaciones por email** | El service existe pero nada lo conecta con eventos del sistema |
| **Estado centralizado frontend** | `notifCount` vive solo en DashboardLayout — no se comparte con NotificacionesPage |
| **Sidebar entry** | Notificaciones NO aparece en el menú lateral |
| **Notificaciones clickeables** | No navegan al recurso relacionado (ej: click en "préstamo aprobado" → ir a préstamos) |
| **Notificaciones en tiempo real** | Solo polling 60s — no hay WebSocket/SSE funcionando |
| **Sonido/vibración** | Ninguna alerta sensorial |
| **Agrupación/categorización** | El modelo `Notificacion` no tiene campo `categoria` |
| **Expiración automática** | El modelo `Notificacion` no tiene `expires_at` |
| **Notificaciones broadcast** | No hay mecanismo para enviar a todos los usuarios de una org |

---

## 2. Problemas Críticos Identificados

### Problema 1: Tres modelos de notificación paralelos
```
core.Notificacion        → Integer PK, simple, SIN organization FK (¡!)
core.Notification        → UUID PK, multi-tenant, categorías, expiración (NO USADO)
dashboard.NotificationLog → PK auto, para push_notifications (NO USADO)
```
**Riesgo:** Fragmentación total. Solo `Notificacion` funciona pero le falta `organization` (violación multi-tenant).

### Problema 2: Violación multi-tenant
El modelo `Notificacion` filtra por `usuario` pero **NO tiene campo `organization`**. En un sistema multi-tenant, esto es un gap de seguridad: un superadmin podría ver notificaciones cross-tenant.

### Problema 3: 700+ líneas de código muerto
`push_notifications.py`, `websocket_consumer.py`, `routing.py` — todo existe pero nada funciona porque:
- `channels` no está en `INSTALLED_APPS`
- `CHANNEL_LAYERS` no está configurado
- `ASGI_APPLICATION` no está configurado
- `pywebpush` no está instalado
- `django_q` no está instalado

### Problema 4: Notificaciones no se crean automáticamente
No hay **ningún signal, middleware o hook** que cree notificaciones cuando:
- Se procesa una nómina
- Se aprueba/rechaza un préstamo
- Un contrato está por vencer
- Se crea/modifica un usuario
- Se detecta actividad sospechosa
- Se actualiza un proyecto

### Problema 5: Preferencias decorativas
El usuario puede configurar: "no quiero notificaciones de préstamos" o "solo vía email" — pero el sistema **ignora completamente** esta configuración.

---

## 3. Arquitectura Propuesta

### 3.1 Estrategia: Unificar en un solo modelo mejorado

**Decisión:** Migrar todo a un modelo `Notificacion` mejorado que combine lo mejor de ambos modelos existentes.

```
┌─────────────────────────────────────────────────────────┐
│                    NOTIFICACION (Unificado)               │
│─────────────────────────────────────────────────────────│
│ id (UUID)              ← De Notification v2              │
│ organization (FK)      ← De Notification v2 (NUEVO)      │
│ usuario (FK)           ← Existente                       │
│ titulo (str)           ← Existente                       │
│ mensaje (text)         ← Existente                       │
│ tipo (choices)         ← Existente (info/success/warn/err)│
│ categoria (choices)    ← De Notification v2 (NUEVO)      │
│ leida (bool)           ← Existente                       │
│ fecha_leida (datetime) ← Existente                       │
│ url_accion (str)       ← Existente (cambiar a CharField) │
│ texto_accion (str)     ← De Notification v2 (NUEVO)      │
│ icono (str)            ← Existente                       │
│ datos_adicionales (JSON)← Existente                      │
│ fecha (datetime)       ← Existente                       │
│ expires_at (datetime)  ← De Notification v2 (NUEVO)      │
│ prioridad (choices)    ← NUEVO (baja/normal/alta/urgente)│
│ origen (str)           ← NUEVO (módulo que la creó)      │
│ origen_id (str)        ← NUEVO (ID del objeto origen)    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Flujo de Notificaciones

```
Evento del Sistema (signal/hook)
        │
        ▼
┌──────────────────────┐
│  NotificationEngine  │ ← Servicio centralizado
│  (backend)           │
│                      │
│  1. Verificar prefs  │ ← Consulta ConfiguracionNotificaciones
│  2. Verificar horario│ ← Dentro de horario_inicio/fin?
│  3. Crear Notificacion│ ← En BD
│  4. Enviar canales:  │
│     ├→ In-app (BD)   │ ← Siempre
│     ├→ Email          │ ← Si via_email=True
│     ├→ Push (futuro)  │ ← Si tiene suscripción
│     └→ Real-time      │ ← SSE o polling mejorado
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│  Frontend            │
│                      │
│  NotificationContext │ 0← Estado centralizado
│  ├→ Bell badge       │
│  ├→ Dropdown         │
│  ├→ NotificacionesPage│
│  ├→ Toast alerts     │ ← Para urgentes
│  └→ Sonido (config)  │
└──────────────────────┘
```

### 3.3 Decisión sobre Real-Time

**Opción elegida:** Server-Sent Events (SSE) en lugar de WebSockets.

**Razones:**
- Django Channels + Redis agrega complejidad operativa significativa
- SSE es nativo del navegador, más simple, unidireccional (perfecto para notificaciones)
- No requiere `channels`, `daphne`, ni Redis
- Se puede implementar con una vista Django estándar
- Fallback a polling ya existe (60s → mejorar a 15s)

**Implementación futura (opcional):** Si se necesita bidireccional (chat, colaboración), entonces sí activar Channels.

---

## 4. Plan de Implementación

### Resumen de Fases

| Fase | Nombre | Prioridad | Esfuerzo |
|------|--------|-----------|----------|
| **Fase 1** | Unificar modelo + categorías | 🔴 Crítica | 2-3 horas |
| **Fase 2** | Motor de notificaciones automáticas | 🔴 Crítica | 3-4 horas |
| **Fase 3** | Enforcement de preferencias | 🟡 Alta | 1-2 horas |
| **Fase 4** | Frontend: Context + UI mejorada | 🟡 Alta | 3-4 horas |
| **Fase 5** | Notificaciones por email | 🟡 Alta | 2-3 horas |
| **Fase 6** | SSE real-time (opcional) | 🟢 Media | 2-3 horas |
| **Fase 7** | Limpieza de código muerto | 🟢 Media | 1 hora |

**Total estimado:** 14-20 horas

---

## 5. Detalle por Fase

### Fase 1: Unificar Modelo + Agregar Categorías

**Meta:** Un solo modelo `Notificacion` con multi-tenant, categorías, prioridad y origen.

#### Backend

**1.1 Migración del modelo `Notificacion`** (`core/models.py`)

Agregar campos al modelo existente:
```python
# Nuevos campos a agregar
organization = models.ForeignKey('Organizacion', on_delete=models.CASCADE, 
    related_name='notificaciones_org', null=True, blank=True)

categoria = models.CharField(max_length=20, choices=[
    ('sistema', 'Sistema'),
    ('nomina', 'Nómina'),
    ('prestamos', 'Préstamos'),
    ('contratos', 'Contratos'),
    ('empleados', 'Empleados'),
    ('contabilidad', 'Contabilidad'),
    ('proyectos', 'Proyectos'),
    ('seguridad', 'Seguridad'),
    ('general', 'General'),
], default='general')

prioridad = models.CharField(max_length=10, choices=[
    ('baja', 'Baja'),
    ('normal', 'Normal'),
    ('alta', 'Alta'),
    ('urgente', 'Urgente'),
], default='normal')

# Para linking: al hacer click, navegar al objeto origen
origen_tipo = models.CharField(max_length=50, blank=True,
    help_text="Modelo que generó la notificación (ej: 'nomina', 'prestamo')")
origen_id = models.CharField(max_length=100, blank=True,
    help_text="ID del objeto que generó la notificación")

expires_at = models.DateTimeField(null=True, blank=True,
    verbose_name="Fecha de expiración")

texto_accion = models.CharField(max_length=100, blank=True,
    verbose_name="Texto del botón de acción")
```

**1.2 Actualizar serializer**

Agregar los nuevos campos: `categoria`, `prioridad`, `origen_tipo`, `origen_id`, `expires_at`, `texto_accion`, `organization`.

**1.3 Actualizar viewset**

- Agregar filtro por `categoria` y `prioridad`
- Filtrar por `organization` del usuario autenticado (multi-tenant)
- Agregar endpoint `stats/` mejorado con desglose por categoría
- Agregar endpoint `DELETE /api/notificaciones/delete-read/` para limpiar leídas

**1.4 Migración de datos**

Script para:
- Popular `organization` en notificaciones existentes (desde `usuario.organization`)
- Marcar el modelo `Notification` (v2) como deprecated (no borrar todavía)

**1.5 Actualizar índices**
```python
indexes = [
    models.Index(fields=['organization', 'usuario', 'leida']),
    models.Index(fields=['tipo', 'categoria']),
    models.Index(fields=['fecha']),
    models.Index(fields=['prioridad']),
    models.Index(fields=['expires_at']),
]
```

---

### Fase 2: Motor de Notificaciones Automáticas

**Meta:** Crear un servicio centralizado que genere notificaciones automáticamente ante eventos del sistema.

#### 2.1 Crear `core/notification_engine.py`

```python
class NotificationEngine:
    """Motor centralizado de notificaciones.
    
    Uso:
        NotificationEngine.notify(
            usuario=user,
            titulo="Nómina procesada",
            mensaje="La nómina de Febrero 2026 ha sido procesada exitosamente.",
            tipo="success",
            categoria="nomina",
            prioridad="normal",
            url_accion="/dashboard/nomina",
            texto_accion="Ver nómina",
            origen_tipo="nomina",
            origen_id=str(nomina.id),
        )
    """
    
    @classmethod
    def notify(cls, usuario, titulo, mensaje, tipo='info', categoria='general',
               prioridad='normal', url_accion='', texto_accion='', 
               origen_tipo='', origen_id='', datos_adicionales=None,
               enviar_email=False, icono=''):
        """Crear notificación respetando preferencias del usuario."""
        
        # 1. Verificar preferencias
        if not cls._debe_notificar(usuario, categoria):
            return None
        
        # 2. Verificar horario (solo para prioridad no-urgente)
        if prioridad != 'urgente' and not cls._dentro_de_horario(usuario):
            # Guardar pero no alertar
            pass
        
        # 3. Crear notificación en BD
        notif = Notificacion.objects.create(
            organization=usuario.organization,
            usuario=usuario,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            categoria=categoria,
            prioridad=prioridad,
            url_accion=url_accion,
            texto_accion=texto_accion,
            origen_tipo=origen_tipo,
            origen_id=origen_id,
            icono=icono,
            datos_adicionales=datos_adicionales or {},
        )
        
        # 4. Email si corresponde
        if enviar_email and cls._quiere_email(usuario):
            cls._enviar_email(usuario, notif)
        
        return notif
    
    @classmethod
    def notify_bulk(cls, usuarios, **kwargs):
        """Enviar misma notificación a múltiples usuarios."""
        return [cls.notify(u, **kwargs) for u in usuarios]
    
    @classmethod
    def notify_organization(cls, organization, **kwargs):
        """Enviar a todos los usuarios de una organización."""
        usuarios = CustomUser.objects.filter(organization=organization, is_active=True)
        return cls.notify_bulk(usuarios, **kwargs)
```

#### 2.2 Crear signals automáticos

Archivo: `core/notification_signals.py`

| Evento | Signal | Notificación |
|---|---|---|
| Nómina procesada | `post_save(Nomina, estado='procesada')` | "Nómina {periodo} procesada" → categoría `nomina` |
| Nómina pagada | `post_save(Nomina, estado='pagada')` | "Nómina {periodo} pagada exitosamente" → categoría `nomina` |
| Préstamo aprobado | `post_save(Prestamo, estado='aprobado')` | "Préstamo #{numero} aprobado" → categoría `prestamos` |
| Préstamo rechazado | `post_save(Prestamo, estado='rechazado')` | "Préstamo #{numero} rechazado" → categoría `prestamos` |
| Contrato por vencer | Scheduled / management command | "Contrato de {empleado} vence en {X} días" → categoría `contratos`, prioridad `alta` |
| Empleado creado | `post_save(Empleado)` | "Nuevo empleado: {nombre}" → categoría `empleados` |
| Login sospechoso | Custom signal | "Inicio de sesión desde nueva ubicación" → categoría `seguridad`, prioridad `alta` |
| Error del sistema | Exception handler | "Error en módulo {X}" → categoría `sistema`, prioridad `urgente` |
| Proyecto actualizado | `post_save(Project)` | "Proyecto {nombre} actualizado" → categoría `proyectos` |

#### 2.3 Management command para notificaciones periódicas

```bash
python manage.py check_notifications
```

Revisa y genera:
- Contratos por vencer (30, 15, 7 días)
- Préstamos con cuotas próximas
- Nóminas pendientes de procesar
- Limpieza de notificaciones expiradas

Se puede agregar a un cron job o celery beat.

---

### Fase 3: Enforcement de Preferencias

**Meta:** Antes de crear cualquier notificación, consultar `ConfiguracionNotificaciones` del usuario.

#### 3.1 Mapeo categoria → preferencia

```python
CATEGORIA_PREFERENCIA_MAP = {
    'nomina': 'notif_nomina',
    'prestamos': 'notif_prestamos',
    'contratos': 'notif_documentos',  # documentos incluye contratos
    'empleados': 'notif_sistema',
    'proyectos': 'notif_sistema',
    'contabilidad': 'notif_nomina',
    'seguridad': 'notif_sistema',      # siempre activa para seguridad
    'sistema': 'notif_sistema',
    'general': 'notif_sistema',
}
```

#### 3.2 Lógica de decisión

```python
def _debe_notificar(usuario, categoria):
    """¿El usuario quiere recibir notificaciones de esta categoría?"""
    try:
        config = usuario.perfil.config_notificaciones
    except:
        return True  # Si no tiene config, notificar siempre
    
    # Seguridad SIEMPRE se notifica
    if categoria == 'seguridad':
        return True
    
    campo = CATEGORIA_PREFERENCIA_MAP.get(categoria, 'notif_sistema')
    return getattr(config, campo, True)

def _quiere_email(usuario):
    try:
        return usuario.perfil.config_notificaciones.via_email
    except:
        return True

def _dentro_de_horario(usuario):
    try:
        config = usuario.perfil.config_notificaciones
        ahora = timezone.localtime().time()
        return config.horario_inicio <= ahora <= config.horario_fin
    except:
        return True
```

---

### Fase 4: Frontend — Context Centralizado + UI Mejorada

**Meta:** Estado global de notificaciones, sidebar entry, notificaciones clickeables, agrupación por categoría.

#### 4.1 Crear `NotificationContext`

Archivo: `frontend/src/context/NotificationContext.jsx`

```jsx
const NotificationContext = createContext()

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [stats, setStats] = useState(null)
  const [recentNotifications, setRecentNotifications] = useState([])
  
  // Polling cada 30s (mejorado de 60s)
  useEffect(() => {
    const poll = async () => {
      const data = await notificationsService.stats()
      setUnreadCount(data.no_leidas || 0)
      setStats(data)
    }
    poll()
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const markRead = async (id) => { ... }
  const markAllRead = async () => { ... }
  const refreshCount = async () => { ... }
  
  return (
    <NotificationContext.Provider value={{
      unreadCount, stats, recentNotifications,
      markRead, markAllRead, refreshCount,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
```

**Beneficio:** DashboardLayout, NotificacionesPage, DashboardHomePage — todos comparten el mismo estado.

#### 4.2 Sidebar entry

Agregar en `SIDEBAR_CONFIG`:
```javascript
{
  to: '/dashboard/notificaciones',
  icon: BellIcon,
  label: 'Notificaciones',
  section: 'general',
  badge: unreadCount > 0 ? unreadCount : null,  // Badge dinámico
}
```

#### 4.3 Mejorar `NotificacionesPage`

- **Agrupación por categoría**: Tabs o filtro visual (Nómina, Préstamos, Sistema, etc.)
- **Iconos por categoría**: Cada categoría con su icono y color
- **Click → navegar**: Si `url_accion` tiene valor, hacer navigate al click
- **Badge "Urgente"**: Para prioridad `urgente` mostrar badge rojo
- **Limpiar leídas**: Botón para borrar todas las leídas
- **Marcar individual como no leída**: Para volver a revisar
- **Animación de entrada**: Para nuevas notificaciones

#### 4.4 Mejorar dropdown del bell

- Mostrar categoría con color
- Mostrar prioridad visual (borde rojo para urgente)
- Click navega a `url_accion` o al recurso
- "Ver todas por categoría" link

#### 4.5 Toast para urgentes

Cuando llega una notificación con `prioridad='urgente'`, mostrar un `toast.warning()` automáticamente desde el polling.

---

### Fase 5: Notificaciones por Email

**Meta:** Conectar el email service existente con el motor de notificaciones.

#### 5.1 Templates de email

Crear templates HTML para cada categoría:
```
templates/
  emails/
    notification_base.html       ← Layout base (header, footer, logo)
    notification_nomina.html     ← Nómina procesada/pagada
    notification_prestamo.html   ← Préstamo aprobado/rechazado
    notification_contrato.html   ← Contrato por vencer
    notification_seguridad.html  ← Alerta de seguridad
    notification_general.html    ← General/fallback
```

#### 5.2 Integración con `core/email_service.py`

```python
def _enviar_email(usuario, notificacion):
    """Enviar notificación por email."""
    template = f'emails/notification_{notificacion.categoria}.html'
    try:
        html = render_to_string(template, {
            'notificacion': notificacion,
            'usuario': usuario,
            'url_base': settings.FRONTEND_URL,
        })
    except TemplateDoesNotExist:
        html = render_to_string('emails/notification_general.html', {...})
    
    send_system_email(
        recipient_email=usuario.email,
        subject=f"[CorteSec] {notificacion.titulo}",
        html_content=html,
    )
```

#### 5.3 Configuración de cuándo enviar email

| Categoría | Email por defecto | Urgente = email siempre |
|---|---|---|
| Nómina | ✅ Sí | ✅ |
| Préstamos | ✅ Sí | ✅ |
| Contratos | ✅ Sí | ✅ |
| Seguridad | ✅ Siempre | ✅ |
| Sistema | ❌ No | ✅ |
| General | ❌ No | ✅ |

---

### Fase 6: Real-Time con SSE (Opcional)

**Meta:** Notificaciones instantáneas sin polling, usando Server-Sent Events.

#### 6.1 Backend: Vista SSE

```python
# core/sse_views.py
from django.http import StreamingHttpResponse

class NotificationSSEView(APIView):
    """Server-Sent Events para notificaciones en tiempo real."""
    
    def get(self, request):
        def event_stream():
            last_id = 0
            while True:
                nuevas = Notificacion.objects.filter(
                    usuario=request.user,
                    leida=False,
                    id__gt=last_id,
                ).order_by('id')
                
                for notif in nuevas:
                    data = NotificacionSerializer(notif).data
                    yield f"data: {json.dumps(data)}\n\n"
                    last_id = notif.id
                
                time.sleep(5)  # Check cada 5s
        
        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        return response
```

#### 6.2 Frontend: EventSource

```javascript
// En NotificationContext
useEffect(() => {
  const eventSource = new EventSource('/api/notificaciones/stream/', {
    withCredentials: true,
  })
  
  eventSource.onmessage = (event) => {
    const notif = JSON.parse(event.data)
    setUnreadCount(prev => prev + 1)
    
    if (notif.prioridad === 'urgente') {
      toast.warning(notif.titulo)
    }
  }
  
  return () => eventSource.close()
}, [])
```

**Nota:** Esta fase es opcional. El polling mejorado (30s) es suficiente para la mayoría de casos de uso.

---

### Fase 7: Limpieza de Código Muerto

**Meta:** Eliminar o marcar como deprecated el código no funcional.

#### Acciones:
1. **Marcar `core.Notification` como deprecated** — Agregar docstring warning, no borrar (puede haber migraciones dependientes)
2. **Limpiar `dashboard/push_notifications.py`** — Mantener solo lo que se use (EmailNotificationService). Mover el resto a un archivo `_deprecated/`
3. **Limpiar `dashboard/websocket_consumer.py`** — Mantener como referencia futura pero documentar que está inactivo
4. **No borrar `routing.py` ni `asgi.py`** — Se pueden necesitar en el futuro para chat/colaboración
5. **Remover context processor `notificaciones_context`** — No se usa en React SPA

---

## 6. Endpoints API

### Endpoints actuales (mantener)

| Método | Endpoint | Acción |
|---|---|---|
| `GET` | `/api/notificaciones/` | Listar (filtros: tipo, leida, ordering, page) |
| `GET` | `/api/notificaciones/{id}/` | Detalle |
| `DELETE` | `/api/notificaciones/{id}/` | Eliminar |
| `POST` | `/api/notificaciones/{id}/mark_read/` | Marcar como leída |
| `POST` | `/api/notificaciones/mark_all_read/` | Marcar todas como leídas |
| `GET` | `/api/notificaciones/stats/` | Estadísticas |

### Endpoints nuevos (agregar)

| Método | Endpoint | Acción |
|---|---|---|
| `GET` | `/api/notificaciones/?categoria=nomina` | **Filtro por categoría** |
| `GET` | `/api/notificaciones/?prioridad=urgente` | **Filtro por prioridad** |
| `POST` | `/api/notificaciones/{id}/mark_unread/` | **Marcar como no leída** |
| `DELETE` | `/api/notificaciones/delete-read/` | **Borrar todas las leídas** |
| `GET` | `/api/notificaciones/stats/` | **Mejorado: incluir desglose por categoría y prioridad** |
| `GET` | `/api/notificaciones/stream/` | **SSE real-time (Fase 6)** |

### Endpoints de preferencias (existentes, mantener)

| Método | Endpoint | Acción |
|---|---|---|
| `GET` | `/api/perfil/notificaciones/` | Config de notificaciones |
| `PATCH` | `/api/perfil/notificaciones/{id}/` | Actualizar preferencias |

---

## 7. Esquema de Base de Datos Final

### Modelo `Notificacion` (mejorado)

```sql
CREATE TABLE core_notificacion (
    id              BIGSERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES core_organizacion(id),  -- NUEVO
    usuario_id      INTEGER REFERENCES login_customuser(id),
    titulo          VARCHAR(200) DEFAULT 'Notificación',
    mensaje         TEXT NOT NULL,
    tipo            VARCHAR(20) DEFAULT 'info',      -- info/success/warning/error/system
    categoria       VARCHAR(20) DEFAULT 'general',   -- NUEVO: nomina/prestamos/contratos/etc.
    prioridad       VARCHAR(10) DEFAULT 'normal',    -- NUEVO: baja/normal/alta/urgente
    leida           BOOLEAN DEFAULT FALSE,
    fecha_leida     TIMESTAMP NULL,
    url_accion      VARCHAR(500) DEFAULT '',          -- Cambiado de URLField a CharField
    texto_accion    VARCHAR(100) DEFAULT '',          -- NUEVO
    icono           VARCHAR(50) DEFAULT '',
    datos_adicionales JSONB DEFAULT '{}',
    origen_tipo     VARCHAR(50) DEFAULT '',           -- NUEVO: modelo origen
    origen_id       VARCHAR(100) DEFAULT '',          -- NUEVO: ID del objeto
    fecha           TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP NULL,                   -- NUEVO
    
    -- Índices
    INDEX idx_org_user_read (organization_id, usuario_id, leida),
    INDEX idx_tipo_cat (tipo, categoria),
    INDEX idx_fecha (fecha),
    INDEX idx_prioridad (prioridad),
    INDEX idx_expires (expires_at)
);
```

### Modelo `ConfiguracionNotificaciones` (ya existe, agregar)

```sql
-- Agregar campos opcionales futuros
ALTER TABLE perfil_configuracionnotificaciones
    ADD COLUMN notif_contratos BOOLEAN DEFAULT TRUE,
    ADD COLUMN notif_proyectos BOOLEAN DEFAULT TRUE,
    ADD COLUMN notif_contabilidad BOOLEAN DEFAULT TRUE,
    ADD COLUMN sonido_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN resumen_diario BOOLEAN DEFAULT FALSE;   -- Email digest diario
```

---

## 8. Diseño Frontend

### 8.1 NotificacionesPage — Rediseño

```
┌────────────────────────────────────────────────────────────┐
│ 🔔 Centro de Notificaciones                    [Marcar todas leídas]  [Limpiar leídas]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                     │
│  │ 12   │ │  3   │ │  8   │ │  1   │   ← Stats cards     │
│  │Total │ │No leí│ │Leídas│ │Urgent│                      │
│  └──────┘ └──────┘ └──────┘ └──────┘                     │
│                                                            │
│  [Todas] [Nómina] [Préstamos] [Contratos] [Sistema] ...  │ ← Tabs categoría
│                                                            │
│  Filtros: [Tipo ▾] [Estado ▾] [Prioridad ▾]              │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🟢 Nómina procesada              hace 5 min  [Leer] │ │ ← Click → navegar
│  │    La nómina de Feb 2026 fue procesada.      NORMAL  │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ 🔴 Contrato por vencer           hace 1 hora [Leer] │ │ ← Badge urgente
│  │    Contrato de Juan Pérez vence en 3 días.   URGENTE │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ 🔵 Nuevo empleado registrado     hace 2 horas       │ │
│  │    María López ha sido registrada.           NORMAL  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [← Anterior]  Página 1 de 3  [Siguiente →]              │
└────────────────────────────────────────────────────────────┘
```

### 8.2 Iconos y Colores por Categoría

| Categoría | Icono | Color Base |
|---|---|---|
| `nomina` | `DollarSignIcon` | Verde (emerald) |
| `prestamos` | `CreditCardIcon` | Naranja (amber) |
| `contratos` | `FileTextIcon` | Púrpura (violet) |
| `empleados` | `UsersIcon` | Azul (blue) |
| `proyectos` | `BriefcaseIcon` | Índigo (indigo) |
| `contabilidad` | `BarChart3Icon` | Cyan |
| `seguridad` | `ShieldCheckIcon` | Rojo (rose) |
| `sistema` | `SettingsIcon` | Gris (slate) |
| `general` | `BellIcon` | Gris claro |

### 8.3 Prioridad Visual

| Prioridad | Indicador |
|---|---|
| `baja` | Sin indicador especial |
| `normal` | Badge gris discreto |
| `alta` | Badge naranja + borde izquierdo naranja |
| `urgente` | Badge rojo pulsante + borde izquierdo rojo + toast automático |

---

## 9. Seguridad y Multi-tenant

### 9.1 Filtrado obligatorio por organización

```python
def get_queryset(self):
    return Notificacion.objects.filter(
        usuario=self.request.user,
        organization=self.request.user.organization,  # CRÍTICO
    )
```

### 9.2 Permisos

| Acción | Permiso |
|---|---|
| Ver mis notificaciones | `IsAuthenticated` (cualquier usuario) |
| Marcar leída/no leída | `IsAuthenticated` + es mi notificación |
| Eliminar | `IsAuthenticated` + es mi notificación |
| Crear notificación manual (admin) | `notificaciones.crear` (solo admin/supervisor) |
| Ver notificaciones de otro usuario | `notificaciones.ver_todos` (solo superadmin) |
| Broadcast a organización | `notificaciones.broadcast` (solo admin) |

### 9.3 Rate limiting para creación

- Máximo 100 notificaciones por usuario por hora (evitar spam de signals)
- Deduplicación: no crear la misma notificación (mismo origen_tipo + origen_id + usuario) en < 1 hora

### 9.4 Expiración automática

- Cron/management command que borre notificaciones expiradas (`expires_at < now()`)
- Default: notificaciones info/general expiran a 30 días
- Notificaciones de seguridad: nunca expiran
- Notificaciones leídas: expiran a 7 días

---

## 10. Entregables y Checklist

### Fase 1 — Modelo Unificado
- [ ] Migración: agregar `organization`, `categoria`, `prioridad`, `origen_tipo`, `origen_id`, `expires_at`, `texto_accion` a `Notificacion`
- [ ] Actualizar `NotificacionSerializer` con nuevos campos
- [ ] Actualizar `NotificacionViewSet` con filtros por `categoria` y `prioridad`
- [ ] Agregar endpoint `mark_unread` y `delete_read`
- [ ] Mejorar endpoint `stats` con desglose por categoría
- [ ] Script de backfill: popular `organization` en notificaciones existentes
- [ ] Cambiar `url_accion` de URLField a CharField (para rutas relativas `/dashboard/...`)
- [ ] Tests unitarios del modelo y viewset

### Fase 2 — Motor de Notificaciones
- [ ] Crear `core/notification_engine.py` con `NotificationEngine.notify()`
- [ ] Crear `core/notification_signals.py` con signals para: nómina, préstamo, contrato, empleado
- [ ] Crear management command `check_notifications` para periódicas
- [ ] Registrar signals en `core/apps.py` → `ready()`
- [ ] Tests de cada signal

### Fase 3 — Enforcement de Preferencias  
- [ ] Implementar `_debe_notificar()` consultando `ConfiguracionNotificaciones`
- [ ] Implementar `_dentro_de_horario()` 
- [ ] Implementar `_quiere_email()`
- [ ] Agregar campos `notif_contratos`, `notif_proyectos` a `ConfiguracionNotificaciones`
- [ ] Agregar campo `sonido_enabled` a `ConfiguracionNotificaciones`
- [ ] Tests de preferencias

### Fase 4 — Frontend Mejorado
- [ ] Crear `NotificationContext` + `useNotifications` hook
- [ ] Integrar `NotificationProvider` en App.jsx
- [ ] Refactorizar DashboardLayout para usar `useNotifications()`
- [ ] Agregar notificaciones al SIDEBAR_CONFIG con badge dinámico
- [ ] Rediseñar `NotificacionesPage` con tabs por categoría
- [ ] Agregar indicadores de prioridad (badges, bordes)
- [ ] Hacer notificaciones clickeables (navegar a `url_accion`)
- [ ] Toast automático para notificaciones urgentes
- [ ] Botón "Limpiar leídas"
- [ ] Botón "Marcar como no leída"
- [ ] Actualizar servicio con nuevos endpoints
- [ ] Agregar toggle de sonido en preferencias

### Fase 5 — Email
- [ ] Crear templates HTML por categoría
- [ ] Conectar `NotificationEngine` con `send_system_email()`
- [ ] Respetar `via_email` de ConfiguracionNotificaciones
- [ ] Tests de envío de email

### Fase 6 — SSE Real-Time (Opcional)
- [ ] Implementar vista SSE en backend
- [ ] Implementar EventSource en `NotificationContext`
- [ ] Fallback a polling si SSE falla
- [ ] Tests de conectividad

### Fase 7 — Limpieza
- [ ] Deprecar modelo `core.Notification` (v2)
- [ ] Mover código muerto de `push_notifications.py` a `_deprecated/`
- [ ] Documentar estado de WebSockets (futuro)
- [ ] Remover `notificaciones_context` context processor

---

## 📌 Orden de Implementación Recomendado

```
Fase 1 (Modelo)  →  Fase 2 (Motor)  →  Fase 3 (Preferencias)
                                              │
Fase 4 (Frontend) ←──────────────────────────┘
                                              │
Fase 5 (Email)  ←────────────────────────────┘
                                              │
Fase 7 (Limpieza) ←─────────────────────────┘
                                              │
Fase 6 (SSE) ←── Opcional, después de todo lo demás
```

**Fase 1 y 2 son las más críticas** — sin ellas, el módulo de notificaciones es solo un CRUD vacío que nadie alimenta.

**Fase 4** transforma la experiencia de usuario y le da vida real al módulo.

**Fase 6** es un nice-to-have que puede esperarse hasta que el polling sea insuficiente.
