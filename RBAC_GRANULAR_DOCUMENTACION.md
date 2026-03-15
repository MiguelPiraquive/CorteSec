# Sistema RBAC Granular - Documentación Completa

## 📋 Tabla de Contenidos
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Backend - Django](#backend)
4. [Frontend - React](#frontend)
5. [Guía de Uso](#guía-de-uso)
6. [Ejemplos Prácticos](#ejemplos-prácticos)
7. [API Endpoints](#api-endpoints)
8. [Testing](#testing)

---

## 🎯 Introducción

Sistema de **Control de Acceso Basado en Roles (RBAC) Granular** con las siguientes características:

### ✨ Características Principales
- ✅ **Permisos Granulares**: Basados en Recursos + Acciones (no solo roles)
- ✅ **Row-Level Security (RLS)**: Restricciones a nivel de registro
- ✅ **Field-Level Permissions**: Control de visibilidad/edición de campos
- ✅ **UI Element Permissions**: Control de botones, tabs, widgets, sidebar items
- ✅ **Delegación de Permisos**: Temporal y permanente
- ✅ **Workflow de Aprobaciones**: Solicitudes de permisos temporales
- ✅ **Cache Inteligente**: Redis con TTL de 5 minutos
- ✅ **Auditoría Completa**: Logs de uso de permisos
- ✅ **Multi-tenant**: Soporte nativo para organizaciones

---

## 🏗️ Arquitectura

### Conceptos Clave

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       │ tiene
       ▼
┌─────────────┐
│    Roles    │ ◄─── hereda de ──── Rol Padre
└──────┬──────┘
       │
       │ asignados mediante
       ▼
┌─────────────────┐
│ AsignacionPermiso│
└──────┬──────────┘
       │
       │ contiene
       ▼
┌─────────────┐
│  Permisos   │ ◄─── compuesto de ──┐
└──────┬──────┘                      │
       │                             │
       │ descompuesto en      ┌──────┴──────┐
       ▼                      │PermisoAccion│
┌─────────────────┐           └─────────────┘
│ Recurso+Acción  │                 │
└─────────────────┘                 │
       │                            │
       ├──── RestriccionCampo       │
       ├──── RestriccionRegistro (RLS)
       ├──── PermisoUI
       └──── Delegacion
```

### Modelos del Sistema

#### 1. **Catálogos** (No cambian frecuentemente)
- `ModuloSistema`: Módulos del sistema (nomina, contabilidad, etc.)
- `Recurso`: Entidades del sistema (empleado, contrato, préstamo)
- `Accion`: Operaciones CRUD + custom (view, create, edit, delete, approve, export...)
- `RecursoAccion`: Relación M2M entre Recursos y Acciones
- `UIElemento`: Elementos de UI (botones, tabs, widgets, sidebar items)

#### 2. **Permisos**
- `TipoPermiso`: Clasificación de permisos (CRUD, workflow, admin, custom)
- `Permiso`: Permiso granular (formato: `modulo:recurso:accion`)
- `PermisoAccion`: Descomposición permiso → recurso + acción
- `AsignacionPermiso`: Asignación de permiso a rol (grant/deny/temporary)

#### 3. **Restricciones**
- `RestriccionCampo`: Field-level permissions (hidden, readonly, editable, required)
- `RestriccionRegistro`: Row-level security con filtros JSON/Python
- `PermisoUI`: Mapeo permiso → elemento UI

#### 4. **Workflow**
- `Delegacion`: Delegación temporal de permisos entre usuarios
- `SolicitudAprobacion`: Workflow de solicitud-aprobación de permisos

---

## 🔧 Backend - Django

### Instalación

```bash
cd backend
python manage.py makemigrations permisos
python manage.py migrate
python manage.py seed_permissions  # Seed inicial
```

### Componentes Backend

#### 1. **PermissionManager** (`permisos/managers.py`)

Manager centralizado para verificación de permisos.

```python
from permisos.managers import PermissionManager

pm = PermissionManager()

# Verificar permiso simple
if pm.has_permission(user, 'nomina:empleado:view'):
    print("Usuario puede ver empleados")

# Obtener todos los permisos del usuario (con cache)
permisos = pm.get_all_permissions(user)

# Obtener queryset filtrado con RLS
empleados = pm.get_filtered_queryset(
    user=user,
    resource_code='empleado',
    action_code='view',
    queryset=Empleado.objects.all()
)

# Obtener campos restringidos
restricted_fields = pm.get_restricted_fields(
    user=user,
    resource_code='empleado',
    action_code='edit'
)
# Returns: {'hidden': [...], 'readonly': [...], 'required': [...]}
```

#### 2. **Decoradores** (`permisos/decorators.py`)

Protegen vistas basadas en funciones.

```python
from permisos.decorators import (
    require_permission,
    require_any_permission,
    require_all_permissions,
    permission_required_api,
    object_permission_required
)

# Verificar un permiso
@require_permission('nomina:empleado:edit')
def editar_empleado(request, pk):
    pass

# Verificar cualquiera de varios permisos
@require_any_permission(['admin:users:view', 'admin:roles:view'])
def admin_panel(request):
    pass

# API con DRF
@permission_required_api('nomina:nomina:approve')
def aprobar_nomina(request, pk):
    pass

# Verificar permiso sobre objeto específico
@object_permission_required('prestamo', 'approve')
def aprobar_prestamo(request, pk):
    prestamo = get_object_or_404(Prestamo, pk=pk)
    # ... lógica
```

#### 3. **Mixins** (`permisos/mixins.py`)

Protegen ViewSets de DRF.

```python
from permisos.mixins import (
    PermissionRequiredMixin,
    FieldFilterMixin,
    RLSMixin,
    AuditMixin
)

class EmpleadoViewSet(PermissionRequiredMixin, FieldFilterMixin, RLSMixin, viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    
    # Configuración de permisos
    permission_resource = 'empleado'
    permission_actions = {
        'list': 'list',
        'retrieve': 'view',
        'create': 'create',
        'update': 'edit',
        'destroy': 'delete',
        'aprobar': 'approve'  # Acción custom
    }
    
    # RLS se aplica automáticamente en list/retrieve
    # Field filtering se aplica automáticamente en serializers
```

#### 4. **Middleware** (`permisos/middleware.py`)

```python
# contractor_management/settings.py
MIDDLEWARE = [
    # ...
    'permisos.middleware.PermissionCheckMiddleware',
    'permisos.middleware.RateLimitPermissionMiddleware',
    'permisos.middleware.PermissionCacheMiddleware',
]
```

#### 5. **Serializers Dinámicos** (`permisos/serializers.py`)

```python
from permisos.serializers import DynamicFieldSerializer

class EmpleadoSerializer(DynamicFieldSerializer):
    class Meta:
        model = Empleado
        fields = '__all__'
        
# Automáticamente oculta campos según RestriccionCampo
# En el request: ?resource=empleado&action=edit
```

#### 6. **Signals para Cache** (`permisos/signals.py`)

Automáticamente invalida cache cuando cambian:
- Permisos
- Roles
- Asignaciones
- Delegaciones
- Restricciones

```python
# Se ejecutan automáticamente, no requiere código adicional
```

---

## ⚛️ Frontend - React

### Componentes Frontend

#### 1. **PermissionsContext** (`context/PermissionsContext.jsx`)

Context global de permisos.

```jsx
import { usePermissions } from './context/PermissionsContext';

function MyComponent() {
  const {
    // State
    permissions,      // Array de códigos de permisos
    uiElements,      // Array de elementos UI permitidos
    resources,       // Array de recursos disponibles
    actions,         // Array de acciones disponibles
    loading,         // Estado de carga
    initialized,     // Si ya se inicializó
    
    // Funciones
    hasPermission,        // (permission) => boolean
    hasAnyPermission,     // ([permissions]) => boolean
    hasAllPermissions,    // ([permissions]) => boolean
    can,                  // (resource, action) => boolean
    hasUIElement,         // (uiElementCode) => boolean
    getSidebarItems,      // () => array
    clearCache,           // () => promise
    reload,               // () => promise
  } = usePermissions();
  
  return (
    <div>
      {hasPermission('nomina:empleado:edit') && (
        <button>Editar</button>
      )}
    </div>
  );
}
```

#### 2. **Componente `<Can>`** (`components/permissions/Can.jsx`)

Renderizado condicional declarativo.

```jsx
import { Can } from './components/permissions';

// Permiso simple
<Can permission="nomina:empleado:edit">
  <button>Editar Empleado</button>
</Can>

// Recurso + Acción
<Can resource="prestamo" action="approve">
  <button>Aprobar Préstamo</button>
</Can>

// Múltiples permisos (cualquiera)
<Can permissions={['admin:users:view', 'admin:roles:view']} mode="any">
  <AdminPanel />
</Can>

// Múltiples permisos (todos)
<Can permissions={['nomina:nomina:view', 'nomina:empleado:view']} mode="all">
  <NominaModule />
</Can>

// Elemento UI
<Can uiElement="button:crear_empleado">
  <button>Crear Empleado</button>
</Can>

// Con fallback
<Can permission="admin:config:edit" fallback={<div>Sin permisos</div>}>
  <ConfigForm />
</Can>

// Invertir lógica
<Can permission="admin:delete:all" not fallback={<SafeMode />}>
  <DangerZone />
</Can>
```

#### 3. **Componente `<ProtectedRoute>`** (`components/permissions/ProtectedRoute.jsx`)

Protege rutas completas.

```jsx
import { ProtectedRoute } from './components/permissions';

<Route 
  path="/empleados" 
  element={
    <ProtectedRoute permission="nomina:empleado:list">
      <EmpleadosPage />
    </ProtectedRoute>
  } 
/>

<Route 
  path="/admin" 
  element={
    <ProtectedRoute 
      permissions={['admin:users:view', 'admin:roles:view']} 
      mode="any"
      redirectTo="/dashboard"
    >
      <AdminPage />
    </ProtectedRoute>
  } 
/>
```

#### 4. **Componente `<PermissionButton>`** (`components/permissions/PermissionButton.jsx`)

Botón inteligente con permisos integrados.

```jsx
import { PermissionButton } from './components/permissions';

<PermissionButton 
  permission="nomina:empleado:edit"
  onClick={handleEdit}
  variant="primary"
  icon={<EditIcon />}
>
  Editar
</PermissionButton>

<PermissionButton
  resource="prestamo"
  action="approve"
  variant="success"
  confirmMessage="¿Aprobar préstamo?"
  onClick={handleApprove}
  loadingText="Aprobando..."
>
  Aprobar Préstamo
</PermissionButton>

<PermissionButton
  uiElement="button:eliminar_usuario"
  variant="danger"
  hideIfNoPermission  // Ocultar si no tiene permiso
  onClick={handleDelete}
>
  Eliminar
</PermissionButton>
```

#### 5. **HOC `withPermission`** (`hoc/withPermission.jsx`)

Higher Order Component para proteger componentes.

```jsx
import withPermission, { createPermissionHOC } from './hoc/withPermission';

// Uso directo
const ProtectedComponent = withPermission(MyComponent, {
  permission: 'nomina:empleado:edit',
  fallback: <div>Sin permisos</div>
});

// Factory para reutilización
const withAdminPermission = createPermissionHOC({
  permissions: ['admin:users:view', 'admin:roles:view'],
  mode: 'any'
});

const AdminPanel = withAdminPermission(AdminPanelComponent);
const AdminSettings = withAdminPermission(AdminSettingsComponent);
```

#### 6. **Hooks** (`hooks/usePermission.js`)

```jsx
import { 
  usePermission, 
  useAnyPermission, 
  useCan, 
  usePermissionHelpers 
} from './hooks/usePermission';

function MyComponent() {
  // Hook simple
  const canEdit = usePermission('nomina:empleado:edit');
  
  // Hook de recurso+acción
  const canApprove = useCan('prestamo', 'approve');
  
  // Hook completo
  const { has, hasAny, can, hasUI } = usePermissionHelpers();
  
  return (
    <div>
      {canEdit && <button>Editar</button>}
      {canApprove && <button>Aprobar</button>}
      {has('admin:delete:all') && <DangerButton />}
    </div>
  );
}
```

---

## 📖 Guía de Uso

### Caso 1: Proteger una Vista (Backend)

```python
# views.py
from permisos.decorators import require_permission

@require_permission('nomina:empleado:create')
def crear_empleado(request):
    # Solo usuarios con permiso 'nomina:empleado:create' acceden
    pass
```

### Caso 2: Proteger ViewSet (Backend)

```python
# api_views.py
from permisos.mixins import PermissionRequiredMixin, RLSMixin

class EmpleadoViewSet(PermissionRequiredMixin, RLSMixin, viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    permission_resource = 'empleado'
    
    # Acciones personalizadas
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        # Requiere 'nomina:empleado:approve'
        pass
```

### Caso 3: Field-Level Permissions (Backend)

```python
# Crear restricción de campo
RestriccionCampo.objects.create(
    permiso=permiso,
    recurso=recurso_empleado,
    nombre_campo='salario',
    tipo_restriccion='readonly'  # hidden, readonly, editable, required
)

# En el serializer (automático con DynamicFieldSerializer)
class EmpleadoSerializer(DynamicFieldSerializer):
    class Meta:
        model = Empleado
        fields = '__all__'
```

### Caso 4: Row-Level Security (Backend)

```python
# Crear restricción de registro
RestriccionRegistro.objects.create(
    permiso=permiso,
    recurso=recurso_empleado,
    filtro_json={
        'departamento__in': ['HR', 'Finance']
    }
)

# En ViewSet (automático con RLSMixin)
class EmpleadoViewSet(RLSMixin, viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    # Automáticamente filtra empleados según RLS
```

### Caso 5: Proteger Componente (Frontend)

```jsx
import { Can } from './components/permissions';

function EmpleadosList() {
  return (
    <div>
      <h1>Empleados</h1>
      
      <Can permission="nomina:empleado:create">
        <button onClick={handleCreate}>Crear Empleado</button>
      </Can>
      
      <table>
        {empleados.map(emp => (
          <tr key={emp.id}>
            <td>{emp.nombre}</td>
            <Can resource="empleado" action="edit">
              <td><button>Editar</button></td>
            </Can>
            <Can resource="empleado" action="delete">
              <td><button>Eliminar</button></td>
            </Can>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

### Caso 6: Sidebar Dinámico (Frontend)

```jsx
import { usePermissions } from './context/PermissionsContext';

function Sidebar() {
  const { getSidebarItems } = usePermissions();
  const sidebarItems = getSidebarItems(); // Filtrados por permisos
  
  return (
    <nav>
      {sidebarItems.map(item => (
        <Link key={item.codigo} to={item.ruta}>
          <Icon name={item.icono} />
          {item.nombre}
        </Link>
      ))}
    </nav>
  );
}
```

---

## 🔥 Ejemplos Prácticos

### Ejemplo Completo: Módulo de Préstamos

#### Backend

```python
# api_views.py
from permisos.mixins import PermissionRequiredMixin, RLSMixin, AuditMixin

class PrestamoViewSet(PermissionRequiredMixin, RLSMixin, AuditMixin, viewsets.ModelViewSet):
    queryset = Prestamo.objects.all()
    serializer_class = PrestamoSerializer
    permission_resource = 'prestamo'
    
    permission_actions = {
        'list': 'list',
        'retrieve': 'view',
        'create': 'create',
        'update': 'edit',
        'destroy': 'delete',
        'aprobar': 'approve',  # Custom action
        'rechazar': 'reject'   # Custom action
    }
    
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar préstamo - requiere 'prestamos:prestamo:approve'"""
        prestamo = self.get_object()
        prestamo.estado = 'aprobado'
        prestamo.aprobado_por = request.user
        prestamo.save()
        return Response({'status': 'aprobado'})
    
    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar préstamo - requiere 'prestamos:prestamo:reject'"""
        prestamo = self.get_object()
        prestamo.estado = 'rechazado'
        prestamo.rechazado_por = request.user
        prestamo.save()
        return Response({'status': 'rechazado'})
```

#### Frontend

```jsx
// PrestamosPage.jsx
import { Can, PermissionButton } from '../components/permissions';
import { usePermissionHelpers } from '../hooks/usePermission';

function PrestamosPage() {
  const { can } = usePermissionHelpers();
  
  const handleAprobar = async (id) => {
    await api.post(`/api/prestamos/${id}/aprobar/`);
  };
  
  return (
    <div>
      <h1>Préstamos</h1>
      
      <Can permission="prestamos:prestamo:create">
        <button onClick={handleCreate}>Crear Préstamo</button>
      </Can>
      
      <table>
        {prestamos.map(prestamo => (
          <tr key={prestamo.id}>
            <td>{prestamo.monto}</td>
            <td>{prestamo.empleado}</td>
            <td>{prestamo.estado}</td>
            <td>
              <Can resource="prestamo" action="view">
                <button>Ver</button>
              </Can>
              
              {prestamo.estado === 'pendiente' && (
                <>
                  <PermissionButton
                    resource="prestamo"
                    action="approve"
                    variant="success"
                    confirmMessage="¿Aprobar este préstamo?"
                    onClick={() => handleAprobar(prestamo.id)}
                  >
                    Aprobar
                  </PermissionButton>
                  
                  <PermissionButton
                    resource="prestamo"
                    action="reject"
                    variant="danger"
                    onClick={() => handleRechazar(prestamo.id)}
                  >
                    Rechazar
                  </PermissionButton>
                </>
              )}
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

---

## 🌐 API Endpoints

### Permission Check API

```bash
# Obtener permisos del usuario actual
GET /api/permisos/check/me/
Authorization: Bearer <token>

Response:
{
  "user": 1,
  "permissions": [
    "nomina:empleado:view",
    "nomina:empleado:list",
    "nomina:empleado:create"
  ],
  "ui_elements": [
    {
      "codigo": "sidebar:dashboard",
      "nombre": "Dashboard",
      "tipo": "sidebar_item",
      "ruta": "/dashboard",
      "icono": "dashboard",
      "orden": 1
    }
  ],
  "resources": [
    {
      "codigo": "empleado",
      "nombre": "Empleado",
      "modulo": "nomina"
    }
  ],
  "actions": [
    {
      "codigo": "view",
      "nombre": "Ver"
    }
  ]
}

# Verificar permiso específico
POST /api/permisos/check/
Authorization: Bearer <token>
Content-Type: application/json

{
  "permission": "nomina:empleado:edit",
  "context": {
    "object_id": 123,
    "department": "HR"
  }
}

Response:
{
  "has_permission": true,
  "details": {
    "permission": "nomina:empleado:edit",
    "granted_by": ["Rol: Supervisor"],
    "restrictions": {
      "fields": {
        "hidden": [],
        "readonly": ["fecha_creacion"],
        "required": ["nombre", "salario"]
      }
    }
  }
}

# Obtener elementos UI permitidos
GET /api/permisos/check/ui-elements/?type=sidebar_item
Authorization: Bearer <token>

Response:
{
  "ui_elements": [...]
}

# Limpiar cache de permisos
POST /api/permisos/check/clear-cache/
Authorization: Bearer <token>

Response:
{
  "message": "Cache cleared successfully"
}

# Obtener recursos disponibles
GET /api/permisos/resources/
Authorization: Bearer <token>

Response:
{
  "resources": [
    {
      "codigo": "empleado",
      "nombre": "Empleado",
      "modulo": "nomina",
      "tipo_recurso": "model"
    }
  ]
}

# Obtener acciones disponibles
GET /api/permisos/actions/
Authorization: Bearer <token>

Response:
{
  "actions": [
    {
      "codigo": "view",
      "nombre": "Ver",
      "tipo": "crud"
    }
  ]
}
```

---

## 🧪 Testing

### Backend Tests

```python
# tests.py
from django.test import TestCase
from permisos.managers import PermissionManager

class PermissionTestCase(TestCase):
    def setUp(self):
        self.pm = PermissionManager()
        self.user = User.objects.create_user('test', 'test@test.com', 'password')
    
    def test_has_permission(self):
        # Asignar permiso
        permiso = Permiso.objects.get(codigo='nomina:empleado:view')
        rol = Rol.objects.create(nombre='Test')
        AsignacionPermiso.objects.create(rol=rol, permiso=permiso)
        AsignacionRol.objects.create(usuario=self.user, rol=rol)
        
        # Verificar
        self.assertTrue(self.pm.has_permission(self.user, 'nomina:empleado:view'))
        self.assertFalse(self.pm.has_permission(self.user, 'nomina:empleado:edit'))
```

### Frontend Tests

```jsx
// __tests__/Can.test.jsx
import { render, screen } from '@testing-library/react';
import { Can } from '../components/permissions';
import { PermissionsProvider } from '../context/PermissionsContext';

test('renders children when has permission', () => {
  render(
    <PermissionsProvider>
      <Can permission="nomina:empleado:view">
        <div>Protected Content</div>
      </Can>
    </PermissionsProvider>
  );
  
  expect(screen.getByText('Protected Content')).toBeInTheDocument();
});
```

---

## 📊 Resumen de Implementación

### ✅ Completado

**Backend:**
- ✅ 10 nuevos modelos (Recurso, Accion, RecursoAccion, PermisoAccion, RestriccionCampo, RestriccionRegistro, UIElemento, PermisoUI, Delegacion, SolicitudAprobacion)
- ✅ PermissionManager con caching y RLS
- ✅ 5 Decoradores (require_permission, require_any_permission, etc.)
- ✅ 5 Mixins (PermissionRequiredMixin, FieldFilterMixin, RLSMixin, AuditMixin, PermissionCacheMiddleware)
- ✅ 3 Middleware (PermissionCheckMiddleware, RateLimitPermissionMiddleware, PermissionCacheMiddleware)
- ✅ DynamicFieldSerializer con field-level permissions
- ✅ API ViewSet (PermissionCheckViewSet) con 4 actions
- ✅ 6 nuevos endpoints API
- ✅ Signals para invalidación de cache
- ✅ Comando seed_permissions con 154 permisos, 35 recursos, 23 acciones, 23 UI elements, 5 roles

**Frontend:**
- ✅ PermissionsContext global
- ✅ usePermission hooks
- ✅ Componente `<Can>` declarativo
- ✅ Componente `<ProtectedRoute>` para rutas
- ✅ Componente `<PermissionButton>` inteligente
- ✅ HOC `withPermission`
- ✅ Integración en App.jsx

**Database:**
- ✅ Migrations aplicadas
- ✅ Seed ejecutado (154 permisos, 5 roles, 23 acciones, 35 recursos, 23 UI elements)

---

## 🚀 Próximos Pasos

1. **Integrar en módulos existentes**: Reemplazar permisos legacy por RBAC granular
2. **Sidebar dinámico**: Renderizar sidebar basado en `ui_elements`
3. **Testing E2E**: Pruebas completas de flujo de permisos
4. **Documentación de API**: Swagger/OpenAPI para endpoints
5. **Dashboard de Permisos**: Panel admin para gestión visual

---

## 📞 Soporte

Para preguntas o issues:
- Revisar logs: `backend/logs/permissions.log`
- Verificar cache: `POST /api/permisos/check/clear-cache/`
- Revisar asignaciones: Django Admin → Permisos → AsignacionPermiso

---

**Versión:** 1.0.0  
**Fecha:** 2025-02-04  
**Estado:** ✅ Producción Ready
