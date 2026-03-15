# MATRIZ DE PERMISOS POR ROL - CorteSec
## Sistema RBAC (Role-Based Access Control)

Esta matriz define qué permisos debe tener cada rol en el sistema.

---

## ROLES Y SUS PERMISOS

### 1. SUPER ADMINISTRADOR RBAC
**Código**: `SUPER_ADMIN_RBAC`
**Descripción**: Control total del sistema, incluyendo configuración de roles y permisos

**Permisos**: TODOS (264 permisos)
- Acceso completo a todos los módulos
- Todas las acciones: create, read, update, delete, list, export, import

**Módulos**:
- Todos los 27 módulos del sistema

---

### 2. ADMINISTRADOR
**Código**: `ADMIN`
**Descripción**: Gestor del sistema sin control de RBAC

**Permisos**: Todos EXCEPTO gestión de roles/permisos (242 permisos)
- Usuarios: create, read, update, delete, list, export
- Configuración: create, read, update, delete, list
- Dashboard: read, list,stats
- Core: read, list, logs, notifications
- Nómina: create, read, update, delete, list, export
- Contabilidad: create, read, update, delete, list, export
- Préstamos: create, read, update, delete, list
- Empleados: create, read, update, delete, list
- Cargos: create, read, update, delete, list
- Contratos: create, read, update, delete, list
- Reportes: read, list, export, generate

**Módulos EXCLUIDOS**:
- Roles y Permisos (solo lectura)

---

### 3. CONTADOR
**Código**: `CONTADOR`
**Descripción**: Gestión financiera y contable

**Permisos**: Módulos financieros (87 permisos)
- Contabilidad: create, read, update, list, export
- Nómina: read, list, export (NO puede crear/modificar)
- Préstamos: create, read, update, list
- Reportes: read, list, export, generate
- Dashboard: read, list (vistas financieras)
- Items: create, read, update, list (gestión de items contables)

**Acciones DENEGADAS**:
- NO puede eliminar registros contables
- NO puede modificar nóminas ya procesadas
- NO puede gestionar usuarios

---

### 4. SUPERVISOR NÓMINA RBAC
**Código**: `SUPERVISOR_NOMINA`
**Descripción**: Gestión completa de nómina y empleados

**Permisos**: Nómina, empleados, contratos (58 permisos)
- Nómina: create, read, update, delete, list, export
- Empleados: create, read, update, list
- Contratos: create, read, update, list
- Tipos de Contrato: read, list
- Cargos: read, list
- Conceptos Laborales: create, read, update, list
- Parámetros Legales: read, list
- Dashboard: read, list (vistas de nómina)

**Acciones DENEGADAS**:
- NO puede eliminar empleados (solo desactivar)
- NO puede acceder a contabilidad
- NO puede gestionar préstamos

---

### 5. SUPERVISOR
**Código**: `SUPERVISOR`
**Descripción**: Supervisor de operaciones generales

**Permisos**: Lectura amplia + edición limitada (78 permisos)
- Dashboard: read, list, stats
- Empleados: read, update, list
- Cargos: read, list
- Contratos: read, list
- Nómina: read, list (solo visualización)
- Reportes: read, list, export
- Items: read, list
- Ubicaciones: read, list
- Préstamos: read, list (solo visualización)

**Acciones DENEGADAS**:
- NO puede crear empleados (solo editar básicos)
- NO puede procesar nóminas
- NO puede acceder a contabilidad completa
- NO puede gestionar configuración

---

### 6. EMPLEADO
**Código**: `EMPLEADO`
**Descripción**: Usuario básico del sistema

**Permisos**: Solo lectura de su información (15 permisos)
- Perfil: read, update (solo su propio perfil)
- Dashboard: read, list (vista personalizada)
- Nómina: read (solo sus propias nóminas)
- Contratos: read (solo su contrato)
- Préstamos: create, read, update (solo sus préstamos)
- Ayuda: read, list

**Acciones DENEGADAS**:
- NO puede ver información de otros empleados
- NO puede acceder a módulos administrativos
- NO puede crear/modificar configuraciones

---

### 7. GERENTE
**Código**: `GERENTE`
**Descripción**: Gestión ejecutiva y toma de decisiones

**Permisos**: Lectura completa + reportes avanzados (95 permisos)
- Dashboard: ALL (todas las vistas ejecutivas)
- Reportes: create, read, list, export, generate (todos los reportes)
- Nómina: read, list, export
- Contabilidad: read, list, export
- Préstamos: read, list, approve (aprobación de préstamos)
- Empleados: read, list
- Contratos: read, list
- Core: read, list, stats, notifications

**Acciones DENEGADAS**:
- NO puede crear/modificar datos operativos
- NO puede eliminar registros
- NO puede gestionar configuración del sistema

---

### 8. ADMINISTRADOR RBAC
**Código**: `ADMIN_RBAC`
**Descripción**: Gestión exclusiva de roles y permisos

**Permisos**: Solo módulo de Roles/Permisos (27 permisos)
- Roles y Permisos: create, read, update, delete, list
- Tipos de Rol: create, read, update, list
- Asignaciones: create, read, update, delete (gestión de asignaciones de roles)
- Auditoría: read, list (logs de cambios en roles)
- Usuarios: read, list (solo para asignar roles)

**Acciones DENEGADAS**:
- NO puede acceder a otros módulos del sistema
- NO puede gestionar contenido operativo

---

### 9. CONTADOR RBAC
**Código**: `CONTADOR_RBAC`
**Descripción**: Contador especializado con acceso a configuración contable

**Permisos**: Igual que CONTADOR + configuración contable
- Todo lo de CONTADOR +
- Configuración: read, update (solo parámetros contables)
- Parámetros Legales: create, read, update, list

---

### 10. EMPLEADO RBAC
**Código**: `EMPLEADO_RBAC`
**Descripción**: Igual que EMPLEADO (sin diferencias actualmente)

**Permisos**: Igual que EMPLEADO

---

## RESUMEN POR MÓDULO

| Módulo | Super Admin | Admin | Contador | Sup. Nómina | Supervisor | Empleado | Gerente | Admin RBAC |
|--------|-------------|-------|----------|-------------|------------|----------|---------|------------|
| Usuarios | CRUD | CRUD | - | - | R | - | R | R |
| Roles | CRUD | R | - | - | - | - | - | CRUD |
| Dashboard | CRUD | CRU | R | R | R | R | CRUD | - |
| Nómina | CRUD | CRUD | R | CRUD | R | R* | R | - |
| Contabilidad | CRUD | CRUD | CRU | - | - | - | R | - |
| Préstamos | CRUD | CRUD | CRU | - | R | CRU* | RA | - |
| Empleados | CRUD | CRUD | - | CRU | RU | - | R | - |
| Contratos | CRUD | CRUD | - | CRU | R | R* | R | - |
| Reportes | CRUD | CRUD | RX | R | RX | - | CRUDX | - |
| Configuración | CRUD | CRUD | - | - | - | - | - | - |
| Core | CRUD | CRU | R | R | R | R | R | - |

**Leyenda**:
- C: Create
- R: Read
- U: Update
- D: Delete
- X: Export
- A: Approve
- *: Solo sus propios registros

---

## REGLAS ESPECIALES

### Permisos Condicionales

1. **Empleado - Préstamos**:
   - Solo puede ver/editar sus propios préstamos
   - Condición SQL: `usuario_id = {user.id}`

2. **Empleado - Nómina**:
   - Solo puede ver sus propias nóminas
   - Condición SQL: `empleado.usuario_id = {user.id}`

3. **Empleado - Contrato**:
   - Solo puede ver su contrato activo
   - Condición SQL: `usuario_id = {user.id} AND activo = TRUE`

4. **Supervisor - Empleados**:
   - Solo puede editar empleados de su departamento
   - Condición SQL: `departamento_id IN (SELECT departamento_id FROM empleados WHERE usuario_id = {user.id})`

---

## PRÓXIMOS PASOS

1. Ejecutar script de inicialización: `python manage.py init_permisos_roles`
2. Verificar asignaciones: `python verificar_permisos_usuario.py`
3. Aplicar reglas condicionales en DRF Access Policies
4. Configurar tests de permisos

---

## NOTAS DE IMPLEMENTACIÓN

- Esta matriz se debe revisar cada vez que se agregue un nuevo módulo
- Los permisos condicionales requieren configuración adicional en las policies
- Mantener sincronizado con `init_permisos_roles.py`
- Documentar cambios en el CHANGELOG

---

**Última actualización**: 2026-02-13
**Versión**: 1.0.0
**Responsable**: Sistema CorteSec
