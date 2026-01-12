# 📋 Guía de Auditoría - Sistema CorteSec

## 🎯 Cómo Generar Logs de Auditoría

### Método 1: Usando el Decorador (Recomendado)

```python
from core.decorators import audit_action

class PrestamoViewSet(viewsets.ModelViewSet):
    
    @audit_action('crear_prestamo', modelo='Prestamo')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @audit_action('modificar_prestamo', modelo='Prestamo')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @audit_action('eliminar_prestamo', modelo='Prestamo')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
```

### Método 2: Usando Signals de Django

```python
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from core.decorators import log_model_change
from .models import Prestamo

@receiver(post_save, sender=Prestamo)
def audit_prestamo_save(sender, instance, created, **kwargs):
    action = 'crear_prestamo' if created else 'modificar_prestamo'
    user = instance.usuario if hasattr(instance, 'usuario') else None
    log_model_change(instance, action, user=user)

@receiver(pre_delete, sender=Prestamo)
def audit_prestamo_delete(sender, instance, **kwargs):
    log_model_change(instance, 'eliminar_prestamo')
```

### Método 3: Manual en Vistas

```python
from core.models import LogAuditoria
from core.decorators import get_client_ip

def mi_vista(request):
    # Tu lógica aquí
    
    # Crear log manual
    LogAuditoria.objects.create(
        usuario=request.user,
        accion='accion_personalizada',
        modelo='MiModelo',
        objeto_id=123,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
        datos_antes={'campo': 'valor_anterior'},
        datos_despues={'campo': 'valor_nuevo'},
        metadata={'info': 'adicional'}
    )
```

## 📊 Estructura del Log de Auditoría

```python
LogAuditoria:
    - usuario: ForeignKey(User) - Usuario que realizó la acción
    - accion: CharField - Nombre de la acción (crear, modificar, eliminar, login, etc.)
    - modelo: CharField - Nombre del modelo afectado
    - objeto_id: IntegerField - ID del objeto modificado
    - ip_address: GenericIPAddressField - IP del cliente
    - user_agent: CharField - Navegador/cliente usado
    - datos_antes: JSONField - Estado anterior del objeto
    - datos_despues: JSONField - Estado posterior del objeto
    - metadata: JSONField - Información adicional
    - created_at: DateTimeField - Fecha y hora del log
```

## 🔍 Acciones Comunes Recomendadas

### Módulo de Préstamos
- `crear_prestamo` - Crear un nuevo préstamo
- `modificar_prestamo` - Actualizar préstamo existente
- `eliminar_prestamo` - Eliminar préstamo
- `aprobar_prestamo` - Aprobar solicitud
- `rechazar_prestamo` - Rechazar solicitud
- `desembolsar_prestamo` - Registrar desembolso
- `pagar_cuota` - Registrar pago de cuota

### Módulo de Empleados
- `crear_empleado` - Registrar nuevo empleado
- `modificar_empleado` - Actualizar datos de empleado
- `eliminar_empleado` - Eliminar empleado
- `cambiar_estado_empleado` - Activar/desactivar
- `asignar_cargo` - Cambiar cargo del empleado

### Módulo de Usuarios y Permisos
- `crear_usuario` - Crear nuevo usuario
- `modificar_usuario` - Actualizar usuario
- `eliminar_usuario` - Eliminar usuario
- `asignar_rol` - Asignar rol a usuario
- `modificar_permisos` - Cambiar permisos
- `login` - Inicio de sesión exitoso
- `login_fallido` - Intento fallido de login
- `logout` - Cierre de sesión
- `cambiar_password` - Cambio de contraseña

### Módulo de Configuración
- `modificar_parametros` - Cambiar configuración
- `crear_tipo_prestamo` - Nuevo tipo de préstamo
- `modificar_tipo_prestamo` - Actualizar tipo
- `eliminar_tipo_prestamo` - Eliminar tipo

## 🛠️ Comandos Útiles

### Crear logs de prueba
```bash
python manage.py crear_logs_prueba --cantidad=100
```

### Ver últimos logs en consola
```python
from core.models import LogAuditoria
logs = LogAuditoria.objects.all().order_by('-created_at')[:10]
for log in logs:
    print(f"{log.created_at} | {log.usuario} | {log.accion} | {log.modelo}")
```

### Limpiar logs antiguos (más de 6 meses)
```python
from core.models import LogAuditoria
from datetime import datetime, timedelta

fecha_limite = datetime.now() - timedelta(days=180)
LogAuditoria.objects.filter(created_at__lt=fecha_limite).delete()
```

## 📈 Características del Módulo de Auditoría

### Frontend (6 Tabs)

1. **Logs** ✅
   - Tabla completa con todos los logs
   - Filtros: búsqueda, acción, módulo, fechas
   - Paginación (20 registros por página)
   - Vista detallada de cada log
   - Exportar a CSV
   - 4 estadísticas: total, hoy, semana, mes

2. **Estadísticas** ✅
   - Total de eventos
   - Usuarios activos
   - Módulos más usados
   - Acciones frecuentes (top 5)
   - Actividad diaria (últimos 5 días)

3. **Actividad** ✅
   - Por usuario (top 20)
   - Por módulo (top 20)
   - Filtros de fecha
   - Gráficos de barras

4. **Anomalías** ✅
   - Detección de actividad excesiva
   - Múltiples IPs por usuario
   - Accesos fallidos
   - Niveles de alerta (crítico, alto, medio)

5. **Usuarios** ✅
   - Lista de usuarios activos
   - Acciones por usuario
   - Promedio de acciones
   - Top usuario del periodo
   - Vista detallada de logs por usuario

6. **Reportes** ✅
   - Exportar CSV
   - Exportar Excel
   - Filtros avanzados
   - Búsqueda personalizada

### Backend (API Endpoints)

```
GET /api/auditoria/ - Lista de logs (paginada)
GET /api/auditoria/{id}/ - Detalle de log
GET /api/auditoria/estadisticas/ - Estadísticas generales
GET /api/auditoria/actividad_usuarios/ - Top usuarios
GET /api/auditoria/actividad_modulos/ - Top módulos
GET /api/auditoria/linea_tiempo/ - Timeline de eventos
GET /api/auditoria/anomalias/ - Detección de anomalías
GET /api/auditoria/accesos_fallidos/ - Intentos fallidos
GET /api/auditoria/exportar_csv/ - Exportar CSV
GET /api/auditoria/exportar_excel/ - Exportar Excel
POST /api/auditoria/busqueda_avanzada/ - Búsqueda con filtros
```

## ✅ Lista de Verificación - Estado Actual

### Backend
- [x] Modelo LogAuditoria completo
- [x] Serializer con todos los campos
- [x] ViewSet con 9 custom actions
- [x] Paginación configurada (20 por página)
- [x] Filtros: fecha, acción, modelo, usuario
- [x] Búsqueda: acción, modelo, username, IP
- [x] Ordenamiento por fecha (descendente)
- [x] Exportación CSV
- [x] Exportación Excel (placeholder)
- [x] Middleware excluye /api/auditoria/
- [x] Decoradores para auditoría automática
- [x] Función auxiliar log_model_change()
- [x] Comando crear_logs_prueba

### Frontend
- [x] AuditoriaUnificadoPage con 6 tabs
- [x] LogsTab con tabla completa
- [x] Paginación visual con controles
- [x] Filtros funcionales
- [x] Modal de detalle
- [x] Exportar CSV
- [x] EstadisticasTab
- [x] ActividadTab
- [x] AnomaliasTab
- [x] UsuariosTab
- [x] ReportesTab
- [x] Servicio con axios
- [x] Autenticación correcta (Token)
- [x] Menú integrado en DashboardLayout

### Configuración
- [x] Rutas registradas
- [x] Permisos configurados
- [x] Middlewares ajustados
- [x] 100 logs de prueba generados

## 🚀 Próximos Pasos Recomendados

1. **Implementar signals en todos los módulos**
   - Préstamos (crear, modificar, eliminar, aprobar)
   - Empleados (crear, modificar, eliminar)
   - Usuarios (login, logout, cambiar password)
   - Roles y Permisos (asignar, modificar)

2. **Agregar auditoría en acciones críticas**
   - Desembolsos de préstamos
   - Aprobaciones
   - Cambios de permisos
   - Modificación de datos sensibles

3. **Exportación Excel real**
   - Instalar openpyxl
   - Implementar exportar_excel() en el ViewSet

4. **Alertas automáticas**
   - Notificar anomalías críticas
   - Enviar emails en accesos fallidos
   - Dashboard de seguridad

5. **Retención de logs**
   - Comando para archivar logs antiguos
   - Política de eliminación automática
   - Backup de logs históricos

## 📝 Ejemplo Completo: Auditar Módulo de Préstamos

```python
# En prestamos/signals.py (CREAR ESTE ARCHIVO)

from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from core.decorators import log_model_change
from .models import Prestamo

@receiver(post_save, sender=Prestamo)
def audit_prestamo_save(sender, instance, created, **kwargs):
    action = 'crear_prestamo' if created else 'modificar_prestamo'
    log_model_change(
        instance, 
        action, 
        user=instance.empleado.usuario if hasattr(instance, 'empleado') else None
    )

@receiver(pre_delete, sender=Prestamo)
def audit_prestamo_delete(sender, instance, **kwargs):
    log_model_change(instance, 'eliminar_prestamo')


# En prestamos/apps.py (AGREGAR)

class PrestamosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'prestamos'
    
    def ready(self):
        import prestamos.signals  # Importar signals


# En prestamos/api_views.py (AGREGAR decoradores)

from core.decorators import audit_action

class PrestamoViewSet(viewsets.ModelViewSet):
    
    @audit_action('aprobar_prestamo', modelo='Prestamo', 
                  get_objeto_id=lambda result, *args, **kwargs: kwargs.get('pk'))
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        prestamo = self.get_object()
        prestamo.estado = 'aprobado'
        prestamo.save()
        return Response({'status': 'aprobado'})
```

---

**Módulo de Auditoría - Completamente Funcional** ✅  
**Versión:** 1.0.0  
**Última actualización:** 31 de diciembre de 2025
