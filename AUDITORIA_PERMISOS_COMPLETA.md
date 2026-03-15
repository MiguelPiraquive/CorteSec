# AUDITORÍA COMPLETA DEL SISTEMA DE PERMISOS Y ROLES - CorteSec
## Fecha: 2026-02-13
## Estado: COMPLETADO

================================================================================
## RESUMEN EJECUTIVO
================================================================================

El sistema de Roles y Permisos (RBAC) de CorteSec ha sido auditado completamente.
La arquitectura está EXCELENTE, pero se han detectado problemas críticos de
configuración que requieren acción inmediata.

### ESTADO GENERAL: ⚠️ ADVERTENCIA CRÍTICA

La infraestructura de seguridad está bien diseñada pero **NO está operativa**:
- ✅ Arquitectura robusta (RBAC + ABAC)
- ✅ 100% de endpoints protegidos con DRF Access Policy
- ✅ Sistema de auditoría completo
- ✅ Multi-tenant implementado
- ❌ CRÍTICO: NINGÚN permiso asignado a roles
- ❌ CRÍTICO: Los usuarios tienen roles vacíos

---

================================================================================
## 1. HALLAZGOS PRINCIPALES
================================================================================

### 1.1 ESTADÍSTICAS DEL SISTEMA

```
USUARIOS:
  Total:               3
  Activos:             3
  Con roles:           3
  Sin roles:           0
  Superusuarios:       2

ROLES:
  Total:               10
  Activos:             10
  Con permisos:        0    ⚠️ CRÍTICO
  Sin permisos:        10   ⚠️ CRÍTICO

PERMISOS:
  Total:               264
  Activos:             264
  Asignados a roles:   0    ⚠️ CRÍTICO
  Sin asignar:         264  ⚠️ CRÍTICO

ASIGNACIONES:
  Total activas:       3
  Vigentes:            0
  Expiradas:           0
```

### 1.2 ROLES EXISTENTES (Todos sin permisos)

1. **Administrador** - 2 usuarios asignados
2. **Empleado** - 1 usuario asignado
3. **Administrador RBAC** - 0 usuarios
4. **Contador RBAC** - 0 usuarios
5. **Contador** - 0 usuarios
6. **Supervisor Nómina RBAC** - 0 usuarios
7. **Super Administrador RBAC** - 0 usuarios
8. **Supervisor** - 0 usuarios
9. **Empleado RBAC** - 0 usuarios
10. **Gerente** - 0 usuarios

### 1.3 MÓDULOS CON PERMISOS DISPONIBLES

Total: **27 módulos** con **264 permisos activos**

Principales módulos:
- Nómina: 35 permisos
- Usuarios: 24 permisos
- Roles y Permisos: 22 permisos
- Contabilidad: 21 permisos
- Préstamos: 21 permisos
- Configuración: 19 permisos
- Core: 19 permisos
- Dashboard: 11 permisos
- Ayuda: 9 permisos
- Cargos: 9 permisos

[... Y 17 módulos más con 4-7 permisos cada uno]

---

================================================================================
## 2. PROBLEMAS CRÍTICOS DETECTADOS
================================================================================

### 🚨 PROBLEMA #1: Roles sin permisos (CRÍTICO)

**Impacto**: ALTO
**Urgencia**: INMEDIATA

**Descripción**:
Los 10 roles del sistema NO tienen permisos asignados. Esto significa que:
- Los usuarios tienen roles asignados
- Pero esos roles no otorgan acceso a ninguna funcionalidad
- Efectivamente, los usuarios no pueden hacer nada en el sistema

**Ejemplo**:
```python
# Usuario "admin" tiene rol "Administrador"
# Pero rol "Administrador" tiene 0 permisos
# Por lo tanto, admin NO puede acceder a nada
```

**Solución requerida**: Asignar permisos apropiados a cada rol

---

### 🚨 PROBLEMA #2: 264 permisos sin asignar (CRÍTICO)

**Impacto**: ALTO
**Urgencia**: INMEDIATA

**Descripción**:
Todos los 264 permisos activos del sistema están disponibles pero NO han sido asignados a ningún rol.

**Solución requerida**: Crear matriz de permisos y asignarlos a roles

---

### ⚠️ PROBLEMA #3: 8 roles sin usuarios (ADVERTENCIA)

**Impacto**: BAJO
**Urgencia**: MEDIA

**Descripción**:
8 de 10 roles no tienen usuarios asignados. Pueden ser roles preparados para el futuro o roles obsoletos.

**Roles sin usuarios**:
- Administrador RBAC
- Contador RBAC
- Contador
- Supervisor Nómina RBAC
- Super Administrador RBAC
- Supervisor
- Empleado RBAC
- Gerente

**Solución requerida**: Revisar y eliminar roles obsoletos o asignar usuarios

---

================================================================================
## 3. ARQUITECTURA DEL SISTEMA (Evaluación Positiva)
================================================================================

### 3.1 FORTALEZAS DEL DISEÑO

✅ **DRF Access Policy Implementado**
- 100% de cobertura en todas las apps
- Políticas personalizadas por ViewSet
- Integración con sistema de permisos

✅ **Middleware de Seguridad Robusto**
```python
MIDDLEWARE = [
    'core.middleware.tenant.TenantMiddleware',          # Multi-tenant
    'core.middleware.permissions.PermissionMiddleware',  # Permisos
    'core.middleware.api_security.APISecurityMiddleware', # Seguridad API
    'core.middleware.role_verification.RoleVerificationMiddleware',  # Roles
]
```

✅ **Modelos Completos**
- roles/models.py: 16 modelos (Rol, AsignacionRol, TipoRol, etc.)
- permisos/models.py: 8 modelos (Permiso, ModuloSistema, CondicionPermiso, etc.)
- Soporte de jerarquías
- Control temporal
- Auditoría completa

✅ **Servicios Empresariales**
- RolService: Gestión completa de roles
- DirectPermissionService: Permisos directos
- PermissionAnalyticsService: Análisis y estadísticas
- Cache inteligente (300s TTL)

✅ **Management Commands**
- audit_permisos: Auditoría completa con export JSON
- reporte_permisos_usuario: Análisis individual
- listar_usuarios_sin_roles: Detecta usuarios sin protección
- limpiar_asignaciones_expiradas: Mantenimiento automático

---

================================================================================
## 4. PLAN DE ACCIÓN REQUERIDO
================================================================================

### FASE 1: CORRECCIÓN URGENTE (Prioridad CRÍTICA - Hoy)

#### Paso 1: Asignar permisos básicos al rol "Administrador"

```bash
cd backend
python manage.py shell
```

```python
from roles.models import Rol
from permisos.models import Permiso

# Obtener rol Administrador
admin_rol = Rol.objects.get(codigo='ADMIN')  # Ajustar código según tu BD

# Asignar TODOS los permisos al Administrador
todos_permisos = Permiso.objects.filter(activo=True)
admin_rol.permisos.add(*todos_permisos)

print(f"✓ Asignados {todos_permisos.count()} permisos al rol Administrador")
```

#### Paso 2: Asignar permisos básicos al rol "Empleado"

```python
# Obtener rol Empleado
empleado_rol = Rol.objects.get(codigo='EMPLEADO')  # Ajustar código

# Asignar permisos de lectura básicos
permisos_lectura = Permiso.objects.filter(
    codigo__icontains='list',  # Permisos de listar
    activo=True
)
empleado_rol.permisos.add(*permisos_lectura)

# Agregar permiso de ver su propio perfil
perfil_permisos = Permiso.objects.filter(
    modulo__codigo='perfil',
    activo=True
)
empleado_rol.permisos.add(*perfil_permisos)

print(f"✓ Asignados permisos básicos al rol Empleado")
```

#### Paso 3: Verificar la asignación

```bash
python manage.py reporte_permisos_usuario <username>
```

---

### FASE 2: CONFIGURACIÓN COMPLETA (Prioridad ALTA - Esta semana)

#### 2.1 Crear Matriz de Permisos por Rol

Archivo: `docs/MATRIZ_PERMISOS_ROLES.md`

| Rol | Módulo | Permisos |
|-----|--------|----------|
| Super Admin | Todos | create, read, update, delete, list |
| Administrador | Usuarios, Roles, Config | create, read, update, delete, list |
| Contador | Contabilidad, Nomina, Prestamos | create, read, update, list |
| Supervisor | Empleados, Cargos, Contratos | read, update, list |
| Empleado | Perfil, Dashboard | read, list |

#### 2.2 Script de Inicialización Automática

Crear `backend/roles/management/commands/init_permisos_roles.py`:

```python
from django.core.management.base import BaseCommand
from roles.models import Rol
from permisos.models import Permiso, ModuloSistema

class Command(BaseCommand):
    help = 'Inicializa permisos en roles según matriz definida'

    def handle(self, *args, **options):
        # Matriz de permisos
        matriz = {
            'SUPER_ADMIN': {
                'modulos': ['*'],  # Todos
                'acciones': ['*']   # Todas
            },
            'ADMIN': {
                'modulos': ['usuarios', 'roles', 'configuracion'],
                'acciones': ['create', 'read', 'update', 'delete', 'list']
            },
            'CONTADOR': {
                'modulos': ['contabilidad', 'nomina', 'prestamos'],
                'acciones': ['create', 'read', 'update', 'list']
            },
            # ... resto de roles
        }

        for codigo_rol, config in matriz.items():
            try:
                rol = Rol.objects.get(codigo=codigo_rol)

                # Limpiar permisos actuales
                rol.permisos.clear()

                # Asignar nuevos permisos según matriz
                if config['modulos'] == ['*']:
                    # Todos los permisos
                    permisos = Permiso.objects.filter(activo=True)
                else:
                    # Permisos filtrados
                    modulos = ModuloSistema.objects.filter(codigo__in=config['modulos'])
                    permisos = Permiso.objects.filter(
                        modulo__in=modulos,
                        activo=True
                    )

                    if config['acciones'] != ['*']:
                        # Filtrar por acciones específicas
                        permisos = permisos.filter(
                            codigo__regex=r':(' + '|'.join(config['acciones']) + r')$'
                        )

                rol.permisos.add(*permisos)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ {rol.nombre}: {permisos.count()} permisos asignados'
                    )
                )

            except Rol.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f'⚠ Rol {codigo_rol} no encontrado')
                )
```

Ejecutar:
```bash
python manage.py init_permisos_roles
```

---

### FASE 3: VALIDACIÓN (Prioridad ALTA - Esta semana)

#### 3.1 Pruebas Funcionales

```bash
# 1. Verificar que usuarios con roles pueden acceder
python manage.py reporte_permisos_usuario admin
python manage.py reporte_permisos_usuario empleado1

# 2. Verificar roles sin usuarios
python manage.py listar_usuarios_sin_roles

# 3. Auditoría completa
python manage.py audit_permisos --exportar audit_post_fix.json
```

#### 3.2 Pruebas de API

Crear `tests/test_permisos_roles_integration.py`:

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from roles.models import Rol, AsignacionRol

User = get_user_model()

class PermisosRolesIntegrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Crear usuario con rol Empleado
        self.empleado = User.objects.create_user(
            username='test_empleado',
            password='test123'
        )
        rol_empleado = Rol.objects.get(codigo='EMPLEADO')
        AsignacionRol.objects.create(
            usuario=self.empleado,
            rol=rol_empleado,
            activa=True
        )

    def test_empleado_puede_listar_su_perfil(self):
        """Empleado debe poder ver su propio perfil"""
        self.client.force_authenticate(user=self.empleado)
        response = self.client.get('/api/perfil/')
        self.assertEqual(response.status_code, 200)

    def test_empleado_no_puede_crear_usuarios(self):
        """Empleado NO debe poder crear usuarios"""
        self.client.force_authenticate(user=self.empleado)
        response = self.client.post('/api/usuarios/', {
            'username': 'nuevo_user',
            'password': 'pass123'
        })
        self.assertEqual(response.status_code, 403)  # Forbidden
```

Ejecutar:
```bash
python manage.py test tests.test_permisos_roles_integration
```

---

### FASE 4: MONITOREO Y MANTENIMIENTO (Prioridad MEDIA - Próxima semana)

#### 4.1 Dashboard de Permisos

Archivo: `backend/dashboard/permisos_dashboard.py`

```python
from django.db.models import Count
from roles.models import Rol, AsignacionRol
from permisos.models import Permiso

def get_permisos_dashboard_stats():
    """Obtiene estadísticas para dashboard de permisos"""

    stats = {
        'roles_total': Rol.objects.count(),
        'roles_activos': Rol.objects.filter(activo=True).count(),
        'roles_sin_permisos': Rol.objects.annotate(
            num_permisos=Count('permisos')
        ).filter(num_permisos=0).count(),

        'permisos_total': Permiso.objects.count(),
        'permisos_activos': Permiso.objects.filter(activo=True).count(),
        'permisos_sin_asignar': Permiso.objects.annotate(
            num_roles=Count('roles_asignados')
        ).filter(num_roles=0).count(),

        'usuarios_con_roles': AsignacionRol.objects.filter(
            activa=True
        ).values('usuario').distinct().count(),

        'asignaciones_expiradas': AsignacionRol.objects.filter(
            activa=True,
            fecha_fin__lt=timezone.now()
        ).count(),
    }

    return stats
```

Agregar endpoint en `dashboard/api_views.py`:

```python
@api_view(['GET'])
def permisos_stats_view(request):
    """Estadísticas de permisos para dashboard"""
    stats = get_permisos_dashboard_stats()
    return Response(stats)
```

#### 4.2 Alertas Automáticas

Archivo: `backend/roles/management/commands/check_permisos_health.py`

```python
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from roles.models import Rol
from permisos.models import Permiso

class Command(BaseCommand):
    help = 'Verifica salud del sistema de permisos y envía alertas'

    def handle(self, *args, **options):
        problemas = []

        # Verificar roles sin permisos
        roles_vacios = Rol.objects.annotate(
            num_permisos=Count('permisos')
        ).filter(num_permisos=0, activo=True)

        if roles_vacios.exists():
            problemas.append(
                f"⚠ {roles_vacios.count()} roles activos sin permisos"
            )

        # Verificar permisos sin asignar
        permisos_huerfanos = Permiso.objects.annotate(
            num_roles=Count('roles_asignados')
        ).filter(num_roles=0, activo=True)

        if permisos_huerfanos.count() > 100:
            problemas.append(
                f"⚠ {permisos_huerfanos.count()} permisos sin asignar"
            )

        # Enviar alerta si hay problemas
        if problemas:
            mensaje = "\\n".join(problemas)
            send_mail(
                'Alerta: Problemas en Sistema de Permisos',
                mensaje,
                'sistema@cortesec.com',
                ['admin@cortesec.com'],
                fail_silently=False,
            )

            self.stdout.write(self.style.ERROR(f"❌ Alertas enviadas:\\n{mensaje}"))
        else:
            self.stdout.write(self.style.SUCCESS("✓ Sistema de permisos saludable"))
```

Configurar en crontab (Linux) o Task Scheduler (Windows):
```bash
# Ejecutar cada día a las 9 AM
0 9 * * * cd /path/to/backend && python manage.py check_permisos_health
```

---

================================================================================
## 5. GUÍA RÁPIDA PARA EL EQUIPO
================================================================================

### 5.1 ¿Cómo asignar permisos a un rol?

**Opción 1: Desde Python/Shell**

```python
from roles.models import Rol
from permisos.models import Permiso

# Obtener rol
rol = Rol.objects.get(codigo='CONTADOR')

# Obtener permisos del módulo Contabilidad
permisos_conta = Permiso.objects.filter(
    modulo__codigo='contabilidad',
    activo=True
)

# Asignar permisos al rol
rol.permisos.add(*permisos_conta)

# Verificar
print(f"Rol {rol.nombre} tiene {rol.permisos.count()} permisos")
```

**Opción 2: Desde Admin de Django**

1. Ir a `/admin/roles/rol/`
2. Seleccionar el rol
3. En el campo "Permisos", seleccionar los permisos deseados
4. Guardar

**Opción 3: Usando API (si está disponible)**

```bash
curl -X POST http://localhost:8000/api/roles/123/asignar-permisos/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permisos_ids": [1, 2, 3, 4, 5]
  }'
```

### 5.2 ¿Cómo asignar un rol a un usuario?

```python
from django.contrib.auth import get_user_model
from roles.models import Rol, AsignacionRol

User = get_user_model()

# Obtener usuario y rol
usuario = User.objects.get(username='juan.perez')
rol = Rol.objects.get(codigo='EMPLEADO')

# Crear asignación
AsignacionRol.objects.create(
    usuario=usuario,
    rol=rol,
    activa=True,
    asignado_por=request.user,  # Usuario que hace la asignación
    justificacion="Incorporación como empleado"
)
```

### 5.3 ¿Cómo verificar permisos de un usuario?

```bash
# Desde línea de comandos
python manage.py reporte_permisos_usuario juan.perez

# Exportar a JSON
python manage.py reporte_permisos_usuario juan.perez --exportar juan_permisos.json
```

### 5.4 ¿Cómo crear un nuevo rol?

```python
from roles.models import Rol, TipoRol

# Obtener tipo de rol (o crear uno nuevo)
tipo_operativo = TipoRol.objects.get_or_create(
    nombre='Operativo',
    defaults={'descripcion': 'Roles operativos del sistema'}
)[0]

# Crear rol
nuevo_rol = Rol.objects.create(
    nombre='Analista de Datos',
    codigo='ANALISTA_DATOS',
    descripcion='Rol para analistas con acceso a reportes y dashboard',
    tipo_rol=tipo_operativo,
    activo=True,
    creado_por=request.user
)

# Asignar permisos necesarios
permisos_analista = Permiso.objects.filter(
    modulo__codigo__in=['dashboard', 'reportes'],
    activo=True
)
nuevo_rol.permisos.add(*permisos_analista)
```

---

================================================================================
## 6. COMANDOS ÚTILES DE MANTENIMIENTO
================================================================================

### Auditoría y Reportes

```bash
# Auditoría completa del sistema
python manage.py audit_permisos --exportar audit_$(date +%Y%m%d).json

# Reporte de permisos de un usuario específico
python manage.py reporte_permisos_usuario username

# Listar usuarios sin roles ni permisos
python manage.py listar_usuarios_sin_roles

# Exportar lista a CSV
python manage.py listar_usuarios_sin_roles --exportar usuarios_sin_proteccion.csv
```

### Mantenimiento

```bash
# Limpiar asignaciones expiradas
python manage.py limpiar_asignaciones_expiradas

# Modo dry-run (simular sin hacer cambios)
python manage.py limpiar_asignaciones_expiradas --dry-run

# Verificar salud del sistema
python manage.py check_permisos_health
```

### Desarrollo y Debugging

```bash
# Ver estado de migraciones
python manage.py showmigrations roles permisos

# Crear migraciones si hay cambios en modelos
python manage.py makemigrations roles permisos

# Aplicar migraciones
python manage.py migrate

# Verificar configuración
python manage.py check

# Verificar configuración para producción
python manage.py check --deploy
```

---

================================================================================
## 7. RECURSOS ADICIONALES
================================================================================

### Archivos de Configuración Importantes

- `backend/roles/models.py` - 16 modelos de roles
- `backend/permisos/models.py` - 8 modelos de permisos
- `backend/roles/services.py` - Servicios de gestión de roles
- `backend/permisos/services.py` - Servicios de gestión de permisos
- `backend/core/policies/utils.py` - Utilidades de verificación de permisos
- `backend/contractor_management/settings.py` - Configuración global

### Management Commands Disponibles

Ubicación: `backend/roles/management/commands/`

- `audit_permisos.py` - Auditoría completa
- `reporte_permisos_usuario.py` - Reporte individual de usuario
- `listar_usuarios_sin_roles.py` - Detectar usuarios desprotegidos
- `limpiar_asignaciones_expiradas.py` - Limpieza automática
- `init_permisos_roles.py` - (A crear) Inicialización de permisos por rol

### Documentación de Arquitectura

- **DRF Access Policy**: https://rsinger86.github.io/drf-access-policy/
- **Django Permissions**: https://docs.djangoproject.com/en/stable/topics/auth/default/#permissions
- **Documentación interna**: Ver archivos RBAC_*.md en la raíz del proyecto

---

================================================================================
## 8. CONTACTO Y SOPORTE
================================================================================

Para preguntas sobre el sistema de permisos:
- **Arquitectura**: Ver `RBAC_ARCHITECTURE.md`
- **Implementación**: Ver `IMPLEMENTACION_RBAC.md`
- **Registro de cambios**: Ver `CHANGELOG_RBAC.md`

---

## FIN DEL REPORTE
## Próxima revisión: 1 semana después de implementar FASE 1 y FASE 2

================================================================================
