# Sistema RBAC Granular Unificado - Documentación Técnica

## 📋 Índice
1. [Arquitectura General](#arquitectura-general)
2. [Estructura de Tabs](#estructura-de-tabs)
3. [Modelo de Datos](#modelo-de-datos)
4. [Casos de Uso - Nómina](#casos-de-uso-nómina)
5. [Guía de Implementación](#guía-de-implementación)
6. [Auditoría y Seguridad](#auditoría-y-seguridad)

---

## 🏗️ Arquitectura General

### Concepto
Sistema de control de acceso basado en **RBAC (Role-Based Access Control) con granularidad multinivel**, optimizado para gestión de nómina empresarial.

### Principios de Diseño
- ✅ **Todo en un solo lugar**: Una página unificada con tabs, sin navegación fragmentada
- ✅ **Granularidad avanzada**: Control desde recursos hasta campos individuales
- ✅ **Seguridad multinivel**: Field Security + Row-Level Security + Delegaciones
- ✅ **Auditoría total**: Cada acción registrada con contexto completo
- ✅ **Escalabilidad**: Fácil agregar nuevos recursos y acciones

### Diferencias con Sistema Clásico

| Aspecto | Sistema Viejo (Eliminado) | Sistema RBAC Granular |
|---------|---------------------------|----------------------|
| **Concepto Base** | Módulos predefinidos | Recursos dinámicos |
| **Permisos** | Tipos fijos (CRUD) | Acciones custom ilimitadas |
| **Restricciones** | Condiciones genéricas | Field Security + RLS específicos |
| **UI** | Disperso en múltiples páginas | Unificado en tabs |
| **Enfoque** | Permisos de aplicación | Permisos de datos |

---

## 📑 Estructura de Tabs

### Tab 1: 👥 Usuarios
**Propósito**: Gestión completa de usuarios del sistema

**Funcionalidades**:
- Crear/editar/eliminar usuarios
- Asignar roles múltiples por usuario
- Ver historial de acciones
- Gestionar estado activo/inactivo
- Cambiar contraseñas

**Componente**: `UsuariosTab.jsx` (wrapper de `UsuariosPage.jsx`)

---

### Tab 2: 🛡️ Roles
**Propósito**: Gestión de roles jerárquicos

**Tabs Internos**:
1. **Roles**: Crear y editar roles del sistema
2. **Tipos de Rol**: Categorías y clasificaciones
3. **Asignaciones**: Asignar roles a usuarios
4. **Plantillas**: Plantillas predefinidas de roles
5. **Meta-Roles**: Roles compuestos dinámicamente
6. **Condicionales**: Roles basados en condiciones
7. **Auditoría**: Historial de cambios de roles
8. **Historial**: Historial de asignaciones
9. **Configuración**: Configuración general de roles

**Funcionalidades**:
- Crear roles (ej: "Supervisor Nómina", "Contador", "Auxiliar RRHH")
- Definir jerarquías (roles padre/hijo)
- Asignar usuarios masivamente
- Plantillas de roles predefinidas
- Roles condicionales (activos según criterios)

**Componente**: `RolesTabWrapper.jsx` → Renderiza 9 tabs internos

**Ejemplo de Jerarquía**:
```
Director RRHH
  ├── Supervisor Nómina
  │     ├── Auxiliar Nómina
  │     └── Analista Compensaciones
  └── Jefe Contratación
        └── Reclutador
```

---

### Tab 3: 📦 Recursos
**Propósito**: Definir recursos protegibles (tablas, vistas, APIs, páginas)

**Tipos de Recursos**:
- **Modelo** (tabla): `tabla_salarios`, `datos_bancarios`, `empleados`
- **Vista** (página): `vista_nomina`, `reporte_prestaciones`
- **API** (endpoint): `api_calculo_nomina`, `api_exportar_pagos`
- **UI Component**: `boton_aprobar_pago`, `sidebar_nomina`

**Componente**: `RecursosTab.jsx`

**Campos**:
- `codigo`: Identificador único (ej: `tabla_salarios`)
- `nombre`: Nombre descriptivo
- `tipo`: modelo/vista/api/componente
- `descripcion`: Para qué sirve
- `modulo`: A qué módulo pertenece (ej: "Nómina")
- `activo`: Habilitado/deshabilitado

**Ejemplo de Recursos para Nómina**:
```javascript
{
  codigo: "tabla_salarios",
  nombre: "Tabla de Salarios",
  tipo: "modelo",
  descripcion: "Salarios base y componentes salariales de empleados",
  modulo: "Nómina",
  activo: true
}
```

---

### Tab 4: ⚡ Acciones
**Propósito**: Definir acciones ejecutables sobre recursos

**Acciones Estándar (CRUD)**:
- `ver` - Consultar datos
- `crear` - Insertar nuevos registros
- `editar` - Modificar existentes
- `eliminar` - Borrar registros

**Acciones Custom (ejemplos para Nómina)**:
- `aprobar_pago` - Aprobar pago de nómina
- `exportar_nomina` - Descargar archivo de nómina
- `calcular_prestaciones` - Ejecutar cálculo de prestaciones sociales
- `revertir_liquidacion` - Anular liquidación de empleado
- `ajustar_salario` - Modificar salario con auditoría
- `ver_historico_salarios` - Consultar histórico salarial

**Componente**: `AccionesTab.jsx`

**Campos**:
- `codigo`: Identificador (ej: `aprobar_pago`)
- `nombre`: Nombre descriptivo
- `descripcion`: Qué hace
- `tipo`: standard/custom
- `requiere_aprobacion`: Si necesita workflow

**Ejemplo**:
```javascript
{
  codigo: "aprobar_pago",
  nombre: "Aprobar Pago de Nómina",
  descripcion: "Permite aprobar el pago de nómina procesada",
  tipo: "custom",
  requiere_aprobacion: true,
  recursos_aplicables: ["tabla_salarios", "pagos_nomina"]
}
```

---

### Tab 5: 🔒 Field Security (Restricciones de Campo)
**Propósito**: Controlar qué columnas puede ver/editar cada rol

**Casos de Uso**:
- Ocultar `salario_base` a roles no autorizados
- Mostrar solo `salario_bruto` sin desglose a supervisores
- Ocultar `numero_cuenta_bancaria` completo (mostrar últimos 4 dígitos)
- Bloquear edición de `fecha_ingreso` excepto a RRHH

**Componente**: `FieldRestrictionsTab.jsx`

**Tipos de Restricción**:
- **Ocultar**: Campo no visible
- **Solo lectura**: Visible pero no editable
- **Enmascarar**: Mostrar parcialmente (ej: ***1234)
- **Requerir aprobación**: Editar solo con aprobación

**Ejemplo**:
```javascript
{
  rol: "Auxiliar RRHH",
  recurso: "tabla_salarios",
  campo: "salario_base",
  tipo_restriccion: "ocultar",
  motivo: "Datos sensibles - solo supervisores",
  activa: true
}
```

---

### Tab 6: 🎯 Row-Level Security (RLS)
**Propósito**: Filtrar QUÉ registros puede ver cada usuario/rol

**Casos de Uso**:
- Jefe de Área solo ve nómina de su departamento
- Contador Regional solo ve sedes de su región
- Supervisor ve solo empleados de su equipo
- Gerente General ve todo

**Componente**: `RLSTab.jsx`

**Tipos de Condición**:
- **SQL directo**: `departamento_id = {user.departamento_id}`
- **JSON Query**: `{"area": {"$eq": "{user.area}"}}`
- **Python Expression**: `Q(supervisor_id=user.id) | Q(departamento__in=user.departamentos_supervisados)`

**Ejemplo**:
```javascript
{
  rol: "Supervisor Nómina",
  recurso: "tabla_salarios",
  tipo: "filtro_sql",
  condicion_sql: "departamento_id IN (SELECT id FROM departamentos WHERE supervisor_id = {user.id})",
  descripcion: "Solo ver nómina de su departamento",
  activa: true
}
```

---

### Tab 7: 🔄 Delegaciones
**Propósito**: Delegación temporal de permisos con auditoría

**Casos de Uso**:
- Gerente delega aprobación de pagos durante vacaciones
- Contador principal delega cierre contable a auxiliar
- Delegación con fecha de expiración automática
- Revocación manual con justificación

**Componente**: `DelegacionesTab.jsx`

**Campos Clave**:
- `usuario_delegante`: Quien delega
- `usuario_delegado`: Quien recibe
- `fecha_inicio` / `fecha_fin`: Vigencia
- `motivo`: Justificación
- `activa`: Estado actual
- `revocada_at`: Si se canceló anticipadamente

**Ejemplo**:
```javascript
{
  usuario_delegante: "gerente.rrhh@empresa.com",
  usuario_delegado: "supervisor.temporal@empresa.com",
  permisos_delegados: ["aprobar_pago", "exportar_nomina"],
  fecha_inicio: "2026-02-10",
  fecha_fin: "2026-02-20",
  motivo: "Vacaciones gerente RRHH",
  activa: true
}
```

---

### Tab 8: ✅ Solicitudes de Aprobación
**Propósito**: Workflow de solicitud y aprobación de permisos especiales

**Flujo**:
1. Usuario solicita permiso excepcional
2. Aprobador recibe notificación
3. Aprobador acepta/rechaza con comentario
4. Permiso otorgado temporalmente si se aprueba
5. Auditoría completa del proceso

**Componente**: `SolicitudesAprobacionTab.jsx`

**Estados**:
- `pendiente`: Esperando revisión
- `aprobada`: Permiso otorgado
- `rechazada`: Permiso denegado
- `revocada`: Cancelada después de aprobada

**Ejemplo**:
```javascript
{
  usuario_solicitante: "auxiliar.nomina@empresa.com",
  recurso_solicitado: "tabla_salarios",
  accion_solicitada: "editar",
  justificacion: "Corregir error en salario de empleado #1234",
  aprobador_asignado: "supervisor.nomina@empresa.com",
  estado: "pendiente",
  fecha_solicitud: "2026-02-04 10:30:00"
}
```

---

### Tab 9: 🎨 UI Elements
**Propósito**: Controlar visibilidad de elementos visuales (sidebar, botones, tabs, widgets)

**Casos de Uso**:
- Ocultar botón "Exportar Nómina" a usuarios sin permiso
- Mostrar tab "Reportes Financieros" solo a contadores
- Ocultar widget "Resumen Salarial" en dashboard a no autorizados

**Componente**: `UIElementsTab.jsx`

**Tipos**:
- `sidebar_item`: Items del menú lateral
- `button`: Botones de acción
- `tab`: Pestañas de navegación
- `widget`: Widgets de dashboard
- `modal`: Modales/diálogos

---

### Tab 10: 📊 Reportes
**Propósito**: Auditoría, estadísticas y reportes del sistema RBAC

**Secciones**:
- **Auditoría**: Historial completo de cambios de permisos
- **Estadísticas**: Usuarios por rol, permisos más usados, etc.
- **Delegaciones activas**: Quién tiene qué delegado
- **Solicitudes pendientes**: Workflow en curso
- **Accesos recientes**: Últimos accesos a recursos sensibles

**Componente**: `ReportesTab.jsx` (wrapper de `RBACReportsPage.jsx`)

---

## 📊 Modelo de Datos Backend

### Modelos Principales (backend/permisos/models.py)

```python
# Usuario (heredado de Django Auth)
User
  - username
  - email
  - is_active
  - roles (ManyToMany)

# Rol
Rol
  - codigo
  - nombre
  - descripcion
  - nivel (jerarquía)
  - padre (ForeignKey a Rol)
  - activo

# Recurso
Recurso
  - codigo (unique)
  - nombre
  - tipo (choices: modelo/vista/api/componente)
  - descripcion
  - modulo
  - activo

# Acción
Accion
  - codigo
  - nombre
  - descripcion
  - tipo (standard/custom)
  - requiere_aprobacion

# Permiso (relación Rol → Recurso → Acción)
Permiso
  - rol (FK)
  - recurso (FK)
  - accion (FK)
  - condicion (JSON, opcional para RLS)
  - activo

# Restricción de Campo
RestriccionCampo
  - rol (FK)
  - recurso (FK)
  - campo (nombre de la columna)
  - tipo_restriccion (ocultar/solo_lectura/enmascarar)
  - motivo
  - activa

# Restricción de Registro (RLS)
RestriccionRegistro
  - rol (FK)
  - recurso (FK)
  - tipo (filtro_sql/json_query)
  - condicion_sql
  - condicion_json
  - descripcion
  - activa

# Delegación
Delegacion
  - usuario_delegante (FK)
  - usuario_delegado (FK)
  - fecha_inicio
  - fecha_fin
  - motivo
  - activa
  - revocada_at

# Solicitud de Aprobación
SolicitudAprobacion
  - usuario_solicitante (FK)
  - recurso (FK)
  - accion (FK)
  - justificacion
  - aprobador (FK)
  - estado (pendiente/aprobada/rechazada)
  - comentarios_aprobador
  - fecha_solicitud
  - fecha_resolucion

# UIElemento
UIElemento
  - codigo
  - nombre
  - tipo (sidebar_item/button/tab/widget/modal)
  - descripcion
  - parent (FK opcional)
  - activo

# Auditoría de Permisos
AuditoriaPermisos
  - usuario (FK)
  - accion (str: "asignar_rol", "revocar_permiso", etc.)
  - permiso (FK, opcional)
  - fecha
  - detalles (JSON)
```

---

## 🎯 Casos de Uso - Nómina

### Caso 1: Restricción de Salarios por Departamento

**Objetivo**: Supervisor de Producción solo ve nómina de su área

**Configuración**:

1. **Recurso**: `tabla_salarios` (tipo: modelo)
2. **Acción**: `ver` (standard)
3. **Permiso**: Rol "Supervisor Producción" → `tabla_salarios` → `ver`
4. **RLS**:
   ```javascript
   {
     rol: "Supervisor Producción",
     recurso: "tabla_salarios",
     tipo: "filtro_sql",
     condicion_sql: "empleado_id IN (SELECT id FROM empleados WHERE departamento_id = {user.departamento_id})"
   }
   ```

**Resultado**: Supervisor solo ve salarios de empleados de Producción

---

### Caso 2: Ocultar Datos Bancarios Sensibles

**Objetivo**: Auxiliares de nómina pueden procesar pagos sin ver cuentas bancarias completas

**Configuración**:

1. **Recurso**: `datos_bancarios` (tipo: modelo)
2. **Field Restriction**:
   ```javascript
   {
     rol: "Auxiliar Nómina",
     recurso: "datos_bancarios",
     campo: "numero_cuenta",
     tipo_restriccion: "enmascarar",
     formato_mascara: "****{last_4}",
     motivo: "Seguridad PCI - datos financieros"
   }
   ```

**Resultado**: Auxiliar ve `****5678` en lugar de `1234567890123456`

---

### Caso 3: Aprobación de Ajustes Salariales

**Objetivo**: Ajustar salarios requiere aprobación del gerente RRHH

**Configuración**:

1. **Acción Custom**:
   ```javascript
   {
     codigo: "ajustar_salario",
     nombre: "Ajustar Salario",
     tipo: "custom",
     requiere_aprobacion: true
   }
   ```

2. **Workflow**:
   - Supervisor solicita ajuste → `SolicitudAprobacion` creada
   - Gerente RRHH recibe notificación
   - Gerente aprueba/rechaza con comentario
   - Si aprueba: permiso temporal otorgado
   - Auditoría completa registrada

---

### Caso 4: Delegación Durante Vacaciones

**Objetivo**: Contador principal delega cierre de nómina durante ausencia

**Configuración**:

```javascript
{
  usuario_delegante: "contador.principal@empresa.com",
  usuario_delegado: "contador.auxiliar@empresa.com",
  permisos_delegados: [
    { recurso: "nomina_mensual", accion: "cerrar" },
    { recurso: "reportes_dian", accion: "generar" }
  ],
  fecha_inicio: "2026-02-15",
  fecha_fin: "2026-02-28",
  motivo: "Vacaciones contador principal",
  activa: true
}
```

**Auditoría**: Cada acción ejecutada por delegado registra quién delegó

---

## 🚀 Guía de Implementación

### Paso 1: Definir Recursos

```javascript
// Recursos de Nómina
const recursos_nomina = [
  { codigo: "tabla_salarios", nombre: "Salarios", tipo: "modelo" },
  { codigo: "datos_bancarios", nombre: "Datos Bancarios", tipo: "modelo" },
  { codigo: "nomina_mensual", nombre: "Nómina Mensual", tipo: "modelo" },
  { codigo: "prestaciones_sociales", nombre: "Prestaciones", tipo: "modelo" },
  { codigo: "vista_reporte_nomina", nombre: "Reporte Nómina", tipo: "vista" },
  { codigo: "api_calcular_nomina", nombre: "API Cálculo", tipo: "api" }
]
```

### Paso 2: Definir Acciones

```javascript
// Acciones Standard
const acciones_standard = ["ver", "crear", "editar", "eliminar"]

// Acciones Custom
const acciones_custom = [
  { codigo: "aprobar_pago", nombre: "Aprobar Pago", requiere_aprobacion: true },
  { codigo: "exportar_nomina", nombre: "Exportar Nómina", requiere_aprobacion: false },
  { codigo: "ajustar_salario", nombre: "Ajustar Salario", requiere_aprobacion: true },
  { codigo: "cerrar_nomina", nombre: "Cerrar Nómina", requiere_aprobacion: true }
]
```

### Paso 3: Crear Roles

```javascript
const roles = [
  { codigo: "gerente_rrhh", nombre: "Gerente RRHH", nivel: 1 },
  { codigo: "supervisor_nomina", nombre: "Supervisor Nómina", nivel: 2, padre: "gerente_rrhh" },
  { codigo: "auxiliar_nomina", nombre: "Auxiliar Nómina", nivel: 3, padre: "supervisor_nomina" }
]
```

### Paso 4: Asignar Permisos

```javascript
// Gerente RRHH: Acceso total
Permiso.create({
  rol: "gerente_rrhh",
  recurso: "tabla_salarios",
  accion: ["ver", "editar", "aprobar_pago", "ajustar_salario"]
})

// Supervisor: Ver y procesar
Permiso.create({
  rol: "supervisor_nomina",
  recurso: "tabla_salarios",
  accion: ["ver", "editar"],
  rls: "departamento_id = {user.departamento_id}" // Solo su departamento
})

// Auxiliar: Solo ver
Permiso.create({
  rol: "auxiliar_nomina",
  recurso: "tabla_salarios",
  accion: ["ver"],
  rls: "departamento_id = {user.departamento_id}",
  field_restrictions: ["salario_base:ocultar", "numero_cuenta:enmascarar"]
})
```

---

## 🔐 Auditoría y Seguridad

### Registro Automático

**Todas las operaciones RBAC son auditadas automáticamente**:

```javascript
AuditoriaPermisos.create({
  usuario: current_user,
  accion: "asignar_permiso",
  permiso: permiso_obj,
  detalles: {
    rol: "supervisor_nomina",
    recurso: "tabla_salarios",
    accion: "ver",
    timestamp: "2026-02-04 10:30:00",
    ip_address: "192.168.1.10"
  }
})
```

### Eventos Auditados

- ✅ Creación/modificación de roles
- ✅ Asignación de permisos a roles
- ✅ Asignación de roles a usuarios
- ✅ Creación de Field Restrictions
- ✅ Creación de reglas RLS
- ✅ Inicio/fin de delegaciones
- ✅ Solicitudes de permisos
- ✅ Aprobaciones/rechazos
- ✅ Accesos a recursos sensibles

### Reportes de Auditoría

```javascript
// Quién modificó permisos de nómina en los últimos 7 días
GET /api/permisos/auditoria/?recurso=tabla_salarios&fecha_desde=2026-01-28

// Delegaciones activas
GET /api/permisos/delegaciones/?activa=true

// Solicitudes pendientes
GET /api/permisos/solicitudes/?estado=pendiente
```

---

## 📚 Recursos Adicionales

### Backend API Endpoints

```
# Recursos
GET    /api/permisos/recursos/
POST   /api/permisos/recursos/
PUT    /api/permisos/recursos/{id}/
DELETE /api/permisos/recursos/{id}/

# Acciones
GET    /api/permisos/acciones/
POST   /api/permisos/acciones/
PUT    /api/permisos/acciones/{id}/

# Field Restrictions
GET    /api/permisos/restricciones-campo/
POST   /api/permisos/restricciones-campo/
PUT    /api/permisos/restricciones-campo/{id}/

# RLS
GET    /api/permisos/restricciones-registro/
POST   /api/permisos/restricciones-registro/
PUT    /api/permisos/restricciones-registro/{id}/

# Delegaciones
GET    /api/permisos/delegaciones/
POST   /api/permisos/delegaciones/
PUT    /api/permisos/delegaciones/{id}/
DELETE /api/permisos/delegaciones/{id}/ (revocación)

# Solicitudes
GET    /api/permisos/solicitudes/
POST   /api/permisos/solicitudes/
PUT    /api/permisos/solicitudes/{id}/aprobar/
PUT    /api/permisos/solicitudes/{id}/rechazar/

# Auditoría
GET    /api/permisos/auditoria/
GET    /api/permisos/estadisticas/
```

### Frontend Components

```
frontend/src/pages/control-acceso/
├── PermisosUnificadoPage.jsx           # Página principal
└── tabs-rbac/
    ├── UsuariosTab.jsx                 # Tab 1: Usuarios
    ├── RolesTabWrapper.jsx             # Tab 2: Roles
    ├── RecursosTab.jsx                 # Tab 3: Recursos
    ├── AccionesTab.jsx                 # Tab 4: Acciones
    ├── FieldRestrictionsTab.jsx        # Tab 5: Field Security
    ├── RLSTab.jsx                      # Tab 6: Row Security
    ├── DelegacionesTab.jsx             # Tab 7: Delegaciones
    ├── SolicitudesAprobacionTab.jsx    # Tab 8: Solicitudes
    ├── UIElementsTab.jsx               # Tab 9: UI Elements
    └── ReportesTab.jsx                 # Tab 10: Reportes
```

---

## ✅ Checklist de Implementación

- [x] ✅ Crear tabs-rbac con wrappers
- [x] ✅ Refactorizar PermisosUnificadoPage
- [x] ✅ Actualizar sidebar (simplificado)
- [x] ✅ Eliminar rutas obsoletas en App.jsx
- [x] ✅ Eliminar archivos del sistema viejo
- [x] ✅ Documentar arquitectura completa
- [ ] ⏳ Probar carga de todos los tabs
- [ ] ⏳ Verificar integración backend
- [ ] ⏳ Validar auditoría funcionando
- [ ] ⏳ Crear datos de ejemplo (seed)
- [ ] ⏳ Documentar casos de uso reales

---

**Fecha de Implementación**: 4 de Febrero, 2026  
**Sistema**: CorteSec - Control de Acceso RBAC Granular  
**Versión**: 2.0 (Sistema Unificado)
