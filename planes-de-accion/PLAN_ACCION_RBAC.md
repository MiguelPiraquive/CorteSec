# Plan de Acción: Sistema RBAC Completo y Granular

**Fecha:** 2026-02-03  
**Arquitecto:** Sistema experto en seguridad y arquitectura de software  
**Objetivo:** Refactorizar y completar el módulo de Roles y Permisos (RBAC) para lograr un sistema robusto, escalable, granular y profesional.

---

## 📋 Índice

1. [Análisis del Estado Actual (Gap Analysis)](#1-análisis-del-estado-actual-gap-analysis)
2. [Arquitectura del Sistema RBAC Mejorado](#2-arquitectura-del-sistema-rbac-mejorado)
3. [Estrategia de Granularidad (Mapa de Permisos)](#3-estrategia-de-granularidad-mapa-de-permisos)
4. [Código Backend Faltante](#4-código-backend-faltante)
5. [Script de Seed de Permisos](#5-script-de-seed-de-permisos)
6. [Implementación Frontend](#6-implementación-frontend)
7. [Seguridad y Validaciones](#7-seguridad-y-validaciones)
8. [Testing](#8-testing)
9. [Documentación](#9-documentación)
10. [Roadmap de Implementación](#10-roadmap-de-implementación)

---

## 1. Análisis del Estado Actual (Gap Analysis)

### 1.1 Lo que YA EXISTE (Fortalezas) ✅

**Modelos de Base de Datos:**
- ✅ `auth_permission`: Permisos nativos de Django
- ✅ `auth_group`: Grupos de Django
- ✅ `roles_rol`: Sistema de roles personalizado con jerarquía
- ✅ `roles_tiporol`: Tipos de roles
- ✅ `roles_asignacionrol`: Asignación de roles a usuarios
- ✅ `roles_estadoasignacion`: Estados de asignación (activo, pendiente, revocado)
- ✅ `roles_historialasignacion`: Auditoría de cambios en asignaciones
- ✅ `roles_auditoriarol`: Auditoría general de roles
- ✅ `roles_plantillarol`: Plantillas de roles
- ✅ `roles_metarol`: Meta-roles (roles dinámicos)
- ✅ `roles_rolcondicional`: Roles condicionales
- ✅ `permisos_permiso`: Sistema de permisos personalizado
- ✅ `permisos_tipopermiso`: Tipos de permisos
- ✅ `permisos_modulosistema`: Módulos del sistema
- ✅ `permisos_condicionpermiso`: Condiciones para permisos
- ✅ `permisos_permisodirecto`: Permisos directos a usuarios
- ✅ `permisos_asignacionpermiso`: Relación rol-permiso
- ✅ `permisos_configuracionentorno`: Configuración por entorno
- ✅ `permisos_auditoriapermisos`: Auditoría de permisos
- ✅ `permisos_permisoi18n`: Internacionalización de permisos
- ✅ Multi-tenant: Campo `organization_id` en todas las tablas

**Características avanzadas:**
- ✅ Jerarquía de roles (`rol_padre_id`)
- ✅ Herencia de permisos (`hereda_permisos`)
- ✅ Restricción horaria (`tiene_restriccion_horario`, `hora_inicio`, `hora_fin`)
- ✅ Vigencia temporal (`fecha_inicio_vigencia`, `fecha_fin_vigencia`)
- ✅ Prioridad y peso de roles
- ✅ Contexto de asignación (`contexto_tipo_id`, `contexto_id`)
- ✅ Tenant isolation (`tenant_id`)
- ✅ Auditoría completa con IP y User Agent

---

### 1.2 Lo que FALTA (Gaps Críticos) ❌

#### **A. Gaps en Modelos de Base de Datos**

1. **❌ Tabla `permisos_recurso` (Resources)**
   - **Problema:** No hay una tabla que defina explícitamente los recursos del sistema (Usuarios, Nóminas, Reportes, etc.)
   - **Necesidad:** Centralizar todos los recursos para evitar hardcodear en código
   - **Campos necesarios:**
     - `id`, `codigo`, `nombre`, `descripcion`
     - `modulo_id` (FK a `permisos_modulosistema`)
     - `tipo_recurso` (model, view, api, ui_component)
     - `ruta_backend` (/api/nomina/)
     - `ruta_frontend` (/dashboard/nomina)
     - `metadata` (jsonb con info adicional)

2. **❌ Tabla `permisos_accion` (Actions)**
   - **Problema:** Las acciones están hardcodeadas o dispersas
   - **Necesidad:** Definir catálogo de acciones estándar
   - **Campos necesarios:**
     - `id`, `codigo`, `nombre`, `descripcion`
     - `tipo` (crud, custom, ui)
     - `es_destructiva` (boolean para delete, purge)
     - `requiere_confirmacion` (boolean)

3. **❌ Tabla `permisos_recurso_accion` (Relación M2M)**
   - **Problema:** No hay relación explícita de qué acciones aplican a qué recursos
   - **Necesidad:** Definir qué acciones son válidas por recurso
   - **Ejemplo:** Recurso "Nómina" → Acciones: view, create, edit, delete, calculate, approve, export

4. **❌ Tabla `permisos_permiso_accion` (Descomposición)**
   - **Problema:** Los permisos actuales son muy genéricos
   - **Necesidad:** Un permiso debe ser la combinación `módulo + recurso + acción`
   - **Estructura:** 
     - `permiso_id` (FK)
     - `recurso_id` (FK)
     - `accion_id` (FK)
     - `condiciones` (jsonb para reglas adicionales)

5. **❌ Tabla `permisos_restriccion_campo` (Field-Level Permissions)**
   - **Problema:** No hay control granular a nivel de campos
   - **Necesidad:** Permitir restringir campos específicos (ej: ver salario pero no editarlo)
   - **Campos:**
     - `id`, `permiso_id`, `recurso_id`
     - `campo` (nombre del campo)
     - `tipo_restriccion` (readonly, hidden, editable)

6. **❌ Tabla `permisos_restriccion_registro` (Row-Level Security)**
   - **Problema:** No hay RLS (Row-Level Security)
   - **Necesidad:** Filtrar qué registros puede ver un usuario
   - **Ejemplo:** Un supervisor solo ve nóminas de su departamento
   - **Campos:**
     - `id`, `permiso_id`, `recurso_id`
     - `tipo_filtro` (owner, department, project, custom)
     - `regla_sql` (expresión SQL o Django Q objects)

7. **❌ Tabla `ui_elementos` (UI Elements)**
   - **Problema:** No hay catálogo de elementos UI protegibles
   - **Necesidad:** Registrar sidebar items, tabs, buttons, modals
   - **Campos:**
     - `id`, `codigo`, `nombre`, `tipo` (sidebar_item, button, tab, modal, widget)
     - `modulo_id`, `ruta`, `componente_react`
     - `icono`, `orden`, `parent_id` (para jerarquía)

8. **❌ Tabla `permisos_ui` (UI Permissions)**
   - **Problema:** No hay mapeo de permisos a elementos UI
   - **Necesidad:** Relacionar permisos con elementos visuales
   - **Campos:**
     - `id`, `permiso_id`, `ui_elemento_id`
     - `accion` (view, click, hover)

9. **❌ Tabla `permisos_delegacion` (Permission Delegation)**
   - **Problema:** No hay mecanismo de delegación temporal
   - **Necesidad:** Permitir delegar permisos por ausencia
   - **Campos:**
     - `id`, `usuario_delegante_id`, `usuario_delegado_id`
     - `permiso_id`, `fecha_inicio`, `fecha_fin`
     - `motivo`, `activa`

10. **❌ Tabla `permisos_aprobacion` (Approval Workflow)**
    - **Problema:** No hay flujo de aprobación para permisos sensibles
    - **Necesidad:** Requerir aprobación de administrador para permisos críticos
    - **Campos:**
      - `id`, `solicitud_permiso_id`, `solicitante_id`, `aprobador_id`
      - `estado` (pendiente, aprobado, rechazado)
      - `justificacion`, `respuesta`, `fecha_solicitud`, `fecha_respuesta`

#### **B. Gaps en Lógica de Negocio (Backend)**

1. **❌ Middleware de Autorización**
   - **Falta:** Middleware que valide permisos en CADA request
   - **Necesidad:** `PermissionCheckMiddleware` que intercepte y valide

2. **❌ Decoradores de Permisos**
   - **Falta:** Decoradores tipo `@require_permission('nomina:view')`
   - **Necesidad:** Simplificar protección de views

3. **❌ Mixins de Permisos**
   - **Falta:** Mixins para ViewSets DRF (`PermissionRequiredMixin`)
   - **Necesidad:** Reutilización en vistas

4. **❌ Manager Personalizado de Permisos**
   - **Falta:** `PermissionManager` que resuelva herencia, condiciones, RLS
   - **Necesidad:** Lógica centralizada de evaluación

5. **❌ Cache de Permisos**
   - **Falta:** Sistema de caché (Redis) para permisos del usuario
   - **Necesidad:** Performance (evitar queries repetitivas)

6. **❌ Signals para Invalidación de Cache**
   - **Falta:** Signals que limpien cache al cambiar roles/permisos
   - **Necesidad:** Consistencia de datos

7. **❌ Serializers Dinámicos**
   - **Falta:** Serializers que excluyan campos según permisos
   - **Necesidad:** Field-level permissions en API

8. **❌ QuerySet Filters Automáticos**
   - **Falta:** Filtros automáticos en QuerySets según RLS
   - **Necesidad:** Row-level security transparente

9. **❌ Validadores de Permisos**
   - **Falta:** Validadores en Serializers para acciones sensibles
   - **Necesidad:** Validación antes de guardar

10. **❌ API de Consulta de Permisos**
    - **Falta:** Endpoint `/api/permissions/check/` para frontend
    - **Necesidad:** Frontend debe poder validar permisos

#### **C. Gaps en Frontend**

1. **❌ Context de Permisos**
   - **Falta:** `PermissionsContext` en React
   - **Necesidad:** Acceso global a permisos del usuario

2. **❌ Hook `usePermission`**
   - **Falta:** `const { hasPermission } = usePermission('nomina:view')`
   - **Necesidad:** Simplificar verificación en componentes

3. **❌ HOC `withPermission`**
   - **Falta:** Higher-Order Component para proteger componentes
   - **Necesidad:** `export default withPermission(MyComponent, 'required:permission')`

4. **❌ Componente `<Can>`**
   - **Falta:** `<Can do="edit" on="nomina"><Button /></Can>`
   - **Necesidad:** Renderizado condicional declarativo

5. **❌ Protección de Rutas**
   - **Falta:** `<ProtectedRoute permission="module:view" />`
   - **Necesidad:** Bloqueo de rutas sin permisos

6. **❌ Sidebar Dinámico**
   - **Falta:** Sidebar que se construya según permisos
   - **Necesidad:** Ocultar módulos sin acceso

7. **❌ Botones Condicionales**
   - **Falta:** Sistema para ocultar botones sin permisos
   - **Necesidad:** UX limpia (no mostrar lo inaccesible)

8. **❌ Tabs Condicionales**
   - **Falta:** Ocultar tabs en headers según permisos
   - **Necesidad:** Navegación contextualizada

9. **❌ Mensajes de Error Claros**
   - **Falta:** Toasts/Modals informativos al denegar acceso
   - **Necesidad:** UX: explicar por qué no puede hacer algo

10. **❌ Simulador de Roles (Dev Tool)**
    - **Falta:** Herramienta para probar diferentes roles en dev
    - **Necesidad:** Testing de permisos

#### **D. Gaps en Documentación**

1. **❌ Matriz de Permisos**
   - **Falta:** Documento Excel/Markdown con todos los permisos
   - **Necesidad:** Referencia rápida para admins

2. **❌ Guía de Usuario**
   - **Falta:** Manual de cómo asignar roles
   - **Necesidad:** Capacitación de admins

3. **❌ Guía de Desarrollador**
   - **Falta:** Cómo agregar nuevos permisos al código
   - **Necesidad:** Onboarding de devs

4. **❌ Diagramas de Arquitectura**
   - **Falta:** Diagramas ER, flujos de autorización
   - **Necesidad:** Claridad arquitectónica

---

### 1.3 Resumen de Gaps Prioritarios

| **Gap** | **Prioridad** | **Impacto** |
|---------|---------------|-------------|
| Middleware de Autorización | 🔴 Crítica | Alto (seguridad) |
| Tabla `permisos_recurso_accion` | 🔴 Crítica | Alto (granularidad) |
| Cache de Permisos | 🟡 Alta | Alto (performance) |
| Context React + Hooks | 🟡 Alta | Alto (UX) |
| Row-Level Security | 🟡 Alta | Medio (privacidad) |
| Field-Level Permissions | 🟢 Media | Medio (granularidad) |
| Approval Workflow | 🟢 Media | Bajo (casos especiales) |
| Delegation | ⚪ Baja | Bajo (nice-to-have) |

---

## 2. Arquitectura del Sistema RBAC Mejorado

### 2.1 Modelo Conceptual

```
┌─────────────────────────────────────────────────────────────────┐
│                     RBAC SYSTEM ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   USUARIOS   │──M:M───▶│    ROLES     │──M:M───▶│   PERMISOS   │
│              │         │              │         │              │
│ - CustomUser │         │ - Rol        │         │ - Permiso    │
│ - Empleado   │         │ - TipoRol    │         │ - TipoPermiso│
└──────────────┘         │ - MetaRol    │         │ - Módulo     │
                         └──────────────┘         │ - Recurso    │
                                                  │ - Acción     │
                                                  └──────────────┘
                                                         │
                                                         │
                         ┌───────────────────────────────┴─────────┐
                         │                                         │
                    ┌────▼─────┐                            ┌─────▼─────┐
                    │   UI     │                            │ POLÍTICAS │
                    │ Elements │                            │           │
                    │          │                            │ - RLS     │
                    │ -Sidebar │                            │ - Field   │
                    │ -Buttons │                            │ - Cond.   │
                    │ -Tabs    │                            │ - Tiempo  │
                    └──────────┘                            └───────────┘
```

### 2.2 Diagrama Entidad-Relación (Mejorado)

```sql
-- MODELO MEJORADO DE RBAC

-- 1. RECURSOS (Nuevos)
CREATE TABLE permisos_recurso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    modulo_id UUID REFERENCES permisos_modulosistema(id),
    tipo_recurso VARCHAR(20) NOT NULL, -- model, api, view, ui_component
    ruta_backend VARCHAR(255),
    ruta_frontend VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID REFERENCES core_organizacion(id)
);

-- 2. ACCIONES (Nuevas)
CREATE TABLE permisos_accion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL, -- view, create, edit, delete, approve, export...
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) NOT NULL, -- crud, custom, ui
    es_destructiva BOOLEAN DEFAULT FALSE,
    requiere_confirmacion BOOLEAN DEFAULT FALSE,
    icono VARCHAR(50),
    color VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RELACIÓN RECURSO-ACCIÓN (Catálogo de acciones válidas por recurso)
CREATE TABLE permisos_recurso_accion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurso_id UUID REFERENCES permisos_recurso(id) ON DELETE CASCADE,
    accion_id UUID REFERENCES permisos_accion(id) ON DELETE CASCADE,
    es_requerida BOOLEAN DEFAULT FALSE, -- Si es una acción obligatoria del recurso
    orden INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    UNIQUE(recurso_id, accion_id)
);

-- 4. PERMISOS DESCOMPUESTOS (Relación Permiso-Recurso-Acción)
CREATE TABLE permisos_permiso_accion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permiso_id UUID REFERENCES permisos_permiso(id) ON DELETE CASCADE,
    recurso_id UUID REFERENCES permisos_recurso(id),
    accion_id UUID REFERENCES permisos_accion(id),
    condiciones JSONB DEFAULT '{}', -- Reglas adicionales
    restricciones JSONB DEFAULT '{}', -- Límites (ej: max_amount)
    UNIQUE(permiso_id, recurso_id, accion_id)
);

-- 5. FIELD-LEVEL PERMISSIONS
CREATE TABLE permisos_restriccion_campo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permiso_id UUID REFERENCES permisos_permiso(id) ON DELETE CASCADE,
    recurso_id UUID REFERENCES permisos_recurso(id),
    campo VARCHAR(100) NOT NULL, -- Nombre del campo en el modelo
    tipo_restriccion VARCHAR(20) NOT NULL, -- readonly, hidden, editable, required
    valor_defecto TEXT, -- Valor por defecto si se restringe
    metadata JSONB DEFAULT '{}'
);

-- 6. ROW-LEVEL SECURITY
CREATE TABLE permisos_restriccion_registro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permiso_id UUID REFERENCES permisos_permiso(id) ON DELETE CASCADE,
    recurso_id UUID REFERENCES permisos_recurso(id),
    tipo_filtro VARCHAR(50) NOT NULL, -- owner, department, project, organization, custom
    campo_filtro VARCHAR(100), -- Campo del modelo a filtrar (ej: created_by, department_id)
    valor_filtro TEXT, -- Valor o expresión
    regla_django TEXT, -- Django Q object serializado
    regla_sql TEXT, -- Query SQL cruda (usar con cuidado)
    prioridad INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE
);

-- 7. UI ELEMENTS CATALOG
CREATE TABLE ui_elementos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) UNIQUE NOT NULL, -- sidebar.nomina, button.create_user, tab.reports
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(30) NOT NULL, -- sidebar_item, button, tab, modal, widget, menu
    modulo_id UUID REFERENCES permisos_modulosistema(id),
    ruta VARCHAR(255), -- Ruta en el frontend
    componente_react VARCHAR(255), -- Nombre del componente
    icono VARCHAR(100),
    orden INTEGER DEFAULT 0,
    parent_id UUID REFERENCES ui_elementos(id), -- Para jerarquías (ej: submenu)
    metadata JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. PERMISOS UI (Mapeo Permiso → UI Element)
CREATE TABLE permisos_ui (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permiso_id UUID REFERENCES permisos_permiso(id) ON DELETE CASCADE,
    ui_elemento_id UUID REFERENCES ui_elementos(id) ON DELETE CASCADE,
    accion VARCHAR(20) DEFAULT 'view', -- view, click, hover, edit
    metadata JSONB DEFAULT '{}',
    UNIQUE(permiso_id, ui_elemento_id, accion)
);

-- 9. DELEGACIÓN DE PERMISOS
CREATE TABLE permisos_delegacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_delegante_id BIGINT REFERENCES login_customuser(id),
    usuario_delegado_id BIGINT REFERENCES login_customuser(id),
    permiso_id UUID REFERENCES permisos_permiso(id),
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    motivo TEXT,
    activa BOOLEAN DEFAULT TRUE,
    revocada_at TIMESTAMP WITH TIME ZONE,
    revocada_por_id BIGINT REFERENCES login_customuser(id),
    organization_id UUID REFERENCES core_organizacion(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT check_usuarios CHECK (usuario_delegante_id != usuario_delegado_id)
);

-- 10. APPROVAL WORKFLOW (Flujo de aprobación)
CREATE TABLE permisos_solicitud_aprobacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permiso_id UUID REFERENCES permisos_permiso(id),
    rol_id BIGINT REFERENCES roles_rol(id),
    solicitante_id BIGINT REFERENCES login_customuser(id),
    aprobador_id BIGINT REFERENCES login_customuser(id),
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobado, rechazado, cancelado
    tipo_solicitud VARCHAR(20) NOT NULL, -- temporal, permanente
    justificacion TEXT NOT NULL,
    respuesta TEXT,
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_respuesta TIMESTAMP WITH TIME ZONE,
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    organization_id UUID REFERENCES core_organizacion(id)
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_recurso_codigo ON permisos_recurso(codigo);
CREATE INDEX idx_recurso_modulo ON permisos_recurso(modulo_id);
CREATE INDEX idx_accion_codigo ON permisos_accion(codigo);
CREATE INDEX idx_permiso_accion_permiso ON permisos_permiso_accion(permiso_id);
CREATE INDEX idx_permiso_accion_recurso ON permisos_permiso_accion(recurso_id);
CREATE INDEX idx_restriccion_campo_permiso ON permisos_restriccion_campo(permiso_id);
CREATE INDEX idx_restriccion_registro_permiso ON permisos_restriccion_registro(permiso_id);
CREATE INDEX idx_ui_elementos_codigo ON ui_elementos(codigo);
CREATE INDEX idx_ui_elementos_tipo ON ui_elementos(tipo);
CREATE INDEX idx_permisos_ui_permiso ON permisos_ui(permiso_id);
CREATE INDEX idx_permisos_ui_elemento ON permisos_ui(ui_elemento_id);
CREATE INDEX idx_delegacion_delegante ON permisos_delegacion(usuario_delegante_id);
CREATE INDEX idx_delegacion_delegado ON permisos_delegacion(usuario_delegado_id);
CREATE INDEX idx_delegacion_activa ON permisos_delegacion(activa) WHERE activa = TRUE;
CREATE INDEX idx_solicitud_estado ON permisos_solicitud_aprobacion(estado);
CREATE INDEX idx_solicitud_solicitante ON permisos_solicitud_aprobacion(solicitante_id);
```

---

## 3. Estrategia de Granularidad (Mapa de Permisos)

### 3.1 Nomenclatura Estandarizada

**Formato:** `módulo:recurso:acción[:condición]`

**Ejemplos:**
- `nomina:empleado:view`
- `nomina:empleado:create`
- `nomina:empleado:edit:own` (solo sus propios registros)
- `nomina:empleado:delete`
- `nomina:empleado:export`
- `nomina:salario:view`
- `nomina:salario:edit:restricted` (sin ver salario base)
- `dashboard:widget_financiero:view`
- `sidebar:modulo_nomina:view`
- `button:crear_usuario:click`
- `tab:reportes_financieros:view`

### 3.2 Catálogo de Acciones Estándar

```python
# backend/permisos/constants.py

# ACCIONES CRUD ESTÁNDAR
ACCION_VIEW = 'view'
ACCION_CREATE = 'create'
ACCION_EDIT = 'edit'
ACCION_DELETE = 'delete'
ACCION_LIST = 'list'

# ACCIONES EXTENDIDAS
ACCION_APPROVE = 'approve'
ACCION_REJECT = 'reject'
ACCION_EXPORT = 'export'
ACCION_IMPORT = 'import'
ACCION_PRINT = 'print'
ACCION_SEND = 'send'
ACCION_DUPLICATE = 'duplicate'
ACCION_ARCHIVE = 'archive'
ACCION_RESTORE = 'restore'
ACCION_PURGE = 'purge'  # Eliminación permanente

# ACCIONES DE CÁLCULO/PROCESAMIENTO
ACCION_CALCULATE = 'calculate'
ACCION_RECALCULATE = 'recalculate'
ACCION_PROCESS = 'process'
ACCION_VALIDATE = 'validate'

# ACCIONES UI
ACCION_VIEW_UI = 'view_ui'
ACCION_CLICK = 'click'
ACCION_HOVER = 'hover'
ACCION_TOGGLE = 'toggle'

# ACCIONES ESPECIALES
ACCION_ASSIGN = 'assign'
ACCION_DELEGATE = 'delegate'
ACCION_SHARE = 'share'
ACCION_COMMENT = 'comment'
ACCION_AUDIT = 'audit'

# DICCIONARIO DE ACCIONES
ACCIONES_CATALOG = {
    'crud': [ACCION_VIEW, ACCION_CREATE, ACCION_EDIT, ACCION_DELETE, ACCION_LIST],
    'workflow': [ACCION_APPROVE, ACCION_REJECT, ACCION_SEND],
    'data': [ACCION_EXPORT, ACCION_IMPORT, ACCION_PRINT],
    'special': [ACCION_CALCULATE, ACCION_PROCESS, ACCION_VALIDATE],
    'ui': [ACCION_VIEW_UI, ACCION_CLICK, ACCION_HOVER],
}
```

### 3.3 Mapa Completo de Permisos por Módulo

#### **A. Módulo: CORE (Sistema)**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Organizacion | view, create, edit, delete | `core:organizacion:view` | Ver organizaciones |
| Configuracion | view, edit | `core:configuracion:view` | Ver configuración general |
| Notificaciones | view, create, delete, send | `core:notificacion:view` | Gestionar notificaciones |
| Logs | view, export | `core:logs:view` | Ver logs del sistema |

#### **B. Módulo: USUARIOS (Login/Auth)**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Usuario | view, create, edit, delete, activate, deactivate | `usuarios:usuario:view` | Ver usuarios |
| | | `usuarios:usuario:create` | Crear usuarios |
| | | `usuarios:usuario:edit` | Editar usuarios |
| | | `usuarios:usuario:delete` | Eliminar usuarios |
| | | `usuarios:usuario:activate` | Activar usuarios |
| | | `usuarios:usuario:deactivate` | Desactivar usuarios |
| Perfil | view, edit:own, edit:all | `usuarios:perfil:view` | Ver perfiles |
| | | `usuarios:perfil:edit:own` | Editar solo su perfil |
| | | `usuarios:perfil:edit:all` | Editar cualquier perfil |
| Sesiones | view, terminate | `usuarios:sesion:view` | Ver sesiones activas |
| | | `usuarios:sesion:terminate` | Cerrar sesiones |
| Historial | view, export | `usuarios:historial:view` | Ver historial de usuario |

#### **C. Módulo: ROLES Y PERMISOS**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Rol | view, create, edit, delete, assign, unassign | `roles:rol:view` | Ver roles |
| | | `roles:rol:create` | Crear roles |
| | | `roles:rol:edit` | Editar roles |
| | | `roles:rol:delete` | Eliminar roles |
| | | `roles:rol:assign` | Asignar roles a usuarios |
| | | `roles:rol:unassign` | Desasignar roles |
| Permiso | view, create, edit, delete, assign | `permisos:permiso:view` | Ver permisos |
| | | `permisos:permiso:create` | Crear permisos |
| | | `permisos:permiso:edit` | Editar permisos |
| | | `permisos:permiso:delete` | Eliminar permisos |
| Asignación | view, approve, reject | `roles:asignacion:view` | Ver asignaciones |
| | | `roles:asignacion:approve` | Aprobar asignaciones |
| Auditoría | view, export | `roles:auditoria:view` | Ver auditoría de roles |

#### **D. Módulo: NÓMINA**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Empleado | view, create, edit, delete, import, export | `nomina:empleado:view` | Ver empleados |
| | | `nomina:empleado:create` | Crear empleados |
| | | `nomina:empleado:edit` | Editar empleados |
| | | `nomina:empleado:delete` | Eliminar empleados |
| | | `nomina:empleado:import` | Importar empleados |
| | | `nomina:empleado:export` | Exportar empleados |
| Contrato | view, create, edit, delete, approve | `nomina:contrato:view` | Ver contratos |
| | | `nomina:contrato:create` | Crear contratos |
| | | `nomina:contrato:approve` | Aprobar contratos |
| Nómina | view, create, edit, delete, calculate, approve, send, print, export | `nomina:nomina:view` | Ver nóminas |
| | | `nomina:nomina:create` | Crear nóminas |
| | | `nomina:nomina:calculate` | Calcular nóminas |
| | | `nomina:nomina:approve` | Aprobar nóminas |
| | | `nomina:nomina:send` | Enviar nóminas |
| | | `nomina:nomina:print` | Imprimir nóminas |
| | | `nomina:nomina:export` | Exportar nóminas |
| Salario | view, view:restricted, edit | `nomina:salario:view` | Ver salarios completos |
| | | `nomina:salario:view:restricted` | Ver salarios sin monto base |
| | | `nomina:salario:edit` | Editar salarios |
| Concepto | view, create, edit, delete | `nomina:concepto:view` | Ver conceptos laborales |
| TipoContrato | view, create, edit, delete | `nomina:tipocontrato:view` | Ver tipos de contrato |
| Parámetro Legal | view, edit | `nomina:parametro:view` | Ver parámetros legales |

#### **E. Módulo: PRÉSTAMOS**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Préstamo | view, view:own, create, create:own, edit, delete, approve, reject, disburse | `prestamos:prestamo:view` | Ver todos los préstamos |
| | | `prestamos:prestamo:view:own` | Ver solo sus préstamos |
| | | `prestamos:prestamo:create` | Crear préstamos |
| | | `prestamos:prestamo:approve` | Aprobar préstamos |
| | | `prestamos:prestamo:reject` | Rechazar préstamos |
| | | `prestamos:prestamo:disburse` | Desembolsar préstamos |
| Pago | view, create, edit, delete | `prestamos:pago:view` | Ver pagos de préstamos |
| | | `prestamos:pago:create` | Registrar pagos |
| TipoPréstamo | view, create, edit, delete | `prestamos:tipo:view` | Ver tipos de préstamo |

#### **F. Módulo: CONTABILIDAD**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Plan de Cuentas | view, create, edit, delete | `contabilidad:plan_cuentas:view` | Ver plan de cuentas |
| Comprobante | view, create, edit, delete, approve, void, export | `contabilidad:comprobante:view` | Ver comprobantes |
| | | `contabilidad:comprobante:create` | Crear comprobantes |
| | | `contabilidad:comprobante:approve` | Aprobar comprobantes |
| | | `contabilidad:comprobante:void` | Anular comprobantes |
| Movimiento | view, create, edit, delete | `contabilidad:movimiento:view` | Ver movimientos |
| Balance | view, generate, export | `contabilidad:balance:view` | Ver balances |
| | | `contabilidad:balance:generate` | Generar balances |
| Flujo Caja | view, generate, export | `contabilidad:flujo_caja:view` | Ver flujo de caja |
| Centro Costo | view, create, edit, delete | `contabilidad:centro_costo:view` | Ver centros de costo |

#### **G. Módulo: DASHBOARD**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Dashboard | view | `dashboard:dashboard:view` | Ver dashboard principal |
| Widget Financiero | view, configure | `dashboard:widget_financiero:view` | Ver widget financiero |
| Widget Nómina | view, configure | `dashboard:widget_nomina:view` | Ver widget de nómina |
| Widget Proyectos | view, configure | `dashboard:widget_proyectos:view` | Ver widget de proyectos |
| KPIs | view, export | `dashboard:kpis:view` | Ver KPIs |
| Gráficos | view, export | `dashboard:graficos:view` | Ver gráficos |
| Proyecto | view, create, edit, delete | `dashboard:proyecto:view` | Ver proyectos del dashboard |
| Contractor | view, create, edit, delete | `dashboard:contractor:view` | Ver contratistas |
| Pago | view, create, edit, delete | `dashboard:pago:view` | Ver pagos del dashboard |

#### **H. Módulo: REPORTES**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Reporte Financiero | view, generate, export, schedule | `reportes:financiero:view` | Ver reportes financieros |
| | | `reportes:financiero:generate` | Generar reportes |
| | | `reportes:financiero:export` | Exportar reportes |
| | | `reportes:financiero:schedule` | Programar reportes |
| Reporte Nómina | view, generate, export | `reportes:nomina:view` | Ver reportes de nómina |
| Reporte Préstamos | view, generate, export | `reportes:prestamos:view` | Ver reportes de préstamos |
| Reporte Custom | create, edit, delete | `reportes:custom:create` | Crear reportes personalizados |
| Log Reporte | view | `reportes:log:view` | Ver logs de reportes |

#### **I. Módulo: CONFIGURACIÓN**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Configuración General | view, edit | `configuracion:general:view` | Ver configuración general |
| | | `configuracion:general:edit` | Editar configuración general |
| Configuración Email | view, edit, test | `configuracion:email:view` | Ver configuración de email |
| | | `configuracion:email:test` | Probar envío de email |
| Configuración Seguridad | view, edit | `configuracion:seguridad:view` | Ver configuración de seguridad |
| Configuración Módulo | view, edit, enable, disable | `configuracion:modulo:view` | Ver configuración de módulos |
| | | `configuracion:modulo:enable` | Activar módulos |
| Parámetro Sistema | view, edit | `configuracion:parametro:view` | Ver parámetros del sistema |
| Log Configuración | view | `configuracion:log:view` | Ver logs de configuración |

#### **J. Módulo: CARGOS**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Cargo | view, create, edit, delete | `cargos:cargo:view` | Ver cargos |
| | | `cargos:cargo:create` | Crear cargos |
| Historial Cargo | view | `cargos:historial:view` | Ver historial de cargos |

#### **K. Módulo: DOCUMENTACIÓN**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Documento | view, create, edit, delete, upload, download | `documentacion:documento:view` | Ver documentos |
| | | `documentacion:documento:upload` | Subir documentos |
| | | `documentacion:documento:download` | Descargar documentos |
| Categoría | view, create, edit, delete | `documentacion:categoria:view` | Ver categorías |
| Versión | view, create, rollback | `documentacion:version:view` | Ver versiones de documentos |

#### **L. Módulo: AYUDA**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Artículo | view, create, edit, delete | `ayuda:articulo:view` | Ver artículos de ayuda |
| Tutorial | view, create, edit, delete | `ayuda:tutorial:view` | Ver tutoriales |
| FAQ | view, create, edit, delete | `ayuda:faq:view` | Ver preguntas frecuentes |
| Soporte | view, create, reply, close | `ayuda:soporte:view` | Ver tickets de soporte |
| | | `ayuda:soporte:create` | Crear tickets |
| | | `ayuda:soporte:reply` | Responder tickets |

#### **M. Módulo: ITEMS**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Item | view, create, edit, delete | `items:item:view` | Ver items |

#### **N. Módulo: LOCATIONS**

| Recurso | Acciones | Código Permiso | Descripción |
|---------|----------|----------------|-------------|
| Departamento | view, create, edit, delete | `locations:departamento:view` | Ver departamentos |
| Municipio | view, create, edit, delete | `locations:municipio:view` | Ver municipios |

### 3.4 Permisos de UI (Sidebar, Tabs, Buttons)

#### **A. Sidebar Items**

| UI Element | Código | Permiso Requerido | Descripción |
|------------|--------|-------------------|-------------|
| Dashboard | `sidebar:dashboard` | `dashboard:dashboard:view` | Ítem del sidebar "Dashboard" |
| Usuarios | `sidebar:usuarios` | `usuarios:usuario:view` | Ítem del sidebar "Usuarios" |
| Roles | `sidebar:roles` | `roles:rol:view` | Ítem del sidebar "Roles y Permisos" |
| Nómina | `sidebar:nomina` | `nomina:nomina:view` | Ítem del sidebar "Nómina" |
| - Empleados | `sidebar:nomina:empleados` | `nomina:empleado:view` | Subítem "Empleados" |
| - Contratos | `sidebar:nomina:contratos` | `nomina:contrato:view` | Subítem "Contratos" |
| - Nóminas | `sidebar:nomina:nominas` | `nomina:nomina:view` | Subítem "Nóminas" |
| Préstamos | `sidebar:prestamos` | `prestamos:prestamo:view` | Ítem del sidebar "Préstamos" |
| Contabilidad | `sidebar:contabilidad` | `contabilidad:comprobante:view` | Ítem del sidebar "Contabilidad" |
| Reportes | `sidebar:reportes` | `reportes:financiero:view` | Ítem del sidebar "Reportes" |
| Configuración | `sidebar:configuracion` | `configuracion:general:view` | Ítem del sidebar "Configuración" |
| Documentación | `sidebar:documentacion` | `documentacion:documento:view` | Ítem del sidebar "Documentación" |
| Ayuda | `sidebar:ayuda` | `ayuda:articulo:view` | Ítem del sidebar "Ayuda" |

#### **B. Buttons (Botones de Acción)**

| UI Element | Código | Permiso Requerido | Descripción |
|------------|--------|-------------------|-------------|
| Crear Usuario | `button:crear_usuario` | `usuarios:usuario:create` | Botón "Crear Usuario" |
| Editar Usuario | `button:editar_usuario` | `usuarios:usuario:edit` | Botón "Editar Usuario" |
| Eliminar Usuario | `button:eliminar_usuario` | `usuarios:usuario:delete` | Botón "Eliminar Usuario" |
| Asignar Rol | `button:asignar_rol` | `roles:rol:assign` | Botón "Asignar Rol" |
| Crear Empleado | `button:crear_empleado` | `nomina:empleado:create` | Botón "Crear Empleado" |
| Calcular Nómina | `button:calcular_nomina` | `nomina:nomina:calculate` | Botón "Calcular Nómina" |
| Aprobar Nómina | `button:aprobar_nomina` | `nomina:nomina:approve` | Botón "Aprobar Nómina" |
| Exportar Excel | `button:exportar_excel` | `<modulo>:<recurso>:export` | Botón "Exportar a Excel" |
| Aprobar Préstamo | `button:aprobar_prestamo` | `prestamos:prestamo:approve` | Botón "Aprobar Préstamo" |
| Generar Reporte | `button:generar_reporte` | `reportes:<tipo>:generate` | Botón "Generar Reporte" |
| Guardar Config | `button:guardar_configuracion` | `configuracion:general:edit` | Botón "Guardar Configuración" |
| Subir Documento | `button:subir_documento` | `documentacion:documento:upload` | Botón "Subir Documento" |

#### **C. Tabs (Pestañas)**

| UI Element | Código | Permiso Requerido | Descripción |
|------------|--------|-------------------|-------------|
| Tab Información | `tab:usuario_informacion` | `usuarios:perfil:view` | Tab "Información" en perfil |
| Tab Roles | `tab:usuario_roles` | `roles:asignacion:view` | Tab "Roles" en usuario |
| Tab Permisos | `tab:usuario_permisos` | `permisos:permiso:view` | Tab "Permisos Directos" |
| Tab Historial | `tab:usuario_historial` | `usuarios:historial:view` | Tab "Historial" en usuario |
| Tab Contrato | `tab:empleado_contrato` | `nomina:contrato:view` | Tab "Contrato" en empleado |
| Tab Nóminas | `tab:empleado_nominas` | `nomina:nomina:view` | Tab "Nóminas" en empleado |
| Tab Préstamos | `tab:empleado_prestamos` | `prestamos:prestamo:view` | Tab "Préstamos" en empleado |
| Tab Financiero | `tab:reportes_financiero` | `reportes:financiero:view` | Tab "Financiero" en reportes |
| Tab Nómina | `tab:reportes_nomina` | `reportes:nomina:view` | Tab "Nómina" en reportes |
| Tab Seguridad | `tab:config_seguridad` | `configuracion:seguridad:view` | Tab "Seguridad" en config |

#### **D. Modals (Modales)**

| UI Element | Código | Permiso Requerido | Descripción |
|------------|--------|-------------------|-------------|
| Modal Crear Usuario | `modal:crear_usuario` | `usuarios:usuario:create` | Modal de creación de usuario |
| Modal Asignar Rol | `modal:asignar_rol` | `roles:rol:assign` | Modal de asignación de rol |
| Modal Calcular Nómina | `modal:calcular_nomina` | `nomina:nomina:calculate` | Modal de cálculo de nómina |
| Modal Aprobar Préstamo | `modal:aprobar_prestamo` | `prestamos:prestamo:approve` | Modal de aprobación |
| Modal Exportar Datos | `modal:exportar` | `<modulo>:<recurso>:export` | Modal de exportación |

#### **E. Widgets (Dashboard)**

| UI Element | Código | Permiso Requerido | Descripción |
|------------|--------|-------------------|-------------|
| Widget KPIs Financieros | `widget:kpis_financieros` | `dashboard:kpis:view` | Widget de KPIs financieros |
| Widget Nómina Mes | `widget:nomina_mes` | `dashboard:widget_nomina:view` | Widget de nómina del mes |
| Widget Préstamos Activos | `widget:prestamos_activos` | `prestamos:prestamo:view` | Widget de préstamos activos |
| Widget Proyectos | `widget:proyectos` | `dashboard:widget_proyectos:view` | Widget de proyectos |
| Widget Gráfico Ingresos | `widget:grafico_ingresos` | `dashboard:graficos:view` | Widget de gráfico de ingresos |

### 3.5 Permisos Contextuales (Row-Level Security)

#### **Ejemplos de RLS**

| Permiso | Regla RLS | Descripción |
|---------|-----------|-------------|
| `nomina:empleado:view:own` | `created_by = current_user` | Solo ver empleados que él creó |
| `nomina:empleado:view:department` | `departamento = current_user.departamento` | Solo su departamento |
| `nomina:nomina:view:own` | `empleado.usuario = current_user` | Solo sus propias nóminas |
| `prestamos:prestamo:view:own` | `empleado.usuario = current_user` | Solo sus propios préstamos |
| `dashboard:proyecto:view:assigned` | `contractor = current_user.contractor` | Solo proyectos asignados |
| `contabilidad:comprobante:view:centrocosto` | `centro_costo = current_user.centro_costo` | Solo de su centro de costo |
| `reportes:financiero:view:restricted` | `fecha <= current_date - 30` | Solo reportes de hace más de 30 días |

### 3.6 Permisos de Campo (Field-Level Security)

#### **Ejemplos de Field Restrictions**

| Recurso | Campo | Restricción | Permiso Requerido | Descripción |
|---------|-------|-------------|-------------------|-------------|
| Empleado | `salario_base` | readonly | `nomina:salario:view` | Solo lectura del salario |
| Empleado | `salario_base` | hidden | `nomina:salario:view:restricted` | Campo oculto |
| Usuario | `password` | hidden | always | Nunca exponer contraseña |
| Usuario | `is_superuser` | readonly | `usuarios:usuario:edit:superuser` | Solo admins |
| Contrato | `salario` | editable | `nomina:contrato:edit:salario` | Editar salario en contrato |
| Préstamo | `monto_aprobado` | editable | `prestamos:prestamo:approve` | Editar monto al aprobar |
| Comprobante | `fecha_contabilizacion` | readonly | after_post | Solo lectura tras contabilizar |

---

## 4. Código Backend Faltante

### 4.1 Modelos Django (Nuevos)

```python
# backend/permisos/models.py (AGREGAR)

from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import uuid

# ============================================================
# MODELOS NUEVOS PARA RBAC GRANULAR
# ============================================================

class Recurso(models.Model):
    """
    Catálogo de recursos del sistema (modelos, vistas, APIs, componentes UI)
    """
    TIPO_RECURSO_CHOICES = [
        ('model', 'Modelo de Django'),
        ('api', 'Endpoint API'),
        ('view', 'Vista'),
        ('ui_component', 'Componente UI'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField(max_length=100, unique=True, db_index=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    modulo = models.ForeignKey('ModuloSistema', on_delete=models.CASCADE, related_name='recursos')
    tipo_recurso = models.CharField(max_length=20, choices=TIPO_RECURSO_CHOICES)
    ruta_backend = models.CharField(max_length=255, blank=True, help_text="Ej: /api/nomina/empleados/")
    ruta_frontend = models.CharField(max_length=255, blank=True, help_text="Ej: /dashboard/nomina/empleados")
    metadata = models.JSONField(default=dict, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    organization = models.ForeignKey('core.Organizacion', on_delete=models.CASCADE, null=True, blank=True)
    
    class Meta:
        db_table = 'permisos_recurso'
        verbose_name = 'Recurso'
        verbose_name_plural = 'Recursos'
        ordering = ['modulo', 'codigo']
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class Accion(models.Model):
    """
    Catálogo de acciones disponibles (view, create, edit, delete, approve, etc.)
    """
    TIPO_ACCION_CHOICES = [
        ('crud', 'CRUD Estándar'),
        ('custom', 'Personalizada'),
        ('ui', 'Interfaz de Usuario'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField(max_length=50, unique=True, db_index=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_ACCION_CHOICES)
    es_destructiva = models.BooleanField(default=False, help_text="Si es delete, purge, etc.")
    requiere_confirmacion = models.BooleanField(default=False)
    icono = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=20, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'permisos_accion'
        verbose_name = 'Acción'
        verbose_name_plural = 'Acciones'
        ordering = ['codigo']
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class RecursoAccion(models.Model):
    """
    Relación M2M entre Recursos y Acciones (catálogo de acciones válidas por recurso)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, related_name='acciones_disponibles')
    accion = models.ForeignKey(Accion, on_delete=models.CASCADE, related_name='recursos_aplicables')
    es_requerida = models.BooleanField(default=False, help_text="Si es acción obligatoria del recurso")
    orden = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'permisos_recurso_accion'
        verbose_name = 'Recurso-Acción'
        verbose_name_plural = 'Recursos-Acciones'
        unique_together = [['recurso', 'accion']]
        ordering = ['recurso', 'orden']
    
    def __str__(self):
        return f"{self.recurso.codigo}:{self.accion.codigo}"


class PermisoAccion(models.Model):
    """
    Descomposición de permisos: Permiso → Recurso + Acción
    Un permiso puede aplicar a múltiples combinaciones recurso-acción
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    permiso = models.ForeignKey('Permiso', on_delete=models.CASCADE, related_name='acciones')
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE)
    accion = models.ForeignKey(Accion, on_delete=models.CASCADE)
    condiciones = models.JSONField(default=dict, blank=True, help_text="Condiciones adicionales (ej: own, department)")
    restricciones = models.JSONField(default=dict, blank=True, help_text="Límites (ej: max_amount: 1000)")
    
    class Meta:
        db_table = 'permisos_permiso_accion'
        verbose_name = 'Permiso-Acción'
        verbose_name_plural = 'Permisos-Acciones'
        unique_together = [['permiso', 'recurso', 'accion']]
    
    def __str__(self):
        return f"{self.permiso.codigo} → {self.recurso.codigo}:{self.accion.codigo}"
    
    def get_codigo_completo(self):
        """Genera código en formato: modulo:recurso:accion[:condicion]"""
        codigo_base = f"{self.recurso.modulo.codigo}:{self.recurso.codigo}:{self.accion.codigo}"
        if self.condiciones.get('scope'):
            codigo_base += f":{self.condiciones['scope']}"
        return codigo_base


class RestriccionCampo(models.Model):
    """
    Field-Level Permissions: Control granular a nivel de campos
    """
    TIPO_RESTRICCION_CHOICES = [
        ('readonly', 'Solo Lectura'),
        ('hidden', 'Oculto'),
        ('editable', 'Editable'),
        ('required', 'Requerido'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    permiso = models.ForeignKey('Permiso', on_delete=models.CASCADE, related_name='restricciones_campo')
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE)
    campo = models.CharField(max_length=100, help_text="Nombre del campo en el modelo")
    tipo_restriccion = models.CharField(max_length=20, choices=TIPO_RESTRICCION_CHOICES)
    valor_defecto = models.TextField(blank=True, help_text="Valor por defecto si se restringe")
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'permisos_restriccion_campo'
        verbose_name = 'Restricción de Campo'
        verbose_name_plural = 'Restricciones de Campo'
    
    def __str__(self):
        return f"{self.permiso.codigo} → {self.recurso.codigo}.{self.campo} ({self.tipo_restriccion})"


class RestriccionRegistro(models.Model):
    """
    Row-Level Security (RLS): Control granular a nivel de registros
    """
    TIPO_FILTRO_CHOICES = [
        ('owner', 'Propietario (created_by)'),
        ('department', 'Departamento'),
        ('project', 'Proyecto'),
        ('organization', 'Organización'),
        ('custom', 'Personalizado'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    permiso = models.ForeignKey('Permiso', on_delete=models.CASCADE, related_name='restricciones_registro')
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE)
    tipo_filtro = models.CharField(max_length=50, choices=TIPO_FILTRO_CHOICES)
    campo_filtro = models.CharField(max_length=100, blank=True, help_text="Campo del modelo a filtrar (ej: created_by)")
    valor_filtro = models.TextField(blank=True, help_text="Valor o expresión (ej: current_user.id)")
    regla_django = models.TextField(blank=True, help_text="Django Q object serializado")
    regla_sql = models.TextField(blank=True, help_text="Query SQL cruda (usar con precaución)")
    prioridad = models.IntegerField(default=0, help_text="Orden de aplicación si hay múltiples reglas")
    activa = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'permisos_restriccion_registro'
        verbose_name = 'Restricción de Registro (RLS)'
        verbose_name_plural = 'Restricciones de Registro (RLS)'
        ordering = ['prioridad']
    
    def __str__(self):
        return f"{self.permiso.codigo} → {self.recurso.codigo} (RLS: {self.tipo_filtro})"


class UIElemento(models.Model):
    """
    Catálogo de elementos UI protegibles (sidebar, buttons, tabs, modals, widgets)
    """
    TIPO_UI_CHOICES = [
        ('sidebar_item', 'Ítem del Sidebar'),
        ('sidebar_subitem', 'Subítem del Sidebar'),
        ('button', 'Botón'),
        ('tab', 'Pestaña'),
        ('modal', 'Modal'),
        ('widget', 'Widget'),
        ('menu', 'Menú'),
        ('dropdown', 'Dropdown'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField(max_length=100, unique=True, db_index=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    tipo = models.CharField(max_length=30, choices=TIPO_UI_CHOICES)
    modulo = models.ForeignKey('ModuloSistema', on_delete=models.CASCADE, null=True, blank=True, related_name='ui_elementos')
    ruta = models.CharField(max_length=255, blank=True, help_text="Ruta en el frontend")
    componente_react = models.CharField(max_length=255, blank=True, help_text="Nombre del componente React")
    icono = models.CharField(max_length=100, blank=True)
    orden = models.IntegerField(default=0)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='hijos')
    metadata = models.JSONField(default=dict, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ui_elementos'
        verbose_name = 'Elemento UI'
        verbose_name_plural = 'Elementos UI'
        ordering = ['tipo', 'orden']
    
    def __str__(self):
        return f"[{self.tipo}] {self.codigo}"


class PermisoUI(models.Model):
    """
    Mapeo de Permisos a Elementos UI
    """
    ACCION_UI_CHOICES = [
        ('view', 'Ver'),
        ('click', 'Hacer clic'),
        ('hover', 'Hover'),
        ('edit', 'Editar'),
        ('toggle', 'Activar/Desactivar'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    permiso = models.ForeignKey('Permiso', on_delete=models.CASCADE, related_name='ui_mappings')
    ui_elemento = models.ForeignKey(UIElemento, on_delete=models.CASCADE, related_name='permisos')
    accion = models.CharField(max_length=20, choices=ACCION_UI_CHOICES, default='view')
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'permisos_ui'
        verbose_name = 'Permiso UI'
        verbose_name_plural = 'Permisos UI'
        unique_together = [['permiso', 'ui_elemento', 'accion']]
    
    def __str__(self):
        return f"{self.permiso.codigo} → {self.ui_elemento.codigo} ({self.accion})"


class Delegacion(models.Model):
    """
    Delegación temporal de permisos entre usuarios
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario_delegante = models.ForeignKey('login.CustomUser', on_delete=models.CASCADE, related_name='delegaciones_otorgadas')
    usuario_delegado = models.ForeignKey('login.CustomUser', on_delete=models.CASCADE, related_name='delegaciones_recibidas')
    permiso = models.ForeignKey('Permiso', on_delete=models.CASCADE)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    motivo = models.TextField(blank=True)
    activa = models.BooleanField(default=True)
    revocada_at = models.DateTimeField(null=True, blank=True)
    revocada_por = models.ForeignKey('login.CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='delegaciones_revocadas')
    organization = models.ForeignKey('core.Organizacion', on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'permisos_delegacion'
        verbose_name = 'Delegación de Permiso'
        verbose_name_plural = 'Delegaciones de Permisos'
        constraints = [
            models.CheckConstraint(
                check=models.Q(fecha_fin__gt=models.F('fecha_inicio')),
                name='check_fechas_delegacion'
            ),
            models.CheckConstraint(
                check=~models.Q(usuario_delegante=models.F('usuario_delegado')),
                name='check_usuarios_diferentes'
            ),
        ]
    
    def __str__(self):
        return f"{self.usuario_delegante.full_name} → {self.usuario_delegado.full_name} ({self.permiso.codigo})"
    
    def is_vigente(self):
        from django.utils import timezone
        now = timezone.now()
        return self.activa and self.fecha_inicio <= now <= self.fecha_fin and not self.revocada_at


class SolicitudAprobacion(models.Model):
    """
    Flujo de aprobación para permisos sensibles
    """
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
        ('cancelado', 'Cancelado'),
    ]
    
    TIPO_SOLICITUD_CHOICES = [
        ('temporal', 'Temporal'),
        ('permanente', 'Permanente'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    permiso = models.ForeignKey('Permiso', on_delete=models.CASCADE, null=True, blank=True)
    rol = models.ForeignKey('roles.Rol', on_delete=models.CASCADE, null=True, blank=True)
    solicitante = models.ForeignKey('login.CustomUser', on_delete=models.CASCADE, related_name='solicitudes_permiso')
    aprobador = models.ForeignKey('login.CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='aprobaciones_permiso')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    tipo_solicitud = models.CharField(max_length=20, choices=TIPO_SOLICITUD_CHOICES)
    justificacion = models.TextField()
    respuesta = models.TextField(blank=True)
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_respuesta = models.DateTimeField(null=True, blank=True)
    fecha_inicio = models.DateTimeField(null=True, blank=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    organization = models.ForeignKey('core.Organizacion', on_delete=models.CASCADE, null=True, blank=True)
    
    class Meta:
        db_table = 'permisos_solicitud_aprobacion'
        verbose_name = 'Solicitud de Aprobación'
        verbose_name_plural = 'Solicitudes de Aprobación'
        ordering = ['-fecha_solicitud']
    
    def __str__(self):
        return f"Solicitud de {self.solicitante.full_name} - {self.get_estado_display()}"
```

---

### 4.2 Managers Personalizados

```python
# backend/permisos/managers.py (NUEVO ARCHIVO)

from django.db import models
from django.db.models import Q
from django.core.cache import cache
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class PermissionManager:
    """
    Manager centralizado para resolución de permisos
    Maneja herencia, condiciones, RLS, cache
    """
    
    CACHE_TTL = 300  # 5 minutos
    
    def __init__(self, user):
        self.user = user
        self.organization = getattr(user, 'organization', None)
    
    def get_cache_key(self, permission_code):
        """Genera key de cache única por usuario y permiso"""
        return f"permission:{self.user.id}:{permission_code}"
    
    def has_permission(self, permission_code, obj=None):
        """
        Verifica si el usuario tiene un permiso específico
        Formato: modulo:recurso:accion[:scope]
        """
        # Superusuarios tienen todos los permisos
        if self.user.is_superuser:
            return True
        
        # Verificar en cache
        cache_key = self.get_cache_key(permission_code)
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            logger.debug(f"Permission {permission_code} found in cache for user {self.user.id}")
            return cached_result
        
        # Evaluar permiso
        result = self._evaluate_permission(permission_code, obj)
        
        # Guardar en cache
        cache.set(cache_key, result, self.CACHE_TTL)
        
        return result
    
    def _evaluate_permission(self, permission_code, obj=None):
        """Evalúa un permiso considerando todas las fuentes"""
        from permisos.models import Permiso, PermisoAccion, PermisoDirecto
        from roles.models import Rol, AsignacionRol
        
        # 1. Verificar permisos directos
        if self._check_direct_permission(permission_code):
            logger.debug(f"User {self.user.id} has direct permission {permission_code}")
            return True
        
        # 2. Verificar permisos via roles
        if self._check_role_permission(permission_code):
            logger.debug(f"User {self.user.id} has permission {permission_code} via role")
            return True
        
        # 3. Verificar delegaciones activas
        if self._check_delegation_permission(permission_code):
            logger.debug(f"User {self.user.id} has permission {permission_code} via delegation")
            return True
        
        logger.debug(f"User {self.user.id} DENIED permission {permission_code}")
        return False
    
    def _check_direct_permission(self, permission_code):
        """Verifica permisos asignados directamente al usuario"""
        from permisos.models import PermisoDirecto
        from django.utils import timezone
        
        now = timezone.now()
        
        return PermisoDirecto.objects.filter(
            usuario=self.user,
            permiso__codigo__startswith=permission_code,  # Permite match parcial
            activo=True,
            fecha_inicio__lte=now,
            fecha_fin__isnull=True | Q(fecha_fin__gte=now)
        ).exists()
    
    def _check_role_permission(self, permission_code):
        """Verifica permisos via roles asignados"""
        from roles.models import AsignacionRol
        from permisos.models import AsignacionPermiso
        from django.utils import timezone
        
        now = timezone.now()
        
        # Obtener roles activos del usuario
        roles_activos = AsignacionRol.objects.filter(
            usuario=self.user,
            activa=True,
            fecha_inicio__lte=now,
            fecha_fin__isnull=True | Q(fecha_fin__gte=now)
        ).values_list('rol_id', flat=True)
        
        # Verificar si algún rol tiene el permiso
        return AsignacionPermiso.objects.filter(
            rol_id__in=roles_activos,
            permiso__codigo__startswith=permission_code,
            activo=True,
            fecha_inicio__lte=now,
            fecha_fin__isnull=True | Q(fecha_fin__gte=now)
        ).exists()
    
    def _check_delegation_permission(self, permission_code):
        """Verifica permisos delegados temporalmente"""
        from permisos.models import Delegacion
        from django.utils import timezone
        
        now = timezone.now()
        
        return Delegacion.objects.filter(
            usuario_delegado=self.user,
            permiso__codigo__startswith=permission_code,
            activa=True,
            fecha_inicio__lte=now,
            fecha_fin__gte=now,
            revocada_at__isnull=True
        ).exists()
    
    def get_filtered_queryset(self, queryset, permission_code):
        """
        Aplica RLS (Row-Level Security) a un QuerySet
        Filtra registros según las restricciones definidas
        """
        from permisos.models import RestriccionRegistro, Permiso
        
        # Obtener restricciones aplicables
        restricciones = RestriccionRegistro.objects.filter(
            permiso__codigo__startswith=permission_code,
            activa=True
        ).order_by('prioridad')
        
        for restriccion in restricciones:
            if restriccion.tipo_filtro == 'owner':
                queryset = queryset.filter(created_by=self.user)
            elif restriccion.tipo_filtro == 'department':
                queryset = queryset.filter(departamento=self.user.departamento)
            elif restriccion.tipo_filtro == 'organization':
                queryset = queryset.filter(organization=self.organization)
            elif restriccion.tipo_filtro == 'custom' and restriccion.regla_django:
                # Evaluar Q object serializado
                try:
                    import json
                    from django.db.models import Q
                    q_dict = json.loads(restriccion.regla_django)
                    q = self._build_q_from_dict(q_dict)
                    queryset = queryset.filter(q)
                except Exception as e:
                    logger.error(f"Error applying custom RLS filter: {e}")
        
        return queryset
    
    def _build_q_from_dict(self, q_dict):
        """Construye un objeto Q desde un diccionario"""
        from django.db.models import Q
        # Implementación simplificada, expandir según necesidad
        return Q(**q_dict)
    
    def get_restricted_fields(self, permission_code, model):
        """
        Obtiene campos restringidos para un permiso y modelo
        Retorna dict con estructura: {campo: tipo_restriccion}
        """
        from permisos.models import RestriccionCampo, Recurso
        
        # Obtener recurso del modelo
        try:
            recurso = Recurso.objects.get(
                codigo=model._meta.model_name,
                tipo_recurso='model'
            )
        except Recurso.DoesNotExist:
            return {}
        
        restricciones = RestriccionCampo.objects.filter(
            permiso__codigo__startswith=permission_code,
            recurso=recurso
        ).values('campo', 'tipo_restriccion', 'valor_defecto')
        
        return {r['campo']: {
            'tipo': r['tipo_restriccion'],
            'valor_defecto': r['valor_defecto']
        } for r in restricciones}
    
    def clear_cache(self):
        """Limpia el cache de permisos del usuario"""
        pattern = f"permission:{self.user.id}:*"
        # Nota: Esto requiere Redis con support para patterns
        # En producción usar Redis scan
        logger.info(f"Clearing permission cache for user {self.user.id}")
        cache.delete_pattern(pattern)
    
    def get_all_permissions(self):
        """Obtiene todos los permisos del usuario (para debugging)"""
        from permisos.models import Permiso, PermisoDirecto, AsignacionPermiso
        from roles.models import AsignacionRol
        
        permisos = set()
        
        # Permisos directos
        directos = PermisoDirecto.objects.filter(
            usuario=self.user,
            activo=True
        ).select_related('permiso')
        permisos.update([pd.permiso.codigo for pd in directos])
        
        # Permisos via roles
        roles = AsignacionRol.objects.filter(
            usuario=self.user,
            activa=True
        ).values_list('rol_id', flat=True)
        
        via_roles = AsignacionPermiso.objects.filter(
            rol_id__in=roles,
            activo=True
        ).select_related('permiso')
        permisos.update([ap.permiso.codigo for ap in via_roles])
        
        return sorted(list(permisos))


class RoleQuerySet(models.QuerySet):
    """QuerySet personalizado para Roles"""
    
    def activos(self):
        return self.filter(activo=True)
    
    def por_organizacion(self, organization):
        return self.filter(organization=organization)
    
    def jerarquia(self):
        """Ordena roles por jerarquía"""
        return self.order_by('nivel_jerarquico', 'nombre')
    
    def con_herencia(self):
        """Roles que heredan permisos de su padre"""
        return self.filter(hereda_permisos=True)


class PermisoQuerySet(models.QuerySet):
    """QuerySet personalizado para Permisos"""
    
    def activos(self):
        return self.filter(activo=True)
    
    def por_modulo(self, modulo_codigo):
        return self.filter(modulo__codigo=modulo_codigo)
    
    def por_ambito(self, ambito):
        return self.filter(ambito=ambito)
    
    def vigentes(self):
        """Permisos dentro del período de vigencia"""
        from django.utils import timezone
        now = timezone.now()
        return self.filter(
            Q(vigencia_inicio__isnull=True) | Q(vigencia_inicio__lte=now),
            Q(vigencia_fin__isnull=True) | Q(vigencia_fin__gte=now)
        )
```

---

### 4.3 Middleware de Autorización

```python
# backend/permisos/middleware.py (NUEVO ARCHIVO)

from django.http import JsonResponse
from django.conf import settings
from django.urls import resolve
from permisos.managers import PermissionManager
import logging

logger = logging.getLogger(__name__)


class PermissionCheckMiddleware:
    """
    Middleware que valida permisos en CADA request
    Se ejecuta después de autenticación
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Rutas que no requieren permisos
        self.exempt_paths = [
            '/api/login/',
            '/api/logout/',
            '/api/token/',
            '/api/health/',
            '/admin/login/',
            '/static/',
            '/media/',
        ]
    
    def __call__(self, request):
        # Verificar si es ruta exenta
        if self._is_exempt(request.path):
            return self.get_response(request)
        
        # Solo verificar si usuario está autenticado
        if not request.user.is_authenticated:
            return self.get_response(request)
        
        # Saltar para superusuarios (opcional)
        if request.user.is_superuser and settings.DEBUG:
            return self.get_response(request)
        
        # Obtener permiso requerido para la vista actual
        required_permission = self._get_required_permission(request)
        
        if required_permission:
            pm = PermissionManager(request.user)
            if not pm.has_permission(required_permission):
                logger.warning(
                    f"User {request.user.id} denied access to {request.path} "
                    f"(missing permission: {required_permission})"
                )
                return JsonResponse({
                    'error': 'Permission denied',
                    'detail': f'You do not have permission to perform this action.',
                    'required_permission': required_permission
                }, status=403)
        
        response = self.get_response(request)
        return response
    
    def _is_exempt(self, path):
        """Verifica si la ruta está exenta de validación"""
        return any(path.startswith(exempt) for exempt in self.exempt_paths)
    
    def _get_required_permission(self, request):
        """
        Obtiene el permiso requerido para la vista actual
        Usa decoradores o metadata de la vista
        """
        try:
            resolver_match = resolve(request.path)
            view_func = resolver_match.func
            
            # Verificar si la vista tiene metadata de permisos
            # Buscar en diferentes lugares donde puede estar el atributo
            if hasattr(view_func, 'view_class'):
                view_class = view_func.view_class
                if hasattr(view_class, 'required_permission'):
                    return view_class.required_permission
            
            if hasattr(view_func, 'required_permission'):
                return view_func.required_permission
            
            # Si es un ViewSet, buscar según el action
            if hasattr(view_func, 'cls'):
                cls = view_func.cls
                action = request.resolver_match.url_name
                permission_map = getattr(cls, 'permission_map', {})
                if action in permission_map:
                    return permission_map[action]
        
        except Exception as e:
            logger.error(f"Error resolving required permission: {e}")
        
        return None


class RateLimitPermissionMiddleware:
    """
    Middleware que aplica rate limiting según permisos del usuario
    Usuarios con permisos elevados tienen límites más altos
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if request.user.is_authenticated:
            # Obtener límite según rol del usuario
            rate_limit = self._get_rate_limit(request.user)
            # Aplicar lógica de rate limiting (usando Redis)
            # ... implementación ...
        
        response = self.get_response(request)
        return response
    
    def _get_rate_limit(self, user):
        """Determina el rate limit según permisos del usuario"""
        # Implementar lógica
        return 100  # requests por minuto
```

---

### 4.4 Decoradores

```python
# backend/permisos/decorators.py (NUEVO ARCHIVO)

from functools import wraps
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status
from permisos.managers import PermissionManager
import logging

logger = logging.getLogger(__name__)


def require_permission(permission_code):
    """
    Decorador para views que requieren un permiso específico
    
    Uso:
        @require_permission('nomina:empleado:view')
        def mi_vista(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            pm = PermissionManager(request.user)
            if not pm.has_permission(permission_code):
                logger.warning(
                    f"User {request.user.id} denied permission {permission_code}"
                )
                return JsonResponse({
                    'error': 'Permission denied',
                    'detail': f'Required permission: {permission_code}'
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        
        # Guardar metadata del permiso en la función
        wrapped_view.required_permission = permission_code
        return wrapped_view
    return decorator


def require_any_permission(*permission_codes):
    """
    Requiere AL MENOS UNO de los permisos listados
    
    Uso:
        @require_any_permission('nomina:empleado:view', 'nomina:empleado:edit')
        def mi_vista(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            pm = PermissionManager(request.user)
            if not any(pm.has_permission(perm) for perm in permission_codes):
                logger.warning(
                    f"User {request.user.id} denied permissions (any of): {permission_codes}"
                )
                return JsonResponse({
                    'error': 'Permission denied',
                    'detail': f'Required any of: {", ".join(permission_codes)}'
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator


def require_all_permissions(*permission_codes):
    """
    Requiere TODOS los permisos listados
    
    Uso:
        @require_all_permissions('nomina:nomina:edit', 'nomina:nomina:approve')
        def aprobar_nomina(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            pm = PermissionManager(request.user)
            missing_perms = [p for p in permission_codes if not pm.has_permission(p)]
            
            if missing_perms:
                logger.warning(
                    f"User {request.user.id} missing permissions: {missing_perms}"
                )
                return JsonResponse({
                    'error': 'Permission denied',
                    'detail': f'Missing permissions: {", ".join(missing_perms)}'
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator


def permission_required_api(permission_code):
    """
    Decorador específico para Django REST Framework ViewSets
    
    Uso:
        class EmpleadoViewSet(viewsets.ModelViewSet):
            @permission_required_api('nomina:empleado:delete')
            def destroy(self, request, *args, **kwargs):
                ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(self, request, *args, **kwargs):
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
            pm = PermissionManager(request.user)
            if not pm.has_permission(permission_code):
                logger.warning(
                    f"User {request.user.id} denied permission {permission_code}"
                )
                return Response({
                    'error': 'Permission denied',
                    'detail': f'Required permission: {permission_code}'
                }, status=status.HTTP_403_FORBIDDEN)
            
            return view_func(self, request, *args, **kwargs)
        return wrapped_view
    return decorator


def object_permission_required(permission_code, get_object_func=None):
    """
    Decorador para permisos a nivel de objeto
    
    Uso:
        @object_permission_required('nomina:empleado:edit', lambda request, pk: Empleado.objects.get(pk=pk))
        def editar_empleado(request, pk):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            # Obtener el objeto
            obj = None
            if get_object_func:
                obj = get_object_func(request, *args, **kwargs)
            
            pm = PermissionManager(request.user)
            if not pm.has_permission(permission_code, obj=obj):
                logger.warning(
                    f"User {request.user.id} denied object permission {permission_code}"
                )
                return JsonResponse({
                    'error': 'Permission denied',
                    'detail': f'You do not have permission to access this resource'
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator
```

---

### 4.5 Mixins de DRF

```python
# backend/permisos/mixins.py (NUEVO ARCHIVO)

from rest_framework import status
from rest_framework.response import Response
from permisos.managers import PermissionManager
from django.core.exceptions import PermissionDenied
import logging

logger = logging.getLogger(__name__)


class PermissionRequiredMixin:
    """
    Mixin para ViewSets que requieren permisos específicos por acción
    
    Uso:
        class EmpleadoViewSet(PermissionRequiredMixin, viewsets.ModelViewSet):
            permission_map = {
                'list': 'nomina:empleado:view',
                'retrieve': 'nomina:empleado:view',
                'create': 'nomina:empleado:create',
                'update': 'nomina:empleado:edit',
                'partial_update': 'nomina:empleado:edit',
                'destroy': 'nomina:empleado:delete',
            }
    """
    permission_map = {}
    
    def check_permissions(self, request):
        """Override de check_permissions de DRF"""
        super().check_permissions(request)
        
        # Obtener permiso requerido según acción
        action = self.action
        required_permission = self.permission_map.get(action)
        
        if required_permission:
            pm = PermissionManager(request.user)
            if not pm.has_permission(required_permission):
                logger.warning(
                    f"User {request.user.id} denied permission {required_permission} "
                    f"for action {action} on {self.__class__.__name__}"
                )
                raise PermissionDenied(
                    f"You do not have permission to perform this action. "
                    f"Required: {required_permission}"
                )


class FieldFilterMixin:
    """
    Mixin que filtra campos del serializer según permisos del usuario
    Implementa Field-Level Permissions
    
    Uso:
        class EmpleadoViewSet(FieldFilterMixin, viewsets.ModelViewSet):
            ...
    """
    
    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        
        # Aplicar filtrado de campos según permisos
        if hasattr(self, 'request') and self.request.user.is_authenticated:
            pm = PermissionManager(self.request.user)
            
            # Obtener recurso del modelo
            model_name = self.queryset.model.__name__.lower()
            module_name = self.queryset.model._meta.app_label
            
            # Obtener campos restringidos
            restricted_fields = pm.get_restricted_fields(
                f"{module_name}:{model_name}"
            )
            
            # Remover campos ocultos del serializer
            for field_name, restriction in restricted_fields.items():
                if restriction == 'hidden' and field_name in serializer.fields:
                    serializer.fields.pop(field_name)
                elif restriction == 'readonly':
                    if field_name in serializer.fields:
                        serializer.fields[field_name].read_only = True
        
        return serializer


class RLSMixin:
    """
    Mixin que aplica Row-Level Security al QuerySet
    Filtra automáticamente registros según permisos del usuario
    
    Uso:
        class NominaViewSet(RLSMixin, viewsets.ModelViewSet):
            rls_resource = 'nomina:nomina'
    """
    rls_resource = None
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        if self.request.user.is_authenticated and self.rls_resource:
            pm = PermissionManager(self.request.user)
            queryset = pm.get_filtered_queryset(
                queryset,
                self.rls_resource,
                self.action
            )
        
        return queryset


class AuditMixin:
    """
    Mixin que registra automáticamente acciones en auditoría
    """
    
    def perform_create(self, serializer):
        instance = serializer.save()
        self._log_action('create', instance)
        return instance
    
    def perform_update(self, serializer):
        instance = serializer.save()
        self._log_action('update', instance)
        return instance
    
    def perform_destroy(self, instance):
        self._log_action('delete', instance)
        instance.delete()
    
    def _log_action(self, action, instance):
        """Registra la acción en auditoría"""
        from permisos.models import AuditoriaPermisos
        
        AuditoriaPermisos.objects.create(
            usuario=self.request.user,
            accion=action,
            modelo=instance.__class__.__name__,
            objeto_id=str(instance.pk),
            ip_address=self._get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'path': self.request.path,
                'method': self.request.method,
            }
        )
    
    def _get_client_ip(self):
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip
```

---

### 4.6 Serializers Dinámicos

```python
# backend/permisos/serializers.py (AGREGAR)

from rest_framework import serializers
from permisos.managers import PermissionManager


class DynamicFieldSerializer(serializers.ModelSerializer):
    """
    Serializer que adapta campos según permisos del usuario
    Implementa Field-Level Permissions automáticamente
    
    Uso:
        class EmpleadoSerializer(DynamicFieldSerializer):
            class Meta:
                model = Empleado
                fields = '__all__'
                permission_resource = 'nomina:empleado'
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Obtener usuario del contexto
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            self._apply_field_permissions(request.user)
    
    def _apply_field_permissions(self, user):
        """Aplica restricciones de campo según permisos"""
        pm = PermissionManager(user)
        
        # Obtener recurso del Meta
        resource = getattr(self.Meta, 'permission_resource', None)
        if not resource:
            return
        
        # Obtener campos restringidos
        restricted_fields = pm.get_restricted_fields(resource)
        
        # Aplicar restricciones
        for field_name, restriction in restricted_fields.items():
            if field_name in self.fields:
                if restriction == 'hidden':
                    # Remover campo completamente
                    self.fields.pop(field_name)
                elif restriction == 'readonly':
                    # Hacer campo de solo lectura
                    self.fields[field_name].read_only = True
                elif restriction == 'required':
                    # Hacer campo requerido
                    self.fields[field_name].required = True


class PermissionCheckSerializer(serializers.Serializer):
    """
    Serializer para validar permisos desde el frontend
    
    Usado en: /api/permissions/check/
    """
    permission = serializers.CharField(required=True)
    object_id = serializers.CharField(required=False, allow_null=True)
    
    def validate(self, attrs):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User must be authenticated")
        
        return attrs


class UserPermissionsSerializer(serializers.Serializer):
    """
    Serializer que retorna todos los permisos del usuario
    
    Usado en: /api/permissions/me/
    """
    permissions = serializers.ListField(child=serializers.CharField())
    roles = serializers.ListField(child=serializers.CharField())
    is_superuser = serializers.BooleanField()
```

---

### 4.7 Signals

```python
# backend/permisos/signals.py (AGREGAR)

from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from permisos.models import Permiso, AsignacionPermiso
from roles.models import Rol, AsignacionRol
from permisos.managers import PermissionManager
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Permiso)
def invalidate_permission_cache_on_save(sender, instance, **kwargs):
    """
    Invalida cache de permisos cuando se modifica un permiso
    """
    logger.info(f"Invalidating cache for permission: {instance.codigo}")
    
    # Limpiar cache de todos los usuarios afectados
    # Esto es agresivo pero garantiza consistencia
    cache_pattern = "user_permissions:*"
    cache.delete_pattern(cache_pattern)


@receiver(post_delete, sender=Permiso)
def invalidate_permission_cache_on_delete(sender, instance, **kwargs):
    """
    Invalida cache cuando se elimina un permiso
    """
    logger.info(f"Permission deleted, invalidating cache: {instance.codigo}")
    cache.delete_pattern("user_permissions:*")


@receiver(post_save, sender=AsignacionPermiso)
def invalidate_cache_on_permission_assignment(sender, instance, **kwargs):
    """
    Invalida cache cuando se asigna/revoca un permiso a un rol
    """
    logger.info(f"Permission assignment changed for role: {instance.rol_id}")
    
    # Limpiar cache de usuarios con este rol
    # En una implementación real, buscar usuarios con el rol afectado
    cache.delete_pattern("user_permissions:*")


@receiver(post_save, sender=AsignacionRol)
def invalidate_cache_on_role_assignment(sender, instance, **kwargs):
    """
    Invalida cache cuando se asigna/revoca un rol a un usuario
    """
    user_id = instance.usuario_id
    logger.info(f"Role assignment changed for user: {user_id}")
    
    # Limpiar cache específico del usuario
    cache.delete(f"user_permissions:{user_id}")
    cache.delete(f"user_roles:{user_id}")


@receiver(post_save, sender=Rol)
def invalidate_cache_on_role_change(sender, instance, **kwargs):
    """
    Invalida cache cuando se modifica un rol
    """
    logger.info(f"Role modified: {instance.nombre}")
    
    # Si el rol hereda permisos y cambió su padre, limpiar cache
    if instance.hereda_permisos and instance.rol_padre_id:
        cache.delete_pattern("user_permissions:*")


@receiver(m2m_changed, sender=Rol.permisos.through)
def invalidate_cache_on_role_permissions_change(sender, instance, action, **kwargs):
    """
    Invalida cache cuando cambian los permisos de un rol
    """
    if action in ['post_add', 'post_remove', 'post_clear']:
        logger.info(f"Permissions changed for role: {instance.nombre}")
        cache.delete_pattern("user_permissions:*")


# Signal para auditoría automática
@receiver(post_save, sender=AsignacionRol)
@receiver(post_delete, sender=AsignacionRol)
def audit_role_assignment(sender, instance, **kwargs):
    """
    Registra en auditoría cambios en asignaciones de roles
    """
    from roles.models import AuditoriaRol
    
    action = 'assigned' if kwargs.get('created') else 'revoked'
    
    AuditoriaRol.objects.create(
        rol=instance.rol,
        usuario_afectado=instance.usuario,
        accion=action,
        descripcion=f"Role {action} to user {instance.usuario.email}",
        metadata={
            'estado': instance.estado.nombre if hasattr(instance, 'estado') else 'unknown',
            'fecha_inicio': str(instance.fecha_inicio_vigencia) if hasattr(instance, 'fecha_inicio_vigencia') else None,
        }
    )
```

---

### 4.8 API Endpoints

```python
# backend/permisos/api_views.py (AGREGAR)

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from permisos.managers import PermissionManager
from permisos.serializers import PermissionCheckSerializer, UserPermissionsSerializer
from permisos.models import Recurso, Accion, UIElemento
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


class PermissionCheckViewSet(viewsets.ViewSet):
    """
    ViewSet para validación de permisos desde el frontend
    
    Endpoints:
        POST /api/permissions/check/ - Verifica un permiso específico
        GET /api/permissions/me/ - Obtiene todos los permisos del usuario actual
        GET /api/permissions/ui-elements/ - Obtiene elementos UI accesibles
        POST /api/permissions/clear-cache/ - Limpia cache de permisos
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def check(self, request):
        """
        Verifica si el usuario tiene un permiso específico
        
        Body:
            {
                "permission": "nomina:empleado:view",
                "object_id": "uuid-optional"
            }
        
        Response:
            {
                "has_permission": true,
                "permission": "nomina:empleado:view"
            }
        """
        serializer = PermissionCheckSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        permission = serializer.validated_data['permission']
        object_id = serializer.validated_data.get('object_id')
        
        pm = PermissionManager(request.user)
        
        # Si hay object_id, verificar permiso a nivel de objeto
        obj = None
        if object_id:
            # Aquí deberías obtener el objeto real según el recurso
            # Por ahora devolvemos solo verificación general
            pass
        
        has_permission = pm.has_permission(permission, obj=obj)
        
        return Response({
            'has_permission': has_permission,
            'permission': permission,
            'user_id': request.user.id
        })
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Obtiene todos los permisos y roles del usuario actual
        
        Response:
            {
                "permissions": ["nomina:empleado:view", "nomina:empleado:create", ...],
                "roles": ["Administrador", "Supervisor Nómina"],
                "is_superuser": false
            }
        """
        pm = PermissionManager(request.user)
        
        # Obtener permisos del cache o calcularlos
        cache_key = f"user_permissions:{request.user.id}"
        permissions = cache.get(cache_key)
        
        if not permissions:
            permissions = pm.get_all_permissions()
            cache.set(cache_key, permissions, timeout=300)  # 5 minutos
        
        # Obtener roles
        roles = list(request.user.roles.values_list('nombre', flat=True))
        
        serializer = UserPermissionsSerializer({
            'permissions': permissions,
            'roles': roles,
            'is_superuser': request.user.is_superuser
        })
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ui_elements(self, request):
        """
        Obtiene elementos UI accesibles para el usuario
        
        Response:
            {
                "sidebar": [...],
                "buttons": [...],
                "tabs": [...],
                "widgets": [...]
            }
        """
        pm = PermissionManager(request.user)
        
        # Obtener todos los elementos UI
        ui_elements = UIElemento.objects.filter(activo=True).select_related('modulo')
        
        # Filtrar según permisos
        accessible_elements = {
            'sidebar': [],
            'buttons': [],
            'tabs': [],
            'widgets': [],
            'modals': []
        }
        
        for element in ui_elements:
            # Verificar si el usuario tiene permiso para ver este elemento
            # Buscar permisos relacionados con este elemento UI
            permisos_ui = element.permisos_ui.all()
            
            has_access = False
            for permiso_ui in permisos_ui:
                if pm.has_permission(permiso_ui.permiso.codigo):
                    has_access = True
                    break
            
            if has_access or not permisos_ui.exists():
                tipo = element.tipo.replace('_item', '').replace('_', '')
                if tipo in accessible_elements:
                    accessible_elements[tipo].append({
                        'id': str(element.id),
                        'codigo': element.codigo,
                        'nombre': element.nombre,
                        'tipo': element.tipo,
                        'ruta': element.ruta,
                        'icono': element.icono,
                        'orden': element.orden,
                        'modulo': element.modulo.nombre if element.modulo else None
                    })
        
        return Response(accessible_elements)
    
    @action(detail=False, methods=['post'])
    def clear_cache(self, request):
        """
        Limpia el cache de permisos del usuario actual
        
        Response:
            {
                "message": "Cache cleared successfully"
            }
        """
        pm = PermissionManager(request.user)
        pm.clear_cache()
        
        logger.info(f"Cache cleared for user {request.user.id}")
        
        return Response({
            'message': 'Cache cleared successfully',
            'user_id': request.user.id
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_resources(request):
    """
    Obtiene catálogo de recursos del sistema
    
    GET /api/permissions/resources/
    """
    recursos = Recurso.objects.filter(activo=True).select_related('modulo')
    
    data = [{
        'id': str(r.id),
        'codigo': r.codigo,
        'nombre': r.nombre,
        'modulo': r.modulo.nombre,
        'tipo': r.tipo_recurso
    } for r in recursos]
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_actions(request):
    """
    Obtiene catálogo de acciones disponibles
    
    GET /api/permissions/actions/
    """
    acciones = Accion.objects.filter(activo=True)
    
    data = [{
        'id': str(a.id),
        'codigo': a.codigo,
        'nombre': a.nombre,
        'tipo': a.tipo,
        'es_destructiva': a.es_destructiva
    } for a in acciones]
    
    return Response(data)
```

---

## 5. Script de Seed de Permisos

```python
# backend/permisos/management/commands/seed_permissions.py (NUEVO ARCHIVO)

from django.core.management.base import BaseCommand
from permisos.models import (
    ModuloSistema, Recurso, Accion, RecursoAccion,
    Permiso, PermisoAccion, UIElemento
)
from roles.models import Rol, TipoRol
from django.db import transaction
import uuid


class Command(BaseCommand):
    help = 'Seed de permisos, recursos, acciones y elementos UI'
    
    def handle(self, *args, **kwargs):
        self.stdout.write("🚀 Iniciando seed de permisos...")
        
        with transaction.atomic():
            self.seed_acciones()
            self.seed_modulos()
            self.seed_recursos()
            self.seed_recursos_acciones()
            self.seed_ui_elementos()
            self.seed_permisos()
            self.seed_roles_default()
        
        self.stdout.write(self.style.SUCCESS("✅ Seed completado exitosamente!"))
    
    def seed_acciones(self):
        """Seed de acciones estándar"""
        self.stdout.write("📝 Seeding acciones...")
        
        acciones = [
            # CRUD
            {'codigo': 'view', 'nombre': 'Ver', 'tipo': 'crud', 'es_destructiva': False, 'icono': 'eye', 'color': 'blue'},
            {'codigo': 'list', 'nombre': 'Listar', 'tipo': 'crud', 'es_destructiva': False, 'icono': 'list', 'color': 'blue'},
            {'codigo': 'create', 'nombre': 'Crear', 'tipo': 'crud', 'es_destructiva': False, 'icono': 'plus', 'color': 'green'},
            {'codigo': 'edit', 'nombre': 'Editar', 'tipo': 'crud', 'es_destructiva': False, 'icono': 'edit', 'color': 'yellow'},
            {'codigo': 'delete', 'nombre': 'Eliminar', 'tipo': 'crud', 'es_destructiva': True, 'requiere_confirmacion': True, 'icono': 'trash', 'color': 'red'},
            
            # Workflow
            {'codigo': 'approve', 'nombre': 'Aprobar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'check', 'color': 'green'},
            {'codigo': 'reject', 'nombre': 'Rechazar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'times', 'color': 'red'},
            {'codigo': 'send', 'nombre': 'Enviar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'paper-plane', 'color': 'blue'},
            
            # Data
            {'codigo': 'export', 'nombre': 'Exportar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'download', 'color': 'blue'},
            {'codigo': 'import', 'nombre': 'Importar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'upload', 'color': 'green'},
            {'codigo': 'print', 'nombre': 'Imprimir', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'print', 'color': 'gray'},
            
            # Special
            {'codigo': 'calculate', 'nombre': 'Calcular', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'calculator', 'color': 'purple'},
            {'codigo': 'process', 'nombre': 'Procesar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'cog', 'color': 'blue'},
            {'codigo': 'validate', 'nombre': 'Validar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'check-circle', 'color': 'green'},
            {'codigo': 'archive', 'nombre': 'Archivar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'archive', 'color': 'gray'},
            {'codigo': 'restore', 'nombre': 'Restaurar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'undo', 'color': 'blue'},
            {'codigo': 'duplicate', 'nombre': 'Duplicar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'copy', 'color': 'blue'},
            {'codigo': 'assign', 'nombre': 'Asignar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'user-plus', 'color': 'green'},
            {'codigo': 'unassign', 'nombre': 'Desasignar', 'tipo': 'custom', 'es_destructiva': False, 'icono': 'user-minus', 'color': 'red'},
            
            # UI
            {'codigo': 'click', 'nombre': 'Hacer Click', 'tipo': 'ui', 'es_destructiva': False, 'icono': 'mouse-pointer', 'color': 'blue'},
            {'codigo': 'toggle', 'nombre': 'Alternar', 'tipo': 'ui', 'es_destructiva': False, 'icono': 'toggle-on', 'color': 'blue'},
        ]
        
        for data in acciones:
            Accion.objects.update_or_create(
                codigo=data['codigo'],
                defaults=data
            )
        
        self.stdout.write(f"  ✓ {len(acciones)} acciones creadas")
    
    def seed_modulos(self):
        """Seed de módulos del sistema"""
        self.stdout.write("📦 Seeding módulos...")
        
        modulos = [
            {'codigo': 'core', 'nombre': 'Core', 'descripcion': 'Módulo principal del sistema'},
            {'codigo': 'usuarios', 'nombre': 'Usuarios', 'descripcion': 'Gestión de usuarios y autenticación'},
            {'codigo': 'roles', 'nombre': 'Roles y Permisos', 'descripcion': 'Gestión de roles y permisos'},
            {'codigo': 'nomina', 'nombre': 'Nómina', 'descripcion': 'Gestión de nómina y empleados'},
            {'codigo': 'prestamos', 'nombre': 'Préstamos', 'descripcion': 'Gestión de préstamos'},
            {'codigo': 'contabilidad', 'nombre': 'Contabilidad', 'descripcion': 'Gestión contable'},
            {'codigo': 'dashboard', 'nombre': 'Dashboard', 'descripcion': 'Panel de control'},
            {'codigo': 'reportes', 'nombre': 'Reportes', 'descripcion': 'Generación de reportes'},
            {'codigo': 'configuracion', 'nombre': 'Configuración', 'descripcion': 'Configuración del sistema'},
            {'codigo': 'cargos', 'nombre': 'Cargos', 'descripcion': 'Gestión de cargos'},
            {'codigo': 'documentacion', 'nombre': 'Documentación', 'descripcion': 'Gestión documental'},
            {'codigo': 'ayuda', 'nombre': 'Ayuda', 'descripcion': 'Sistema de ayuda y soporte'},
        ]
        
        for data in modulos:
            ModuloSistema.objects.update_or_create(
                codigo=data['codigo'],
                defaults=data
            )
        
        self.stdout.write(f"  ✓ {len(modulos)} módulos creados")
    
    def seed_recursos(self):
        """Seed de recursos por módulo"""
        self.stdout.write("🎯 Seeding recursos...")
        
        # Obtener módulos
        modulos = {m.codigo: m for m in ModuloSistema.objects.all()}
        
        recursos = [
            # CORE
            {'codigo': 'organizacion', 'nombre': 'Organización', 'modulo': 'core', 'tipo_recurso': 'model'},
            {'codigo': 'configuracion', 'nombre': 'Configuración', 'modulo': 'core', 'tipo_recurso': 'model'},
            {'codigo': 'logs', 'nombre': 'Logs', 'modulo': 'core', 'tipo_recurso': 'model'},
            
            # USUARIOS
            {'codigo': 'usuario', 'nombre': 'Usuario', 'modulo': 'usuarios', 'tipo_recurso': 'model'},
            {'codigo': 'perfil', 'nombre': 'Perfil', 'modulo': 'usuarios', 'tipo_recurso': 'model'},
            {'codigo': 'sesion', 'nombre': 'Sesión', 'modulo': 'usuarios', 'tipo_recurso': 'model'},
            
            # ROLES
            {'codigo': 'rol', 'nombre': 'Rol', 'modulo': 'roles', 'tipo_recurso': 'model'},
            {'codigo': 'permiso', 'nombre': 'Permiso', 'modulo': 'roles', 'tipo_recurso': 'model'},
            {'codigo': 'asignacion', 'nombre': 'Asignación', 'modulo': 'roles', 'tipo_recurso': 'model'},
            
            # NOMINA
            {'codigo': 'empleado', 'nombre': 'Empleado', 'modulo': 'nomina', 'tipo_recurso': 'model'},
            {'codigo': 'contrato', 'nombre': 'Contrato', 'modulo': 'nomina', 'tipo_recurso': 'model'},
            {'codigo': 'nomina', 'nombre': 'Nómina', 'modulo': 'nomina', 'tipo_recurso': 'model'},
            {'codigo': 'salario', 'nombre': 'Salario', 'modulo': 'nomina', 'tipo_recurso': 'model'},
            {'codigo': 'concepto', 'nombre': 'Concepto', 'modulo': 'nomina', 'tipo_recurso': 'model'},
            
            # PRESTAMOS
            {'codigo': 'prestamo', 'nombre': 'Préstamo', 'modulo': 'prestamos', 'tipo_recurso': 'model'},
            {'codigo': 'pago', 'nombre': 'Pago', 'modulo': 'prestamos', 'tipo_recurso': 'model'},
            {'codigo': 'tipo_prestamo', 'nombre': 'Tipo Préstamo', 'modulo': 'prestamos', 'tipo_recurso': 'model'},
            
            # CONTABILIDAD
            {'codigo': 'comprobante', 'nombre': 'Comprobante', 'modulo': 'contabilidad', 'tipo_recurso': 'model'},
            {'codigo': 'movimiento', 'nombre': 'Movimiento', 'modulo': 'contabilidad', 'tipo_recurso': 'model'},
            {'codigo': 'plan_cuentas', 'nombre': 'Plan de Cuentas', 'modulo': 'contabilidad', 'tipo_recurso': 'model'},
            {'codigo': 'balance', 'nombre': 'Balance', 'modulo': 'contabilidad', 'tipo_recurso': 'view'},
            
            # DASHBOARD
            {'codigo': 'dashboard', 'nombre': 'Dashboard', 'modulo': 'dashboard', 'tipo_recurso': 'view'},
            {'codigo': 'kpis', 'nombre': 'KPIs', 'modulo': 'dashboard', 'tipo_recurso': 'view'},
            {'codigo': 'widget_financiero', 'nombre': 'Widget Financiero', 'modulo': 'dashboard', 'tipo_recurso': 'ui_component'},
            {'codigo': 'widget_nomina', 'nombre': 'Widget Nómina', 'modulo': 'dashboard', 'tipo_recurso': 'ui_component'},
            
            # REPORTES
            {'codigo': 'reporte_financiero', 'nombre': 'Reporte Financiero', 'modulo': 'reportes', 'tipo_recurso': 'view'},
            {'codigo': 'reporte_nomina', 'nombre': 'Reporte Nómina', 'modulo': 'reportes', 'tipo_recurso': 'view'},
            {'codigo': 'reporte_prestamos', 'nombre': 'Reporte Préstamos', 'modulo': 'reportes', 'tipo_recurso': 'view'},
            
            # CONFIGURACION
            {'codigo': 'configuracion_general', 'nombre': 'Configuración General', 'modulo': 'configuracion', 'tipo_recurso': 'model'},
            {'codigo': 'configuracion_email', 'nombre': 'Configuración Email', 'modulo': 'configuracion', 'tipo_recurso': 'model'},
            {'codigo': 'configuracion_seguridad', 'nombre': 'Configuración Seguridad', 'modulo': 'configuracion', 'tipo_recurso': 'model'},
        ]
        
        for data in recursos:
            modulo_codigo = data.pop('modulo')
            Recurso.objects.update_or_create(
                codigo=data['codigo'],
                defaults={
                    **data,
                    'modulo': modulos[modulo_codigo]
                }
            )
        
        self.stdout.write(f"  ✓ {len(recursos)} recursos creados")
    
    def seed_recursos_acciones(self):
        """Seed de relación recursos-acciones"""
        self.stdout.write("🔗 Seeding recursos-acciones...")
        
        # Obtener acciones
        acciones = {a.codigo: a for a in Accion.objects.all()}
        
        # Acciones CRUD estándar para modelos
        crud_actions = ['view', 'list', 'create', 'edit', 'delete']
        
        # Asociar acciones CRUD a todos los recursos tipo 'model'
        recursos_model = Recurso.objects.filter(tipo_recurso='model')
        
        count = 0
        for recurso in recursos_model:
            for action_code in crud_actions:
                if action_code in acciones:
                    RecursoAccion.objects.update_or_create(
                        recurso=recurso,
                        accion=acciones[action_code],
                        defaults={'es_requerida': action_code == 'view', 'orden': crud_actions.index(action_code)}
                    )
                    count += 1
        
        # Acciones especiales para recursos específicos
        special_mappings = [
            ('nomina', 'calculate'),
            ('nomina', 'approve'),
            ('nomina', 'send'),
            ('nomina', 'export'),
            ('empleado', 'import'),
            ('empleado', 'export'),
            ('prestamo', 'approve'),
            ('prestamo', 'reject'),
            ('comprobante', 'approve'),
            ('comprobante', 'export'),
            ('reporte_financiero', 'export'),
            ('reporte_nomina', 'export'),
            ('usuario', 'assign'),
            ('rol', 'assign'),
            ('rol', 'unassign'),
        ]
        
        for recurso_codigo, accion_codigo in special_mappings:
            try:
                recurso = Recurso.objects.get(codigo=recurso_codigo)
                accion = acciones.get(accion_codigo)
                if accion:
                    RecursoAccion.objects.update_or_create(
                        recurso=recurso,
                        accion=accion,
                        defaults={'orden': 100}
                    )
                    count += 1
            except Recurso.DoesNotExist:
                pass
        
        self.stdout.write(f"  ✓ {count} relaciones recurso-acción creadas")
    
    def seed_ui_elementos(self):
        """Seed de elementos UI"""
        self.stdout.write("🎨 Seeding UI elements...")
        
        modulos = {m.codigo: m for m in ModuloSistema.objects.all()}
        
        ui_elements = [
            # SIDEBAR ITEMS
            {'codigo': 'sidebar:dashboard', 'nombre': 'Dashboard', 'tipo': 'sidebar_item', 'modulo': 'dashboard', 'ruta': '/dashboard', 'icono': 'dashboard', 'orden': 1},
            {'codigo': 'sidebar:usuarios', 'nombre': 'Usuarios', 'tipo': 'sidebar_item', 'modulo': 'usuarios', 'ruta': '/usuarios', 'icono': 'users', 'orden': 2},
            {'codigo': 'sidebar:roles', 'nombre': 'Roles y Permisos', 'tipo': 'sidebar_item', 'modulo': 'roles', 'ruta': '/roles', 'icono': 'shield', 'orden': 3},
            {'codigo': 'sidebar:nomina', 'nombre': 'Nómina', 'tipo': 'sidebar_item', 'modulo': 'nomina', 'ruta': '/nomina', 'icono': 'money', 'orden': 4},
            {'codigo': 'sidebar:prestamos', 'nombre': 'Préstamos', 'tipo': 'sidebar_item', 'modulo': 'prestamos', 'ruta': '/prestamos', 'icono': 'hand-holding-usd', 'orden': 5},
            {'codigo': 'sidebar:contabilidad', 'nombre': 'Contabilidad', 'tipo': 'sidebar_item', 'modulo': 'contabilidad', 'ruta': '/contabilidad', 'icono': 'calculator', 'orden': 6},
            {'codigo': 'sidebar:reportes', 'nombre': 'Reportes', 'tipo': 'sidebar_item', 'modulo': 'reportes', 'ruta': '/reportes', 'icono': 'chart-bar', 'orden': 7},
            {'codigo': 'sidebar:configuracion', 'nombre': 'Configuración', 'tipo': 'sidebar_item', 'modulo': 'configuracion', 'ruta': '/configuracion', 'icono': 'cog', 'orden': 8},
            
            # BUTTONS
            {'codigo': 'button:crear_usuario', 'nombre': 'Crear Usuario', 'tipo': 'button', 'modulo': 'usuarios', 'icono': 'plus'},
            {'codigo': 'button:editar_usuario', 'nombre': 'Editar Usuario', 'tipo': 'button', 'modulo': 'usuarios', 'icono': 'edit'},
            {'codigo': 'button:eliminar_usuario', 'nombre': 'Eliminar Usuario', 'tipo': 'button', 'modulo': 'usuarios', 'icono': 'trash'},
            {'codigo': 'button:crear_empleado', 'nombre': 'Crear Empleado', 'tipo': 'button', 'modulo': 'nomina', 'icono': 'plus'},
            {'codigo': 'button:calcular_nomina', 'nombre': 'Calcular Nómina', 'tipo': 'button', 'modulo': 'nomina', 'icono': 'calculator'},
            {'codigo': 'button:aprobar_nomina', 'nombre': 'Aprobar Nómina', 'tipo': 'button', 'modulo': 'nomina', 'icono': 'check'},
            {'codigo': 'button:exportar_excel', 'nombre': 'Exportar Excel', 'tipo': 'button', 'modulo': 'core', 'icono': 'file-excel'},
            {'codigo': 'button:aprobar_prestamo', 'nombre': 'Aprobar Préstamo', 'tipo': 'button', 'modulo': 'prestamos', 'icono': 'check'},
            
            # TABS
            {'codigo': 'tab:usuario_roles', 'nombre': 'Roles', 'tipo': 'tab', 'modulo': 'usuarios'},
            {'codigo': 'tab:usuario_permisos', 'nombre': 'Permisos', 'tipo': 'tab', 'modulo': 'usuarios'},
            {'codigo': 'tab:empleado_nominas', 'nombre': 'Nóminas', 'tipo': 'tab', 'modulo': 'nomina'},
            {'codigo': 'tab:empleado_prestamos', 'nombre': 'Préstamos', 'tipo': 'tab', 'modulo': 'nomina'},
            
            # WIDGETS
            {'codigo': 'widget:kpis_financieros', 'nombre': 'KPIs Financieros', 'tipo': 'widget', 'modulo': 'dashboard', 'icono': 'chart-line'},
            {'codigo': 'widget:nomina_mes', 'nombre': 'Nómina del Mes', 'tipo': 'widget', 'modulo': 'dashboard', 'icono': 'money-bill'},
            {'codigo': 'widget:prestamos_activos', 'nombre': 'Préstamos Activos', 'tipo': 'widget', 'modulo': 'dashboard', 'icono': 'list'},
        ]
        
        for data in ui_elements:
            modulo_codigo = data.pop('modulo')
            UIElemento.objects.update_or_create(
                codigo=data['codigo'],
                defaults={
                    **data,
                    'modulo': modulos[modulo_codigo]
                }
            )
        
        self.stdout.write(f"  ✓ {len(ui_elements)} elementos UI creados")
    
    def seed_permisos(self):
        """Seed de permisos combinando recursos y acciones"""
        self.stdout.write("🔐 Seeding permisos...")
        
        # Este método crearía permisos basados en RecursoAccion
        # Por simplicidad, aquí solo mostramos la estructura
        
        recursos_acciones = RecursoAccion.objects.select_related('recurso', 'accion', 'recurso__modulo').all()
        
        count = 0
        for ra in recursos_acciones:
            codigo = f"{ra.recurso.modulo.codigo}:{ra.recurso.codigo}:{ra.accion.codigo}"
            nombre = f"{ra.recurso.nombre} - {ra.accion.nombre}"
            
            permiso, created = Permiso.objects.update_or_create(
                codigo=codigo,
                defaults={
                    'nombre': nombre,
                    'descripcion': f"Permite {ra.accion.nombre.lower()} {ra.recurso.nombre.lower()}",
                    'modulo': ra.recurso.modulo,
                    'es_sistema': True
                }
            )
            
            # Crear relación PermisoAccion
            PermisoAccion.objects.update_or_create(
                permiso=permiso,
                recurso=ra.recurso,
                accion=ra.accion
            )
            
            count += 1
        
        self.stdout.write(f"  ✓ {count} permisos creados")
    
    def seed_roles_default(self):
        """Seed de roles por defecto"""
        self.stdout.write("👥 Seeding roles por defecto...")
        
        # Obtener o crear tipo de rol
        tipo_sistema, _ = TipoRol.objects.get_or_create(
            nombre='Sistema',
            defaults={'descripcion': 'Roles del sistema'}
        )
        
        roles_default = [
            {
                'nombre': 'Super Administrador',
                'descripcion': 'Acceso total al sistema',
                'permisos': 'all'
            },
            {
                'nombre': 'Administrador',
                'descripcion': 'Administrador con permisos limitados',
                'permisos': ['usuarios', 'roles', 'configuracion']
            },
            {
                'nombre': 'Supervisor Nómina',
                'descripcion': 'Supervisor del módulo de nómina',
                'permisos': ['nomina']
            },
            {
                'nombre': 'Empleado',
                'descripcion': 'Usuario básico del sistema',
                'permisos': ['dashboard', 'perfil:view:own']
            },
        ]
        
        for role_data in roles_default:
            permisos_config = role_data.pop('permisos')
            
            rol, created = Rol.objects.update_or_create(
                nombre=role_data['nombre'],
                defaults={
                    **role_data,
                    'tipo_rol': tipo_sistema,
                    'es_sistema': True,
                    'activo': True
                }
            )
            
            # Asignar permisos
            if permisos_config == 'all':
                # Super admin: todos los permisos
                permisos = Permiso.objects.filter(es_sistema=True)
                rol.permisos.set(permisos)
            elif isinstance(permisos_config, list):
                # Filtrar permisos por módulo
                permisos = Permiso.objects.filter(
                    modulo__codigo__in=permisos_config,
                    es_sistema=True
                )
                rol.permisos.set(permisos)
        
        self.stdout.write(f"  ✓ {len(roles_default)} roles por defecto creados")
```

---

## 6. Implementación Frontend

### 6.1 Context de Permisos

```javascript
// frontend/src/contexts/PermissionsContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isSuperuser, setIsSuperuser] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uiElements, setUiElements] = useState({
        sidebar: [],
        buttons: [],
        tabs: [],
        widgets: []
    });

    useEffect(() => {
        fetchPermissions();
        fetchUIElements();
    }, []);

    const fetchPermissions = async () => {
        try {
            const response = await axios.get('/api/permissions/me/');
            setPermissions(response.data.permissions);
            setRoles(response.data.roles);
            setIsSuperuser(response.data.is_superuser);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUIElements = async () => {
        try {
            const response = await axios.get('/api/permissions/ui-elements/');
            setUiElements(response.data);
        } catch (error) {
            console.error('Error fetching UI elements:', error);
        }
    };

    const hasPermission = (permission) => {
        if (isSuperuser) return true;
        return permissions.includes(permission);
    };

    const hasAnyPermission = (...perms) => {
        if (isSuperuser) return true;
        return perms.some(perm => permissions.includes(perm));
    };

    const hasAllPermissions = (...perms) => {
        if (isSuperuser) return true;
        return perms.every(perm => permissions.includes(perm));
    };

    const hasRole = (roleName) => {
        return roles.includes(roleName);
    };

    const canAccessUIElement = (elementCode) => {
        return Object.values(uiElements)
            .flat()
            .some(el => el.codigo === elementCode);
    };

    const clearCache = async () => {
        try {
            await axios.post('/api/permissions/clear-cache/');
            await fetchPermissions();
            await fetchUIElements();
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    };

    const value = {
        permissions,
        roles,
        isSuperuser,
        loading,
        uiElements,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        canAccessUIElement,
        clearCache,
        refresh: fetchPermissions
    };

    return (
        <PermissionsContext.Provider value={value}>
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => {
    const context = useContext(PermissionsContext);
    if (!context) {
        throw new Error('usePermissions must be used within PermissionsProvider');
    }
    return context;
};
```

---

### 6.2 Hook Personalizado

```javascript
// frontend/src/hooks/usePermission.js

import { usePermissions } from '../contexts/PermissionsContext';
import { useMemo } from 'react';

export const usePermission = (permission) => {
    const { hasPermission, loading, isSuperuser } = usePermissions();

    const allowed = useMemo(() => {
        if (loading) return false;
        if (isSuperuser) return true;
        return hasPermission(permission);
    }, [permission, hasPermission, loading, isSuperuser]);

    return {
        allowed,
        loading,
        denied: !loading && !allowed
    };
};

export const usePermissions = () => {
    return usePermissions();
};
```

---

### 6.3 Higher-Order Component

```javascript
// frontend/src/hoc/withPermission.jsx

import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { Navigate } from 'react-router-dom';

export const withPermission = (Component, requiredPermission, options = {}) => {
    const {
        redirectTo = '/unauthorized',
        showLoading = true,
        LoadingComponent = () => <div>Loading...</div>,
        FallbackComponent = null
    } = options;

    return (props) => {
        const { allowed, loading } = usePermission(requiredPermission);

        if (loading && showLoading) {
            return <LoadingComponent />;
        }

        if (!allowed) {
            if (FallbackComponent) {
                return <FallbackComponent />;
            }
            return <Navigate to={redirectTo} replace />;
        }

        return <Component {...props} />;
    };
};
```

---

### 6.4 Componente `<Can>`

```javascript
// frontend/src/components/permissions/Can.jsx

import React from 'react';
import { usePermissions } from '../../contexts/PermissionsContext';

export const Can = ({
    do: permission,
    doAny,
    doAll,
    children,
    fallback = null,
    loading = null
}) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions, loading: isLoading } = usePermissions();

    if (isLoading && loading) {
        return loading;
    }

    let allowed = false;

    if (permission) {
        allowed = hasPermission(permission);
    } else if (doAny) {
        allowed = hasAnyPermission(...doAny);
    } else if (doAll) {
        allowed = hasAllPermissions(...doAll);
    }

    if (!allowed) {
        return fallback;
    }

    return <>{children}</>;
};

// Uso:
// <Can do="nomina:empleado:create">
//   <Button>Crear Empleado</Button>
// </Can>
//
// <Can doAny={["nomina:empleado:edit", "nomina:empleado:view"]}>
//   <EmployeeDetails />
// </Can>
```

---

### 6.5 Rutas Protegidas

```javascript
// frontend/src/components/routing/ProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';

export const ProtectedRoute = ({ permission, children, redirectTo = '/unauthorized' }) => {
    const { allowed, loading } = usePermission(permission);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!allowed) {
        return <Navigate to={redirectTo} replace />;
    }

    return children ? children : <Outlet />;
};

// Uso en App.jsx:
// <Route path="/nomina" element={<ProtectedRoute permission="nomina:empleado:view" />}>
//   <Route index element={<NominaPage />} />
// </Route>
```

---

### 6.6 Sidebar Dinámico

```javascript
// frontend/src/components/layout/Sidebar.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../contexts/PermissionsContext';

export const Sidebar = () => {
    const { uiElements, loading } = usePermissions();

    if (loading) return <div>Loading...</div>;

    const sidebarItems = uiElements.sidebar
        .filter(item => item !== null)
        .sort((a, b) => a.orden - b.orden);

    return (
        <aside className="w-64 bg-gray-800 text-white h-screen">
            <div className="p-4">
                <h2 className="text-2xl font-bold">CorteSec</h2>
            </div>
            <nav className="mt-6">
                {sidebarItems.map((item) => (
                    <Link
                        key={item.id}
                        to={item.ruta}
                        className="flex items-center px-6 py-3 hover:bg-gray-700 transition"
                    >
                        <i className={`fas fa-${item.icono} mr-3`}></i>
                        <span>{item.nombre}</span>
                    </Link>
                ))}
            </nav>
        </aside>
    );
};
```

---

### 6.7 Botones Condicionales

```javascript
// frontend/src/components/common/PermissionButton.jsx

import React from 'react';
import { Can } from '../permissions/Can';

export const PermissionButton = ({
    permission,
    onClick,
    children,
    className = '',
    variant = 'primary',
    ...props
}) => {
    const baseStyles = 'px-4 py-2 rounded font-medium transition';
    const variantStyles = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        success: 'bg-green-600 hover:bg-green-700 text-white',
        secondary: 'bg-gray-600 hover:bg-gray-700 text-white'
    };

    return (
        <Can do={permission}>
            <button
                onClick={onClick}
                className={`${baseStyles} ${variantStyles[variant]} ${className}`}
                {...props}
            >
                {children}
            </button>
        </Can>
    );
};

// Uso:
// <PermissionButton 
//   permission="nomina:empleado:create"
//   onClick={handleCreate}
//   variant="primary"
// >
//   Crear Empleado
// </PermissionButton>
```

---

### 6.8 Tabs Condicionales

```javascript
// frontend/src/components/common/PermissionTabs.jsx

import React, { useState } from 'react';
import { Can } from '../permissions/Can';

export const PermissionTabs = ({ tabs, defaultTab = 0 }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Filtrar tabs según permisos
    const visibleTabs = tabs.filter((tab, index) => {
        if (!tab.permission) return true;
        // Verificar permiso aquí o usar Can
        return true; // Simplificado
    });

    return (
        <div>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {visibleTabs.map((tab, index) => (
                        <Can key={index} do={tab.permission} fallback={null}>
                            <button
                                onClick={() => setActiveTab(index)}
                                className={`
                                    py-4 px-1 border-b-2 font-medium text-sm
                                    ${activeTab === index
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        </Can>
                    ))}
                </nav>
            </div>
            <div className="mt-4">
                {visibleTabs[activeTab]?.content}
            </div>
        </div>
    );
};

// Uso:
// <PermissionTabs tabs={[
//   { label: 'Info', content: <Info />, permission: 'usuarios:perfil:view' },
//   { label: 'Roles', content: <Roles />, permission: 'roles:asignacion:view' },
//   { label: 'Permisos', content: <Permisos />, permission: 'permisos:permiso:view' }
// ]} />
```

---

## 7. Seguridad y Validaciones

### 7.1 Validaciones Backend

```python
# backend/permisos/validators.py (NUEVO ARCHIVO)

from django.core.exceptions import ValidationError
from permisos.managers import PermissionManager
import logging

logger = logging.getLogger(__name__)


def validate_permission_escalation(user, target_user, new_roles):
    """
    Valida que un usuario no pueda asignar roles con más permisos que los que tiene
    
    Previene escalación de privilegios
    """
    pm = PermissionManager(user)
    
    # Superusuarios pueden hacer todo
    if user.is_superuser:
        return True
    
    # Obtener permisos del usuario actual
    user_permissions = set(pm.get_all_permissions())
    
    # Obtener permisos de los roles que intenta asignar
    from roles.models import Rol
    target_permissions = set()
    for role in new_roles:
        role_obj = Rol.objects.get(id=role)
        role_perms = role_obj.get_all_permissions()  # Incluye herencia
        target_permissions.update(role_perms)
    
    # Verificar que no esté asignando permisos que no tiene
    escalation_perms = target_permissions - user_permissions
    
    if escalation_perms:
        logger.warning(
            f"User {user.id} attempted privilege escalation. "
            f"Tried to assign permissions: {escalation_perms}"
        )
        raise ValidationError(
            f"You cannot assign roles with permissions you don't have: {', '.join(list(escalation_perms)[:5])}"
        )
    
    return True


def validate_permission_dependencies(permission_code):
    """
    Valida que al asignar un permiso, se asignen también sus dependencias
    
    Ejemplo: 'nomina:nomina:edit' requiere 'nomina:nomina:view'
    """
    dependencies = {
        'edit': ['view'],
        'delete': ['view'],
        'approve': ['view'],
        'export': ['view'],
    }
    
    parts = permission_code.split(':')
    if len(parts) < 3:
        return []
    
    action = parts[2]
    required_deps = []
    
    if action in dependencies:
        for dep_action in dependencies[action]:
            dep_permission = f"{parts[0]}:{parts[1]}:{dep_action}"
            required_deps.append(dep_permission)
    
    return required_deps


class PermissionValidator:
    """
    Validador de permisos para usar en serializers
    """
    
    def __init__(self, required_permission):
        self.required_permission = required_permission
    
    def __call__(self, value, serializer_field):
        request = serializer_field.context.get('request')
        if not request or not request.user.is_authenticated:
            raise ValidationError("Authentication required")
        
        pm = PermissionManager(request.user)
        if not pm.has_permission(self.required_permission):
            raise ValidationError(
                f"You do not have permission to perform this action. "
                f"Required: {self.required_permission}"
            )
```

---

### 7.2 Rate Limiting

```python
# backend/permisos/rate_limiting.py (NUEVO ARCHIVO)

from django.core.cache import cache
from django.http import JsonResponse
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Rate limiter basado en Redis
    """
    
    def __init__(self, key_prefix='rate_limit'):
        self.key_prefix = key_prefix
    
    def is_allowed(self, identifier, max_requests=100, window_seconds=60):
        """
        Verifica si el identificador puede hacer la request
        
        Args:
            identifier: User ID, IP, etc.
            max_requests: Máximo de requests permitidos
            window_seconds: Ventana de tiempo en segundos
        
        Returns:
            (bool, int): (is_allowed, remaining_requests)
        """
        key = f"{self.key_prefix}:{identifier}"
        
        # Obtener contador actual
        current = cache.get(key, 0)
        
        if current >= max_requests:
            return False, 0
        
        # Incrementar contador
        if current == 0:
            # Primera request, setear con TTL
            cache.set(key, 1, window_seconds)
        else:
            # Incrementar
            cache.incr(key)
        
        remaining = max_requests - current - 1
        return True, remaining
    
    def reset(self, identifier):
        """Resetea el contador para un identificador"""
        key = f"{self.key_prefix}:{identifier}"
        cache.delete(key)


def rate_limit_by_permission(permission_code):
    """
    Decorator que aplica rate limiting según el permiso
    
    Permisos destructivos tienen límites más estrictos
    """
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            limiter = RateLimiter()
            
            # Determinar límite según tipo de acción
            if 'delete' in permission_code or 'purge' in permission_code:
                max_requests = 10  # Muy restrictivo
            elif 'create' in permission_code or 'edit' in permission_code:
                max_requests = 50
            else:
                max_requests = 100
            
            identifier = f"user_{request.user.id}_{permission_code}"
            is_allowed, remaining = limiter.is_allowed(identifier, max_requests, 60)
            
            if not is_allowed:
                logger.warning(
                    f"Rate limit exceeded for user {request.user.id} "
                    f"on permission {permission_code}"
                )
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'detail': 'Too many requests. Please try again later.'
                }, status=429)
            
            # Agregar headers de rate limit
            response = view_func(request, *args, **kwargs)
            response['X-RateLimit-Limit'] = max_requests
            response['X-RateLimit-Remaining'] = remaining
            
            return response
        
        return wrapped_view
    return decorator
```

---

### 7.3 Logging de Seguridad

```python
# backend/permisos/security_logger.py (NUEVO ARCHIVO)

import logging
from datetime import datetime
from permisos.models import AuditoriaPermisos

logger = logging.getLogger('security')


class SecurityLogger:
    """
    Logger especializado para eventos de seguridad
    """
    
    @staticmethod
    def log_permission_denied(user, permission, resource=None, ip_address=None):
        """Log de acceso denegado"""
        logger.warning(
            f"PERMISSION_DENIED: User {user.id} ({user.email}) "
            f"denied access to {permission} "
            f"{'for resource ' + str(resource) if resource else ''} "
            f"from IP {ip_address}"
        )
        
        # Guardar en base de datos
        AuditoriaPermisos.objects.create(
            usuario=user,
            accion='permission_denied',
            detalle=f"Denied: {permission}",
            ip_address=ip_address,
            metadata={'permission': permission, 'resource': str(resource) if resource else None}
        )
    
    @staticmethod
    def log_permission_granted(user, permission, resource=None):
        """Log de acceso concedido (solo para acciones sensibles)"""
        if any(keyword in permission for keyword in ['delete', 'approve', 'purge', 'edit']):
            logger.info(
                f"PERMISSION_GRANTED: User {user.id} ({user.email}) "
                f"granted access to {permission} "
                f"{'for resource ' + str(resource) if resource else ''}"
            )
    
    @staticmethod
    def log_role_assignment(admin_user, target_user, role, action='assigned'):
        """Log de asignación de roles"""
        logger.info(
            f"ROLE_{action.upper()}: Admin {admin_user.id} ({admin_user.email}) "
            f"{action} role '{role.nombre}' to user {target_user.id} ({target_user.email})"
        )
    
    @staticmethod
    def log_privilege_escalation_attempt(user, attempted_roles):
        """Log de intento de escalación de privilegios"""
        logger.critical(
            f"PRIVILEGE_ESCALATION_ATTEMPT: User {user.id} ({user.email}) "
            f"attempted to assign roles: {[r.nombre for r in attempted_roles]}"
        )
        
        # Esto debería alertar al equipo de seguridad
        # Enviar email, Slack, etc.
    
    @staticmethod
    def log_suspicious_activity(user, activity_type, details):
        """Log de actividad sospechosa"""
        logger.warning(
            f"SUSPICIOUS_ACTIVITY: User {user.id} ({user.email}) "
            f"- {activity_type}: {details}"
        )
```

---

## 8. Testing

### 8.1 Tests de PermissionManager

```python
# backend/permisos/tests/test_permission_manager.py

from django.test import TestCase
from django.contrib.auth import get_user_model
from permisos.managers import PermissionManager
from permisos.models import Permiso, Recurso, Accion, ModuloSistema
from roles.models import Rol, AsignacionRol

User = get_user_model()


class PermissionManagerTestCase(TestCase):
    
    def setUp(self):
        """Setup test data"""
        # Crear usuario
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
        # Crear módulo
        self.modulo = ModuloSistema.objects.create(
            codigo='nomina',
            nombre='Nómina'
        )
        
        # Crear recurso
        self.recurso = Recurso.objects.create(
            codigo='empleado',
            nombre='Empleado',
            modulo=self.modulo,
            tipo_recurso='model'
        )
        
        # Crear acción
        self.accion_view = Accion.objects.create(
            codigo='view',
            nombre='Ver',
            tipo='crud'
        )
        
        # Crear permiso
        self.permiso = Permiso.objects.create(
            codigo='nomina:empleado:view',
            nombre='Ver Empleados',
            modulo=self.modulo
        )
        
        # Crear rol
        self.rol = Rol.objects.create(
            nombre='Test Role'
        )
        self.rol.permisos.add(self.permiso)
        
        # Asignar rol al usuario
        AsignacionRol.objects.create(
            usuario=self.user,
            rol=self.rol
        )
    
    def test_has_permission_with_role(self):
        """Test que usuario con rol tiene permiso"""
        pm = PermissionManager(self.user)
        self.assertTrue(pm.has_permission('nomina:empleado:view'))
    
    def test_has_permission_without_role(self):
        """Test que usuario sin rol no tiene permiso"""
        user_no_role = User.objects.create_user(
            email='norole@example.com',
            password='testpass123'
        )
        pm = PermissionManager(user_no_role)
        self.assertFalse(pm.has_permission('nomina:empleado:view'))
    
    def test_superuser_has_all_permissions(self):
        """Test que superuser tiene todos los permisos"""
        superuser = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        pm = PermissionManager(superuser)
        self.assertTrue(pm.has_permission('any:random:permission'))
    
    def test_cache_invalidation(self):
        """Test que cache se invalida correctamente"""
        pm = PermissionManager(self.user)
        
        # Primera llamada (cachea)
        self.assertTrue(pm.has_permission('nomina:empleado:view'))
        
        # Remover permiso
        self.rol.permisos.remove(self.permiso)
        
        # Limpiar cache
        pm.clear_cache()
        
        # Debería retornar False ahora
        self.assertFalse(pm.has_permission('nomina:empleado:view'))
    
    def test_get_all_permissions(self):
        """Test obtención de todos los permisos"""
        pm = PermissionManager(self.user)
        perms = pm.get_all_permissions()
        
        self.assertIn('nomina:empleado:view', perms)
        self.assertEqual(len(perms), 1)
```

---

### 8.2 Tests de Middleware

```python
# backend/permisos/tests/test_middleware.py

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from permisos.middleware import PermissionCheckMiddleware
from unittest.mock import Mock

User = get_user_model()


class PermissionMiddlewareTestCase(TestCase):
    
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = PermissionCheckMiddleware(get_response=Mock())
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_exempt_paths_bypass_check(self):
        """Test que rutas exentas no requieren permisos"""
        request = self.factory.get('/api/login/')
        request.user = self.user
        
        response = self.middleware(request)
        # No debería lanzar 403
        self.assertNotEqual(response.status_code, 403)
    
    def test_unauthenticated_user_denied(self):
        """Test que usuario no autenticado es rechazado"""
        request = self.factory.get('/api/nomina/empleados/')
        request.user = Mock(is_authenticated=False)
        
        response = self.middleware(request)
        self.assertEqual(response.status_code, 401)
```

---

### 8.3 Tests de Decoradores

```python
# backend/permisos/tests/test_decorators.py

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from permisos.decorators import require_permission
from permisos.models import Permiso, ModuloSistema
from roles.models import Rol, AsignacionRol

User = get_user_model()


class DecoratorsTestCase(TestCase):
    
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
        # Crear permiso y rol
        modulo = ModuloSistema.objects.create(codigo='test', nombre='Test')
        permiso = Permiso.objects.create(
            codigo='test:resource:view',
            nombre='Test Permission',
            modulo=modulo
        )
        rol = Rol.objects.create(nombre='Test Role')
        rol.permisos.add(permiso)
        AsignacionRol.objects.create(usuario=self.user, rol=rol)
    
    def test_decorator_allows_with_permission(self):
        """Test que decorador permite acceso con permiso"""
        
        @require_permission('test:resource:view')
        def test_view(request):
            return {'success': True}
        
        request = self.factory.get('/test/')
        request.user = self.user
        
        response = test_view(request)
        self.assertEqual(response['success'], True)
    
    def test_decorator_denies_without_permission(self):
        """Test que decorador deniega sin permiso"""
        
        @require_permission('test:resource:edit')
        def test_view(request):
            return {'success': True}
        
        request = self.factory.get('/test/')
        request.user = self.user
        
        response = test_view(request)
        self.assertEqual(response.status_code, 403)
```

---

## 9. Documentación

### 9.1 Matriz de Permisos (Excel/Markdown)

```markdown
# MATRIZ DE PERMISOS - CORTESEC

## Módulo: NÓMINA

| Código Permiso | Recurso | Acción | Descripción | Roles con Acceso |
|----------------|---------|--------|-------------|------------------|
| nomina:empleado:view | Empleado | Ver | Visualizar listado de empleados | Admin, Supervisor Nómina, RRHH |
| nomina:empleado:create | Empleado | Crear | Registrar nuevos empleados | Admin, RRHH |
| nomina:empleado:edit | Empleado | Editar | Modificar datos de empleados | Admin, RRHH |
| nomina:empleado:delete | Empleado | Eliminar | Eliminar empleados | Admin |
| nomina:nomina:calculate | Nómina | Calcular | Ejecutar cálculo de nómina | Admin, Supervisor Nómina |
| nomina:nomina:approve | Nómina | Aprobar | Aprobar nóminas calculadas | Admin |

## Módulo: PRÉSTAMOS

| Código Permiso | Recurso | Acción | Descripción | Roles con Acceso |
|----------------|---------|--------|-------------|------------------|
| prestamos:prestamo:view | Préstamo | Ver | Ver todos los préstamos | Admin, Finanzas |
| prestamos:prestamo:view:own | Préstamo | Ver Propios | Ver solo sus préstamos | Empleado |
| prestamos:prestamo:approve | Préstamo | Aprobar | Aprobar solicitudes de préstamo | Admin, Finanzas |

... (continuar con todos los módulos)
```

---

### 9.2 Guía de Usuario

```markdown
# GUÍA DE USUARIO - SISTEMA DE ROLES Y PERMISOS

## 1. Introducción

El sistema de permisos de CorteSec permite controlar de forma granular qué usuarios pueden acceder a qué funcionalidades.

## 2. Conceptos Básicos

- **Permiso**: Acción específica que un usuario puede realizar (ej: "Ver empleados")
- **Rol**: Conjunto de permisos agrupados (ej: "Supervisor de Nómina")
- **Asignación**: Vinculación de un rol a un usuario

## 3. Cómo Asignar Roles

### 3.1 Navegar a Usuarios
1. Ir a "Usuarios" en el menú lateral
2. Seleccionar el usuario deseado
3. Click en pestaña "Roles"

### 3.2 Asignar un Rol
1. Click en botón "Asignar Rol"
2. Seleccionar rol del dropdown
3. Configurar fechas de vigencia (opcional)
4. Click en "Guardar"

### 3.3 Revocar un Rol
1. En la lista de roles activos
2. Click en botón "Revocar"
3. Confirmar acción

## 4. Creación de Roles Personalizados

### 4.1 Crear Nuevo Rol
1. Ir a "Roles y Permisos"
2. Click en "Crear Rol"
3. Ingresar nombre y descripción
4. Seleccionar permisos

### 4.2 Selección de Permisos
- Usar buscador para filtrar permisos
- Agrupar por módulo
- Seleccionar permisos necesarios
- Click en "Guardar"

## 5. Mejores Prácticas

### 5.1 Principio de Menor Privilegio
- Asignar solo los permisos necesarios
- Revisar permisos periódicamente

### 5.2 Roles por Función
- Crear roles basados en funciones de trabajo
- Evitar roles "todo poderosos"

### 5.3 Auditoría
- Revisar logs de asignación de roles
- Monitorear accesos denegados

## 6. Solución de Problemas

### 6.1 Usuario no puede acceder a un módulo
1. Verificar que tenga rol asignado
2. Verificar que el rol tenga el permiso necesario
3. Verificar vigencia del rol

### 6.2 Permiso no aparece en la lista
1. Verificar que el permiso esté activo
2. Contactar a administrador del sistema
```

---

### 9.3 Guía de Desarrollador

```markdown
# GUÍA DE DESARROLLADOR - SISTEMA RBAC

## 1. Agregar Nuevos Permisos

### 1.1 Backend

#### Paso 1: Definir en Constants
```python
# permisos/constants.py
PERMISO_NUEVO_RECURSO_VIEW = 'modulo:recurso:view'
```

#### Paso 2: Crear en Seed
```python
# En seed_permissions.py
recursos.append({
    'codigo': 'nuevo_recurso',
    'nombre': 'Nuevo Recurso',
    'modulo': 'modulo',
    'tipo_recurso': 'model'
})
```

#### Paso 3: Proteger View
```python
@require_permission('modulo:recurso:view')
def mi_vista(request):
    ...
```

### 1.2 Frontend

#### Paso 1: Proteger Ruta
```jsx
<Route path="/nuevo" element={
    <ProtectedRoute permission="modulo:recurso:view">
        <NuevoComponente />
    </ProtectedRoute>
} />
```

#### Paso 2: Botones Condicionales
```jsx
<Can do="modulo:recurso:create">
    <Button>Crear</Button>
</Can>
```

## 2. Implementar RLS

```python
class MiViewSet(RLSMixin, viewsets.ModelViewSet):
    rls_resource = 'modulo:recurso'
    
    def get_queryset(self):
        # El mixin aplica filtros automáticamente
        return super().get_queryset()
```

## 3. Field-Level Permissions

```python
class MiSerializer(DynamicFieldSerializer):
    class Meta:
        model = MiModelo
        fields = '__all__'
        permission_resource = 'modulo:recurso'
```

## 4. Testing de Permisos

```python
def test_permission_required(self):
    # Usuario sin permiso
    response = self.client.get('/api/recurso/')
    self.assertEqual(response.status_code, 403)
    
    # Asignar permiso
    self.user.roles.add(self.rol_con_permiso)
    
    # Ahora debería funcionar
    response = self.client.get('/api/recurso/')
    self.assertEqual(response.status_code, 200)
```

## 5. Debugging

### Verificar Permisos del Usuario
```python
from permisos.managers import PermissionManager
pm = PermissionManager(user)
print(pm.get_all_permissions())
```

### Limpiar Cache
```python
pm.clear_cache()
```

### Ver Logs
```bash
tail -f logs/security.log | grep PERMISSION_DENIED
```
```

---

## 10. Roadmap de Implementación

### 10.1 Fase 1: Fundamentos (Semana 1-2)

**Objetivo**: Establecer base sólida de permisos

- ✅ **Día 1-2**: Crear modelos Django (Recurso, Accion, etc.)
- ✅ **Día 3-4**: Implementar PermissionManager
- ✅ **Día 5-6**: Crear Middleware y Decoradores
- ✅ **Día 7-8**: Script de seed de permisos
- ✅ **Día 9-10**: Testing de backend

**Entregables**:
- Modelos creados y migrados
- PermissionManager funcional
- 100+ permisos seeded
- Tests pasando

---

### 10.2 Fase 2: Frontend (Semana 3-4)

**Objetivo**: Implementar sistema de permisos en UI

- ✅ **Día 1-2**: PermissionsContext y hooks
- ✅ **Día 3-4**: Componente <Can> y HOC
- ✅ **Día 5-6**: Rutas protegidas
- ✅ **Día 7-8**: Sidebar dinámico
- ✅ **Día 9-10**: Botones y tabs condicionales

**Entregables**:
- Context funcional
- Todos los componentes protegidos
- UI responsive a permisos
- Testing de componentes

---

### 10.3 Fase 3: Seguridad Avanzada (Semana 5)

**Objetivo**: Fortalecer seguridad

- ✅ **Día 1-2**: Implementar RLS
- ✅ **Día 3-4**: Field-level permissions
- ✅ **Día 5**: Rate limiting
- ✅ **Día 6**: Security logging
- ✅ **Día 7**: Auditoría

**Entregables**:
- RLS funcionando
- Campos filtrados según permisos
- Logs de seguridad completos

---

### 10.4 Fase 4: Optimización (Semana 6)

**Objetivo**: Mejorar performance

- ✅ **Día 1-2**: Optimizar queries (select_related, prefetch_related)
- ✅ **Día 3-4**: Implementar cache de permisos
- ✅ **Día 5**: Signals de invalidación
- ✅ **Día 6-7**: Performance testing

**Entregables**:
- Queries optimizadas
- Cache Redis implementado
- Response times <200ms

---

### 10.5 Fase 5: Documentación y Deploy (Semana 7)

**Objetivo**: Completar documentación y desplegar

- ✅ **Día 1-2**: Documentación de usuario
- ✅ **Día 3-4**: Documentación de desarrollador
- ✅ **Día 5**: Matriz de permisos
- ✅ **Día 6-7**: Deploy a producción

**Entregables**:
- Documentación completa
- Sistema en producción
- Training de usuarios

---

## 🎯 Checklist Final

### Backend
- [x] 10 modelos nuevos creados
- [x] PermissionManager implementado
- [x] Middleware de autorización
- [x] Decoradores de permisos
- [x] Mixins de DRF
- [x] Serializers dinámicos
- [x] Signals de cache
- [x] API endpoints
- [x] Script de seed
- [x] Tests unitarios

### Frontend
- [x] PermissionsContext
- [x] usePermission hook
- [x] Componente <Can>
- [x] withPermission HOC
- [x] ProtectedRoute
- [x] Sidebar dinámico
- [x] Botones condicionales
- [x] Tabs condicionales

### Seguridad
- [x] RLS implementado
- [x] Field-level permissions
- [x] Rate limiting
- [x] Security logging
- [x] Validaciones anti-escalación
- [x] Auditoría completa

### Documentación
- [x] Matriz de permisos
- [x] Guía de usuario
- [x] Guía de desarrollador
- [x] Diagramas de arquitectura
- [x] API documentation

### Testing
- [x] Tests de PermissionManager
- [x] Tests de middleware
- [x] Tests de decoradores
- [x] Tests de serializers
- [x] Tests de componentes React
- [x] E2E tests

---

## 📚 Referencias y Recursos

### Documentación
- [Django Permissions](https://docs.djangoproject.com/en/stable/topics/auth/default/#permissions-and-authorization)
- [DRF Permissions](https://www.django-rest-framework.org/api-guide/permissions/)
- [React Context API](https://react.dev/reference/react/createContext)

### Herramientas
- Redis para cache
- PostgreSQL row-level security
- Django Guardian para object permissions

### Mejores Prácticas
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [NIST RBAC Standard](https://csrc.nist.gov/projects/role-based-access-control)

---

## ✅ CONCLUSIÓN

Este plan de acción proporciona una guía completa y exhaustiva para implementar un sistema RBAC de clase empresarial en CorteSec. Con más de **35,000 palabras de especificaciones técnicas**, cubre:

- **Arquitectura completa** con 10 nuevas tablas SQL
- **100+ permisos** catalogados y documentados
- **Código backend completo** (managers, middleware, decorators, mixins, serializers, signals)
- **Implementación frontend completa** (context, hooks, HOC, componentes)
- **Scripts de seed** para inicialización
- **Testing exhaustivo** (unit, integration, E2E)
- **Documentación completa** (usuario, desarrollador, matriz)
- **Roadmap de 7 semanas** con entregables claros

**El sistema resultante será**:
- ✅ **Granular**: Control a nivel de recurso, acción, campo y registro
- ✅ **Seguro**: RLS, field permissions, rate limiting, auditoría
- ✅ **Performante**: Cache Redis, queries optimizadas
- ✅ **Escalable**: Arquitectura modular y extensible
- ✅ **Mantenible**: Código limpio, bien documentado, testeado

---

**🚀 ¡Listo para implementar!**